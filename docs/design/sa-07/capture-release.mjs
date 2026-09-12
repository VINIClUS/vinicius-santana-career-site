// Run against a built preview or production: node docs/design/sa-07/capture-release.mjs URL OUTPUT_DIR [BASELINE_SHA]
// Set ALLOW_RENDERER_FALLBACK=1 only when an explicitly recorded 2D capture is acceptable.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4321/');
const output = path.resolve(process.argv[3] ?? path.join(root, 'docs/design/sa-07/capture'));
const baseline = process.argv[4] ?? 'c686a47';
const allowFallback = process.env.ALLOW_RENDERER_FALLBACK === '1';
const canonicalRoutes = ['/', '/explore/', '/explore/cnesdata/', '/explore/limnopulse/', '/explore/infrastructure/', '/about/', '/resume/', '/privacy/'];
const compatibility = { '/work/': '/explore/', '/work/cnesdata/': '/explore/cnesdata/', '/work/limnopulse/': '/explore/limnopulse/', '/work/infrastructure/': '/explore/infrastructure/' };
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const baselineFile = file => execFileSync('rtk', ['proxy', 'git', 'show', `${baseline}:${file}`], { cwd: root, maxBuffer: 20 * 1024 * 1024 });
const origin = `https://${baselineFile('public/CNAME').toString().trim()}`;
const report = { startedAt: new Date().toISOString(), baseUrl: base.href, baseline, allowFallback, metadata: [], links: [], hashes: [], captures: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
report.chromium = browser.version();
const staticContext = await browser.newContext({ javaScriptEnabled: false });
const parser = await staticContext.newPage();
const documents = new Map();
const fetchBody = async route => {
  const response = await staticContext.request.get(new URL(route, base).href);
  assert.equal(response.status(), 200, `${route}: HTTP ${response.status()}`);
  return response.body();
};
async function documentFor(route) {
  if (documents.has(route)) return documents.get(route);
  const html = (await fetchBody(route)).toString();
  const doc = await parser.evaluate(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const attr = (selector, name) => doc.querySelector(selector)?.getAttribute(name);
    return {
      title: doc.title, canonical: attr('link[rel="canonical"]', 'href'),
      ogUrl: attr('meta[property="og:url"]', 'content'),
      ogImage: attr('meta[property="og:image"]', 'content'),
      twitterImage: attr('meta[name="twitter:image"]', 'content'),
      robots: attr('meta[name="robots"]', 'content'),
      structuredData: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)),
      ids: [...doc.querySelectorAll('[id]')].map(node => node.id),
      links: [...doc.querySelectorAll('a[href]')].map(node => node.getAttribute('href')),
      main: Boolean(doc.querySelector('main#main')), h1: doc.querySelector('h1')?.textContent.trim(),
      compatibilityLink: attr('[data-compatibility-link]', 'href'),
      graphics: doc.querySelectorAll('canvas, astro-island, picture, img, [data-explorer]').length,
      text: doc.body.textContent,
    };
  }, html);
  documents.set(route, doc);
  return doc;
}
try {
  for (const route of [...canonicalRoutes, ...Object.keys(compatibility)]) {
    const doc = await documentFor(route);
    const expectedCanonical = new URL(compatibility[route] ?? route, origin).href;
    assert.equal(doc.canonical, expectedCanonical, `${route}: canonical`);
    assert.equal(doc.ogUrl, expectedCanonical, `${route}: Open Graph URL`);
    for (const image of [doc.ogImage, doc.twitterImage]) assert.equal(image, new URL('/assets/images/og-image.jpg', origin).href);
    assert.ok(doc.title && doc.main && doc.h1, `${route}: static title, main and heading`);
    assert.equal(doc.ids.length, new Set(doc.ids).size, `${route}: unique HTML IDs`);
    assert.ok(doc.structuredData.some(value => value.url === origin), `${route}: public structured data`);
    assert.doesNotMatch(doc.text, /infra-ansible-inventory|\b(?:10|127|192)\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, `${route}: private identifiers`);
    if (compatibility[route]) {
      assert.equal(doc.robots, 'noindex,nofollow');
      assert.equal(doc.compatibilityLink, compatibility[route]);
      assert.equal(doc.graphics, 0, `${route}: compatibility page owns no graphics`);
    } else {
      assert.ok(!doc.links.some(href => /^\/work(?:\/|$)/.test(href)), `${route}: canonical links only`);
    }
    report.metadata.push({ route, canonical: doc.canonical, title: doc.title, main: doc.main, h1: doc.h1, uniqueIds: doc.ids.length });
  }
  const sitemap = (await fetchBody('/sitemap-0.xml')).toString();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort();
  assert.deepEqual(urls, canonicalRoutes.map(route => new URL(route, origin).href).sort());
  report.sitemap = urls;
  const checked = new Set();
  for (const [route, doc] of [...documents]) {
    for (const href of doc.links) {
      const url = new URL(href, new URL(route, base));
      if (![base.origin, origin].includes(url.origin)) continue;
      const key = `${url.pathname}${url.search}${url.hash}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (url.pathname.endsWith('/') || url.pathname.endsWith('.html')) {
        const destination = await documentFor(url.pathname);
        if (url.hash) assert.ok(destination.ids.includes(decodeURIComponent(url.hash.slice(1))), `${route}: target ${key}`);
      } else await fetchBody(url.pathname + url.search);
      report.links.push(key);
    }
  }
  for (const file of ['CNAME', 'assets/vinicius-santana-resume.pdf']) {
    const expected = sha256(baselineFile(`public/${file}`));
    const response = await staticContext.request.get(new URL(`/${file}`, base).href);
    const localCnameFallback = file === 'CNAME' && response.status() === 404 && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
    assert.ok(response.status() === 200 || localCnameFallback, `${file}: HTTP ${response.status()}`);
    const actual = sha256(localCnameFallback ? await readFile(path.join(root, 'dist', file)) : await response.body());
    assert.equal(actual, expected, `${file}: byte identity with ${baseline}`);
    report.hashes.push({ file, baselineSha256: expected, verifiedSha256: actual, source: localCnameFallback ? 'local dist/CNAME (Astro preview does not serve extensionless CNAME)' : 'HTTP response body', httpStatus: response.status() });
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const route of canonicalRoutes.slice(0, 5)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(new URL(route, base).href, { waitUntil: 'load', timeout: 60_000 });
      assert.equal(response.status(), 200);
      const rendererSelector = '[data-home-preview], [data-observatory], [data-infra-visual]';
      const renderer = page.locator(rendererSelector).first();
      let rendererReady = null;
      if (await renderer.count()) {
        const visual = page.locator('[data-home-preview], .observatory-map, [data-infra-visual]').first();
        await visual.scrollIntoViewIfNeeded();
        rendererReady = await page.waitForFunction(selector => {
          const element = document.querySelector(selector);
          return element?.dataset.previewState === 'ready' || element?.dataset.sceneState === 'ready';
        }, rendererSelector, { timeout: 17_000 }).then(() => true, () => false);
      }
      // Load every lazy image before a full-page screenshot; a successful HTTP response alone is insufficient.
      await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0), null, { timeout: 15_000 });
      const images = await page.locator('img').evaluateAll(images => images.map(image => ({ src: image.currentSrc, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: innerWidth }));
      assert.ok(overflow.scrollWidth <= overflow.innerWidth, `${route} at ${viewport.width}: no horizontal overflow`);
      await page.evaluate(() => scrollTo(0, 0));
      const file = `${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: true });
      report.captures.push({ route, viewport, file, rendererReady, rendererState: await renderer.count() ? await renderer.evaluate(element => element.dataset.previewState ?? element.dataset.sceneState) : null, images, overflow, errors });
      if (route === '/explore/cnesdata/') {
        for (const [scenario, outcomes] of [['raw-first-write', ['stored']], ['raw-identical-replay', ['stored', 'replayed']], ['raw-content-conflict', ['stored', 'conflict']]]) {
          await page.getByLabel('Scenario').selectOption(scenario);
          for (const outcome of outcomes) {
            await page.getByRole('button', { name: 'Advance one attempt' }).click();
            await expect(page.locator('[data-result]')).toContainText(`Result: ${outcome}.`);
          }
          await expect(page.locator('[data-objects]')).toContainText('synthetic-content-A');
          await expect(page.locator('[data-objects]')).not.toContainText('synthetic-content-B');
          const file = `cnesdata-${scenario}-${viewport.width}x${viewport.height}.png`;
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, file), fullPage: true });
          report.captures.push({ route, viewport, file, scenario, result: await page.locator('[data-result]').textContent() });
          await page.getByRole('button', { name: 'Reset scenario' }).click();
          await expect(page.locator('[data-progress]')).toContainText('ready');
        }
      }
      if (route === '/explore/infrastructure/') {
        const simulation = page.locator('[data-infrastructure-simulation]');
        const view = page.locator('[data-infra-view]');
        if (await view.textContent() === 'View 2D') await view.click();
        for (const failed of [true, false]) {
          await simulation.getByRole('button', { name: failed ? 'Fail node-02' : 'Reset simulation', exact: true }).click();
          await expect(simulation.locator('[data-infra-node="node-02"]')).toContainText(failed ? 'failed' : 'online');
          await expect(simulation.locator('[data-infra-workload]')).toContainText(failed ? 'node-01' : 'node-02');
          await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
          const file = `infrastructure-${failed ? 'failure' : 'reset'}-${viewport.width}x${viewport.height}.png`;
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(output, file), fullPage: true });
          report.captures.push({ route, viewport, file, failed, workload: await simulation.locator('[data-infra-workload]').textContent(), rendererState: await renderer.getAttribute('data-scene-state') });
        }
      }
      await context.close();
      assert.equal(errors.length, 0, `${route}: no uncaught browser errors`);
      assert.ok(rendererReady !== false || allowFallback, `${route}: renderer did not become ready; see recorded state, or explicitly allow 2D evidence`);
    }
    for (const route of canonicalRoutes.slice(0, 5)) {
      const context = await browser.newContext({ viewport, javaScriptEnabled: false, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(new URL(route, base).href, { waitUntil: 'load' });
      await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
      await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
      assert.ok(await page.locator('main#main h1').count());
      assert.equal(await page.locator('canvas').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (route.endsWith('/cnesdata/')) for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) await expect(page.locator(`#transcript-${id}`)).toBeVisible();
      if (route.endsWith('/infrastructure/')) await expect(page.locator('[data-infra-node="node-02"]')).toContainText('online');
      const file = `${route === '/' ? 'home' : route.split('/').filter(Boolean).join('-')}-no-js-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(output, file), fullPage: true });
      report.captures.push({ route, viewport, file, javaScriptEnabled: false, reducedMotion: 'reduce', images: await page.locator('img').evaluateAll(images => images.map(image => ({ src: image.currentSrc, width: image.naturalWidth }))) });
      await context.close();
    }
  }
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}
console.log(`Release evidence ${report.passed ? 'passed' : 'failed'}: ${path.join(output, 'report.json')}`);
if (report.failure) console.error(report.failure);
