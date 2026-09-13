import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scenarios } from '../src/features/explorer/lifecycle/catalog.ts';
import { loadEngine } from '../src/features/explorer/lifecycle/engine.ts';
import { execute, reconstruct } from '../src/features/explorer/lifecycle/types.ts';
const root = 'docs/design/systems-atlas-lifecycles-v3/scenarios/';
const negatives = JSON.parse(readFileSync(root+'negative-cases.json')).cases;
function subset(actual,expected,path='') {
  for(const [key,value] of Object.entries(expected)) {
    if(value && typeof value==='object' && !Array.isArray(value)) subset(actual[key],value,`${path}.${key}`);
    else assert.deepEqual(actual[key],value,`${path}.${key}`);
  }
}
for(const scenario of scenarios) {
  const fixture=JSON.parse(readFileSync(root+scenario.id+'.json'));
  const adapter=await loadEngine(scenario.id);
  test(`integrated command-only tour: ${scenario.id} (${fixture.checkpoints.length} checkpoints)`,()=>{
    let state=adapter.initialize();
    fixture.checkpoints.forEach((cp,index)=>{
      const result=execute(adapter,state,scenario.checkpoints[index].command);
      assert.equal(result.rejection,undefined,cp.id);state=result.state;
      subset(adapter.project(state),cp.expected,cp.id);
    });
  });
  for(const negative of negatives.filter(n=>n.scenarioId===scenario.id))test(`integrated negative ${negative.id}${negative.id==='LP-N02'?' (erratum: prefix ends at -01)':''}`,()=>{
    const from=negative.id==='LP-N02'?'limnopulse-end-to-end-01':negative.fromCheckpoint;
    let state=reconstruct(adapter,scenario,scenario.checkpoints.findIndex(cp=>cp.id===from));
    for(const command of negative.commands)state=execute(adapter,state,command).state;
    subset(adapter.project(state),negative.expectedSubset,negative.id);
  });
}
test('91 checkpoints, 27 negative cases, two explicit normative corrections',()=>{
  assert.equal(scenarios.reduce((total,s)=>total+s.checkpoints.length,0),91);
  assert.equal(negatives.length,27);
  const command=scenarios.find(s=>s.id==='infra-quorum-recovery').checkpoints[7].command;
  assert.deepEqual(command,{type:'SEQUENCE',commands:[{type:'FAIL_NODE',nodeId:'node-03'},{type:'SET_STORAGE',ready:false}]});
});
