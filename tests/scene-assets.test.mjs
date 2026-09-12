import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { Box3, Group, OrthographicCamera, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { allPosters, details, districtIds, districts, sceneAssets, overview } from '../src/content/scenes/index.ts';
import { projectDefinitions, projectIds } from '../src/features/explorer/projects.ts';
import { makeScene, normalizeGeneratedMetadata } from '../scripts/assets/scenes.mjs';
import visual from '../src/content/scenes/atlas-authoring.json' with { type: 'json' };
import { applyAtlasCamera, createAtlasWorld } from '../src/features/explorer/scene/atlas-world.mjs';
import { projectToPoster } from '../src/features/explorer/observatory-projection.ts';
import { disposeObjects } from '../src/features/explorer/scene/resources.ts';

const publicRoot = new URL('../public/', import.meta.url);
const assetFile = src => {
  assert.match(src, /^\/assets\/(posters|scenes)\/[a-z0-9-]+\.(webp|glb)$/);
  return new URL(src.slice(1), publicRoot);
};
function webpSize(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset < bytes.length; ) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const start = offset + 8;
    if (type === 'VP8X') return [bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1];
    if (type === 'VP8 ') return [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
    if (type === 'VP8L') {
      const bits = bytes.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    const length = bytes.readUInt32LE(offset + 4);
    offset = start + length + (length % 2);
  }
  throw new Error('WebP dimensions not found');
}

test('scene contract covers the three routable projects and preserves system detail artwork', () => {
  assert.deepEqual(projectIds, ['cnesdata', 'limnopulse', 'infrastructure']);
  assert.deepEqual([...districtIds], projectIds);
  assert.deepEqual(Object.keys(districts).sort(), [...districtIds].sort());
  assert.deepEqual(Object.keys(overview.placements).sort(), [...districtIds].sort());
  assert.deepEqual(Object.keys(details).sort(), ['cnesdata', 'infrastructure']);
  assert.equal(sceneAssets.length, 6);
  assert.equal(new Set(sceneAssets.map(asset => asset.id)).size, sceneAssets.length);
  assert.equal(new Set(sceneAssets.map(asset => asset.model.src)).size, sceneAssets.length);
  for (const vector of [...Object.values(overview.placements), overview.hubPosition, overview.camera.position, overview.camera.target, overview.camera.up]) assert.ok(vector.length === 3 && vector.every(Number.isFinite));
  assert.ok(Number.isFinite(overview.districtScale) && overview.districtScale > 0);
  for (const camera of Object.values(overview.cameras)) {
    assert.equal(camera.projection, 'orthographic');
    assert.ok(Object.values(camera.frustum).every(Number.isFinite));
    assert.ok(camera.frustum.right > camera.frustum.left && camera.frustum.top > camera.frustum.bottom);
    assert.ok(camera.frustum.far > camera.frustum.near && camera.zoom > 0);
  }
  for (const [variant, layout] of Object.entries(overview.layouts)) {
    assert.deepEqual(Object.keys(layout.placements).sort(), [...districtIds].sort());
    for (const position of [...Object.values(layout.placements), layout.hubPosition]) assert.ok(position.length === 3 && position.every(Number.isFinite));
    assert.ok(Number.isFinite(layout.districtScale) && layout.districtScale > 0);
    assert.deepEqual(layout.camera, overview.cameras[variant]);
  }
  assert.notDeepEqual(overview.layouts.mobile.placements, overview.layouts.desktop.placements, 'Portrait layout must compose its districts for the narrow frame');
  const desktopXs = Object.values(overview.layouts.desktop.placements).map(position => position[0]);
  const desktopZs = Object.values(overview.layouts.desktop.placements).map(position => position[2]);
  assert.ok(Math.max(...desktopXs) - Math.min(...desktopXs) > Math.max(...desktopZs) - Math.min(...desktopZs), 'Desktop triangle should use the wide frame');
  const projectedHorizontal = position => position[0] - position[2];
  const projectedVertical = position => position[0] + position[2];
  const mobile = overview.layouts.mobile.placements;
  assert.ok(projectedVertical(mobile.cnesdata) < projectedVertical(mobile.infrastructure));
  assert.ok(projectedVertical(mobile.cnesdata) < projectedVertical(mobile.limnopulse));
  assert.ok(projectedHorizontal(mobile.infrastructure) < projectedHorizontal(overview.layouts.mobile.hubPosition));
  assert.ok(projectedHorizontal(mobile.limnopulse) > projectedHorizontal(overview.layouts.mobile.hubPosition));
  assert.deepEqual(overview.placements, overview.layouts.desktop.placements);
});

test('partial generation retains supported detail metadata and purges obsolete districts', async () => {
  const metadata = JSON.parse(await readFile(new URL('../src/content/scenes/generated.json', import.meta.url), 'utf8'));
  assert.ok(metadata['detail-cnesdata']);
  assert.ok(metadata['detail-infrastructure']);
  assert.equal(metadata['district-public-health'], undefined);
  assert.equal(metadata['district-observability'], undefined);
});

test('partial generation sanitizer removes obsolete metadata and placements', () => {
  const stalePositions = {
    cnesdata: [-5, 0, -6],
    'public-health': [5, 0, -6],
    infrastructure: [-7, 0, 4],
    observability: [0, 0, 7],
    limnopulse: [7, 0, 4],
  };
  const metadata = normalizeGeneratedMetadata({
      overview: {
        districtPositions: stalePositions,
        layouts: {
          desktop: { districtPositions: stalePositions },
          mobile: { districtPositions: stalePositions },
        },
      },
      'detail-cnesdata': { retained: true },
      'district-public-health': { obsolete: true },
  });
  assert.ok(metadata['detail-cnesdata']);
  assert.equal(metadata['district-public-health'], undefined);
  assert.deepEqual(Object.keys(metadata.overview.districtPositions), projectIds);
  for (const layout of Object.values(metadata.overview.layouts)) {
    assert.deepEqual(Object.keys(layout.districtPositions), projectIds);
  }
});

test('scene authoring rejects unknown and retired district identities', () => {
  for (const id of ['district-public-health', 'district-observability', 'unknown', '__proto__']) {
    assert.throws(() => makeScene(id), /Unknown scene/);
  }
});

test('the cartographic origin is low, decorative and has no project identity', () => {
  const origin = makeScene('hub');
  assert.ok(new Box3().setFromObject(origin).max.y <= 0.3, 'Origin must not read as a fourth landmark');
  origin.traverse(object => {
    assert.equal(object.userData.districtId, undefined);
    assert.equal(object.userData.componentId, undefined);
    assert.equal(object.userData.simulationId, undefined);
  });
});

test('label anchors include placement rotation, scale and translation', () => {
  const authored = structuredClone(visual);
  authored.regions.cnesdata.labelAnchor = [1, 2, 3];
  const models = Object.fromEntries([...districtIds, 'hub'].map(id => [id, new Group()]));
  const composition = createAtlasWorld({ models, visual: authored });
  const layout = structuredClone(overview.layouts.desktop);
  layout.placements.cnesdata = [10, 20, 30];
  layout.rotations.cnesdata = [0, Math.PI / 2, 0];
  layout.districtScale = 2;
  composition.applyLayout(layout);
  const actual = composition.labelPosition('cnesdata', new Vector3()).toArray();
  // Local [1,2,3] -> scale [2,4,6] -> yaw [6,4,-2] -> translation.
  actual.forEach((value, axis) => assert.ok(Math.abs(value - [16, 24, 28][axis]) < 1e-10));
  disposeObjects([composition.world]);
});

test('exported overview GLBs reproduce the generated HTML anchors in both layouts', async () => {
  const models = Object.fromEntries(await Promise.all([...districtIds, 'hub'].map(async id => {
    const bytes = await readFile(new URL(`assets/scenes/${id === 'hub' ? id : `district-${id}`}.glb`, publicRoot));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    return [id, gltf.scene];
  })));
  const composition = createAtlasWorld({ models, visual });
  const camera = new OrthographicCamera();
  for (const layout of Object.values(overview.layouts)) {
    composition.applyLayout(layout);
    applyAtlasCamera(camera, layout.camera);
    for (const id of districtIds) {
      const runtime = composition.labelPosition(id, new Vector3()).project(camera);
      const html = projectToPoster(layout.labelPositions[id], layout.camera);
      assert.ok(Math.abs((runtime.x + 1) * 50 - html.x) < 0.01, `${id}: horizontal parity`);
      assert.ok(Math.abs((1 - runtime.y) * 50 - html.y) < 0.01, `${id}: vertical parity`);
      assert.ok(html.x > 15 && html.x < 90 && html.y > 5 && html.y < 90, `${id}: label reserved inside useful frame`);
    }
  }
  // Returning to a prior breakpoint reuses its environment; both remain owned for teardown.
  const resources = new Set();
  composition.world.traverse(object => { if (object.geometry) resources.add(object.geometry); });
  composition.applyLayout(overview.layouts.desktop);
  composition.world.traverse(object => { if (object.geometry) assert.ok(resources.has(object.geometry)); });
  const releases = new Map([...resources].map(resource => [resource, 0]));
  for (const resource of resources) resource.addEventListener('dispose', () => releases.set(resource, releases.get(resource) + 1));
  disposeObjects([composition.world, ...Object.values(models)]);
  assert.ok([...releases.values()].every(count => count === 1), 'Each cached geometry releases exactly once');
});

test('asset generator rejects obsolete and unknown scene IDs before launching Chromium', () => {
  for (const id of ['district-public-health', 'district-observability', 'district-unknown']) {
    const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/assets/generate.mjs', id], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
    assert.notEqual(result.status, 0, id);
    assert.match(result.stderr, new RegExp(`Unknown scene ${id}`));
  }
});

test('every responsive fallback exists with its declared dimensions and alternative text', async () => {
  const images = allPosters.flatMap(poster => [poster.desktop, poster.mobile]);
  assert.equal(images.length, 16);
  assert.equal(new Set(images.map(image => image.src)).size, images.length);
  assert.deepEqual((await readdir(new URL('assets/posters/', publicRoot))).sort(), images.map(image => image.src.split('/').at(-1)).sort());
  for (const image of images) {
    assert.ok(image.alt.trim().length > 20, image.src);
    const bytes = await readFile(assetFile(image.src));
    assert.deepEqual(webpSize(bytes), [image.width, image.height], image.src);
  }
});

for (const asset of sceneAssets) test(`${asset.id}: self-contained GLB loads with finite geometry, bounds, and identifiers`, async () => {
  const bytes = await readFile(assetFile(asset.model.src));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const jsonLength = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  for (const resource of [...(json.buffers ?? []), ...(json.images ?? [])]) assert.ok(!resource.uri || resource.uri.startsWith('data:'), 'No external dependencies');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  let meshes = 0;
  const componentIds = new Set();
  const simulationIds = new Set();
  const expectedDistrict = asset.id.startsWith('district-') ? asset.id.slice(9) : asset.id.startsWith('detail-') ? asset.id.slice(7) : undefined;
  let foundDistrict = false;
  gltf.scene.traverse(object => {
    assert.ok(object.matrix.elements.every(Number.isFinite), `${asset.id}: finite local transform`);
    if (object.userData.districtId) {
      assert.ok(districtIds.includes(object.userData.districtId));
      if (expectedDistrict) assert.equal(object.userData.districtId, expectedDistrict);
      foundDistrict = true;
    }
    if (object.userData.componentId) {
      const project = projectDefinitions[expectedDistrict];
      assert.ok(project?.componentIds.includes(object.userData.componentId), `${asset.id}: invalid component ${object.userData.componentId}`);
      // Semantic groups own identifiers; repeated child meshes may inherit them.
      if (!object.isMesh) {
        if (asset.id === 'detail-cnesdata') assert.ok(!componentIds.has(object.userData.componentId), 'Unique architectural group ID');
        componentIds.add(object.userData.componentId);
        if (asset.id === 'detail-cnesdata' && ['parquet-to-gold', 'kubernetes'].includes(object.userData.componentId)) assert.equal(object.userData.status, 'planned');
      }
    }
    if (object.userData.simulationId && !object.isMesh) {
      assert.ok(!simulationIds.has(object.userData.simulationId), 'Unique simulation group ID');
      simulationIds.add(object.userData.simulationId);
    }
    if (!object.isMesh) return;
    meshes++;
    const positions = object.geometry.getAttribute('position');
    assert.ok(positions?.count >= 3);
    assert.ok(Array.from(positions.array).every(Number.isFinite));
  });
  assert.ok(meshes > 0);
  if (expectedDistrict) assert.ok(foundDistrict, 'District ID must survive export in extras');
  const bounds = new Box3().setFromObject(gltf.scene);
  for (const key of ['min', 'max']) {
    const actual = bounds[key].toArray();
    assert.ok(actual.every(Number.isFinite));
    actual.forEach((value, index) => assert.ok(Math.abs(value - asset.model.bounds[key][index]) < 0.001, `${asset.id}: bounds ${key}`));
  }
  assert.ok(!bounds.isEmpty());
  assert.ok(Object.keys(asset.model.anchors).length > 0);
  assert.deepEqual(asset.model.anchors.base, [0, 0, 0]);
  for (const anchor of Object.values(asset.model.anchors)) assert.ok(anchor.length === 3 && anchor.every(Number.isFinite));
  if (asset.id === 'detail-cnesdata') assert.deepEqual([...componentIds].sort(), [...projectDefinitions.cnesdata.componentIds].sort());
  if (asset.id === 'detail-infrastructure') {
    assert.deepEqual([...simulationIds].sort(), ['node-01', 'node-02', 'node-03', 'shared-layer', 'workload']);
    const workload = asset.model.anchors.workload;
    const initialNode = asset.model.anchors['node-02'];
    assert.equal(workload[0], initialNode[0], 'Initial workload starts on node-02');
    // Rack front details shift its bounds centre slightly in Z.
    assert.ok(Math.abs(workload[2] - initialNode[2]) < 0.01);
    assert.ok(workload[1] > initialNode[1]);
  }
});

test('built output publishes every referenced asset byte-for-byte when requested', { skip: process.env.VERIFY_BUILT_ASSETS !== '1' }, async () => {
  const paths = [...allPosters.flatMap(poster => [poster.desktop.src, poster.mobile.src]), ...sceneAssets.map(asset => asset.model.src)];
  assert.deepEqual((await readdir(new URL('../dist/assets/posters/', import.meta.url))).sort(), allPosters.flatMap(poster => [poster.desktop.src, poster.mobile.src]).map(src => src.split('/').at(-1)).sort());
  for (const src of paths) {
    const built = await readFile(new URL(`../dist${src}`, import.meta.url));
    assert.deepEqual(built, await readFile(assetFile(src)), src);
  }
});
