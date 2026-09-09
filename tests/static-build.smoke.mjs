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

async function readBuiltPage(relativePath) {
  await assertFile(relativePath);
  return readFile(fromRoot(relativePath), 'utf8');
}

function assertEditorialShell(html, pageName) {
  assert.match(html, /<header\b/i, `${pageName} must include the global header`);
  assert.match(html, /<nav\b[^>]*aria-label="Primary navigation"/i, `${pageName} must include primary navigation`);
  assert.match(html, /<main\b[^>]*id="main"/i, `${pageName} must include the main landmark`);
  assert.match(html, /<footer\b/i, `${pageName} must include the global footer`);
  assert.doesNotMatch(html, /href="\/explore\/?"/i, `${pageName} must not link to Explore before M2`);
}

const html = await readFile(fromRoot('dist/index.html'), 'utf8');

assert.match(html, /<main\b[^>]*id="main"/i, 'home must render its main content as static HTML');
assert.match(html, /I build data pipelines, APIs and automation/i, 'home must include the hero content in static HTML');

for (const id of ['about', 'experience', 'projects', 'stack', 'contact']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

for (const id of ['case-cnesdata', 'case-aquafarm', 'case-esus-pec-bootstrap', 'case-infra-ansible', 'case-packer-proxmox-templates']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

assert.match(html, /href="\/assets\/vinicius-santana-resume\.pdf"/i, 'home must link to the resume');
assertEditorialShell(html, 'home');

const homeSectionOrder = ['hero-title', 'projects', 'contact', 'about', 'experience', 'stack'].map((marker) => {
  const offset = html.indexOf(`id="${marker}"`);
  assert.notEqual(offset, -1, `home must include #${marker}`);
  return offset;
});
assert.deepEqual(homeSectionOrder, [...homeSectionOrder].sort((left, right) => left - right), 'home must use recruiter-first section order');

const editorialPages = {
  work: await readBuiltPage('dist/work/index.html'),
  about: await readBuiltPage('dist/about/index.html'),
  resume: await readBuiltPage('dist/resume/index.html'),
  privacy: await readBuiltPage('dist/privacy/index.html'),
  notFound: await readBuiltPage('dist/404.html')
};

for (const [pageName, pageHtml] of Object.entries(editorialPages)) {
  assertEditorialShell(pageHtml, pageName);
  assert.match(pageHtml, new RegExp(`<title>[^<]+ — Vinicius Santana<\\/title>`, 'i'), `${pageName} must have a specific title`);
}

assert.match(editorialPages.work, /<a[^>]*aria-current="page"[^>]*>Work<\/a>/i, 'Work navigation must expose the active page');
const workCardOffsets = ['CnesData', 'Limnopulse', 'Infrastructure &amp; Operations'].map((title) => editorialPages.work.indexOf(title));
assert.ok(workCardOffsets.every((offset) => offset >= 0), 'Work must list all three selected case studies');
assert.deepEqual(workCardOffsets, [...workCardOffsets].sort((left, right) => left - right), 'Work must follow collection order');
for (const slug of ['cnesdata', 'limnopulse', 'infrastructure']) {
  assert.match(editorialPages.work, new RegExp(`href="/work/${slug}/"`, 'i'), `Work must link to ${slug}`);
}

assert.match(editorialPages.about, /aria-current="page"[^>]*>About</i, 'About navigation must expose the active page');
assert.match(editorialPages.resume, /aria-current="page"[^>]*>Resume</i, 'Resume navigation must expose the active page');
assert.match(editorialPages.resume, /href="\/assets\/vinicius-santana-resume\.pdf"[^>]*target="_blank"/i, 'Resume must offer an open action');
assert.match(editorialPages.resume, /href="\/assets\/vinicius-santana-resume\.pdf"[^>]*download/i, 'Resume must offer a download action');
assert.match(editorialPages.privacy, /does not use analytics/i, 'Privacy must disclose the absence of analytics');
assert.match(editorialPages.privacy, /does not set[^<]*cookies/i, 'Privacy must disclose the absence of first-party cookies');
assert.match(editorialPages.privacy, /does not include[^<]*form/i, 'Privacy must disclose the absence of forms');
assert.match(editorialPages.privacy, /does not provide[^<]*account/i, 'Privacy must disclose the absence of accounts');
assert.match(editorialPages.notFound, /<meta name="robots" content="noindex,nofollow">/i, '404 must be noindex');
assert.doesNotMatch(html, /id=["']root["']/i, 'home must not include the former React mount point');
assert.doesNotMatch(html, /src\/main\.jsx/i, 'home must not load the former Vite entry point');
assert.doesNotMatch(html, /<astro-island\b/i, 'home must not ship hydrated React islands');

const caseStudies = [
  {
    slug: 'cnesdata',
    title: 'CnesData',
    repositoryUrls: ['https://github.com/VINIClUS/CnesData'],
    evidenceLabels: ['CnesData public repository', 'Architecture documentation'],
    statuses: ['Implemented', 'Planned']
  },
  {
    slug: 'limnopulse',
    title: 'Limnopulse',
    repositoryUrls: ['https://github.com/VINIClUS/limnopulse'],
    evidenceLabels: ['Limnopulse public repository', 'Alert evaluator operations', 'Notification operations'],
    statuses: ['Implemented', 'Documented']
  },
  {
    slug: 'infrastructure',
    title: 'Infrastructure &amp; Operations',
    repositoryUrls: [
      'https://github.com/VINIClUS/infra-ansible',
      'https://github.com/VINIClUS/packer-proxmox-templates',
      'https://github.com/VINIClUS/esus-pec-bootstrap'
    ],
    evidenceLabels: [
      'infra-ansible public repository',
      'packer-proxmox-templates public repository',
      'esus-pec-bootstrap public repository'
    ],
    statuses: ['Implemented', 'Illustrative']
  }
];

for (const caseStudy of caseStudies) {
  const caseHtml = await readFile(fromRoot(`dist/work/${caseStudy.slug}/index.html`), 'utf8');

  assert.match(caseHtml, new RegExp(`<title>${caseStudy.title} — Vinicius Santana<\\/title>`, 'i'));
  assert.match(
    caseHtml,
    new RegExp(`<link rel="canonical" href="https://dev\\.vinisantana\\.com/work/${caseStudy.slug}/">`, 'i')
  );
  assert.match(caseHtml, /<main\b[^>]*id="main"/i, `${caseStudy.slug} must render a semantic main landmark`);
  assertEditorialShell(caseHtml, caseStudy.slug);

  for (const heading of [
    'Problem',
    'Context',
    'Contribution',
    'Architecture',
    'Decisions',
    'Reliability',
    'Outcomes',
    'Limitations',
    'Evidence'
  ]) {
    assert.match(caseHtml, new RegExp(`<h2[^>]*>${heading}<\\/h2>`, 'i'), `${caseStudy.slug} must include ${heading}`);
  }

  for (const status of caseStudy.statuses) {
    assert.match(caseHtml, new RegExp(`>${status}<`, 'i'), `${caseStudy.slug} must render the ${status} status`);
  }

  for (const repositoryUrl of caseStudy.repositoryUrls) {
    assert.match(caseHtml, new RegExp(`href="${repositoryUrl}"`, 'i'), `${caseStudy.slug} must link public evidence`);
  }

  for (const evidenceLabel of caseStudy.evidenceLabels) {
    assert.match(
      caseHtml,
      new RegExp(`aria-label="Open ${evidenceLabel} in a new tab"`, 'i'),
      `${caseStudy.slug} must give each evidence link a distinct accessible name`
    );
  }

  assert.match(caseHtml, /target="_blank"/i, `${caseStudy.slug} must open external evidence separately`);
  assert.match(caseHtml, /rel="noreferrer noopener"/i, `${caseStudy.slug} must protect external links`);
  assert.doesNotMatch(caseHtml, /<astro-island\b/i, `${caseStudy.slug} must not ship hydrated islands`);
}

const [cnesDataHtml, limnopulseHtml, infrastructureHtml] = await Promise.all([
  readFile(fromRoot('dist/work/cnesdata/index.html'), 'utf8'),
  readFile(fromRoot('dist/work/limnopulse/index.html'), 'utf8'),
  readFile(fromRoot('dist/work/infrastructure/index.html'), 'utf8')
]);

assert.doesNotMatch(cnesDataHtml, /BigQuery/i, 'CnesData must omit BigQuery');
assert.match(
  limnopulseHtml,
  /No production sensor fleet or hardware deployment is verified/i,
  'Limnopulse must state the unverified production-hardware boundary'
);
assert.match(
  infrastructureHtml,
  /sanitized, illustrative reference topology/i,
  'Infrastructure must identify its topology as sanitized and illustrative'
);
assert.doesNotMatch(
  infrastructureHtml,
  /infra-ansible-inventory|(?:10|127|172|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}/i,
  'Infrastructure must not expose private repository names or real network addresses'
);

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
    'dist/assets/images/vinicius-hero-desktop.webp',
    'dist/assets/images/vinicius-portrait-mobile.avif',
    'dist/assets/images/vinicius-portrait-mobile.webp',
    'dist/assets/images/vinicius-portrait-mobile.jpg',
    'dist/assets/images/vinicius-about.avif',
    'dist/assets/images/vinicius-about.webp',
    'dist/assets/images/vinicius-about.jpg',
    'dist/assets/images/og-image.jpg'
  ].map(assertFile)
);

console.log('Static build smoke checks passed.');
