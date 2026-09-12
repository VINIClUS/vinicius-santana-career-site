import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Group, Mesh, MeshStandardMaterial, BoxGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeScene } from '../scripts/assets/scenes.mjs';
import { createInfrastructureProjection } from '../src/features/explorer/scene/infrastructure-projection.ts';
import { createModelCache, disposeObjects } from '../src/features/explorer/scene/resources.ts';
import { createInitialInfraState, transitionInfrastructure } from '../src/features/explorer/simulation/infrastructure.ts';

test('runtime projection repeats, resets, and fails again without moving healthy nodes or mutating snapshots', () => {
  const model = makeScene('detail-infrastructure');
  const groups = new Map();
  const originalMaterials = new Map();
  model.traverse(child => {
    if (!child.isMesh && child.userData.simulationId) groups.set(child.userData.simulationId, child);
    if (child.isMesh) originalMaterials.set(child, child.material);
  });
  const workload = groups.get('workload');
  const originalPosition = workload.position.clone();
  const healthy = new Set();
  for (const id of ['node-01', 'node-03', 'shared-layer']) groups.get(id).traverse(child => { if (child.isMesh) healthy.add(child); });
  const initial = createInitialInfraState();
  const failed = transitionInfrastructure(initial, { type: 'FAIL_NODE', nodeId: 'node-02' });
  Object.freeze(initial.nodes); Object.freeze(initial); Object.freeze(failed.nodes); Object.freeze(failed);
  const snapshots = JSON.stringify([initial, failed]);
  const projection = createInfrastructureProjection(model);
  projection.apply(initial);
  assert.deepEqual(workload.position, originalPosition);
  projection.apply(failed);
  const failedPosition = workload.position.clone();
  const failedMaterials = new Map();
  groups.get('node-02').traverse(child => {
    if (!child.isMesh) return;
    assert.notStrictEqual(child.material, originalMaterials.get(child));
    failedMaterials.set(child, child.material);
  });
  const target = new Box3().setFromObject(groups.get('node-01')).getCenter(new Vector3());
  const center = new Box3().setFromObject(workload).getCenter(new Vector3());
  assert.ok(Math.abs(center.x - target.x) < 0.001);
  assert.ok(Math.abs(center.z - target.z) < 0.01);
  assert.ok(center.y > target.y);
  for (let repeat = 0; repeat < 10; repeat++) projection.apply(failed);
  assert.deepEqual(workload.position, failedPosition);
  for (const [mesh, material] of failedMaterials) assert.strictEqual(mesh.material, material);
  for (const mesh of healthy) assert.strictEqual(mesh.material, originalMaterials.get(mesh));
  projection.apply(initial);
  assert.deepEqual(workload.position, originalPosition);
  for (const [mesh, material] of originalMaterials) assert.strictEqual(mesh.material, material);
  projection.apply(failed);
  assert.deepEqual(workload.position, failedPosition);
  for (const [mesh, material] of failedMaterials) assert.strictEqual(mesh.material, material);
  assert.equal(JSON.stringify([initial, failed]), snapshots);
  const disposed = new Map();
  for (const material of new Set(failedMaterials.values())) {
    disposed.set(material, 0);
    material.addEventListener('dispose', () => disposed.set(material, disposed.get(material) + 1));
  }
  projection.dispose(); projection.dispose(); projection.apply(failed);
  assert.deepEqual(workload.position, originalPosition);
  for (const [mesh, material] of originalMaterials) assert.strictEqual(mesh.material, material);
  for (const count of disposed.values()) assert.equal(count, 1);
  disposeObjects([model]);
});

test('projection rejects a model missing its semantic groups', () => {
  assert.throws(() => createInfrastructureProjection(new Group()), /Missing Infrastructure/);
});

test('an asset completing its parse after disposal is released and never returned', async t => {
  const geometry = new BoxGeometry(), material = new MeshStandardMaterial();
  const scene = new Group(); scene.add(new Mesh(geometry, material));
  let geometryDisposals = 0, materialDisposals = 0;
  geometry.addEventListener('dispose', () => geometryDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  let finishParse, markParsing;
  const parsing = new Promise(resolve => { markParsing = resolve; });
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }));
  const previousLocation = globalThis.location;
  globalThis.location = { href: 'https://example.test/explore/infrastructure/' };
  t.after(() => { if (previousLocation === undefined) delete globalThis.location; else globalThis.location = previousLocation; });
  t.mock.method(GLTFLoader.prototype, 'parseAsync', () => {
    markParsing();
    return new Promise(resolve => { finishParse = resolve; });
  });
  const lifetime = new AbortController();
  const cache = createModelCache(lifetime.signal);
  const loading = cache.load('/assets/scenes/detail-infrastructure.glb');
  assert.strictEqual(cache.load('/assets/scenes/detail-infrastructure.glb'), loading);
  await parsing;
  lifetime.abort(); cache.dispose();
  finishParse({ scene, scenes: [scene] });
  await assert.rejects(loading, { name: 'AbortError' });
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
});
