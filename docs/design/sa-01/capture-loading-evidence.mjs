#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const [distArg, label = 'candidate', portArg = '4330'] = process.argv.slice(2);
if (!distArg) {
  console.error('Usage: node docs/design/sa-01/capture-loading-evidence.mjs <dist-dir> [label] [port]');
  process.exit(2);
}

const dist = resolve(distArg);
const output = resolve('docs/design/sa-01', label);
const port = Number(portArg);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
  let target = normalize(join(dist, pathname));
  if (!target.startsWith(dist)) return response.writeHead(403).end();
  if (pathname.endsWith('/')) target = join(target, 'index.html');
  if (!existsSync(target) || !statSync(target).isFile()) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'content-length': statSync(target).size });
  createReadStream(target).pipe(response);
});

await mkdir(output, { recursive: true });
await new Promise(resolveListen => server.listen(port, '127.0.0.1', resolveListen));

const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const profiles = [
  { name: 'desktop-1440x900', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'mobile-390x900', viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true },
];
const results = [];

for (const profile of profiles) {
  const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile, hasTouch: profile.hasTouch, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });

  const requests = new Map();
  const measureLabels = () => page.evaluate(() => {
    const entries = [...document.querySelectorAll('[data-district-link], .observatory-hub')].map(element => {
      const rect = element.getBoundingClientRect();
      return { label: element.getAttribute('data-district-link') || 'hub', left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) };
    });
    const pairs = [];
    for (let first = 0; first < entries.length; first += 1) for (let second = first + 1; second < entries.length; second += 1) {
      const a = entries[first]; const b = entries[second];
      const horizontalGap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
      const verticalGap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
      pairs.push({ labels: [a.label, b.label], overlaps: horizontalGap < 0 && verticalGap < 0, separationPx: Math.max(horizontalGap, verticalGap) });
    }
    return { rectangles: entries, pairs };
  });
  let phase = 'initial';
  client.on('Network.requestWillBeSent', event => {
    if (event.type === 'Document' || /\.(?:glb|gltf)(?:\?|$)/i.test(event.request.url)) {
      requests.set(event.requestId, { url: event.request.url, type: event.type, phase, startSeconds: event.timestamp, encodedBytes: 0 });
    }
  });
  client.on('Network.loadingFinished', event => {
    const request = requests.get(event.requestId);
    if (request) Object.assign(request, { encodedBytes: event.encodedDataLength, durationMs: Math.round((event.timestamp - request.startSeconds) * 1000) });
  });

  const navigationStart = performance.now();
  await page.goto(`http://127.0.0.1:${port}/explore/`, { waitUntil: 'networkidle' });
  const initialSettledMs = Math.round(performance.now() - navigationStart);
  const initialLabelLayout = await measureLabels();
  const webgl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const debug = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? {
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    } : null;
  });
  await page.screenshot({ path: join(output, `${profile.name}-initial.png`), fullPage: true });

  phase = 'selection-cnesdata';
  const selectionStart = performance.now();
  await page.locator('[data-district-link="cnesdata"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(250);
  const selectionSettledMs = Math.round(performance.now() - selectionStart);
  await page.screenshot({ path: join(output, `${profile.name}-selection-cnesdata.png`), fullPage: true });

  phase = 'zoom-composition';
  await page.goto(`http://127.0.0.1:${port}/explore/`, { waitUntil: 'networkidle' });
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  const reset = page.getByRole('button', { name: 'Reset view' });
  if (await zoomIn.isVisible()) {
    for (let index = 0; index < 8; index += 1) await zoomIn.click();
    var zoomInLabelLayout = await measureLabels();
    await page.screenshot({ path: join(output, `${profile.name}-zoom-in-extreme.png`), fullPage: true });
    await reset.click();
    for (let index = 0; index < 8; index += 1) await zoomOut.click();
    var zoomOutLabelLayout = await measureLabels();
    await page.screenshot({ path: join(output, `${profile.name}-zoom-out-extreme.png`), fullPage: true });
  }

  const entries = [...requests.values()].map(({ startSeconds, ...entry }) => entry);
  const glbs = entries.filter(entry => /\.(?:glb|gltf)(?:\?|$)/i.test(entry.url));
  const summarize = selected => ({ requestCount: selected.length, encodedBytes: selected.reduce((sum, item) => sum + item.encodedBytes, 0), requests: selected });
  results.push({ profile, webgl, initialSettledMs, selectionSettledMs, labelLayout: { initial: initialLabelLayout, zoomIn: zoomInLabelLayout, zoomOut: zoomOutLabelLayout }, initialModels: summarize(glbs.filter(entry => entry.phase === 'initial')), selectionModels: summarize(glbs.filter(entry => entry.phase === 'selection-cnesdata')) });
  await context.close();
}

await browser.close();
server.close();
const evidence = {
  capturedAt: new Date().toISOString(), label, dist, browser: `Chromium ${browserVersion}`,
  conditions: { cache: 'disabled through CDP; fresh context per viewport', host: `127.0.0.1:${port}`, rendering: 'headless Chromium; container GPU availability may cause SwiftShader/software WebGL', timingMeaning: 'wall-clock until network idle; useful only for same-host/profile comparisons, not user-facing latency' },
  results,
};
await writeFile(join(output, 'loading-metrics.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
