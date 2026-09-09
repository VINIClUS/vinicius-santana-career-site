import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const fromRoot = (...segments) => new URL(segments.join('/'), root);
const expectedResumeHash = 'b2cca4eac1313462b8ff44eb0c42a3143e5bd1a3ac02a2d756b1b38bc16b769e';

async function assertFile(relativePath) {
  const details = await stat(fromRoot(relativePath));
  assert.ok(details.isFile(), `${relativePath} must be a file`);
}

const html = await readFile(fromRoot('dist/index.html'), 'utf8');

assert.match(html, /<main\b[^>]*id="main"/i, 'home must render its main content as static HTML');
assert.match(html, /I build data pipelines, APIs and automation/i, 'home must include the hero content in static HTML');

for (const id of ['about', 'experience', 'projects', 'stack', 'contact']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

for (const id of [
  'case-cnesdata',
  'case-esus-pec-bootstrap',
  'case-infra-ansible',
  'case-packer-proxmox-templates',
  'case-aquafarm'
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

assert.match(html, /href="\/assets\/vinicius-santana-resume\.pdf"/i, 'home must link to the resume');
assert.doesNotMatch(html, /id=["']root["']/i, 'home must not include the former React mount point');
assert.doesNotMatch(html, /src\/main\.jsx/i, 'home must not load the former Vite entry point');
assert.doesNotMatch(html, /<astro-island\b/i, 'home must not ship hydrated React islands');

const [publicCname, builtCname, publicResume, builtResume] = await Promise.all([
  readFile(fromRoot('public/CNAME')),
  readFile(fromRoot('dist/CNAME')),
  readFile(fromRoot('public/assets/vinicius-santana-resume.pdf')),
  readFile(fromRoot('dist/assets/vinicius-santana-resume.pdf'))
]);

assert.deepEqual(builtCname, publicCname, 'build must preserve CNAME byte for byte');
assert.equal(builtCname.toString().trim(), 'dev.vinisantana.com');
assert.deepEqual(builtResume, publicResume, 'build must preserve the resume byte for byte');
assert.equal(createHash('sha256').update(builtResume).digest('hex'), expectedResumeHash);

await Promise.all(
  [
    'dist/404.html',
    'dist/favicon.svg',
    'dist/site.webmanifest',
    'dist/robots.txt',
    'dist/sitemap.xml',
    'dist/assets/images/vinicius-hero-desktop.avif',
    'dist/assets/images/vinicius-portrait-mobile.avif',
    'dist/assets/images/vinicius-about.avif',
    'dist/assets/images/og-image.jpg'
  ].map(assertFile)
);

console.log('Static build smoke checks passed.');
