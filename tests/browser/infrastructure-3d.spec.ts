import { test, expect, type Page, type Route } from '@playwright/test';

const visual = (page: Page) => page.locator('[data-infra-visual]');
const canvas = (page: Page) => page.locator('[data-infra-canvas-host] canvas');
const ready = (page: Page) => expect(visual(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 15_000 });
const modelPattern = '**/detail-infrastructure.glb';

async function frames(page: Page, count = 5) {
  await page.evaluate(async count => {
    for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
  }, count);
}

function hold(page: Page, pattern = modelPattern) {
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const arrived = new Promise<void>(resolve => { requested = resolve; });
  const installed = page.route(pattern, async (route: Route) => {
    requested();
    await gate;
    await route.continue().catch(() => {});
  });
  return { installed, arrived, release };
}

async function activate(page: Page) {
  await page.goto('/explore/infrastructure/');
  await visual(page).scrollIntoViewIfNeeded();
}

async function failed(page: Page) {
  await expect(page.locator('[data-infra-workload]')).toContainText('node-01');
  await expect(page.locator('[data-infra-node="node-02"]')).toContainText('failed');
  for (const id of ['node-01', 'node-03']) await expect(page.locator(`[data-infra-node="${id}"]`)).toContainText('online');
  await expect(page.locator('[data-infra-shared]')).toContainText('available');
  await expect(page.locator('[data-infra-timeline] li')).toHaveCount(3);
}

for (const width of [1440, 390]) {
  test(`Infrastructure 3D preserves failure, reset, keyboard and view switching at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const assets: string[] = [];
    page.on('request', request => { if (/\.glb(?:$|\?)/.test(request.url())) assets.push(new URL(request.url()).pathname); });
    await activate(page);
    await ready(page);
    expect(assets.map(asset => asset.split('/').at(-1))).toEqual(['detail-infrastructure.glb']);
    await page.getByRole('button', { name: 'Fail node-02', exact: true }).focus();
    await page.keyboard.press('Enter');
    await failed(page);
    await visual(page).scrollIntoViewIfNeeded();
    await frames(page);
    await page.screenshot({ path: testInfo.outputPath(`infrastructure-3d-failed-${width}.png`), fullPage: true });
    const toggle = page.locator('[data-infra-view]');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(visual(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(toggle).toBeFocused();
    await expect(canvas(page)).toHaveCount(0);
    await failed(page);
    await page.keyboard.press('Enter');
    await ready(page);
    await expect(toggle).toBeFocused();
    await failed(page);
    await page.getByRole('button', { name: 'Reset simulation', exact: true }).click();
    await expect(page.locator('[data-infra-workload]')).toContainText('node-02');
    await expect(page.locator('[data-infra-timeline] li')).toHaveCount(0);
    await visual(page).scrollIntoViewIfNeeded();
    await frames(page);
    await page.screenshot({ path: testInfo.outputPath(`infrastructure-3d-reset-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const size = await canvas(page).evaluate((element: HTMLCanvasElement) => ({ width: element.width, css: element.clientWidth }));
    expect(size.width).toBeLessThanOrEqual(Math.ceil(size.css * 1.5));
  });
}

test('Infrastructure waits for visibility and first valid frame reflects state changed during loading', async ({ page }) => {
  const assets: string[] = [];
  page.on('request', request => { if (/infrastructure-renderer\.|\.glb(?:$|\?)/.test(request.url())) assets.push(request.url()); });
  const model = hold(page);
  await model.installed;
  await page.goto('/explore/infrastructure/');
  await frames(page);
  expect(assets).toEqual([]);
  await visual(page).scrollIntoViewIfNeeded();
  await model.arrived;
  await expect(visual(page)).toHaveAttribute('data-scene-state', 'loading');
  await expect(page.locator('[data-infra-poster]')).toBeVisible();
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await failed(page);
  await visual(page).scrollIntoViewIfNeeded();
  model.release();
  await ready(page);
  const firstFrame = await canvas(page).screenshot();
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click();
  await visual(page).scrollIntoViewIfNeeded();
  await frames(page);
  expect((await canvas(page).screenshot()).equals(firstFrame)).toBe(false);
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await visual(page).scrollIntoViewIfNeeded();
  await frames(page);
  expect((await canvas(page).screenshot()).equals(firstFrame)).toBe(true);
});

test('Infrastructure View 2D cancels loading and late assets cannot replace a newer mount', async ({ page }) => {
  const model = hold(page);
  await model.installed;
  await activate(page);
  await model.arrived;
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await page.getByRole('button', { name: 'View 2D', exact: true }).click();
  await expect(visual(page)).toHaveAttribute('data-scene-state', 'fallback');
  model.release();
  await frames(page);
  await expect(canvas(page)).toHaveCount(0);
  await failed(page);
  await page.getByRole('button', { name: 'View 3D', exact: true }).click();
  await ready(page);
  await expect(canvas(page)).toHaveCount(1);
  await failed(page);
});

test('Infrastructure has a single 15 second attempt deadline and requires explicit retry', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));
  const renderer = hold(page, '**/_astro/infrastructure-renderer.*.js');
  const model = hold(page);
  await renderer.installed;
  await model.installed;
  await activate(page);
  await renderer.arrived;
  await page.clock.fastForward(10_000);
  renderer.release();
  await model.arrived;
  await page.clock.fastForward(4_000);
  await expect(visual(page)).toHaveAttribute('data-scene-state', 'loading');
  await page.clock.fastForward(1_000);
  await expect(visual(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(page.locator('[data-infra-view-status]')).toContainText('timed out');
  model.release();
  await page.clock.resume();
  await page.evaluate(() => scrollTo(0, 0));
  await visual(page).scrollIntoViewIfNeeded();
  await frames(page);
  await expect(canvas(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await failed(page);
  await page.getByRole('button', { name: 'View 3D', exact: true }).click();
  await ready(page);
  await failed(page);
});

for (const failure of ['invalid-model', 'context-loss']) {
  test(`Infrastructure ${failure} preserves simulation and focus`, async ({ page }) => {
    if (failure === 'invalid-model') await page.route(modelPattern, route => route.fulfill({ status: 200, body: 'invalid GLB' }));
    await activate(page);
    if (failure === 'context-loss') await ready(page);
    await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
    const reset = page.getByRole('button', { name: 'Reset simulation', exact: true });
    await reset.focus();
    if (failure === 'context-loss') await canvas(page).evaluate((element: HTMLCanvasElement) => {
      const extension = element.getContext('webgl2')?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Context-loss extension unavailable');
      extension.loseContext();
    });
    await expect(visual(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await expect(reset).toBeFocused();
    await failed(page);
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-infra-workload]')).toContainText('node-02');
  });
}

test('Infrastructure Save-Data keeps graphics unloaded and simulation available', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
  const assets: string[] = [];
  page.on('request', request => { if (/infrastructure-renderer\.|\.glb(?:$|\?)/.test(request.url())) assets.push(request.url()); });
  await activate(page);
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await failed(page);
  await expect(visual(page)).toHaveAttribute('data-scene-state', 'fallback');
  await page.getByRole('button', { name: 'View 3D', exact: true }).click();
  await expect(canvas(page)).toHaveCount(0);
  expect(assets).toEqual([]);
});

test('Infrastructure persisted page lifecycle disposes graphics and retains one simulation', async ({ page }) => {
  await activate(page);
  await ready(page);
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(canvas(page)).toHaveCount(0);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await failed(page);
  await page.getByRole('button', { name: 'Reset simulation', exact: true }).click();
  await page.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await failed(page);
  await visual(page).scrollIntoViewIfNeeded();
  await frames(page);
  await expect(canvas(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'View 3D', exact: true }).click();
  await ready(page);
  await failed(page);
});

test('Infrastructure draws on demand and defers hidden state updates until visible', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { infrastructureDraws: number };
    state.infrastructureDraws = 0;
    for (const method of ['drawArrays', 'drawElements'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args: number[]) {
        state.infrastructureDraws++;
        return Reflect.apply(original, this, args);
      };
    }
  });
  const draws = () => page.evaluate(() => (window as typeof window & { infrastructureDraws: number }).infrastructureDraws);
  await activate(page);
  await ready(page);
  await frames(page);
  const initial = await draws();
  expect(initial).toBeGreaterThan(0);
  await frames(page, 12);
  expect(await draws()).toBe(initial);
  await page.evaluate(() => scrollTo(0, 0));
  await frames(page);
  await page.locator('[data-fail-node]').evaluate((button: HTMLButtonElement) => button.click());
  await failed(page);
  await frames(page);
  expect(await draws()).toBe(initial);
  await visual(page).scrollIntoViewIfNeeded();
  await expect.poll(draws).toBeGreaterThan(initial);
  await frames(page);
  const visible = await draws();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    document.querySelector<HTMLButtonElement>('[data-infra-reset]')!.click();
  });
  await frames(page);
  expect(await draws()).toBe(visible);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(draws).toBeGreaterThan(visible);
  await expect(page.locator('[data-infra-workload]')).toContainText('node-02');
});
