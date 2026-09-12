import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4325/';
const outputPath = process.argv[3] ?? '/tmp/sa05-measurement.json';
const runsPerViewport = Number(process.env.MEASURE_RUNS ?? 3);
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const network = {
  downloadMbps: 10,
  uploadMbps: 1,
  latencyMs: 40,
  downloadThroughput: (10 * 1024 * 1024) / 8,
  uploadThroughput: (1 * 1024 * 1024) / 8,
};
const cpuSlowdownMultiplier = 4;

const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const results = [];

for (const viewport of viewports) {
  for (let run = 1; run <= runsPerViewport; run += 1) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: network.latencyMs,
      downloadThroughput: network.downloadThroughput,
      uploadThroughput: network.uploadThroughput,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdownMultiplier });

    await page.addInitScript(() => {
      window.__sa05 = { draws: [], longTasks: [], imageLoads: [], previewReadyAt: null, htmlAtDcl: null };
      const snapshotHtml = () => {
        const hero = document.querySelector('.observatory-hero, [data-home-hero], h1');
        const cta = document.querySelector('.hero-actions a, [data-home-cta], a[href="/work/"]');
        const visible = (element) => Boolean(element && element.getBoundingClientRect().width && element.getBoundingClientRect().height);
        window.__sa05.htmlAtDcl = {
          observedAt: performance.now(),
          heroPresent: Boolean(hero),
          heroVisible: visible(hero),
          ctaPresent: Boolean(cta),
          ctaVisible: visible(cta),
        };
      };
      document.addEventListener('DOMContentLoaded', snapshotHtml, { once: true });
      document.addEventListener('load', (event) => {
        if (!(event.target instanceof HTMLImageElement)) return;
        window.__sa05.imageLoads.push({ currentSrc: event.target.currentSrc, at: performance.now() });
      }, true);
      const observePreviewReady = () => {
        if (document.querySelector('[data-preview-state="ready"]') && window.__sa05.previewReadyAt === null) {
          window.__sa05.previewReadyAt = performance.now();
        }
      };
      new MutationObserver(observePreviewReady).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-preview-state'],
      });
      document.addEventListener('DOMContentLoaded', observePreviewReady, { once: true });
      const wrapDraws = (prototype) => {
        if (!prototype) return;
        for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
          const original = prototype[method];
          if (typeof original !== 'function') continue;
          prototype[method] = function (...args) {
            window.__sa05.draws.push(performance.now());
            return original.apply(this, args);
          };
        }
      };
      wrapDraws(globalThis.WebGLRenderingContext?.prototype);
      wrapDraws(globalThis.WebGL2RenderingContext?.prototype);
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__sa05.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      }).observe({ type: 'longtask', buffered: true });
    });

    const startedAt = new Date().toISOString();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (viewport.name === 'mobile') {
      const preview = page.locator('[data-home-preview], .home-preview, .globe-visual, canvas').first();
      if (await preview.count()) await preview.scrollIntoViewIfNeeded();
    }
    await page.waitForLoadState('load');
    const hasPreviewHost = await page.locator('[data-preview-host]').count() > 0;
    if (hasPreviewHost) {
      await page.waitForFunction(() => Boolean(document.querySelector('[data-preview-state="ready"]')), null, {
        timeout: 15_000,
      }).catch(() => {});
    }
    const settleDelay = await page.evaluate(() => {
      const loadEnd = performance.getEntriesByType('navigation')[0]?.loadEventEnd ?? performance.now();
      const readyAt = window.__sa05.previewReadyAt ?? 0;
      return Math.max(0, Math.max(loadEnd + 3_000, readyAt + 500) - performance.now());
    });
    await page.waitForTimeout(settleDelay);
    const idleWindowStart = await page.evaluate(() => performance.now());
    await page.waitForTimeout(2_000);

    const metrics = await page.evaluate(({ idleWindowStart }) => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]));
      const resources = performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        responseEnd: entry.responseEnd,
      }));
      const classify = ({ name, initiatorType }) => {
        const path = new URL(name).pathname.toLowerCase();
        if (initiatorType === 'script' || /\.(?:m?js)(?:$|\?)/.test(path)) return 'javascript';
        if (/\.(?:glb|gltf|bin)(?:$|\?)/.test(path)) return 'model';
        if (path.includes('/posters/') || /poster/.test(path)) return 'poster';
        return null;
      };
      const resourceTotals = Object.fromEntries(['javascript', 'model', 'poster'].map((category) => {
        const selected = resources.filter((resource) => classify(resource) === category);
        return [category, {
          requestCount: selected.length,
          transferSize: selected.reduce((sum, resource) => sum + resource.transferSize, 0),
          encodedBodySize: selected.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
          resources: selected,
        }];
      }));
      const draws = window.__sa05.draws;
      const longTasks = window.__sa05.longTasks;
      const poster = document.querySelector('[data-home-preview] img, .globe-visual img, img[src*="poster"]');
      const posterResource = poster?.currentSrc
        ? resources.find((resource) => resource.name === poster.currentSrc)
        : null;
      return {
        timingsMs: {
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd,
          firstContentfulPaint: paints['first-contentful-paint'] ?? null,
          firstGlDraw: draws[0] ?? null,
          previewReady: window.__sa05.previewReadyAt,
        },
        htmlAtDcl: window.__sa05.htmlAtDcl,
        poster: poster ? {
          currentSrc: poster.currentSrc,
          complete: poster.complete,
          naturalWidth: poster.naturalWidth,
          naturalHeight: poster.naturalHeight,
          renderedWidth: poster.getBoundingClientRect().width,
          renderedHeight: poster.getBoundingClientRect().height,
          loadObservedAt: window.__sa05.imageLoads.find((entry) => entry.currentSrc === poster.currentSrc)?.at ?? null,
          responseEnd: posterResource?.responseEnd ?? null,
        } : null,
        drawCalls: {
          total: draws.length,
          idleWindowStart,
          idleWindowDuration: performance.now() - idleWindowStart,
          duringIdleWindow: draws.filter((time) => time >= idleWindowStart).length,
          previewStateAtStart: document.querySelector('[data-preview-state]')?.getAttribute('data-preview-state') ?? null,
        },
        longTasks: {
          count: longTasks.length,
          totalDuration: longTasks.reduce((sum, task) => sum + task.duration, 0),
          maxDuration: Math.max(0, ...longTasks.map((task) => task.duration)),
          entries: longTasks,
        },
        resources: resourceTotals,
      };
    }, { idleWindowStart });

    results.push({ viewport, run, startedAt, ...metrics });
    await context.close();
  }
}

await browser.close();
const report = {
  measuredUrl: baseUrl,
  browser: { name: 'Chromium', version: browserVersion },
  profile: { network, cpuSlowdownMultiplier, coldCache: true },
  runsPerViewport,
  results,
};
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${results.length} runs to ${outputPath} with Chromium ${browserVersion}`);
