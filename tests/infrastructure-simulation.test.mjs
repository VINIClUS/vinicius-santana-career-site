import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialInfraState, transitionInfrastructure } from '../src/features/explorer/simulation/infrastructure.ts';

test('failure is deterministic, immutable, and transfers only node-02 workload to node-01', () => {
  const initial = createInitialInfraState();
  const snapshot = structuredClone(initial);
  assert.deepEqual(initial.nodes, { 'node-01': 'online', 'node-02': 'online', 'node-03': 'online' });
  assert.equal(initial.workloadNodeId, 'node-02');
  assert.equal(initial.sharedLayer, 'available');
  assert.deepEqual(initial.timeline, []);
  const command = { type: 'FAIL_NODE', nodeId: 'node-02' };
  const failed = transitionInfrastructure(initial, command);
  assert.deepEqual(initial, snapshot);
  assert.deepEqual(failed, transitionInfrastructure(createInitialInfraState(), command));
  assert.deepEqual(failed.nodes, { 'node-01': 'online', 'node-02': 'failed', 'node-03': 'online' });
  assert.equal(failed.workloadNodeId, 'node-01');
  assert.equal(failed.sharedLayer, 'available');
  assert.deepEqual(failed.timeline.map(event => event.type), ['node-failed', 'workload-transferred', 'shared-layer-available']);
  assert.strictEqual(transitionInfrastructure(failed, command), failed);
  assert.strictEqual(transitionInfrastructure(initial, { type: 'FAIL_NODE', nodeId: 'node-01' }), initial);
  assert.deepEqual(transitionInfrastructure(failed, { type: 'RESET' }), initial);
});

test('failure renderer moves the workload by semantic ID and preserves healthy materials', async () => {
  const { Box3, Vector3 } = await import('three');
  const { makeScene } = await import('../scripts/assets/scenes.mjs');
  const { applyInfrastructureState } = await import('../scripts/assets/infrastructure-state.mjs');
  const object = makeScene('detail-infrastructure');
  const groups = new Map();
  object.traverse(child => { if (!child.isMesh && child.userData.simulationId) groups.set(child.userData.simulationId, child); });
  const healthy = [];
  groups.get('node-01').traverse(child => { if (child.isMesh) healthy.push([child, child.material, child.material.color.getHex()]); });
  const failedMaterials = [];
  groups.get('node-02').traverse(child => { if (child.isMesh) failedMaterials.push([child, child.material]); });
  const sharedBefore = new Box3().setFromObject(groups.get('shared-layer'));
  const state = transitionInfrastructure(createInitialInfraState(), { type: 'FAIL_NODE', nodeId: 'node-02' });
  const snapshot = structuredClone(state);
  applyInfrastructureState(object, state);
  object.updateMatrixWorld(true);
  const workload = new Box3().setFromObject(groups.get('workload')).getCenter(new Vector3());
  const target = new Box3().setFromObject(groups.get('node-01')).getCenter(new Vector3());
  assert.ok(Math.abs(workload.x - target.x) < 0.001);
  assert.ok(Math.abs(workload.z - target.z) < 0.01);
  assert.ok(workload.y > target.y);
  for (const [mesh, material, color] of healthy) { assert.strictEqual(mesh.material, material); assert.equal(mesh.material.color.getHex(), color); }
  for (const [mesh, material] of failedMaterials) assert.notStrictEqual(mesh.material, material);
  assert.deepEqual(new Box3().setFromObject(groups.get('shared-layer')), sharedBefore);
  assert.deepEqual(state, snapshot);
});
