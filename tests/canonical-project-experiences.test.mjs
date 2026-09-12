import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import yaml from 'js-yaml';

const run = promisify(execFile);
const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const astroBin = path.join(rootPath, 'node_modules', 'astro', 'bin', 'astro.mjs');
const caseStudies = yaml.load(await readFile(new URL('../src/content/case-studies.yaml', import.meta.url), 'utf8'));
const outputDirectory = await mkdtemp(path.join(rootPath, '.canonical-project-experiences-'));

function sectionOrder(html) {
  return [...html.matchAll(/<section id="(overview|system|simulation|engineering|results|evidence)"/g)].map(([, id]) => id);
}

try {
  await run(process.execPath, [astroBin, 'build', '--root', rootPath, '--outDir', outputDirectory], { cwd: rootPath });

  for (const caseStudy of caseStudies) {
    const html = await readFile(path.join(outputDirectory, 'explore', caseStudy.id, 'index.html'), 'utf8');
    assert.equal((html.match(/<[^>]+\bdata-system-view\b/g) ?? []).length, 1, `${caseStudy.id} has exactly one shared System View`);
    assert.deepEqual(
      sectionOrder(html),
      ['overview', 'system', ...(caseStudy.id === 'limnopulse' ? [] : ['simulation']), 'engineering', 'results', 'evidence'],
      `${caseStudy.id} preserves the canonical editorial order`
    );

    for (const text of [
      caseStudy.problem,
      caseStudy.context,
      ...caseStudy.contribution,
      ...caseStudy.decisions,
      ...caseStudy.reliability,
      ...caseStudy.outcomes,
      ...caseStudy.limitations,
      ...caseStudy.evidence.flatMap(item => [item.label, item.description]),
      ...caseStudy.architecture.flatMap(component => [component.title, component.description]),
    ]) assert.ok(html.includes(text), `${caseStudy.id} retains editorial content: ${text}`);

    assert.equal((html.match(/data-component-detail=/g) ?? []).length, caseStudy.architecture.length, `${caseStudy.id} has one detail card per case-study component`);
    assert.doesNotMatch(html, /<(?:canvas|picture)\b|data-infra-poster|detail-(?:cnesdata|infrastructure)[^"']*\.(?:webp|glb)|infrastructure-renderer/i, `${caseStudy.id} has no project poster, canvas, or 3D loader`);
  }
} finally {
  await rm(outputDirectory, { recursive: true, force: true });
}
