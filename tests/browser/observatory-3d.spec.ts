import { test, expect, type Page, type Route } from '@playwright/test';

test.use({ hasTouch: true });

const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'] as const;
const stage = (page: Page) => page.locator('[data-observatory]');
const canvas = (page: Page) => page.locator('canvas[data-observatory-canvas]');
const selected = (page: Page, id: string) => page.locator(`[data-district-link="${id}"]`);
const ready = (page: Page) => expect(stage(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 15000 });

async function frames(page: Page, count = 5) {
  await page.evaluate(async count => { for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame); }, count);
}

function holdRequest(page: Page, pattern: string, respond: (route: Route) => Promise<void> = route => route.continue()) {
  let release!: () => void;
  let requested!: (route: Route) => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const arrived = new Promise<Route>(resolve => { requested = resolve; });
  const installed = page.route(pattern, async route => {
    requested(route);
    await held;
    await respond(route).catch(() => {});
  });
  return { installed, arrived, release };
}

async function clickMaquette(page: Page, id: string, tap = false) {
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  const box = await selected(page, id).boundingBox();
  if (!box) throw new Error(`Missing project ${id}`);
  if (tap) await page.touchscreen.tap(box.x + box.width / 2, box.y - 15);
  else await page.mouse.click(box.x + box.width / 2, box.y - 15);
}

async function clickHub(page: Page) {
  const box = await page.locator('.observatory-hub').boundingBox();
  if (!box) throw new Error('Missing hub');
  await page.mouse.click(box.x + box.width / 2, box.y - 15);
}

test('readiness waits for the hub and all three project models, then renders on demand', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { observatoryDraws: number };
    state.observatoryDraws = 0;
    for (const method of ['drawArrays', 'drawElements'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args: number[]) {
        state.observatoryDraws++;
        return Reflect.apply(original, this, args);
      };
    }
  });
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(new URL(request.url()).pathname); });
  await page.goto('/explore/');
  await ready(page);
  expect(models.map(url => url.split('/').at(-1)).sort()).toEqual([
    'district-cnesdata.glb', 'district-infrastructure.glb', 'district-limnopulse.glb', 'hub.glb',
  ]);
  expect(await canvas(page).evaluate(element => Boolean((element as HTMLCanvasElement).getContext('webgl2')))).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBeGreaterThan(0);
  await frames(page);
  const draws = await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws);
  await frames(page, 12);
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBe(draws);
});

test('View 2D and the poster remain visible while models load, with 3D controls disabled', async ({ page }) => {
  const hub = holdRequest(page, '**/hub.glb');
  await hub.installed;
  await page.goto('/explore/');
  await hub.arrived;
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'loading');
  await expect(page.locator('.observatory-map picture')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View 2D', exact: true })).toBeVisible();
  for (const name of ['Zoom in', 'Zoom out', 'Reset view']) await expect(page.getByRole('button', { name, exact: true })).toBeDisabled();
  await selected(page, 'limnopulse').click();
  await expect(page.locator('#district-limnopulse')).toBeFocused();
  hub.release();
  await ready(page);
  for (const name of ['Zoom in', 'Zoom out', 'Reset view']) await expect(page.getByRole('button', { name, exact: true })).toBeEnabled();
  await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
});

test('all project selections update state and history without requesting detail models', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
  await page.goto('/explore/');
  await ready(page);
  expect(models).toHaveLength(4);
  for (const id of projectIds) {
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await clickMaquette(page, id);
    await expect(selected(page, id)).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(new RegExp(`#district-${id}$`));
    await expect(page.locator(`#district-${id}`)).toHaveAttribute('data-selected', 'true');
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
  }
  await frames(page, 12);
  expect(models).toHaveLength(4);
  expect(models.some(url => url.includes('/detail-'))).toBe(false);
  await page.goBack();
  await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
  await page.goForward();
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  await clickHub(page);
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/#district-infrastructure$/);
});

test('native and mesh selection clear the previous target styling', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await selected(page, 'limnopulse').click();
  await expect(selected(page, 'limnopulse')).toHaveCSS('outline-style', 'solid');
  await clickMaquette(page, 'infrastructure');
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  await expect(selected(page, 'limnopulse')).toHaveCSS('outline-style', 'none');
  await expect(page.locator('#district-limnopulse')).toHaveCSS('outline-style', 'none');
});

test('late fragment focus does not override a reader who moved to the next selector', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await page.evaluate(() => new Promise<void>(resolve => {
    const article = document.querySelector<HTMLElement>('#district-cnesdata')!;
    const next = document.querySelector<HTMLElement>('[data-district-link="limnopulse"]')!;
    const originalFocus = HTMLElement.prototype.focus;
    let moved = false;
    HTMLElement.prototype.focus = function (options) {
      originalFocus.call(this, options);
      if (this === article && !moved) {
        moved = true;
        queueMicrotask(() => originalFocus.call(next));
      }
    };
    window.addEventListener('hashchange', () => setTimeout(() => {
      HTMLElement.prototype.focus = originalFocus;
      resolve();
    }, 0), { once: true });
    document.querySelector<HTMLAnchorElement>('[data-district-link="cnesdata"]')!.click();
  }));
  await expect(selected(page, 'limnopulse')).toBeFocused();
});

test('mesh selection does not steal canvas focus and an unknown fragment clears selection', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await canvas(page).evaluate(element => { (element as HTMLCanvasElement).tabIndex = 0; (element as HTMLCanvasElement).focus(); });
  await clickMaquette(page, 'cnesdata');
  await expect(canvas(page)).toBeFocused();
  await expect(page.locator('#district-cnesdata')).not.toBeFocused();
  await page.evaluate(() => { location.hash = '#district-unknown'; });
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
});

test('the single 15 second deadline includes renderer import and model completion', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));
  const renderer = holdRequest(page, '**/_astro/renderer.*.js');
  const hub = holdRequest(page, '**/hub.glb');
  await renderer.installed;
  await hub.installed;
  await page.goto('/explore/');
  await renderer.arrived;
  await page.clock.fastForward(10_000);
  renderer.release();
  await hub.arrived;
  await page.clock.fastForward(4_000);
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'loading');
  await page.clock.fastForward(1_000);
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  hub.release();
  await page.clock.resume();
  await frames(page, 12);
  await expect(canvas(page)).toHaveCount(0);
});

test('context loss restores focus only when the focused 3D control disappears', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await clickMaquette(page, 'infrastructure');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  await canvas(page).evaluate(element => (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(selected(page, 'infrastructure')).toBeFocused();

  await page.reload();
  await ready(page);
  await selected(page, 'cnesdata').click();
  await expect(page.locator('#district-cnesdata')).toBeFocused();
  await canvas(page).evaluate(element => (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(page.locator('#district-cnesdata')).toBeFocused();
});

test('View 2D restores poster labels while preserving selection, focus and history', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await clickMaquette(page, 'limnopulse');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  await page.getByRole('button', { name: 'View 2D', exact: true }).click();
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(selected(page, 'limnopulse')).toBeFocused();
  await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/#district-limnopulse$/);
  const restoredStyles = await page.locator('[data-district-link]').evaluateAll(links => links.map(link => link.getAttribute('style') ?? ''));
  expect(restoredStyles.every(style => !/(?:^|;)\s*(?:left|top):/.test(style))).toBe(true);
  await page.goBack();
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  await expect(canvas(page)).toHaveCount(0);
});

test('View 2D aborts essential downloads and ignores late arrivals', async ({ page }) => {
  const hub = holdRequest(page, '**/hub.glb');
  await hub.installed;
  await page.goto('/explore/');
  await hub.arrived;
  const canceled = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/hub.glb') });
  await page.getByRole('button', { name: 'View 2D', exact: true }).click();
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  hub.release();
  expect((await canceled).failure()?.errorText).toContain('ABORTED');
  await frames(page, 12);
  await expect(canvas(page)).toHaveCount(0);
  await expect(page.locator('.observatory-map picture')).toBeVisible();
});

test('pagehide aborts essential downloads and a persisted pageshow reconnects navigation once', async ({ page }) => {
  const hub = holdRequest(page, '**/hub.glb');
  await hub.installed;
  await page.goto('/explore/');
  await hub.arrived;
  const canceled = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/hub.glb') });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  hub.release();
  expect((await canceled).failure()?.errorText).toContain('ABORTED');
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await page.evaluate(() => {
    let focusCalls = 0;
    const target = document.querySelector<HTMLElement>('#district-infrastructure')!;
    const original = target.focus.bind(target);
    target.focus = options => { focusCalls++; original(options); };
    (window as typeof window & { atlasFocusCalls?: () => number }).atlasFocusCalls = () => focusCalls;
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await selected(page, 'infrastructure').click();
  await expect(page).toHaveURL(/#district-infrastructure$/);
  await expect(page.locator('#district-infrastructure')).toBeFocused();
  // Native fragments focus before hashchange; wait for the controller to handle selection.
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => (window as typeof window & { atlasFocusCalls: () => number }).atlasFocusCalls())).toBe(1);
  await expect(canvas(page)).toHaveCount(0);
});

for (const capability of ['save-data', 'no-webgl']) {
  test(`${capability} retains 2D without downloading the renderer or models`, async ({ page }) => {
    await page.addInitScript(capability => {
      if (capability === 'save-data') Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
      else HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    }, capability);
    const assets: string[] = [];
    page.on('request', request => { if (/renderer\.|\.glb(?:$|\?)/.test(request.url())) assets.push(request.url()); });
    await page.goto('/explore/');
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await selected(page, 'infrastructure').click();
    await expect(page.locator('#district-infrastructure')).toBeFocused();
    await expect(canvas(page)).toHaveCount(0);
    expect(assets).toEqual([]);
  });
}

for (const failure of ['import', 'initialization', 'overview', 'context']) {
  test(`${failure} failure returns to 2D with working project links`, async ({ page }) => {
    if (failure === 'import') await page.route('**/_astro/renderer.*.js', route => route.abort());
    if (failure === 'overview') await page.route('**/district-limnopulse.glb', route => route.fulfill({ status: 200, body: 'invalid GLB' }));
    if (failure === 'initialization') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      let calls = 0;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type === 'webgl2' && ++calls > 1) return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto('/explore/');
    if (failure === 'context') {
      await ready(page);
      await canvas(page).evaluate(element => {
        const extension = (element as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('Real WebGL context-loss extension unavailable');
        extension.loseContext();
      });
    }
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await selected(page, 'cnesdata').click();
    await expect(page.locator('#district-cnesdata')).toBeFocused();
    await expect(page.locator('#district-cnesdata a')).toHaveAttribute('href', '/explore/cnesdata/');
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`camera, resize and touch-scroll contracts work at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/explore/');
    await ready(page);
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const positions = () => page.locator('[data-district-link]').evaluateAll(links => links.map(link => ({ x: (link as HTMLElement).offsetLeft, y: (link as HTMLElement).offsetTop })));
    const initial = await positions();
    const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
    for (let i = 0; i < 8 && await zoomIn.isEnabled(); i++) await zoomIn.click();
    await frames(page);
    const zoomed = await positions();
    expect(zoomed).not.toEqual(initial);
    expect((zoomed[1]!.x - zoomed[0]!.x) / (initial[1]!.x - initial[0]!.x)).toBeCloseTo(1.2, 1);
    await zoomIn.evaluate(button => (button as HTMLButtonElement).click());
    await frames(page);
    expect(await positions()).toEqual(zoomed);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await expect.poll(positions).toEqual(initial);
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const bounds = await canvas(page).boundingBox();
    await page.mouse.move(bounds!.x + 12, bounds!.y + 12);
    await page.mouse.down();
    await page.mouse.move(bounds!.x + bounds!.width * .6, bounds!.y + bounds!.height * .6, { steps: 12 });
    await page.mouse.up();
    await frames(page);
    const orbited = await positions();
    expect(orbited).not.toEqual(initial);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await expect.poll(positions).toEqual(initial);
    if (viewport.width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      const before = await page.evaluate(() => scrollY);
      const client = await page.context().newCDPSession(page);
      const canvasBox = await canvas(page).boundingBox();
      const x = canvasBox!.x + canvasBox!.width / 2;
      const startY = Math.min(canvasBox!.y + canvasBox!.height - 20, viewport.height - 20);
      const endY = Math.max(canvasBox!.y + 20, startY - 300);
      expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.matches('canvas[data-observatory-canvas]'), { x, y: startY })).toBe(true);
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: endY }] });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    }
    for (const link of await page.locator('[data-district-link]').all()) {
      const box = await link.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
    await frames(page);
    await page.screenshot({ path: testInfo.outputPath(`observatory-3d-${viewport.width}.png`), fullPage: true });
    await page.setViewportSize(viewport.width === 390 ? { width: 1440, height: 900 } : { width: 390, height: 844 });
    await frames(page);
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'ready');
    await clickMaquette(page, 'limnopulse', true);
    await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
  });
}
