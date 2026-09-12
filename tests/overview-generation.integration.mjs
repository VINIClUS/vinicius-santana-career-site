import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = promisify(execFile);
const overviewModels = ['district-cnesdata', 'district-limnopulse', 'district-infrastructure', 'hub'];

async function snapshot(directory) {
  const assets = {};
  for (const kind of ['scenes', 'posters']) {
    for (const name of await readdir(join(directory, 'public/assets', kind))) {
      assets[`${kind}/${name}`] = await readFile(join(directory, 'public/assets', kind, name));
    }
  }
  const metadata = JSON.parse(await readFile(join(directory, 'src/content/scenes/generated.json'), 'utf8'));
  return { assets, metadata };
}

async function bounds(bytes) {
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  return new Box3().setFromObject(scene);
}

function assertPreserved(before, after, regenerated) {
  assert.deepEqual(Object.keys(after.assets).sort(), Object.keys(before.assets).sort());
  assert.deepEqual(Object.keys(after.metadata).sort(), Object.keys(before.metadata).sort());
  for (const [id, entry] of Object.entries(before.metadata)) {
    if (regenerated.includes(id)) continue;
    assert.deepEqual(after.metadata[id], entry, `${id}: unrequested metadata must survive`);
    for (const asset of [entry.model, ...Object.values(entry.posters)].filter(Boolean)) {
      const path = asset.src.slice('/assets/'.length);
      assert.ok(after.assets[path].equals(before.assets[path]), `${path}: unrequested bytes must survive`);
    }
  }
}

test('overview generation exports current landmark sources before rendering and preserves details', { timeout: 240_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-overview-generation-'));
  async function generate(...ids) {
    const { stdout } = await run(process.execPath, ['--experimental-strip-types', 'scripts/assets/generate.mjs', ...ids], {
      cwd: directory,
      timeout: 90_000,
      killSignal: 'SIGKILL',
      maxBuffer: 2 * 1024 * 1024,
    });
    return [...stdout.matchAll(/^Generated (.+)$/gm)].map(match => match[1]);
  }
  try {
    for (const path of ['package.json', 'scripts/assets', 'src', 'public/assets']) {
      await cp(join(root, path), join(directory, path), { recursive: true });
    }
    await symlink(await realpath(join(root, 'node_modules')), join(directory, 'node_modules'), 'dir');
    const original = await snapshot(directory);
    // Render the baseline with this browser/GPU so committed raster differences
    // cannot make a stale poster appear to reflect the subsequent source edit.
    await generate('overview');
    const before = await snapshot(directory);

    const sourcePath = join(directory, 'scripts/assets/atlas-landmarks.mjs');
    const source = await readFile(sourcePath, 'utf8');
    const marker = 'export function makeAtlasLandmark(id) {\n  const g = root(id);';
    assert.ok(source.includes(marker), 'The temporary edit must reach every overview factory');
    await writeFile(sourcePath, source.replace(marker, `${marker}\n  g.scale.x = 1.5;`));

    const generated = await generate('overview');
    const after = await snapshot(directory);
    for (const id of overviewModels) {
      const path = `scenes/${id}.glb`;
      assert.ok(!after.assets[path].equals(before.assets[path]), `${id}: overview must rebuild stale GLBs from edited source`);
      const oldBounds = await bounds(before.assets[path]);
      const newBounds = await bounds(after.assets[path]);
      for (const edge of ['min', 'max']) {
        assert.ok(Math.abs(newBounds[edge].x - oldBounds[edge].x * 1.5) < 0.001, `${id}: exported geometry must include the source edit`);
        assert.ok(Math.abs(after.metadata[id].model.bounds[edge][0] - newBounds[edge].x) < 0.001, `${id}: metadata must match the reloaded GLB`);
      }
    }
    for (const variant of ['desktop', 'mobile']) {
      const path = `posters/overview-${variant}.webp`;
      assert.ok(!after.assets[path].equals(before.assets[path]), `${variant}: overview must render the updated models`);
    }
    assert.deepEqual(generated, [...overviewModels, 'overview'], 'Dependencies must be exported before overview is rendered');
    assertPreserved(original, after, [...overviewModels, 'overview']);

    // An unrelated partial request still has its original narrow scope, even
    // when repeated; it must not overwrite overview or any detail artifact.
    assert.deepEqual(await generate('hub', 'hub'), ['hub']);
    assertPreserved(after, await snapshot(directory), ['hub']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
