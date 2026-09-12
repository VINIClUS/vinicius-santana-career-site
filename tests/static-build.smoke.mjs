import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
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

function escapeHtmlText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function assertTechnologyList(html, projectTitle, technologies) {
  const list = html.match(
    new RegExp(`<ul(?=[^>]*\\bclass="[^"]*\\btechnology-labels\\b[^"]*")(?=[^>]*\\baria-label="Technologies used in ${escapeRegExp(projectTitle)}")(?=[^>]*\\brole="list")[^>]*>[\\s\\S]*?</ul>`, 'i')
  )?.[0];

  assert.ok(list, `${projectTitle} must expose a specifically labelled technology list`);
  assert.equal((list.match(/<li\b/g) || []).length, technologies.length, `${projectTitle} must render every technology exactly once`);

  const offsets = technologies.map((technology) => {
    const offset = list.indexOf(`>${escapeHtmlText(technology)}</li>`);
    assert.notEqual(offset, -1, `${projectTitle} must render ${technology}`);
    return offset;
  });
  assert.deepEqual(offsets, [...offsets].sort((left, right) => left - right), `${projectTitle} must preserve technology order`);

  return list;
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
assert.equal((hero.match(/<a /g) || []).length, 1, 'hero must have exactly one work discovery action');

assert.match(hero, /href="\/explore\/"[^>]*>Explore my work/);
assert.match(hero, /overview-desktop\.webp/);
assert.match(hero, /overview-mobile\.webp/);
assert.match(hero, /data-home-preview/);
assert.doesNotMatch(html, /home-globe|project-grid|Selected work|Browse all selected work/);
for (const name of ['CnesData', 'LimnoPulse', 'Infrastructure']) assert.ok(hero.includes(name));
assert.match(hero, /fetchpriority="high"/);
assert.doesNotMatch(html, /<link[^>]*rel="preload"[^>]*vinicius-(?:hero|portrait)/);
assert.doesNotMatch(html, /<link[^>]+(?:preload|modulepreload)[^>]+(?:preview\.|renderer\.|\.glb)/i, 'graphics must not preload');

for (const id of ['about', 'experience', 'projects', 'stack', 'contact']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

for (const id of ['case-cnesdata', 'case-aquafarm', 'case-esus-pec-bootstrap', 'case-infra-ansible', 'case-packer-proxmox-templates']) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `home must preserve #${id}`);
}

const contactActions = html.match(/<div class="contact-actions"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
assert.ok(contactActions, 'home must render the contact actions');
const homeActions = [...contactActions.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attributes, label]) => ({
  attributes,
  label: label.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}));
assert.deepEqual(
  homeActions.map(({ label }) => label),
  ['me@vinisantana.com', 'Resume', 'LinkedIn', 'GitHub'],
  'home must present contact and social actions in the recruiter-facing order'
);
assert.match(homeActions[0].attributes, /href="mailto:me@vinisantana\.com\?subject=/i, 'home email must use the exact address');
assert.match(homeActions[1].attributes, /href="\/assets\/vinicius-santana-resume\.pdf"/i, 'home Resume must use the canonical PDF');
assert.match(homeActions[1].attributes, /\bdownload\b/i, 'home Resume must download the PDF');
for (const socialAction of homeActions.slice(2)) {
  assert.match(socialAction.attributes, /target="_blank"/i, `${socialAction.label} must open in a new tab`);
  assert.match(socialAction.attributes, /rel="noopener noreferrer"/i, `${socialAction.label} must protect the opener`);
}

const headerNavigationHtml = html.match(/<nav\b[^>]*aria-label="Primary navigation"[\s\S]*?<\/nav>/i)?.[0];
assert.ok(headerNavigationHtml, 'home must render primary navigation');
assert.doesNotMatch(headerNavigationHtml, />Resume</i, 'header must not expose the removed Resume route');
for (const social of ['LinkedIn', 'GitHub']) {
  assert.match(headerNavigationHtml, new RegExp(`>${social}<`, 'i'), `header must include ${social}`);
}

const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0];
assert.ok(footer, 'home must render a footer');
assert.match(footer, /<a\b[^>]*href="\/assets\/vinicius-santana-resume\.pdf"[^>]*\bdownload\b[^>]*>Resume<\/a>/i, 'footer Resume must download the canonical PDF');
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
  about: await readBuiltPage('dist/about/index.html'),
  privacy: await readBuiltPage('dist/privacy/index.html'),
  notFound: await readBuiltPage('dist/404.html')
};

await assert.rejects(stat(fromRoot('dist/resume/index.html')), { code: 'ENOENT' }, 'build must not emit the removed Resume route');
const builtHtmlFiles = (await readdir(fromRoot('dist'), { recursive: true })).filter(file => file.endsWith('.html'));
const builtHtmlPages = await Promise.all(builtHtmlFiles.map(file => readFile(fromRoot(`dist/${file}`), 'utf8')));
for (const pageHtml of builtHtmlPages) {
  assert.doesNotMatch(pageHtml, /href="\/resume\//i, 'built pages must not link to the removed Resume route');
}

function assertExperienceSection(pageHtml, pageName, headingId) {
  const section = pageHtml.match(new RegExp(`<section[^>]*aria-labelledby="${headingId}"[^>]*>[\\s\\S]*?</section>`))?.[0];
  assert.ok(section, `${pageName} must render its experience section`);
  const articles = section.match(/<article class="timeline-card"[\s\S]*?<\/article>/gi) || [];
  assert.equal(articles.length, 2, `${pageName} must group experience into two organization articles`);

  const municipalArticle = articles[0];
  assert.equal(
    (municipalArticle.match(/Prefeitura de Presidente Epitácio/g) || []).length,
    1,
    `${pageName} must name the municipality once within its article`
  );
  assert.match(municipalArticle, /<h3[^>]*>Prefeitura de Presidente Epitácio<\/h3>/i);
  assert.match(municipalArticle, /Nov 2021 — Present/);

  const municipalRoles = [
    ['Health Informatics Analyst &amp; Data Engineer', 'Oct 2023 — Present'],
    ['IT Infrastructure &amp; Systems Support · Internship', 'Nov 2021 — Oct 2023']
  ];
  for (const [title, period] of municipalRoles) {
    assert.match(
      municipalArticle,
      new RegExp(`<h4[^>]*>${escapeRegExp(title)}<\\/h4>[\\s\\S]*?${escapeRegExp(period)}`, 'i'),
      `${pageName} must associate ${title} with ${period}`
    );
  }

  const municipalRoleOffsets = municipalRoles.map(([title]) => municipalArticle.indexOf(title));
  assert.ok(municipalRoleOffsets.every((offset) => offset >= 0), `${pageName} must render both municipal roles`);
  assert.deepEqual(
    municipalRoleOffsets,
    [...municipalRoleOffsets].sort((left, right) => left - right),
    `${pageName} must render municipal roles in reverse chronological order`
  );
  assert.equal((municipalArticle.match(/<h4/g) || []).length, 2, `${pageName} must expose both municipal roles below the organization heading`);

  const internshipMarkup = municipalArticle.slice(municipalRoleOffsets[1]);
  assert.equal((internshipMarkup.match(/<li>/g) || []).length, 3, `${pageName} internship must expose exactly three highlights`);
  assert.match(internshipMarkup, /Maintained rotating snapshots plus incremental and weekly full backups/);

  assert.match(articles[1], /<h3[^>]*>Irmãos Santana<\/h3>/i);
  assert.match(articles[1], /<h4[^>]*>Business Analyst &amp; Operations Manager<\/h4>/i);

  for (const evidence of ['21,000+', '12%+', 'below 1%', '240+', 'about 4 hours', '10,000+', 'Proxmox/Linux', 'Ceph', '26%', '11%', 'Python', 'MQTT']) {
    assert.ok(section.includes(evidence), `${pageName} experience must include ${evidence}`);
  }
  assert.match(section, /Java and Spring/, `${pageName} must identify Java and Spring as current-role technologies`);
}

assertExperienceSection(html, 'home', 'experience-title');
assertExperienceSection(editorialPages.about, 'about', 'experience-heading');

for (const pageHtml of [html, editorialPages.about]) {
  for (const item of ['Java', 'Spring', 'AWS', 'Redis', 'Platform &amp; Reliability']) assert.ok(pageHtml.includes(item));
  for (const retiredItem of ['Firebird', 'DevOps / Infra', 'Observability']) assert.doesNotMatch(pageHtml, new RegExp(`>${escapeRegExp(retiredItem)}<`));
}

const publicCname = await readFile(fromRoot('public/CNAME'));
const origin = `https://${publicCname.toString().trim()}`;
const routePages = new Map([
  ['/', html],
  ['/about/', editorialPages.about],
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
assert.match(
  editorialPages.about,
  /<img[^>]*src="\/assets\/images\/vinicius-about\.jpg"[^>]*width="900"[^>]*height="1125"/i,
  'About portrait dimensions must match the approved asset set'
);
assert.match(editorialPages.about, /aria-current="page"[^>]*>About</i, 'About navigation must expose the active page');
assert.match(editorialPages.privacy, /does not use analytics/i, 'Privacy must disclose the absence of analytics');
assert.match(editorialPages.privacy, /does not set[^<]*cookies/i, 'Privacy must disclose the absence of first-party cookies');
assert.match(editorialPages.privacy, /does not include[^<]*form/i, 'Privacy must disclose the absence of forms');
assert.match(editorialPages.privacy, /does not provide[^<]*account/i, 'Privacy must disclose the absence of accounts');
assert.match(editorialPages.notFound, /<meta name="robots" content="noindex,nofollow">/i, '404 must be noindex');
assert.doesNotMatch(html, /id=["']root["']/i, 'home must not include the former React mount point');
assert.doesNotMatch(html, /src\/main\.jsx/i, 'home must not load the former Vite entry point');
assert.doesNotMatch(html, /<astro-island\b/i, 'Home preview launcher must not eagerly hydrate the Atlas application');

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
  const caseHtml = await readFile(fromRoot(`dist/explore/${caseStudy.slug}/index.html`), 'utf8');

  for (const anchor of ['overview', 'system', 'engineering', 'results']) {
    assert.match(caseHtml, new RegExp(`href="#${anchor}"`));
    assert.match(caseHtml, new RegExp(`id="${anchor}"`));
  }
  assert.match(caseHtml, /id="system-title"/);
  assert.match(caseHtml, /id="limitations"/);
  assertMetadata(caseHtml, `/explore/${caseStudy.slug}/`, origin);

  assert.match(caseHtml, new RegExp(`<title>${caseStudy.title} — Vinicius Santana<\\/title>`, 'i'));
  assert.match(caseHtml, /<main\b[^>]*id="main"/i, `${caseStudy.slug} must render a semantic main landmark`);
  assertEditorialShell(caseHtml, caseStudy.slug);

  for (const heading of [
    'Problem',
    'Context',
    'Contribution',
    'Decisions',
    'Reliability',
    'Outcomes',
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
  assert.match(caseHtml, /rel="noopener noreferrer"/i, `${caseStudy.slug} must protect external links`);
  assert.doesNotMatch(caseHtml, /<astro-island\b/i, `${caseStudy.slug} must not ship hydrated islands`);
}

const [cnesDataHtml, limnopulseHtml, infrastructureHtml] = await Promise.all([
  readFile(fromRoot('dist/explore/cnesdata/index.html'), 'utf8'),
  readFile(fromRoot('dist/explore/limnopulse/index.html'), 'utf8'),
  readFile(fromRoot('dist/explore/infrastructure/index.html'), 'utf8')
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

assert.match(html, /href="\/explore\/"/i, 'home must link to Work');

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

const indexableRoutes = ['/explore/', '/explore/cnesdata/', '/explore/limnopulse/', '/explore/infrastructure/', '/', '/about/', '/privacy/'];
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
assert.deepEqual(sitemapLocations, indexableRoutes.map((route) => new URL(route, origin).href).sort(), 'sitemap must contain exactly the seven canonical indexable routes');
assert.doesNotMatch(sitemap, /\/resume\//i, 'sitemap must exclude the removed Resume route');
assert.doesNotMatch(sitemap, /\/work(?:\/|<)/i, 'sitemap must exclude compatibility routes');
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
const explorerProjects = yaml.load(await readFile(fromRoot('src/content/case-studies.yaml'), 'utf8'));
const expectedTechnologies = {
  cnesdata: ['Python', 'FastAPI', 'Go', 'PostgreSQL', 'Parquet', 'Docker', 'React'],
  limnopulse: ['Python', 'FastAPI', 'Go', 'DynamoDB', 'InfluxDB', 'SQS', 'OpenTofu'],
  infrastructure: ['Ansible', 'Packer', 'Proxmox VE', 'Python', 'PowerShell', 'Bash', 'Docker'],
};
assert.equal([...overview.matchAll(/<article\b[^>]*data-district-detail=/g)].length, 3, 'overview renders exactly three project articles');
for (const [id, href] of Object.entries(districtDestinations)) {
  assert.match(overview, new RegExp(`href="#district-${id}"`));
  const article = overview.match(new RegExp(`<article[^>]*id="district-${id}"[^>]*>[\\s\\S]*?</article>`))?.[0];
  assert.ok(article, `${id} article is present without JavaScript`);
  assert.match(article, new RegExp(`href="${escapeRegExp(href)}"`));
  const project = explorerProjects.find(entry => entry.id === id);
  assert.deepEqual(project.technologies, expectedTechnologies[id], `${id} technology source must retain the approved stack and order`);
  assert.ok(article.includes(`<h2 id="district-title-${id}">${escapeHtmlText(project.title)}</h2>`), `${id} title comes from the editorial source`);
  assert.ok(article.includes(`<p>${escapeHtmlText(project.summary)}</p>`), `${id} summary comes from the editorial source`);
  const technologyList = article.match(/<ul class="district-technologies" aria-label="Main technologies">[\s\S]*?<\/ul>/)?.[0];
  assert.ok(technologyList, `${project.title} must expose its main technologies`);
  assert.equal((technologyList.match(/<li>/g) || []).length, 4, `${project.title} must render four main technologies`);
  const technologies = project.technologies.slice(0, 4);
  const offsets = technologies.map(technology => {
    const offset = technologyList.indexOf(`>${escapeHtmlText(technology)}</li>`);
    assert.notEqual(offset, -1, `${project.title} must render ${technology}`);
    return offset;
  });
  assert.deepEqual(offsets, [...offsets].sort((left, right) => left - right), `${project.title} must preserve technology order`);
  assert.ok(article.includes(`>Explore ${escapeHtmlText(project.title)}</a>`), `${id} must use the canonical CTA label`);
  const technologyOffset = article.indexOf(technologyList);
  assert.ok(
    (article.slice(0, technologyOffset).match(/<\/p>/g) || []).length === 2
      && technologyOffset < article.indexOf('<a class="button'),
    `${project.title} overview technologies must sit between the description and button`
  );
}
assert.equal([...overview.matchAll(/data-district-link=/g)].length, 3);
assert.doesNotMatch(overview, /district-(?:public-health|observability)|atlas-context/, 'retired districts must be absent without compatibility redirects');
assert.doesNotMatch(overview, /href="#district-hub"|data-district-(?:link|detail)="hub"/);
assert.doesNotMatch(overview, /<canvas|<astro-island|\.(glb|gltf|ktx2)["']/i);
for (const { slug, title } of caseStudies) {
  assert.match(overview, new RegExp(`href="/explore/${slug}/"`));
  const explorer = await readBuiltPage(`dist/explore/${slug}/index.html`);
  assertEditorialShell(explorer, slug + ' explorer', true);
  assertMetadata(explorer, `/explore/${slug}/`, origin);
  assert.match(explorer, new RegExp(`<h1[^>]*>${title}</h1>`));
  const project = explorerProjects.find(entry => entry.id === slug);
  const projectHeader = explorer.match(/<header[^>]*class="case-hero"[^>]*>[\s\S]*?<\/header>/)?.[0];
  const technologyList = assertTechnologyList(projectHeader, title, project.technologies);
  const technologyOffset = projectHeader.indexOf(technologyList);
  assert.ok(
    (projectHeader.slice(0, technologyOffset).match(/<\/p>/g) || []).length === 2
      && technologyOffset < projectHeader.indexOf('<div class="hero-evidence"'),
    `${project.title} technologies must sit between the summary and public evidence`
  );
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
    assert.doesNotMatch(explorer, /<picture|<img/, 'Infrastructure System View remains a semantic, non-visual document');
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

assert.match(primaryNavigation(html, 'home'), /<a[^>]*href="\/explore\/"[^>]*>Work<\/a>/i, 'primary navigation must expose Work from Home');
assert.match(primaryNavigation(overview, 'Explore'), /<a[^>]*href="\/explore\/"[^>]*aria-current="page"[^>]*>Work<\/a>/i, 'Explore navigation must expose the active page');

for (const [pageName, pageHtml] of Object.entries({ about: editorialPages.about })) {
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
for (const id of ['overview', 'system', 'engineering', 'simulation', 'results', 'evidence', 'limitations']) {
  assert.match(canonicalCnes, new RegExp(`id="${id}"`), `canonical CnesData preserves #${id}`);
  assert.match(canonicalCnes, new RegExp(`href="#${id}"`), `canonical navigation exposes #${id}`);
}
assert.match(canonicalCnes, /<title>CnesData — Vinicius Santana<\/title>/);
assert.match(canonicalCnes, /System View/);
assert.match(canonicalCnes, /id="system-title"/, 'canonical System View fragment remains a target');
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
assert.doesNotMatch(canonicalCnes, /<picture|<img/, 'CnesData System View remains a semantic, non-visual document');
assert.equal([...canonicalCnes.matchAll(/id="([^" ]+)"/g)].length, new Set([...canonicalCnes.matchAll(/id="([^" ]+)"/g)].map(match => match[1])).size, 'canonical IDs must be unique');
console.log('Canonical CnesData content equivalence passed.');

const canonicalInfra = await readBuiltPage('dist/explore/infrastructure/index.html');
const infra = yaml.load(await readFile(fromRoot('src/content/case-studies.yaml'), 'utf8')).find(entry => entry.id === 'infrastructure');
for (const id of ['overview', 'system', 'system-title', 'engineering', 'simulation', 'results', 'evidence', 'limitations', 'infra-title', 'details-title']) {
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
for (const id of ['overview', 'system', 'engineering', 'results', 'evidence', 'limitations']) {
  assert.ok(canonicalLimno.includes(`id="${id}"`));
  assert.ok(canonicalLimno.includes(`href="#${id}"`));
}
assert.match(canonicalLimno, /id="system-title"/);
for (const heading of ['System diagram', 'Relationships', 'Component details', 'Problem', 'Context', 'Contribution', 'Decisions', 'Reliability', 'Outcomes', 'Public evidence']) {
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
  assert.match(relation, /class="relationship-direction"/);
  assert.match(relation, /class="relationship-arrow"[^>]*aria-hidden="true"/);
}
console.log('Canonical Limnopulse content and relationship checks passed.');

// SA-06: compatibility documents own no project content or graphics runtime.
const compatibilityRoutes = {
  '/work/': '/explore/',
  '/work/cnesdata/': '/explore/cnesdata/',
  '/work/limnopulse/': '/explore/limnopulse/',
  '/work/infrastructure/': '/explore/infrastructure/'
};
const compatibilityFiles = (await readdir(fromRoot('dist/work'), { recursive: true })).filter(file => file.endsWith('.html')).sort();
assert.deepEqual(compatibilityFiles, ['cnesdata/index.html', 'index.html', 'infrastructure/index.html', 'limnopulse/index.html']);
for (const [source, destination] of Object.entries(compatibilityRoutes)) {
  const page = await readBuiltPage(`dist${source}index.html`);
  assertMetadata(page, destination, origin);
  assert.match(page, /<meta name="robots" content="noindex,nofollow">/);
  assert.match(page, new RegExp(`<a[^>]*href="${destination}"[^>]*data-compatibility-link[^>]*>[^<]+</a>`));
  assert.doesNotMatch(page, /<canvas|<astro-island|<picture|<img|data-explorer|project-grid|id="architecture"/);
  const scripts = [...page.matchAll(/<script type="module"(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1, 'compatibility loads only its redirect module');
  const script = scripts[0][1] ? await readFile(fromRoot(`dist${scripts[0][1]}`), 'utf8') : scripts[0][2];
  assert.match(script, /location\.replace\(/);
  assert.doesNotMatch(script, /import\s*\(|WebGL|renderer|\.glb/);
}
for (const route of indexableRoutes) {
  const page = await readBuiltPage(`dist${route}index.html`);
  assert.doesNotMatch(page, /href="\/work(?:\/|["?#])/i, `${route} must not link alternate Work pages`);
  const nav = page.match(/<nav[^>]*aria-label="Primary navigation"[\s\S]*?<\/nav>/)[0];
  assert.equal([...nav.matchAll(/href="\/explore\/"/g)].length, 1);
  assert.match(nav, /href="\/explore\/"[^>]*>Work<\/a>/);
  assert.doesNotMatch(nav, />Explore<\/a>/);
  if (route.startsWith('/explore/')) assert.match(nav, /href="\/explore\/"[^>]*aria-current="page"[^>]*>Work<\/a>/);
}
console.log('SA-06 compatibility, canonical navigation and sitemap contracts passed.');
