import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createInfrastructureState, reduceInfrastructure, projectInfrastructure } from '../src/features/explorer/lifecycle/infrastructure.ts';
import { createScalingState, reduceScaling, projectScaling } from '../src/features/explorer/lifecycle/scaling.ts';
import * as scalingModule from '../src/features/explorer/lifecycle/scaling.ts';
import * as lifecycleEngine from '../src/features/explorer/lifecycle/engine.ts';

const read = name => JSON.parse(readFileSync(new URL(`../docs/design/systems-atlas-lifecycles-v3/scenarios/${name}.json`, import.meta.url)));
const scenarios = ['infra-exhaustion-recovery', 'infra-quorum-recovery', 'infra-provision-scale'];
function engine(id) { return id === scenarios[2] ? [createScalingState, reduceScaling, projectScaling] : [() => createInfrastructureState(id), reduceInfrastructure, projectInfrastructure]; }
function commands(cp) { return cp.id === 'infra-quorum-recovery-07' ? [cp.command, { type: 'SET_STORAGE', ready: false }] : [cp.command]; }
function applyScaling(state,command) { return reduceScaling(state,scalingModule.normalizeScalingCommand(state,command)); }
function dispatch(id,state,command) { const [,reduce] = engine(id); return id===scenarios[2]?applyScaling(state,command):reduce(state,lifecycleEngine.normalizeInfrastructureCommand(state,command)); }
function prefix(id, checkpoint) { const [create] = engine(id); let state = create(); for (const cp of read(id).checkpoints) { for (const c of commands(cp)) state = dispatch(id,state,c).state; if(cp.id === checkpoint) break; } return state; }
for (const id of scenarios) test(`${id}: all checkpoints (quorum -07 explicit storage erratum)`, () => { const [create,,project] = engine(id); let state = create(); for(const cp of read(id).checkpoints) { for(const c of commands(cp)) state = dispatch(id,state,c).state; assert.deepEqual(project(state), cp.expected, cp.id); } });
function subset(actual, expected) { for(const [key, value] of Object.entries(expected)) { if(value && typeof value === 'object' && !Array.isArray(value)) subset(actual[key], value); else assert.deepEqual(actual[key], value, key); } }
for(const variant of read('negative-cases').cases.filter(c => c.id.startsWith('INF-'))) test(variant.id + ': ' + variant.reason, () => { const [,,project] = engine(variant.scenarioId); let state = prefix(variant.scenarioId, variant.fromCheckpoint); for(const command of variant.commands) state = dispatch(variant.scenarioId,state,command).state; subset(project(state), variant.expectedSubset); });
test('ready schedules autostart on logical clock, and stale health cannot revive failed start', () => {
 let state = prefix(scenarios[0], 'infra-exhaustion-recovery-13');
 assert.equal(state.workloadStatus, 'pending');
 state = reduceInfrastructure(state, {type:'ADVANCE_CLOCK',ticks:1}).state;
 assert.equal(state.workloadStatus,'starting');
 const generation = state.instanceGeneration;
 state = reduceInfrastructure(state,{type:'FAIL_NODE',nodeId:'node-02'}).state;
 assert.ok(reduceInfrastructure(state,{type:'WORKLOAD_HEALTHY',generation}).rejection);
 assert.equal(state.nodeId,null);
});
test('failure during boot invalidates ready; storage loss cancels start without waiving fence',()=>{
 let state=prefix(scenarios[0],'infra-exhaustion-recovery-12');
 state=reduceInfrastructure(state,{type:'FAIL_NODE',nodeId:'node-02'}).state;
 assert.ok(reduceInfrastructure(state,{type:'NODE_READY',nodeId:'node-02'}).rejection);
 state=prefix(scenarios[0],'infra-exhaustion-recovery-03');
 state=reduceInfrastructure(state,{type:'SET_STORAGE',ready:false}).state;
 assert.equal(projectInfrastructure(state).clientAvailable,false);
 assert.ok(reduceInfrastructure(state,{type:'WORKLOAD_HEALTHY',generation:2}).rejection);
 assert.equal(state.unsafeOwner,'node-01');
});
test('provision timeout releases slots and rejects late boot',()=>{
 let state=prefix(scenarios[2],'infra-provision-scale-05');
 state=reduceScaling(state,{type:'ADVANCE_CLOCK',ticks:30}).state;
 assert.equal(projectScaling(state).usedSlots,1);
 assert.equal(projectScaling(state).reservedSlots,0);
 assert.ok(reduceScaling(state,{type:'WORKERS_BOOTED',ids:['worker-02','worker-03']}).rejection);
});
test('reservation conflicts and duplicate ids cannot overallocate; release requires stopped replicas',()=>{
 const state=prefix(scenarios[2],'infra-provision-scale-04');
 assert.ok(reduceScaling(state,{type:'RESERVE_WORKERS',ids:['worker-04'],requestId:'req-scale-01'}).rejection);
 assert.ok(reduceScaling(state,{type:'RESERVE_WORKERS',ids:['worker-04','worker-04'],requestId:'new'}).rejection);
 const ready=prefix(scenarios[2],'infra-provision-scale-09');
 assert.ok(applyScaling(ready,{type:'RELEASE_WORKERS',ids:['worker-02']}).rejection);
});
test('repeating running intent preserves the existing healthy singleton',()=>{
 const state=createInfrastructureState(scenarios[0]);
 assert.deepEqual(projectInfrastructure(reduceInfrastructure(state,{type:'SET_DESIRED',value:'running'}).state),projectInfrastructure(state));
});
test('completing one drain does not discard requests belonging to another replica',()=>{
 let state=prefix(scenarios[2],'infra-provision-scale-09');
 state=applyScaling(state,{type:'DRAIN_REPLICAS',ids:['replica-02'],inFlight:2}).state;
 state=applyScaling(state,{type:'DRAIN_REPLICAS',ids:['replica-03'],inFlight:3}).state;
 state=applyScaling(state,{type:'DRAIN_COMPLETE',ids:['replica-02']}).state;
 assert.equal(state.inFlight,3);
 assert.ok(applyScaling(state,{type:'STOP_REPLICAS',ids:['replica-03']}).rejection);
 assert.equal(applyScaling(state,{type:'STOP_REPLICAS',ids:['replica-02']}).state.replicas['replica-02'],'stopped');
});
test('old provisioning request cannot mutate a replacement worker with the same id',()=>{
 let state=createScalingState();
 const ids=['worker-02'];
 for(const command of [{type:'RESERVE_WORKERS',ids,requestId:'old'},{type:'PROVISION_WORKERS',ids},{type:'PROVISION_TIMEOUT',ids},{type:'RESERVE_WORKERS',ids,requestId:'new'}]) state=applyScaling(state,command).state;
 for(const type of ['PROVISION_WORKERS','WORKERS_BOOTED','WORKERS_READY']) {
   const rejected=reduceScaling(state,scalingModule.normalizeScalingCommand(state,{type,ids,requestId:'old'}));
   assert.ok(rejected.rejection,type);
   assert.deepEqual(rejected.state,state);
   state=applyScaling(state,{type,ids,requestId:'new'}).state;
 }
});
test('old replica health cannot confirm a replacement generation on the same worker',()=>{
 let state=prefix(scenarios[2],'infra-provision-scale-09');
 const ids=['replica-02'];
 for(const command of [{type:'DRAIN_REPLICAS',ids},{type:'DRAIN_COMPLETE',ids},{type:'STOP_REPLICAS',ids},{type:'START_REPLICAS',ids,workerIds:['worker-02']}]) state=applyScaling(state,command).state;
 const result=reduceScaling(state,scalingModule.normalizeScalingCommand(state,{type:'REPLICAS_HEALTHY',ids,generation:1}));
 assert.ok(result.rejection);
 assert.equal(result.state.replicas['replica-02'],'starting');
 assert.equal(applyScaling(state,{type:'REPLICAS_HEALTHY',ids,generation:2}).state.replicas['replica-02'],'ready');
});
test('normalization captures identities before scheduling and preserves explicit obsolete identity',()=>{
 assert.equal(typeof scalingModule.normalizeScalingCommand,'function');
 let state=prefix(scenarios[2],'infra-provision-scale-05');
 const ids=['worker-02'];
 const callback=scalingModule.normalizeScalingCommand(state,{type:'WORKERS_BOOTED',ids});
 assert.deepEqual(callback.workerGenerations,{'worker-02':1});
 for(const command of [{type:'PROVISION_TIMEOUT',ids},{type:'RESERVE_WORKERS',ids,requestId:'replacement'},{type:'PROVISION_WORKERS',ids}]) state=applyScaling(state,command).state;
 assert.ok(reduceScaling(state,callback).rejection);
 assert.ok(reduceScaling(state,scalingModule.normalizeScalingCommand(state,callback)).rejection);
 const current=scalingModule.normalizeScalingCommand(state,{type:'WORKERS_BOOTED',ids});
 assert.equal(reduceScaling(state,current).state.workers['worker-02'],'booting');
 let replicas=prefix(scenarios[2],'infra-provision-scale-08');
 const health=scalingModule.normalizeScalingCommand(replicas,{type:'REPLICAS_HEALTHY',ids:['replica-02']});
 assert.deepEqual(health.replicaGenerations,{'replica-02':1});
 assert.equal(reduceScaling(replicas,health).state.replicas['replica-02'],'ready');
});
test('identity-less delayed boot cannot advance a replacement worker',()=>{
 let state=createScalingState();
 const ids=['worker-02'];
 for(const command of [{type:'RESERVE_WORKERS',ids,requestId:'old'},{type:'PROVISION_WORKERS',ids},{type:'PROVISION_TIMEOUT',ids},{type:'RESERVE_WORKERS',ids,requestId:'replacement'},{type:'PROVISION_WORKERS',ids}]) state=reduceScaling(state,scalingModule.normalizeScalingCommand(state,command)).state;
 assert.equal(state.workers['worker-02'],'provisioning');
 const result=reduceScaling(state,{type:'WORKERS_BOOTED',ids});
 assert.equal(result.rejection,'STALE_OPERATION');
 assert.deepEqual(result.state,state);
});
test('node readiness requires the operation identity at the reducer boundary',()=>{
 let state=createInfrastructureState(scenarios[0]);
 state=reduceInfrastructure(state,{type:'FAIL_NODE',nodeId:'node-02'}).state;
 state=reduceInfrastructure(state,{type:'RESTORE_NODE',nodeId:'node-02'}).state;
 const result=reduceInfrastructure(state,{type:'NODE_READY',nodeId:'node-02'});
 assert.equal(result.rejection,'STALE_NODE_READY');
 assert.deepEqual(result.state,state);
});
test('infrastructure normalization captures node identity and preserves a delayed callback',()=>{
 assert.equal(typeof lifecycleEngine.normalizeInfrastructureCommand,'function');
 let state=createInfrastructureState(scenarios[0]);
 state=reduceInfrastructure(state,{type:'FAIL_NODE',nodeId:'node-02'}).state;
 state=reduceInfrastructure(state,{type:'RESTORE_NODE',nodeId:'node-02'}).state;
 const callback=lifecycleEngine.normalizeInfrastructureCommand(state,{type:'NODE_READY',nodeId:'node-02'});
 assert.equal(callback.operationId,state.nodeOperations['node-02']);
 state=reduceInfrastructure(state,callback).state;
 state=reduceInfrastructure(state,{type:'FAIL_NODE',nodeId:'node-02'}).state;
 state=reduceInfrastructure(state,{type:'RESTORE_NODE',nodeId:'node-02'}).state;
 assert.equal(lifecycleEngine.normalizeInfrastructureCommand(state,callback).operationId,callback.operationId);
 assert.equal(reduceInfrastructure(state,callback).rejection,'STALE_NODE_READY');
 const current=lifecycleEngine.normalizeInfrastructureCommand(state,{type:'NODE_READY',nodeId:'node-02'});
 assert.equal(reduceInfrastructure(state,current).state.nodes['node-02'],'ready');
});
