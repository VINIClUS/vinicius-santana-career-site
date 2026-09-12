import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

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

function assertEditorialShell(html, pageName, explorer = false) {
  assert.match(html, /<header\b/i, `${pageName} must include the global header`);
  assert.match(html, /<nav\b[^>]*aria-label="Primary navigation"/i, `${pageName} must include primary navigation`);
  assert.match(html, /<main\b[^>]*id="main"/i, `${pageName} must include the main landmark`);
  assert.match(html, /<footer\b/i, `${pageName} must include the global footer`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertMetadata(html, route, origin) {
  const canonicalUrl = new URL(route, origin).href;
  const expectedUrl = escapeRegExp(canonicalUrl);
  const expectedImageUrl = escapeRegExp(new URL('/assets/images/og-image.jpg', origin).href);

  assert.match(html, new RegExp(`<link rel="canonical" href="${expectedUrl}">`, 'i'), `${route} must use the configured origin for its canonical URL`);
  assert.match(html, new RegExp(`<meta property="og:url" content="${expectedUrl}">`, 'i'), `${route} must keep og:url aligned with canonical`);
  assert.match(html, new RegExp(`<meta property="og:image" content="${expectedImageUrl}">`, 'i'), `${route} must use an absolute Open Graph image URL`);
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${expectedImageUrl}">`, 'i'), `${route} must use an absolute Twitter image URL`);

  const structuredDataMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/i);
  assert.ok(structuredDataMatch, `${route} must include Person structured data`);
  const structuredData = JSON.parse(structuredDataMatch[1]);
  assert.equal(structuredData.url, origin, `${route} structured data must use the configured origin`);
  assert.equal(structuredData.image, new URL('/assets/images/og-image.jpg', origin).href, `${route} structured data image must use the configured origin`);
}

const html = await readFile(fromRoot('dist/index.html'), 'utf8');

assert.match(html, /<main\b[^>]*id="main"/i, 'home must render its main content as static HTML');
assert.match(html, /<h1[^>]*>Vinicius\s*<br[^>]*>Santana<\/h1>/i, 'home must lead with identity');
assert.match(html, /Software &amp; Data Engineer/, 'home must show the professional title');
assert.match(html, /reliable systems where software, data and infrastructure meet/, 'home must explain systems positioning');
for (const pillar of ['Data Systems', 'Distributed Infrastructure', 'Backend Engineering', 'Public Health']) assert.ok(html.includes(pillar));
const hero = html.match(/<section[^>]*id="top"[\s\S]*?<\/section>/)[0];
assert.equal((hero.match(/<a /g) || []).length, 2, 'hero must have exactly two primary actions');
assert.match(hero, /href="\/work\/"[^>]*>View selected work/);
assert.match(hero, /href="\/explore\/"[^>]*>Explore systems/);
assert.match(hero, /home-globe-desktop\.webp/);
assert.match(hero, /fetchpriority="high"/);
assert.doesNotMatch(html, /<link[^>]*rel="preload"[^>]*vinicius-(?:hero|portrait)/);
assert.doesNotMatch(html, /<canvas|\.(?:glb|gltf|ktx2)["']/i);

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

const publicCname = await readFile(fromRoot('public/CNAME'));
const origin = `https://${publicCname.toString().trim()}`;
const routePages = new Map([
  ['/', html],
  ['/work/', editorialPages.work],
  ['/about/', editorialPages.about],
  ['/resume/', editorialPages.resume],
  ['/privacy/', editorialPages.privacy],
  ['/404.html', editorialPages.notFound]
]);

for (const [route, pageHtml] of routePages) {
  assertMetadata(pageHtml, route, origin);
}

for (const [pageName, pageHtml] of Object.entries(editorialPages)) {
  assertEditorialShell(pageHtml, pageName);
  assert.match(pageHtml, new RegExp(`<title>[^<]+ — Vinicius Santana<\\/title>`, 'i'), `${pageName} must have a specific title`);
}

assert.match(editorialPages.work, /<a[^>]*aria-current="page"[^>]*>Work<\/a>/i, 'Work navigation must expose the active page');
assert.equal((editorialPages.work.match(/<article class="project-card visual-work-card"/g) || []).length, 4);
assert.match(editorialPages.work, /Health Systems/);
assert.match(editorialPages.work, /href="\/#experience"[^>]*>View experience/);
assert.match(editorialPages.about, /alt="Professional portrait of Vinicius Santana"/);
assert.match(
  editorialPages.about,
  /<img[^>]*src="\/assets\/images\/vinicius-about\.jpg"[^>]*width="900"[^>]*height="1125"/i,
  'About portrait dimensions must match the approved asset set'
);
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

  for (const anchor of ['overview', 'architecture', 'engineering', 'results']) {
    assert.match(caseHtml, new RegExp(`href="#${anchor}"`));
    assert.match(caseHtml, new RegExp(`id="${anchor}"`));
  }
  assert.match(caseHtml, /<picture/);
  assertMetadata(caseHtml, `/work/${caseStudy.slug}/`, origin);

  assert.match(caseHtml, new RegExp(`<title>${caseStudy.title} — Vinicius Santana<\\/title>`, 'i'));
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
    'Public evidence'
  ]) {
    assert.match(caseHtml, new RegExp(`<h[23][^>]*>${heading}<\\/h[23]>`, 'i'), `${caseStudy.slug} must include ${heading}`);
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

assert.match(html, /href="\/work\/"/i, 'home must link to Work');
assert.match(editorialPages.work, /href="\/work\/cnesdata\/"/i, 'Work must link to CnesData');
assert.match(editorialPages.resume, /href="mailto:[^"]+"/i, 'Resume must provide a direct contact link');

const [builtCname, publicResume, builtResume, robots, sitemapIndex, sitemap] = await Promise.all([
  readFile(fromRoot('dist/CNAME')),
  readFile(fromRoot('public/assets/vinicius-santana-resume.pdf')),
  readFile(fromRoot('dist/assets/vinicius-santana-resume.pdf')),
  readFile(fromRoot('dist/robots.txt'), 'utf8'),
  readFile(fromRoot('dist/sitemap-index.xml'), 'utf8'),
  readFile(fromRoot('dist/sitemap-0.xml'), 'utf8')
]);

assert.deepEqual(builtCname, publicCname, 'build must preserve CNAME byte for byte');
assert.deepEqual(builtResume, publicResume, 'build must preserve the resume byte for byte');
assert.equal(createHash('sha256').update(builtResume).digest('hex'), expectedResumeHash);

assert.match(robots, /^User-agent: \*$/m, 'robots.txt must address all crawlers');
assert.match(robots, /^Allow: \/$/m, 'robots.txt must allow the site');
assert.match(robots, new RegExp(`^Sitemap: ${escapeRegExp(new URL('/sitemap-index.xml', origin).href)}$`, 'm'), 'robots.txt must reference the generated sitemap index');
assert.match(sitemapIndex, new RegExp(`<loc>${escapeRegExp(new URL('/sitemap-0.xml', origin).href)}</loc>`), 'sitemap index must reference the generated page sitemap');

const indexableRoutes = ['/explore/', '/explore/cnesdata/', '/explore/limnopulse/', '/explore/infrastructure/', '/', '/about/', '/privacy/', '/resume/', '/work/', '/work/cnesdata/', '/work/infrastructure/', '/work/limnopulse/'];
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
assert.deepEqual(sitemapLocations, indexableRoutes.map((route) => new URL(route, origin).href).sort(), 'sitemap must contain exactly the twelve M1 and explorer indexable routes');
assert.doesNotMatch(sitemap, /\/404(?:\.html|\/)?<\/loc>/i, 'sitemap must exclude the 404 page');

await Promise.all(
  [
    'dist/404.html',
    'dist/favicon.svg',
    'dist/site.webmanifest',
    'dist/robots.txt',
    'dist/sitemap-index.xml',
    'dist/sitemap-0.xml',
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

const overview = await readBuiltPage('dist/explore/index.html');
assertEditorialShell(overview, 'explorer overview', true);
assertMetadata(overview, '/explore/', origin);
assert.match(overview, /Systems Atlas/);
const districtDestinations = {
  cnesdata: '/explore/cnesdata/',
  infrastructure: '/explore/infrastructure/',
  limnopulse: '/explore/limnopulse/',
};
assert.equal([...overview.matchAll(/<article\b[^>]*data-district-detail=/g)].length, 3, 'overview renders exactly three project articles');
for (const [id, href] of Object.entries(districtDestinations)) {
  assert.match(overview, new RegExp(`href="#district-${id}"`));
  const article = overview.match(new RegExp(`<article[^>]*id="district-${id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article, `${id} article is present without JavaScript`);
  assert.match(article, new RegExp(`href="${escapeRegExp(href)}"`));
}
assert.equal([...overview.matchAll(/data-district-link=/g)].length, 3);
for (const [id, href] of [['public-health', '/#experience'], ['observability', '/#stack']]) {
  assert.doesNotMatch(overview, new RegExp(`data-district-(?:link|detail)="${id}"`));
  assert.match(overview, new RegExp(`id="district-${id}"`));
  assert.ok(overview.includes(`href="${href}"`));
}
assert.doesNotMatch(overview, /href="#district-hub"|data-district-(?:link|detail)="hub"/);
assert.doesNotMatch(overview, /<canvas|<astro-island|\.(glb|gltf|ktx2)["']/i);
for (const { slug, title } of caseStudies) {
  assert.match(overview, new RegExp(`href="/explore/${slug}/"`));
  const explorer = await readBuiltPage(`dist/explore/${slug}/index.html`);
  assertEditorialShell(explorer, slug + ' explorer', true);
  assertMetadata(explorer, `/explore/${slug}/`, origin);
  assert.match(explorer, new RegExp(`<h1[^>]*>${title}</h1>`));
  assert.doesNotMatch(explorer, new RegExp(`href="/work/${slug}/"`));
  assert.match(explorer, /Component details/);
  assert.match(explorer, /Relationships/);
  assert.match(explorer, /data-component-link/);
  assert.match(explorer, /data-component-detail/);
  assert.doesNotMatch(explorer, /<canvas|<astro-island|\.(glb|gltf|ktx2)["']/i);
  if (slug === 'cnesdata') {
    for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
      assert.match(explorer, new RegExp(`id="transcript-${id}"`));
    }
    assert.match(explorer, /Synthetic demonstration/);
    assert.match(explorer, /Illustrative/);
    assert.match(explorer, /synthetic-content-A/);
    assert.match(explorer, /data-step[^>]*disabled/);
  } else if (slug === 'infrastructure') {
    assert.match(explorer, /data-infrastructure-simulation/);
    for (const node of ['node-01', 'node-02', 'node-03']) {
      assert.match(explorer, new RegExp(`data-infra-node="${node}"[^>]*>[^<]*online`));
    }
    assert.match(explorer, /data-infra-workload[^>]*>[^<]*node-02/);
    assert.match(explorer, /data-infra-shared[^>]*>[^<]*available/);
    assert.match(explorer, /data-fail-node[^>]*disabled/);
    assert.match(explorer, /data-infra-reset[^>]*disabled/);
    assert.match(explorer, /Scenario transcript/);
    assert.match(explorer, /detail-infrastructure-desktop.webp/);
    assert.match(explorer, /data-infra-announcement[^>]*aria-live="polite"|aria-live="polite"[^>]*data-infra-announcement/);
    assert.doesNotMatch(explorer, /data-step|data-scenario|data-reset/);
  } else {
    assert.doesNotMatch(explorer, /data-step|data-scenario|data-reset/);
  }
}
console.log('Explorer static routes and transcripts passed.');

// SO-09 release: the Observatory is a first-class route, and the supporting
// pages share its technical visual system rather than reverting to the former
// editorial shell. These assertions operate on built HTML, so they protect the
// published contract without coupling the test to source files.
function primaryNavigation(html, pageName) {
  const navigation = html.match(/<nav\b[^>]*aria-label="Primary navigation"[^>]*>[\s\S]*?<\/nav>/i)?.[0];
  assert.ok(navigation, `${pageName} must include a bounded primary navigation region`);
  return navigation;
}

assert.match(primaryNavigation(html, 'home'), /<a[^>]*href="\/explore\/"[^>]*>Explore<\/a>/i, 'primary navigation must expose Explore from Home');
assert.match(primaryNavigation(overview, 'Explore'), /<a[^>]*href="\/explore\/"[^>]*aria-current="page"[^>]*>Explore<\/a>/i, 'Explore navigation must expose the active page');
assert.match(primaryNavigation(editorialPages.resume, 'Resume'), /<a[^>]*href="\/resume\/"[^>]*aria-current="page"[^>]*>Resume<\/a>/i, 'Resume navigation must retain the active page');

for (const [pageName, pageHtml] of Object.entries({ about: editorialPages.about, resume: editorialPages.resume })) {
  assert.match(pageHtml, /<body\b[^>]*class="[^"]*\bobservatory\b[^"]*"/i, `${pageName} must use the shared Systems Observatory theme`);
  assert.match(pageHtml, /<header\b[^>]*class="[^"]*page-hero[^"]*"/i, `${pageName} must retain the shared technical page structure`);
}

const fictionalReferenceMetrics = [
  /5(?:[.,]5)?\s*k\+?\s*municipalit(?:y|ies)/i,
  /100\s*m\+?\s*records/i,
  /99(?:[.,]9)?\s*%\s*data reliability/i,
  /100\s*%\s*uptime/i,
  /(?:<|&lt;)\s*2\s*s\s*failover/i
];
const publishedPages = [
  ['/', html],
  ...Object.entries(editorialPages).map(([pageName, pageHtml]) => [`/${pageName === 'notFound' ? '404.html' : `${pageName}/`}`, pageHtml]),
  ...(await Promise.all(
    ['cnesdata', 'limnopulse', 'infrastructure'].flatMap(async slug => [
      [`/work/${slug}/`, await readBuiltPage(`dist/work/${slug}/index.html`)],
      [`/explore/${slug}/`, await readBuiltPage(`dist/explore/${slug}/index.html`)]
    ])
  )).flat(),
  ['/explore/', overview]
];
for (const [route, pageHtml] of publishedPages) {
  for (const metric of fictionalReferenceMetrics) {
    assert.doesNotMatch(pageHtml, metric, `${route} must not publish unsupported reference metrics`);
  }
}

// SA-02: canonical content must be complete before the legacy route is retired.
const canonicalCnes = await readBuiltPage('dist/explore/cnesdata/index.html');
const cnes = yaml.load(await readFile(fromRoot('src/content/case-studies.yaml'), 'utf8')).find(entry => entry.id === 'cnesdata');
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
for (const id of ['overview', 'architecture', 'engineering', 'simulation', 'results', 'evidence', 'limitations']) {
  assert.match(canonicalCnes, new RegExp(`id="${id}"`), `canonical CnesData preserves #${id}`);
  assert.match(canonicalCnes, new RegExp(`href="#${id}"`), `canonical navigation exposes #${id}`);
}
assert.match(canonicalCnes, /<title>CnesData — Vinicius Santana<\/title>/);
assert.match(canonicalCnes, /System View/);
assert.match(canonicalCnes, /id="architecture-title"/, 'legacy explorer System View fragment remains a target');
for (const text of [cnes.eyebrow, cnes.summary, cnes.problem, cnes.context, ...cnes.contribution, ...cnes.decisions, ...cnes.reliability, ...cnes.outcomes, ...cnes.limitations]) {
  assert.ok(canonicalCnes.includes(escapeHtml(text)), `canonical HTML retains: ${text}`);
}
for (const component of cnes.architecture) {
  const article = canonicalCnes.match(new RegExp(`<article[^>]*id="component-${component.id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article, `${component.id} details are static HTML`);
  assert.ok(article.includes(escapeHtml(component.description)));
  assert.match(article, new RegExp(component.status, 'i'), `${component.id} status stays adjacent`);
}
for (const evidence of cnes.evidence) {
  assert.ok(canonicalCnes.includes(`href="${evidence.url}"`));
  assert.ok(canonicalCnes.includes(escapeHtml(evidence.description)));
  assert.ok(canonicalCnes.includes(`aria-label="Open ${evidence.label} in a new tab"`));
}
assert.match(canonicalCnes, /detail-cnesdata-desktop\.webp/);
assert.match(canonicalCnes, /detail-cnesdata-mobile\.webp/);
assert.equal([...canonicalCnes.matchAll(/id="([^" ]+)"/g)].length, new Set([...canonicalCnes.matchAll(/id="([^" ]+)"/g)].map(match => match[1])).size, 'canonical IDs must be unique');
console.log('Canonical CnesData content equivalence passed.');

const canonicalInfra = await readBuiltPage('dist/explore/infrastructure/index.html');
const infra = yaml.load(await readFile(fromRoot('src/content/case-studies.yaml'), 'utf8')).find(entry => entry.id === 'infrastructure');
for (const id of ['overview', 'architecture', 'architecture-title', 'engineering', 'simulation', 'results', 'evidence', 'limitations', 'infra-title', 'details-title']) {
  assert.equal([...canonicalInfra.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, `unique Infrastructure #${id}`);
}
for (const text of [infra.eyebrow, infra.summary, infra.problem, infra.context, ...infra.contribution, ...infra.decisions, ...infra.reliability, ...infra.outcomes, ...infra.limitations]) {
  assert.ok(canonicalInfra.includes(escapeHtml(text)), `Infrastructure retains: ${text}`);
}
for (const component of infra.architecture) {
  const article = canonicalInfra.match(new RegExp(`<article[^>]*id="component-${component.id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article?.includes(escapeHtml(component.description)));
  assert.match(article, new RegExp(component.status, 'i'));
}
for (const evidence of infra.evidence) {
  assert.ok(canonicalInfra.includes(`href="${evidence.url}"`));
  assert.ok(canonicalInfra.includes(escapeHtml(evidence.description)));
}
assert.equal([...canonicalInfra.matchAll(/id="([^" ]+)"/g)].length, new Set([...canonicalInfra.matchAll(/id="([^" ]+)"/g)].map(match => match[1])).size);
assert.match(canonicalInfra, /data-visual-mode="cluster"/);
assert.ok(canonicalInfra.indexOf('id="simulation"') < canonicalInfra.indexOf('id="engineering"'));
console.log('Canonical Infrastructure content equivalence passed.');

// SA-03: all public facts remain available in the canonical HTML without a runtime.
const canonicalLimno = await readBuiltPage('dist/explore/limnopulse/index.html');
const limno = yaml.load(await readFile(fromRoot('src/content/case-studies.yaml'), 'utf8')).find(entry => entry.id === 'limnopulse');
assert.match(canonicalLimno, /data-visual-mode="telemetry"/);
assert.match(canonicalLimno, /<title>Limnopulse — Vinicius Santana<\/title>/);
for (const id of ['overview', 'architecture', 'engineering', 'results', 'evidence', 'limitations']) {
  assert.ok(canonicalLimno.includes(`id="${id}"`));
  assert.ok(canonicalLimno.includes(`href="#${id}"`));
}
assert.match(canonicalLimno, /id="architecture-title"/);
for (const heading of ['Observations', 'Telemetry', 'Events', 'Problem', 'Context', 'Contribution', 'Decisions', 'Reliability', 'Outcomes', 'Public evidence']) {
  assert.match(canonicalLimno, new RegExp(`<h[234][^>]*>${heading}</h[234]>`));
}
for (const value of [limno.eyebrow, limno.summary, limno.problem, limno.context, ...limno.technologies, ...limno.contribution, ...limno.decisions, ...limno.reliability, ...limno.outcomes, ...limno.limitations]) {
  assert.ok(canonicalLimno.includes(escapeHtml(value)), `canonical Limnopulse retains: ${value}`);
}
assert.equal(limno.architecture.length, 7);
for (const component of limno.architecture) {
  const article = canonicalLimno.match(new RegExp(`<article[^>]*id="component-${component.id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article, `${component.id} details are static HTML`);
  for (const value of [component.title, component.description]) assert.ok(article.includes(escapeHtml(value)));
  assert.match(article, new RegExp(component.status, 'i'), `${component.id} status stays adjacent`);
  assert.ok(canonicalLimno.includes(`data-component-link="${component.id}"`));
}
for (const evidence of limno.evidence) {
  const article = [...canonicalLimno.matchAll(/<article[^>]*class="evidence-card"[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]).find(article => article.includes(`href="${evidence.url}"`));
  assert.ok(article, `${evidence.label} has an evidence card`);
  assert.ok(article.includes(escapeHtml(evidence.description)));
  assert.ok(article.includes(`aria-label="Open ${evidence.label} in a new tab"`));
  assert.match(article, new RegExp(evidence.status, 'i'));
}
assert.match(canonicalLimno, /docs\/architecture.md/);
assert.match(canonicalLimno, /docs\/notifications-phase-3c-b.md/);
const limnoIds = [...canonicalLimno.matchAll(/\bid="([^" ]+)"/g)].map(match => match[1]);
assert.equal(limnoIds.length, new Set(limnoIds).size, 'Limnopulse IDs must be unique');
assert.doesNotMatch(canonicalLimno, /href="\/work\/limnopulse\/"|data-step|data-scenario|data-reset|id="simulation"|<canvas|<astro-island|\.(?:glb|gltf|ktx2)["']/i);
const limnoRelations = [...canonicalLimno.matchAll(/<li[^>]*data-relation-from="([^"]+)"[^>]*data-relation-to="([^"]+)"[^>]*>[\s\S]*?<\/li>/g)];
assert.ok(limnoRelations.length >= 6, 'directional relationships are rendered');
for (const [relation, from, to] of limnoRelations) {
  assert.ok(limno.architecture.some(component => component.id === from));
  assert.ok(limno.architecture.some(component => component.id === to));
  assert.notEqual(from, to);
  assert.match(relation, /<svg[^>]*aria-hidden="true"/);
  assert.match(relation, /visually-hidden[^>]*>to</);
}
console.log('Canonical Limnopulse content and relationship checks passed.');
