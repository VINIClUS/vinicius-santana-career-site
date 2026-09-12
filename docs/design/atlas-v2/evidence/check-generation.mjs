// rtk node docs/design/atlas-v2/lighting-motion/check-generation.mjs
// Creates one disposable worktree, snapshots the candidate authoring files, and
// records full/partial generation comparisons. It never copies generated pixels
// or metadata back to the candidate. The checkout remains for artifact review.
import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const reportPath = path.join(root, 'docs/design/atlas-v2/lighting-motion/generation.json');
const baselineSha = '773022dee346f9e614b4b227aaf1b38fa721ec1c';
const git = (cwd, ...args) => execFileSync('rtk', ['proxy', 'git', ...args], { cwd, maxBuffer: 20 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { startedAt: new Date().toISOString(), baselineSha, candidateRoot: root, environment: { node: process.version, platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model }, runs: [], sourceOverlay: [], cleanup: 'Disposable checkout retained until comparisons are reviewed.' };
const sourceOverlay = [
  'scripts/assets/generate.mjs', 'scripts/assets/harness.html', 'scripts/assets/scenes.mjs',
  'scripts/assets/atlas-landmarks.mjs', 'scripts/assets/infrastructure-state.mjs',
  'src/content/scenes/atlas-authoring.json', 'src/content/scenes/types.ts', 'src/content/scenes/index.ts',
  'src/features/explorer/scene/atlas-world.mjs', 'src/features/explorer/scene/atlas-terrain.mjs',
];
const detailIds = ['detail-cnesdata', 'detail-infrastructure', 'detail-infrastructure-failed'];
const expectedMetadata = ['district-cnesdata', 'district-limnopulse', 'district-infrastructure', 'hub', 'detail-cnesdata', 'detail-infrastructure', 'overview', 'detail-infrastructure-failed'].sort();
const expectedModels = ['district-cnesdata', 'district-limnopulse', 'district-infrastructure', 'hub', 'detail-cnesdata', 'detail-infrastructure'].map(id => `${id}.glb`).sort();
const expectedPosters = expectedMetadata.flatMap(id => ['desktop', 'mobile'].map(variant => `${id}-${variant}.webp`)).sort();
const baselineInventory = JSON.parse(await readFile(path.join(root, 'docs/design/atlas-v2/baseline/inventory.json'), 'utf8'));
const baselineAssets = Object.fromEntries(baselineInventory.source.map(file => [file.path, file]));
const baselineMetadata = JSON.parse(git(root, 'show', `${baselineSha}:src/content/scenes/generated.json`).toString());
const temporary = await mkdtemp('/tmp/atlas-v2-lighting-motion-generation-');
report.disposableWorktree = temporary;
git(root, 'worktree', 'add', '--detach', temporary, baselineSha);
await symlink(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
for (const file of sourceOverlay) {
  const bytes = await readFile(path.join(root, file));
  await mkdir(path.dirname(path.join(temporary, file)), { recursive: true });
  await writeFile(path.join(temporary, file), bytes);
  report.sourceOverlay.push({ path: file, bytes: bytes.length, sha256: sha(bytes) });
}
await cp(path.join(root, 'public'), path.join(temporary, 'public'), { recursive: true });
const candidateMetadataBytes = await readFile(path.join(root, 'src/content/scenes/generated.json'));
await writeFile(path.join(temporary, 'src/content/scenes/generated.json'), candidateMetadataBytes);
const candidateMetadata = JSON.parse(candidateMetadataBytes.toString());
report.sourceOverlay.push({ path: 'src/content/scenes/generated.json', bytes: candidateMetadataBytes.length, sha256: sha(candidateMetadataBytes) });
const candidateAssets = {};
for (const directory of ['scenes', 'posters']) for (const filename of await readdir(path.join(temporary, 'public/assets', directory))) {
  const file = `public/assets/${directory}/${filename}`, bytes = await readFile(path.join(temporary, file));
  candidateAssets[file] = { bytes, sha256: sha(bytes), size: bytes.length };
}
report.snapshotAt = new Date().toISOString();
report.candidateInventory = Object.entries(candidateAssets).map(([file, value]) => ({ path: file, bytes: value.size, sha256: value.sha256, unchangedFromBaseline: baselineAssets[file]?.sha256 === value.sha256 }));
function differences(before, after, prefix = '') {
  if (isDeepStrictEqual(before, after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [{ path: prefix, before, after }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differences(before[key], after[key], prefix ? `${prefix}.${key}` : key));
}
report.candidateDetailMetadataAgainstBaseline = detailIds.map(id => ({ id, equal: isDeepStrictEqual(candidateMetadata[id], baselineMetadata[id]), differences: differences(baselineMetadata[id], candidateMetadata[id]) }));
async function inventory() {
  const metadata = JSON.parse(await readFile(path.join(temporary, 'src/content/scenes/generated.json'), 'utf8'));
  const models = (await readdir(path.join(temporary, 'public/assets/scenes'))).sort();
  const posters = (await readdir(path.join(temporary, 'public/assets/posters'))).sort();
  const metadataIds = Object.keys(metadata).sort();
  const placements = Object.fromEntries(Object.entries(metadata.overview.layouts).map(([variant, layout]) => [variant, Object.keys(layout.districtPositions).sort()]));
  return { metadataIds, models, posters, placements, exactMetadata: isDeepStrictEqual(metadataIds, expectedMetadata), exactModels: isDeepStrictEqual(models, expectedModels), exactPosters: isDeepStrictEqual(posters, expectedPosters), exactPlacements: Object.values(placements).every(ids => isDeepStrictEqual(ids, ['cnesdata', 'infrastructure', 'limnopulse'])) };
}
async function command(args) {
  const startedAt = new Date().toISOString(), start = performance.now();
  return await new Promise((resolve, reject) => {
    const process = spawn('rtk', args, { cwd: temporary });
    let stdout = '', stderr = '';
    process.stdout.on('data', bytes => { stdout += bytes; });
    process.stderr.on('data', bytes => { stderr += bytes; });
    process.on('error', reject);
    process.on('close', code => resolve({ command: `rtk ${args.join(' ')}`, startedAt, seconds: (performance.now() - start) / 1000, exitCode: code, stdout, stderr }));
  });
}
async function pixelDifference(before, after) {
  const a = await sharp(before).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(after).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!isDeepStrictEqual(a.info, b.info)) return { sameDimensions: false, before: a.info, after: b.info };
  let changedPixels = 0, maxChannelDifference = 0, totalChannelDifference = 0;
  const channelDifferences = [0, 0, 0, 0];
  for (let i = 0; i < a.data.length; i += 4) {
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(a.data[i + channel] - b.data[i + channel]);
      if (delta) { changed = true; channelDifferences[channel]++; }
      totalChannelDifference += delta; maxChannelDifference = Math.max(maxChannelDifference, delta);
    }
    if (changed) changedPixels++;
  }
  return { sameDimensions: true, width: a.info.width, height: a.info.height, changedPixels, totalPixels: a.info.width * a.info.height, changedPixelPercent: changedPixels / (a.info.width * a.info.height) * 100, maxChannelDifference, meanAbsoluteChannelDifference: totalChannelDifference / a.data.length, channelDifferences };
}
try {
  report.initialInventory = await inventory();
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(`Full generation disposable checkout: ${temporary}`);
  const fullRun = await command(['npm', 'run', 'assets:generate']);
  report.runs.push(fullRun);
  if (fullRun.exitCode !== 0) throw new Error(`Full generation exited ${fullRun.exitCode}: ${fullRun.stderr}`);
  report.fullInventory = await inventory();
  const fullMetadata = JSON.parse(await readFile(path.join(temporary, 'src/content/scenes/generated.json'), 'utf8'));
  report.fullMetadataAgainstCandidate = differences(candidateMetadata, fullMetadata);
  report.fullDetailMetadataAgainstBaseline = detailIds.map(id => ({ id, equal: isDeepStrictEqual(fullMetadata[id], baselineMetadata[id]), differences: differences(baselineMetadata[id], fullMetadata[id]) }));
  report.fullAssets = [];
  for (const [file, candidate] of Object.entries(candidateAssets)) {
    const full = await readFile(path.join(temporary, file)), hash = sha(full);
    const entry = { path: file, candidateBytes: candidate.size, fullBytes: full.length, candidateSha256: candidate.sha256, fullSha256: hash, equalToCandidate: candidate.sha256 === hash, baselineSha256: baselineAssets[file]?.sha256, equalToBaseline: baselineAssets[file]?.sha256 === hash };
    if (file.endsWith('.webp') && !entry.equalToCandidate) entry.pixelsAgainstCandidate = await pixelDifference(candidate.bytes, full);
    if (file.includes('/detail-') && file.endsWith('.webp') && !entry.equalToBaseline) entry.pixelsAgainstBaseline = await pixelDifference(git(root, 'show', `${baselineSha}:${file}`), full);
    report.fullAssets.push(entry);
  }
  await cp(path.join(temporary, 'public/assets'), path.join(temporary, 'full-generated-assets'), { recursive: true });
  await writeFile(path.join(temporary, 'full-generated-metadata.json'), JSON.stringify(fullMetadata, null, 2) + '\n');
  // Exercise the existing partial-generation sanitizer with obsolete metadata.
  // All unrequested metadata fields, including both overview layouts and details,
  // must be retained exactly after only hub is regenerated.
  const staleMetadata = structuredClone(fullMetadata);
  for (const id of ['district-public-health', 'district-observability', 'home-globe', 'work-cnesdata']) staleMetadata[id] = { obsolete: true };
  for (const layout of Object.values(staleMetadata.overview.layouts)) {
    layout.districtPositions.observability = [0, 0, 0];
    layout.districtPositions['public-health'] = [0, 0, 0];
  }
  await writeFile(path.join(temporary, 'src/content/scenes/generated.json'), JSON.stringify(staleMetadata, null, 2) + '\n');
  const partialRun = await command(['npm', 'run', 'assets:generate', '--', 'hub']);
  report.runs.push(partialRun);
  if (partialRun.exitCode !== 0) throw new Error(`Partial generation exited ${partialRun.exitCode}: ${partialRun.stderr}`);
  report.partialInventory = await inventory();
  const partialMetadata = JSON.parse(await readFile(path.join(temporary, 'src/content/scenes/generated.json'), 'utf8'));
  report.partialUnrequestedMetadata = Object.keys(fullMetadata).filter(id => id !== 'hub').map(id => ({ id, equal: isDeepStrictEqual(fullMetadata[id], partialMetadata[id]), differences: differences(fullMetadata[id], partialMetadata[id]) }));
  report.partialDetailMetadataAgainstBaseline = detailIds.map(id => ({ id, equal: isDeepStrictEqual(partialMetadata[id], baselineMetadata[id]), differences: differences(baselineMetadata[id], partialMetadata[id]) }));
  report.partialUnrequestedAssets = [];
  for (const file of Object.keys(candidateAssets).filter(file => !/^public\/assets\/(?:scenes\/hub\.glb|posters\/hub-(?:desktop|mobile)\.webp)$/.test(file))) {
    const full = await readFile(path.join(temporary, 'full-generated-assets', path.relative('public/assets', file)));
    const partial = await readFile(path.join(temporary, file));
    const fullSha256 = sha(full), partialSha256 = sha(partial);
    report.partialUnrequestedAssets.push({ path: file, fullBytes: full.length, partialBytes: partial.length, fullSha256, partialSha256, equal: fullSha256 === partialSha256 });
  }
  report.passed = [report.initialInventory, report.fullInventory, report.partialInventory].every(value => value.exactMetadata && value.exactModels && value.exactPosters && value.exactPlacements) && report.candidateDetailMetadataAgainstBaseline.every(value => value.equal) && report.fullAssets.every(value => value.equalToCandidate) && report.fullAssets.filter(value => value.path.includes('/detail-')).every(value => value.equalToBaseline) && report.fullMetadataAgainstCandidate.length === 0 && report.partialUnrequestedMetadata.every(value => value.equal) && report.partialUnrequestedAssets.every(value => value.equal);
  report.interpretation = report.passed ? 'Full generation reproduced candidate assets and metadata exactly; detail assets match baseline and partial generation preserves unrequested metadata and asset bytes.' : 'Differences require explicit review; no regenerated file was copied back to the candidate.';
} catch (error) { report.passed = false; report.failure = error.stack; process.exitCode = 1; console.error(error.stack); }
finally { report.finishedAt = new Date().toISOString(); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); }
console.log(`Generation audit ${report.passed ? 'passed' : 'needs review'}: ${reportPath}`);
console.log(`Retained disposable checkout: ${temporary}`);
