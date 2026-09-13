import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const fromRoot = (...segments) => new URL(segments.join('/'), root);
const expectedResumeHash = 'b2cca4eac1313462b8ff44eb0c42a3143e5bd1a3ac02a2d756b1b38bc16b769e';
const expectedOrigin = 'https://vinisantana.com';
const analyticsMeasurementId = 'G-2DY87DZC90';

async function assertFile(relativePath) {
  const details = await stat(fromRoot(relativePath));
  assert.ok(details.isFile(), `${relativePath} must be a file`);
}

async function readBuiltPage(relativePath) {
  await assertFile(relativePath);
  return readFile(fromRoot(relativePath), 'utf8');
}

async function readBuiltHtmlPages(directory = fromRoot('dist/')) {
  const entries = await readdir(directory, { withFileTypes: true });
  const pages = await Promise.all(
    entries.map(async (entry) => {
      const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) return readBuiltHtmlPages(entryUrl);
      if (!entry.isFile() || !entry.name.endsWith('.html')) return [];
      return [[entryUrl.pathname, await readFile(entryUrl, 'utf8')]];
    })
  );

  return pages.flat();
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

function assertAnalytics(html, pageName) {
  const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${analyticsMeasurementId}`;
  const scriptLoads = html.match(new RegExp(`<script\\b[^>]*\\bsrc="${escapeRegExp(scriptUrl)}"[^>]*>`, 'gi')) ?? [];
  const configurations = html.match(new RegExp(`gtag\\(\\s*['"]config['"]\\s*,\\s*['"]${analyticsMeasurementId}['"]\\s*\\)`, 'g')) ?? [];

  assert.equal(scriptLoads.length, 1, `${pageName} must load the GA4 script exactly once`);
  assert.match(scriptLoads[0], /\basync(?:="")?(?:\s|>)/i, `${pageName} must load the GA4 script asynchronously`);
  assert.equal(configurations.length, 1, `${pageName} must configure the GA4 measurement ID exactly once`);
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

const homeAbout = html.match(/<section[^>]*id="about"[\s\S]*?<\/section>/i)?.[0];
assert.ok(homeAbout, 'home must render the About section');
assert.match(homeAbout, /I build backend systems for data-heavy, operational work\./);
assert.match(
  homeAbout,
  /I’m Vinicius Santana, a Python backend engineer in Brazil\. I build FastAPI and PostgreSQL services, validation workflows and automation for municipal public-health operations—work that validates 21,000\+ records each month and reduced a municipality-wide reconciliation cycle from 240\+ person-hours to about four\./
);
assert.equal((homeAbout.match(/class="role-card"/g) || []).length, 2, 'home About must render exactly two role cards');
assert.doesNotMatch(homeAbout, /Platform \/ DevOps/, 'home About must not render the removed Platform / DevOps card');

const editorialPages = {
  work: await readBuiltPage('dist/work/index.html'),
  about: await readBuiltPage('dist/about/index.html'),
  resume: await readBuiltPage('dist/resume/index.html'),
  privacy: await readBuiltPage('dist/privacy/index.html'),
  notFound: await readBuiltPage('dist/404.html')
};

const publicCname = await readFile(fromRoot('public/CNAME'));
const origin = `https://${publicCname.toString().trim()}`;
assert.equal(publicCname.toString().trim(), 'vinisantana.com', 'CNAME must use the root domain');
assert.equal(origin, expectedOrigin, 'build metadata must use the root domain origin');
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
assert.match(editorialPages.about, /<h1[^>]*>Python backend engineering grounded in operational reality\.<\/h1>/i);
assert.match(
  editorialPages.about,
  /I design and operate data-intensive APIs, validation services and automation for municipal public-health systems\. My work combines FastAPI, SQLAlchemy and PostgreSQL with tenant-aware authorization, automated tests and monitored Linux deployments\./
);
assert.match(editorialPages.about, /Make contracts explicit, protect boundaries and design for recovery\./);
assert.match(
  editorialPages.about,
  /I work from the operational problem backward: define typed contracts and exception paths, protect tenant boundaries, test deterministic rules, and keep deployment, observability, backup and rollback procedures close to the code\. The result is software that teams can inspect, recover and maintain\./
);
assert.match(
  editorialPages.about,
  /<meta name="description" content="About Vinicius Santana, a Python backend engineer building data-intensive APIs, validation services and automation for municipal public-health systems\.">/i
);
assert.equal((editorialPages.about.match(/class="role-card"/g) || []).length, 2, 'About must render exactly two role cards');
assert.doesNotMatch(editorialPages.about, /Platform \/ DevOps/, 'About must not render the removed Platform / DevOps card');

const experiencePages = new Map([
  ['home', html],
  ['about', editorialPages.about]
]);

for (const [pageName, pageHtml] of experiencePages) {
  const experienceArticle = pageHtml.match(/<article class="timeline-card"[\s\S]*?<\/article>/i)?.[0];
  assert.ok(experienceArticle, `${pageName} must render the municipal experience as one article`);
  assert.equal(
    (experienceArticle.match(/Prefeitura de Presidente Epitácio/g) || []).length,
    1,
    `${pageName} must name the organization once within the experience article`
  );
  assert.match(
    experienceArticle,
    /<h3[^>]*>Prefeitura de Presidente Epitácio<\/h3>/i,
    `${pageName} must expose the organization as the article heading`
  );
  assert.match(experienceArticle, /Nov 2021 — Present/, `${pageName} must show the complete employment period`);

  for (const [role, period] of [
    ['Health Informatics Analyst &amp; Data Engineer', 'Oct 2023 — Present'],
    ['IT Infrastructure &amp; Systems Support · Internship', 'Nov 2021 — Oct 2023']
  ]) {
    assert.match(experienceArticle, new RegExp(`<h4[^>]*>${role}<\\/h4>`, 'i'), `${pageName} must expose ${role} as a role heading`);
    assert.match(experienceArticle, new RegExp(escapeRegExp(period)), `${pageName} must show ${period}`);
  }

  const currentRoleOffset = experienceArticle.indexOf('Health Informatics Analyst &amp; Data Engineer');
  const internshipOffset = experienceArticle.indexOf('IT Infrastructure &amp; Systems Support · Internship');
  assert.ok(currentRoleOffset < internshipOffset, `${pageName} must list roles from newest to oldest`);
}

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
assert.match(editorialPages.privacy, /Google Analytics 4/i, 'Privacy must disclose GA4 analytics');
assert.match(editorialPages.privacy, /navigation metrics/i, 'Privacy must disclose navigation metrics');
assert.match(editorialPages.privacy, /identifiers[^<]*cookies/i, 'Privacy must disclose identifiers stored in cookies');
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
    summary: 'A contract-led platform for moving municipal source extracts from edge environments into a tenant-isolated central data layer.',
    technologies: ['Python', 'FastAPI', 'Go', 'PostgreSQL'],
    repositoryUrls: ['https://github.com/VINIClUS/CnesData'],
    evidenceLabels: ['CnesData public repository', 'Architecture documentation'],
    statuses: ['Implemented', 'Planned']
  },
  {
    slug: 'limnopulse',
    title: 'Limnopulse',
    summary: 'An API and evaluation runtime for authorized telemetry reads, alert rules, durable incidents, and notification delivery.',
    technologies: ['Python', 'FastAPI', 'Go', 'DynamoDB'],
    repositoryUrls: ['https://github.com/VINIClUS/limnopulse'],
    evidenceLabels: ['Limnopulse public repository', 'Alert evaluator operations', 'Notification operations'],
    statuses: ['Implemented', 'Documented']
  },
  {
    slug: 'infrastructure',
    title: 'Infrastructure &amp; Operations',
    summary: 'Public infrastructure work that separates reusable automation, image-building, and system runbooks from private runtime configuration.',
    technologies: ['Ansible', 'Packer', 'Proxmox VE', 'Python'],
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
  if (caseStudy.slug === 'cnesdata') {
    assert.doesNotMatch(caseHtml, /<picture|CnesData \/ System view/);
  } else {
    assert.match(caseHtml, /<picture/);
  }
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

const builtHtmlPages = await readBuiltHtmlPages();
assert.ok(builtHtmlPages.length > 0, 'build must generate HTML pages');
for (const [pageName, pageHtml] of builtHtmlPages) assertAnalytics(pageHtml, pageName);

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
assert.match(overview, /Systems Observatory/);
assert.equal([...overview.matchAll(/<article\b[^>]*data-district-detail=/g)].length, 3, 'overview renders the three project panels');
for (const { slug: id, title, summary, technologies } of caseStudies) {
  const href = `/explore/${id}/`;
  assert.match(overview, new RegExp(`href="#district-${id}"`));
  const article = overview.match(new RegExp(`<article[^>]*id="district-${id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article, `${id} article is present without JavaScript`);
  assert.match(article, new RegExp(escapeRegExp(summary)));
  for (const technology of technologies) assert.match(article, new RegExp(`<li>${escapeRegExp(technology)}</li>`));
  assert.match(article, new RegExp(`href="${escapeRegExp(href)}"`));
  assert.match(article, new RegExp(`Explore ${escapeRegExp(title)}`));
}
assert.doesNotMatch(overview, /district-(?:public-health|observability)|data-district-(?:link|detail)="(?:public-health|observability)"/);
assert.doesNotMatch(overview, /<canvas|<astro-island|\.(glb|gltf|ktx2)["']/i);
for (const { slug, title } of caseStudies) {
  assert.match(overview, new RegExp(`href="/explore/${slug}/"`));
  const explorer = await readBuiltPage(`dist/explore/${slug}/index.html`);
  assertEditorialShell(explorer, slug + ' explorer', true);
  assertMetadata(explorer, `/explore/${slug}/`, origin);
  assert.match(explorer, new RegExp(`<h1[^>]*>${title}</h1>`));
  assert.match(explorer, new RegExp(`href="/work/${slug}/"`));
  assert.match(explorer, /Component details/);
  assert.match(explorer, /Relationships/);
  assert.match(explorer, /data-component-diagram/);
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
