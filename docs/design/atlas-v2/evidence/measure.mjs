// rtk node docs/design/atlas-v2/lighting-motion/measure.mjs URL OUTPUT_JSON SOURCE_SHA baseline|candidate
// Sequential, cold-cache production visits. Exact Three.js counters are collected
// in separate diagnostic visits so patched responses never affect timing medians.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:4321/');
const output = path.resolve(process.argv[3] ?? 'docs/design/atlas-v2/lighting-motion/candidate/metrics.json');
const sourceCommit = process.argv[4] ?? 'unspecified';
const buildRole = process.argv[5];
assert.ok(['baseline', 'candidate'].includes(buildRole), 'Specify baseline or candidate as the final argument; this changes expectations only, never the primary timing profile.');
const motionExpected = buildRole === 'candidate';
const runs = Number(process.env.MEASURE_RUNS ?? 3);
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const routes = ['/explore/', '/'];
const profile = {
  network: { downloadMbps: 10, uploadMbps: 1, latencyMs: 40, downloadThroughput: 10_000_000 / 8, uploadThroughput: 1_000_000 / 8 },
  cpuSlowdownMultiplier: 4, coldCache: true, deviceScaleFactor: 1,
  headless: true, reducedMotion: 'no-preference', launchArgs: [],
};
const report = {
  startedAt: new Date().toISOString(), baseUrl: base.href, sourceCommit, buildRole,
  scriptSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
  environment: { node: process.version, platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0]?.model, cpuCount: os.cpus().length },
  profile, runsPerRouteAndViewport: runs,
  method: {
    order: 'Twelve primary visits sequential, then four no-preference lifecycle diagnostics and four separate initially reduced-motion diagnostics. Complete the baseline invocation before starting the candidate invocation.',
    visibility: 'requestAnimationFrame observes the first h1 and primary CTA with nonzero bounds, visible CSS, and opacity > 0. Layout visibility and viewport intersection are separate. DCL snapshot is taken before automated mobile scrolling. This is a DOM/layout observation, not pixel recognition or proof of usability.',
    primaryCta: 'Home: .hero-actions a; Atlas: first [data-district-link].',
    mobileScroll: 'Immediately after DOMContentLoaded, scroll the Home preview or Atlas map into view, following SA-05 to trigger the deferred Home preview. Desktop remains at scroll 0.',
    sceneComplete: 'First MutationObserver observation of data-preview-state=ready or data-scene-state=ready. Existing renderers set ready after all overview models load and a successful draw; model Resource Timing entries are also retained.',
    transfers: 'Unmodified production responses only in primary visits. Resource Timing transferSize includes headers; encodedBodySize is transferred body encoding. Decimal Mbps (1 Mbps = 1,000,000 bits/s), unlike SA-05 which used binary throughput.',
    activeWindow: 'A two-second visible/no-preference observation begins after max(load + 3000 ms, ready + 500 ms). Candidate animation remains enabled. Baseline demand rendering may be idle. Accumulated GL draws in this window are not renderer calls per frame.',
    renderer: 'Separate diagnostic visits intercept JS responses only. A unique minified WebGLRenderer assignment sequence installs a setter for render before render is assigned; its wrapper snapshots renderer.info.render after each original render. Timing and transfer data from these visits are excluded from primary results.',
    motionContract: 'The user explicitly authorized visible ambient movement capped at 24fps. A running candidate is expected to draw. Only settled paused, reduced-motion, hidden and offscreen diagnostic windows require zero GL draws.',
    diagnosticStates: 'No-preference diagnostic: initial visible active window, Pause, Resume, dynamic reduced motion, restore preference, hidden visibility signal, restore visibility, actual offscreen scroll, return to view. Each observed window lasts two seconds after at least 500ms settling. Initially reduced motion is measured in its own fresh context.',
    hiddenMethod: 'Diagnostic-only document.visibilityState/document.hidden getters plus a visibilitychange event reproduce the repository lifecycle tests. Browser JS remains runnable, so zero draws test application suspension. This is an emulated lifecycle signal, not a physical background-tab integration claim.',
    offscreenMethod: 'Actual document scrolling and measured viewport bounds drive the real IntersectionObserver. If native scroll range cannot fully remove the visual, append one inert viewport-height spacer at document end for this diagnostic only; record its use and remove it before resuming.',
    activeRate: 'Per-render frame count in a settled two-second visible window divided by actual window duration; 24fps limit allows one frame for observation-window boundaries. Per-frame calls/triangles and accumulated GL draws are distinct.',
    baselineControls: 'An explicitly identified static baseline has no Pause control; Pause/Resume are notApplicable. Its initial demand-render idle observations and all other lifecycle windows are retained. A candidate missing the required control fails.',
    limitations: ['Local headless Chromium uses the available WebGL backend; this is not a physical mobile GPU measurement.', 'Three cold visits per condition describe this local build only.', 'Init-script observers and GL wrappers add common small overhead to both builds.', 'Diagnostic response routing can bypass browser network throttling and alters response sizes; diagnostic timings and transfers are deliberately excluded.'],
  }, results: [], rendererDiagnostics: [],
};
await mkdir(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: true, args: profile.launchArgs });
report.browser = { name: 'Chromium', version: browser.version(), executablePath: chromium.executablePath() };

function installObservers() {
  const evidence = window.__atlasV2Evidence = { draws: [], longTasks: [], imageLoads: [], readyAt: null, htmlAtDcl: null, firstLayoutVisibleAt: null, firstInViewportAt: null, renderFrames: [], renderers: [], webgl: [] };
  const box = element => {
    if (!element) return { present: false, layoutVisible: false, inViewport: false };
    const bounds = element.getBoundingClientRect(), css = getComputedStyle(element);
    const layoutVisible = bounds.width > 0 && bounds.height > 0 && css.display !== 'none' && css.visibility !== 'hidden' && Number(css.opacity) > 0;
    return { present: true, text: element.textContent.trim(), href: element.getAttribute('href'), layoutVisible, inViewport: layoutVisible && bounds.bottom > 0 && bounds.right > 0 && bounds.top < innerHeight && bounds.left < innerWidth, bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } };
  };
  const snapshot = () => ({ observedAt: performance.now(), heading: box(document.querySelector('h1')), cta: box(document.querySelector('.hero-actions a, [data-district-link]')) });
  const observeVisibility = () => {
    const html = snapshot();
    if (html.heading.layoutVisible && html.cta.layoutVisible && evidence.firstLayoutVisibleAt === null) evidence.firstLayoutVisibleAt = html.observedAt;
    if (html.heading.inViewport && html.cta.inViewport && evidence.firstInViewportAt === null) evidence.firstInViewportAt = html.observedAt;
    if (evidence.htmlAtDcl === null) requestAnimationFrame(observeVisibility);
  };
  requestAnimationFrame(observeVisibility);
  document.addEventListener('DOMContentLoaded', () => { evidence.htmlAtDcl = snapshot(); observeVisibility(); }, { once: true });
  document.addEventListener('load', event => { if (event.target instanceof HTMLImageElement) evidence.imageLoads.push({ currentSrc: event.target.currentSrc, at: performance.now() }); }, true);
  const observeReady = () => {
    if (document.querySelector('[data-preview-state="ready"], [data-observatory][data-scene-state="ready"]') && evidence.readyAt === null) evidence.readyAt = performance.now();
  };
  new MutationObserver(observeReady).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-preview-state', 'data-scene-state'] });
  const seen = new WeakSet();
  for (const prototype of [globalThis.WebGLRenderingContext?.prototype, globalThis.WebGL2RenderingContext?.prototype]) {
    if (!prototype) continue;
    for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
      const original = prototype[method];
      if (typeof original !== 'function') continue;
      prototype[method] = function (...args) {
        if (!seen.has(this)) {
          seen.add(this);
          const extension = this.getExtension('WEBGL_debug_renderer_info');
          evidence.webgl.push({ version: this.getParameter(this.VERSION), renderer: this.getParameter(this.RENDERER), vendor: this.getParameter(this.VENDOR), unmaskedRenderer: extension ? this.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null });
        }
        evidence.draws.push(performance.now());
        return original.apply(this, args);
      };
    }
  }
  new PerformanceObserver(list => { for (const entry of list.getEntries()) evidence.longTasks.push({ startTime: entry.startTime, duration: entry.duration }); }).observe({ type: 'longtask', buffered: true });
  const installed = new WeakSet();
  window.__atlasV2InstallRenderer = renderer => {
    if (installed.has(renderer)) return;
    installed.add(renderer);
    const id = evidence.renderers.length + 1;
    evidence.renderers.push({ id, installedAt: performance.now() });
    let wrapped;
    Object.defineProperty(renderer, 'render', {
      configurable: true, enumerable: true, get() { return wrapped; },
      set(original) {
        if (typeof original !== 'function') throw new Error('Expected WebGLRenderer.render function');
        wrapped = function (...args) {
          const result = original.apply(this, args), info = this.info.render;
          evidence.renderFrames.push({ rendererId: id, at: performance.now(), frame: info.frame, calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines, autoReset: this.info.autoReset });
          return result;
        };
      },
    });
  };
}

function installVisibilitySignal() {
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
  window.__atlasSetVisibilitySignal = value => {
    if (value === null) {
      if (visibility) Object.defineProperty(document, 'visibilityState', visibility); else delete document.visibilityState;
      if (hidden) Object.defineProperty(document, 'hidden', hidden); else delete document.hidden;
    } else {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => value === 'hidden' });
    }
    document.dispatchEvent(new Event('visibilitychange'));
  };
}

async function playbackState(page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-home-preview], [data-observatory]');
    const visual = document.querySelector('[data-home-preview], .observatory-map');
    const bounds = visual?.getBoundingClientRect();
    const controls = [...document.querySelectorAll('[data-motion-control]')];
    return {
      observedAt: performance.now(), documentVisibility: document.visibilityState, documentHidden: document.hidden,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      sceneState: host?.dataset.previewState ?? host?.dataset.sceneState ?? null,
      visualInViewport: Boolean(bounds && bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0 && bounds.top < innerHeight && bounds.left < innerWidth),
      visualBounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
      scrollY, viewport: { width: innerWidth, height: innerHeight },
      controls: controls.map(control => ({ text: control.textContent.trim(), state: control.dataset.motionState, disabled: control.disabled, hidden: control.hidden, ariaPressed: control.getAttribute('aria-pressed') })),
    };
  });
}

function assessWindow(window) {
  const failures = [];
  const states = [window.stateAtStart, window.stateAtEnd];
  if (window.expectZero && window.glDrawCount !== 0) failures.push(`Expected zero GL draws; observed ${window.glDrawCount}`);
  if (window.expectActive && (window.glDrawCount === 0 || window.frames.length === 0)) failures.push('Expected real visible animated renders');
  for (const state of states) {
    if (state.sceneState !== 'ready') failures.push('Scene is not ready throughout the window');
    if (window.kind === 'paused' && state.controls[0]?.state !== 'paused') failures.push('Pause control does not report paused');
    if (window.kind.startsWith('reduced') && !state.reducedMotion) failures.push('Reduced-motion media query is not active');
    if (window.kind.startsWith('reduced') && motionExpected && (state.controls[0]?.state !== 'reduced' || !state.controls[0]?.disabled)) failures.push('Candidate control does not expose disabled reduced-motion state');
    if (window.kind === 'hidden' && (state.documentVisibility !== 'hidden' || !state.documentHidden)) failures.push('Hidden lifecycle signal is not active');
    if (window.kind === 'offscreen' && state.visualInViewport) failures.push('Visual is not fully outside the viewport');
    if (window.expectActive && (state.reducedMotion || state.documentHidden || !state.visualInViewport || state.controls[0]?.state !== 'running')) failures.push('Active-window state is not visible, running and no-preference');
  }
  if (motionExpected && window.frames.some(frame => frame.calls > 150 || frame.triangles > 100_000)) failures.push('Candidate exceeded 150 calls or 100000 triangles per render');
  if (window.frames.some(frame => frame.autoReset !== true)) failures.push('Per-render counters require info.autoReset=true');
  window.renderRateFps = window.frames.length * 1000 / window.durationMs;
  window.activeFrameLimit = Math.ceil(window.durationMs * 24 / 1000) + 1;
  if (window.expectActive && window.frames.length > window.activeFrameLimit) failures.push('Settled active render rate exceeds the 24fps budget plus one boundary frame');
  window.failures = [...new Set(failures)];
  window.passed = failures.length === 0;
  return window;
}

async function observeDiagnosticWindow(page, kind, { expectZero = false, expectActive = false } = {}) {
  await page.waitForTimeout(500);
  const stateAtStart = await playbackState(page);
  const start = await page.evaluate(() => performance.now());
  await page.waitForTimeout(2_000);
  const counters = await page.evaluate(start => {
    const end = performance.now(), e = window.__atlasV2Evidence;
    return { start, end, durationMs: end - start, glDrawCount: e.draws.filter(time => time >= start && time <= end).length, frames: e.renderFrames.filter(frame => frame.at >= start && frame.at <= end) };
  }, start);
  return assessWindow({ kind, expectZero, expectActive, settleMs: 500, stateAtStart, stateAtEnd: await playbackState(page), ...counters });
}

async function collectLifecycleWindows(page) {
  const windows = [], control = page.locator('[data-motion-control]'), visual = page.locator('[data-home-preview], .observatory-map').first();
  const count = await control.count();
  if (motionExpected) assert.equal(count, 1, 'The candidate must expose exactly one Pause motion control on each moving route');
  if (count) {
    assert.equal(buildRole, 'candidate', 'The static baseline unexpectedly exposes a motion control');
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.mouse.move(0, 0);
    await visual.scrollIntoViewIfNeeded();
    windows.push(await observeDiagnosticWindow(page, 'paused', { expectZero: true }));
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await page.mouse.move(0, 0);
    await visual.scrollIntoViewIfNeeded();
    windows.push(await observeDiagnosticWindow(page, 'resumed', { expectActive: true }));
  } else windows.push({ kind: 'pause-resume', notApplicable: true, reason: 'Static baseline has no ambient motion or Pause control', passed: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  windows.push(await observeDiagnosticWindow(page, 'reduced-dynamic', { expectZero: true }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  windows.push(await observeDiagnosticWindow(page, 'preference-restored', { expectActive: motionExpected }));
  await page.evaluate(() => window.__atlasSetVisibilitySignal('hidden'));
  windows.push(await observeDiagnosticWindow(page, 'hidden', { expectZero: true }));
  await page.evaluate(() => window.__atlasSetVisibilitySignal(null));
  windows.push(await observeDiagnosticWindow(page, 'visibility-restored', { expectActive: motionExpected }));
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const needsScrollSpacer = (await playbackState(page)).visualInViewport;
  if (needsScrollSpacer) await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.dataset.atlasMeasurementSpacer = '';
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.cssText = `height:${innerHeight}px;min-height:${innerHeight}px;flex:none;pointer-events:none;`;
    document.body.append(spacer);
    scrollTo(0, document.documentElement.scrollHeight);
  });
  const offscreen = await observeDiagnosticWindow(page, 'offscreen', { expectZero: true });
  offscreen.diagnosticScrollSpacerUsed = needsScrollSpacer;
  windows.push(offscreen);
  if (needsScrollSpacer) await page.evaluate(() => document.querySelector('[data-atlas-measurement-spacer]')?.remove());
  await visual.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  windows.push(await observeDiagnosticWindow(page, 'viewport-restored', { expectActive: motionExpected }));
  return windows;
}

async function visit(route, viewport, run, diagnostic = false, initiallyReduced = false) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: profile.deviceScaleFactor, reducedMotion: initiallyReduced ? 'reduce' : profile.reducedMotion, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [], failedRequests = [], injections = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), failure: request.failure() }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.network.latencyMs, downloadThroughput: profile.network.downloadThroughput, uploadThroughput: profile.network.uploadThroughput });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdownMultiplier });
  await page.addInitScript(installObservers);
  if (diagnostic) await page.addInitScript(installVisibilitySignal);
  if (diagnostic) await page.route('**/*.js', async route => {
    const response = await route.fetch(), source = await response.text();
    // The adjacent assignments are specific to WebGLRenderer's initGLContext.
    const pattern = /([\w$]+)\.renderLists=([\w$]+),\1\.shadowMap=([\w$]+),\1\.state=([\w$]+),\1\.info=([\w$]+)/g;
    const matches = [...source.matchAll(pattern)];
    assert.ok(matches.length <= 1, 'Multiple WebGLRenderer injection matches in one JS response');
    if (matches.length) {
      assert.equal(injections.length, 0, 'More than one WebGLRenderer response injected');
      const match = matches[0], patched = source.replace(pattern, `${match[1]}.renderLists=${match[2]},${match[1]}.shadowMap=${match[3]},${match[1]}.state=${match[4]},window.__atlasV2InstallRenderer(${match[1]}),${match[1]}.info=${match[5]}`);
      injections.push({ url: route.request().url(), matches: 1, originalBytes: Buffer.byteLength(source), originalSha256: createHash('sha256').update(source).digest('hex') });
      await route.fulfill({ response, body: patched });
    } else await route.fulfill({ response });
  });
  try {
    const startedAt = new Date().toISOString();
    const response = await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    assert.equal(response.status(), 200);
    let mobileScroll = null;
    if (viewport.width === 390) {
      await page.locator('[data-home-preview], .observatory-map').first().scrollIntoViewIfNeeded();
      mobileScroll = await page.evaluate(() => ({ at: performance.now(), scrollY }));
    }
    await page.waitForLoadState('load');
    const readyObserved = await page.waitForFunction(() => window.__atlasV2Evidence.readyAt !== null, null, { timeout: 20_000 }).then(() => true, () => false);
    await page.waitForTimeout(await page.evaluate(() => Math.max(0, Math.max(performance.getEntriesByType('navigation')[0].loadEventEnd + 3_000, (window.__atlasV2Evidence.readyAt ?? 0) + 500) - performance.now())));
    const stateAtWindowStart = await playbackState(page);
    const activeStart = await page.evaluate(() => performance.now());
    await page.waitForTimeout(2_000);
    const metrics = await page.evaluate(activeStart => {
      const e = window.__atlasV2Evidence, nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource').map(r => ({ name: r.name, initiatorType: r.initiatorType, transferSize: r.transferSize, encodedBodySize: r.encodedBodySize, decodedBodySize: r.decodedBodySize, responseEnd: r.responseEnd }));
      const classify = r => /\.(?:m?js)$/.test(new URL(r.name).pathname) ? 'javascript' : /\.(?:glb|gltf|bin)$/.test(new URL(r.name).pathname) ? 'model' : /\/posters\/|poster/.test(new URL(r.name).pathname) ? 'poster' : /\/textures\/|\.(?:ktx2|basis|hdr|exr)$/.test(new URL(r.name).pathname) ? 'texture' : null;
      const totals = Object.fromEntries(['javascript', 'model', 'texture', 'poster'].map(category => { const selected = resources.filter(r => classify(r) === category); return [category, { requestCount: selected.length, transferSize: selected.reduce((n,r) => n + r.transferSize, 0), encodedBodySize: selected.reduce((n,r) => n + r.encodedBodySize, 0), decodedBodySize: selected.reduce((n,r) => n + r.decodedBodySize, 0), resources: selected }]; }));
      const poster = document.querySelector('[data-home-preview] img, .observatory-map img');
      const host = document.querySelector('[data-home-preview], [data-observatory]');
      return {
        timingsMs: { domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, htmlAndCtaLayoutVisible: e.firstLayoutVisibleAt, htmlAndCtaInViewport: e.firstInViewportAt, firstGlDraw: e.draws[0] ?? null, sceneComplete: e.readyAt },
        htmlAtDcl: e.htmlAtDcl,
        poster: poster ? { currentSrc: poster.currentSrc, complete: poster.complete, naturalWidth: poster.naturalWidth, naturalHeight: poster.naturalHeight, renderedWidth: poster.getBoundingClientRect().width, renderedHeight: poster.getBoundingClientRect().height, loadObservedAt: e.imageLoads.find(entry => entry.currentSrc === poster.currentSrc)?.at ?? null, responseEnd: resources.find(r => r.name === poster.currentSrc)?.responseEnd ?? null } : null,
        sceneState: host?.dataset.previewState ?? host?.dataset.sceneState ?? null,
        glDraws: { total: e.draws.length, activeWindowStart: activeStart, activeWindowEnd: performance.now(), activeWindowDuration: performance.now() - activeStart, duringActiveWindow: e.draws.filter(t => t >= activeStart).length },
        rendererFrames: e.renderFrames, renderers: e.renderers, webgl: e.webgl,
        longTasks: { count: e.longTasks.length, totalDuration: e.longTasks.reduce((n,t) => n+t.duration, 0), maxDuration: Math.max(0,...e.longTasks.map(t => t.duration)), entries: e.longTasks },
        resources: totals, allResources: resources, overflow: { scrollWidth: document.documentElement.scrollWidth, innerWidth },
      };
    }, activeStart);
    const stateAtWindowEnd = await playbackState(page);
    if (diagnostic) {
      assert.equal(injections.length, 1, 'Expected exactly one production WebGLRenderer JS injection');
      assert.equal(metrics.renderers.length, 1, 'Expected one measured WebGLRenderer instance');
      assert.ok(metrics.rendererFrames.length > 0, 'No renderer.info.render snapshots captured');
      assert.ok(metrics.rendererFrames.every(frame => frame.autoReset === true), 'Per-render counters require info.autoReset=true');
      const firstWindow = assessWindow({ kind: initiallyReduced ? 'reduced-initial' : motionExpected ? 'active-initial' : 'baseline-demand-idle', expectZero: initiallyReduced, expectActive: motionExpected && !initiallyReduced, settleMs: 'max(load+3000, ready+500)', stateAtStart: stateAtWindowStart, stateAtEnd: stateAtWindowEnd, start: metrics.glDraws.activeWindowStart, end: metrics.glDraws.activeWindowEnd, durationMs: metrics.glDraws.activeWindowDuration, glDrawCount: metrics.glDraws.duringActiveWindow, frames: metrics.rendererFrames.filter(frame => frame.at >= metrics.glDraws.activeWindowStart && frame.at <= metrics.glDraws.activeWindowEnd) });
      const windows = [firstWindow, ...(initiallyReduced ? [] : await collectLifecycleWindows(page))];
      if (initiallyReduced && motionExpected) assert.equal(stateAtWindowEnd.controls.length, 1, 'Initially reduced-motion candidate must expose its motion control');
      const frames = await page.evaluate(() => window.__atlasV2Evidence.renderFrames);
      const budgetsPassed = !motionExpected || frames.every(frame => frame.calls <= 150 && frame.triangles <= 100_000);
      return { route, viewport, startedAt, readyObserved, initiallyReduced, sceneState: metrics.sceneState, injections, renderers: metrics.renderers, frames, initialWindowGlDraws: metrics.glDraws, windows, budgets: { applicable: motionExpected, maxCalls: Math.max(...frames.map(frame => frame.calls)), maxTriangles: Math.max(...frames.map(frame => frame.triangles)), limits: { calls: 150, triangles: 100_000 }, passed: budgetsPassed }, webgl: metrics.webgl, errors, failedRequests, passed: windows.every(window => window.passed) && budgetsPassed };
    }
    const candidateAnimationObserved = !motionExpected ? null : metrics.glDraws.duringActiveWindow > 0 && [stateAtWindowStart, stateAtWindowEnd].every(state => !state.reducedMotion && !state.documentHidden && state.visualInViewport && state.controls.length === 1 && state.controls[0].state === 'running');
    const modelTextureBudget = { decodedBytes: metrics.resources.model.decodedBodySize + metrics.resources.texture.decodedBodySize, limit: 700_000, applicable: motionExpected, note: 'Decoded requested GLB/GLTF/BIN bodies plus recognized external texture paths; complete resource list is retained for inventory review.' };
    modelTextureBudget.passed = !motionExpected || modelTextureBudget.decodedBytes <= modelTextureBudget.limit;
    return { route, viewport, run, startedAt, readyObserved, mobileScroll, ...metrics, activeWindowState: { start: stateAtWindowStart, end: stateAtWindowEnd }, candidateAnimationObserved, modelTextureBudget, errors, failedRequests };
  } finally { await context.close(); }
}

try {
  for (const route of routes) for (const viewport of viewports) for (let run = 1; run <= runs; run++) {
    const result = await visit(route, viewport, run);
    report.results.push(result);
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${route} ${viewport.width} run ${run}: ready=${result.readyObserved}, ${result.timingsMs.sceneComplete?.toFixed(1)} ms, active-window GL=${result.glDraws.duringActiveWindow}`);
  }
  for (const route of routes) for (const viewport of viewports) {
    const result = await visit(route, viewport, 1, true);
    report.rendererDiagnostics.push(result);
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${route} ${viewport.width} renderer: ${result.frames.length} renders, last ${result.frames.at(-1).calls} calls / ${result.frames.at(-1).triangles} triangles`);
  }
  for (const route of routes) for (const viewport of viewports) {
    const result = await visit(route, viewport, 1, true, true);
    report.rendererDiagnostics.push(result);
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${route} ${viewport.width} initially reduced: ${result.windows[0].glDrawCount} GL draws in settled 2s`);
  }
  report.passed = report.results.every(r => r.readyObserved && r.poster?.complete && r.poster?.naturalWidth > 0 && r.errors.length === 0 && r.candidateAnimationObserved !== false && r.modelTextureBudget.passed) && report.rendererDiagnostics.every(r => r.readyObserved && r.errors.length === 0 && r.passed);
  assert.ok(report.passed, 'A visit failed readiness, poster, browser-error, lifecycle or render-budget checks; inspect the recorded windows');
} catch (error) {
  report.passed = false; report.failure = error.stack; process.exitCode = 1;
  console.error(error.stack);
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
