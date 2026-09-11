import { test, expect, type Page, type Route } from '@playwright/test';
import { OrthographicCamera, Spherical, Vector3 } from 'three';
import { overview } from '../../src/content/scenes/index.ts';

test.use({ hasTouch: true });

const districtIds = ['cnesdata', 'public-health', 'infrastructure', 'observability', 'limnopulse'];
const stage = (page: Page) => page.locator('[data-observatory]');
const canvas = (page: Page) => page.locator('canvas[data-observatory-canvas]');
const selected = (page: Page, id: string) => page.locator(`[data-district-link="${id}"]`);
const ready = (page: Page) => expect(stage(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 15000 });

function orbitProjection(width: number, height: number, mobile: boolean) {
  const layout = mobile ? overview.layouts.mobile : overview.layouts.desktop;
  const camera = new OrthographicCamera();
  Object.assign(camera, layout.camera.frustum);
  const target = new Vector3(...layout.camera.target);
  const orbit = new Spherical().setFromVector3(new Vector3(...layout.camera.position).sub(target));
  orbit.theta -= Math.PI / 12; // Dragging right/down reaches the independently expected -15°/-5° limits.
  orbit.phi -= Math.PI / 36;
  camera.position.setFromSpherical(orbit).add(target);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return districtIds.map(id => {
    const point = new Vector3(...layout.placements[id as keyof typeof layout.placements]).project(camera);
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
  });
}

async function frames(page: Page, count = 5) {
  await page.evaluate(async count => {
    for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
  }, count);
}

function holdRequest(page: Page, pattern: string, respond: (route: Route) => Promise<void> = route => route.continue()) {
  let release!: () => void;
  let requested!: (route: Route) => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const arrived = new Promise<Route>(resolve => { requested = resolve; });
  const installed = page.route(pattern, async route => {
    requested(route);
    await held;
    await respond(route).catch(() => {}); // Teardown deliberately aborts the request.
  });
  return { installed, arrived, release };
}

async function clickMaquette(page: Page, id: string, tap = false) {
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  const box = await selected(page, id).boundingBox();
  if (!box) throw new Error(`Missing district ${id}`);
  // Labels anchor at the district base; the exposed platform is just above it.
  if (tap) await page.touchscreen.tap(box.x + box.width / 2, box.y - 15);
  else await page.mouse.click(box.x + box.width / 2, box.y - 15);
}

test('capable browsers automatically render all six overview models before offering View 2D', async ({ page }) => {
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
  await expect(page.getByRole('button', { name: 'View 2D', exact: true })).toBeVisible();
  await expect(page.locator('[data-observatory]')).toHaveAttribute('data-scene-state', 'ready');
  await expect(page.locator('canvas[data-observatory-canvas]')).toBeVisible();
  expect(models.map(url => url.split('/').at(-1)).sort()).toEqual([
    'district-cnesdata.glb', 'district-infrastructure.glb', 'district-limnopulse.glb',
    'district-observability.glb', 'district-public-health.glb', 'hub.glb',
  ]);
  expect(await page.locator('canvas').evaluate(canvas => Boolean((canvas as HTMLCanvasElement).getContext('webgl2')))).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBeGreaterThan(0);
  await frames(page);
  const draws = await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws);
  await frames(page, 12);
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBe(draws);
});

test('poster and HTML navigation remain available until the last overview model arrives', async ({ page }) => {
  const hub = holdRequest(page, '**/hub.glb');
  await hub.installed;
  await page.goto('/explore/');
  await hub.arrived;
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'loading');
  await expect(page.locator('.observatory-map picture')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View 2D', exact: true })).toBeHidden();
  await selected(page, 'public-health').click();
  await expect(page.locator('#district-public-health')).toBeFocused();
  hub.release();
  await ready(page);
  await expect(selected(page, 'public-health')).toHaveAttribute('aria-current', 'true');
});

test('all five maquettes select the same HTML state and history without scrolling', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  for (const id of districtIds) {
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await clickMaquette(page, id);
    await expect(selected(page, id)).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(new RegExp(`#district-${id}$`));
    await expect(page.locator(`#district-${id}`)).toHaveAttribute('data-selected', 'true');
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
  }
  await page.goBack();
  await expect(selected(page, 'observability')).toHaveAttribute('aria-current', 'true');
  await page.goForward();
  await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
});

test('mixed HTML and mesh selection clears the previous native target highlight', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await selected(page, 'public-health').click();
  await expect(selected(page, 'public-health')).toHaveCSS('outline-style', 'solid');
  await clickMaquette(page, 'observability');
  await expect(selected(page, 'observability')).toHaveAttribute('aria-current', 'true');
  await expect(selected(page, 'public-health')).toHaveCSS('outline-style', 'none');
  await expect(page.locator('#district-public-health')).toHaveCSS('outline-style', 'none');
  await page.getByRole('button', { name: 'View 2D', exact: true }).click();
  await expect(selected(page, 'public-health')).toHaveCSS('outline-style', 'none');
  await expect(selected(page, 'observability')).toHaveAttribute('aria-current', 'true');
});

test('a native fragment does not steal focus after the reader moves to the next selector', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await page.evaluate(() => new Promise<void>(resolve => {
    const article = document.querySelector<HTMLElement>('#district-public-health')!;
    const next = document.querySelector<HTMLElement>('[data-district-link="observability"]')!;
    const originalFocus = HTMLElement.prototype.focus;
    let moved = false;
    // Advance after application focus, excluding the browser's earlier native target focus.
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
    document.querySelector<HTMLAnchorElement>('[data-district-link="public-health"]')!.click();
  }));
  await expect(selected(page, 'observability')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#district-observability$/);
});

test('context failure restores focus when a disappearing 3D control was focused', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await clickMaquette(page, 'observability');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).focus();
  await canvas(page).evaluate(canvas => {
    (canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(selected(page, 'observability')).toBeFocused();
  await page.reload();
  await ready(page);
  await selected(page, 'public-health').click();
  await expect(page.locator('#district-public-health')).toBeFocused();
  await canvas(page).evaluate(canvas => {
    (canvas as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(page.locator('#district-public-health')).toBeFocused();
});

test('details load only on selection, reuse downloads and ignore a late previous selection', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
  const cnes = holdRequest(page, '**/detail-cnesdata.glb');
  await cnes.installed;
  await page.goto('/explore/');
  await ready(page);
  expect(models.filter(url => url.includes('/detail-'))).toEqual([]);
  await clickMaquette(page, 'cnesdata');
  await cnes.arrived;
  const infrastructureLoaded = page.waitForResponse('**/detail-infrastructure.glb');
  await clickMaquette(page, 'infrastructure');
  await infrastructureLoaded;
  await frames(page, 12);
  const infrastructure = await canvas(page).screenshot();
  const cnesLoaded = page.waitForResponse('**/detail-cnesdata.glb');
  cnes.release();
  await cnesLoaded;
  await frames(page, 12);
  expect((await canvas(page).screenshot()).equals(infrastructure)).toBe(true);
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  await clickMaquette(page, 'cnesdata');
  await frames(page);
  expect((await canvas(page).screenshot()).equals(infrastructure)).toBe(false);
  await clickMaquette(page, 'observability');
  await clickMaquette(page, 'infrastructure');
  expect(models.filter(url => url.endsWith('/detail-cnesdata.glb'))).toHaveLength(1);
  expect(models.filter(url => url.endsWith('/detail-infrastructure.glb'))).toHaveLength(1);
});

for (const { failure, next } of [
  { failure: 'network', next: 'observability' },
  { failure: 'parse', next: 'infrastructure' },
]) {
  test(`superseded ${failure} detail failure keeps the current ${next} scene and permits retry`, async ({ page }) => {
    const cnes = holdRequest(page, '**/detail-cnesdata.glb', route => failure === 'network'
      ? route.abort()
      : route.fulfill({ status: 200, body: 'invalid GLB' }));
    await cnes.installed;
    await page.goto('/explore/');
    await ready(page);
    await clickMaquette(page, 'cnesdata');
    await cnes.arrived;
    const nextLoaded = next === 'infrastructure' ? page.waitForResponse('**/detail-infrastructure.glb') : undefined;
    await clickMaquette(page, next);
    if (nextLoaded) await (await nextLoaded).finished();
    await frames(page, 12);
    const current = await canvas(page).screenshot();
    const failed = page.waitForEvent(failure === 'network' ? 'requestfailed' : 'requestfinished', {
      predicate: request => request.url().endsWith('/detail-cnesdata.glb'),
    });
    cnes.release();
    await failed;
    await frames(page, 12);
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'ready');
    await expect(selected(page, next)).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(new RegExp(`#district-${next}$`));
    expect((await canvas(page).screenshot()).equals(current)).toBe(true);
    await expect(page.getByRole('button', { name: 'View 2D', exact: true })).toBeVisible();
    await page.unroute('**/detail-cnesdata.glb');
    const [retry] = await Promise.all([
      page.waitForResponse('**/detail-cnesdata.glb', { timeout: 5000 }),
      clickMaquette(page, 'cnesdata'),
    ]);
    expect(retry.ok()).toBe(true);
    await retry.finished();
    await frames(page, 12);
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'ready');
    await expect(selected(page, 'cnesdata')).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(/#district-cnesdata$/);
  });
}

test('View 2D aborts a pending detail, restores labels and preserves selection and focus', async ({ page }) => {
  const cnes = holdRequest(page, '**/detail-cnesdata.glb');
  const hub = holdRequest(page, '**/hub.glb');
  await cnes.installed;
  await hub.installed;
  await page.goto('/explore/');
  await hub.arrived;
  const posterStyles = await page.locator('[data-district-link]').evaluateAll(links => links.map(link => link.getAttribute('style')));
  hub.release();
  await ready(page);
  await clickMaquette(page, 'cnesdata');
  await cnes.arrived;
  const canceled = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/detail-cnesdata.glb') });
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await page.getByRole('button', { name: 'View 2D', exact: true }).click();
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(canvas(page)).toHaveCount(0);
  await expect(page.locator('.observatory-map picture')).toBeVisible();
  await expect(selected(page, 'cnesdata')).toBeFocused();
  await expect(selected(page, 'cnesdata')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/#district-cnesdata$/);
  expect(await page.locator('[data-district-link]').evaluateAll(links => links.map(link => link.getAttribute('style')))).toEqual(posterStyles);
  cnes.release();
  expect((await canceled).failure()?.errorText).toContain('ABORTED');
  await frames(page, 12);
  await selected(page, 'observability').click();
  await expect(page.locator('#district-observability')).toBeFocused();
  await page.goBack();
  await expect(selected(page, 'cnesdata')).toHaveAttribute('aria-current', 'true');
  await expect(canvas(page)).toHaveCount(0);
  await page.reload();
  await ready(page);
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
    await expect(page.locator('.observatory-map picture')).toBeVisible();
    await expect(canvas(page)).toHaveCount(0);
    expect(assets).toEqual([]);
  });
}

for (const failure of ['import', 'initialization', 'overview', 'detail', 'context']) {
  test(`${failure} failure returns to 2D with working district links`, async ({ page }) => {
    if (failure === 'import') await page.route('**/_astro/renderer.*.js', route => route.abort());
    if (failure === 'overview') await page.route('**/district-limnopulse.glb', route => route.fulfill({ status: 200, body: 'invalid GLB' }));
    if (failure === 'detail') await page.route('**/detail-cnesdata.glb', route => route.abort());
    if (failure === 'initialization') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      let calls = 0;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type === 'webgl2' && ++calls > 1) return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto('/explore/');
    if (failure === 'detail') {
      await ready(page);
      await clickMaquette(page, 'cnesdata');
    }
    if (failure === 'context') {
      await ready(page);
      await canvas(page).evaluate(canvas => {
        const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_lose_context');
        if (!extension) throw new Error('Real WebGL context-loss extension unavailable');
        extension.loseContext();
      });
    }
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await expect(page.locator('.observatory-map picture')).toBeVisible();
    await selected(page, 'public-health').click();
    await expect(page.locator('#district-public-health')).toBeFocused();
    await expect(page.locator('#district-public-health a')).toHaveAttribute('href', '/#experience');
    await frames(page);
    await expect(canvas(page)).toHaveCount(0);
  });
}

test('Home downloads no Observatory renderer or GLBs', async ({ page }) => {
  const assets: string[] = [];
  page.on('request', request => { if (/renderer\.|\.glb(?:$|\?)/.test(request.url())) assets.push(request.url()); });
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore systems', exact: true }).waitFor();
  await frames(page);
  expect(assets).toEqual([]);
});

test('leaving during a delayed renderer import cannot mount late on Home', async ({ page }) => {
  const renderer = holdRequest(page, '**/_astro/renderer.*.js');
  await renderer.installed;
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
  await page.goto('/explore/');
  await renderer.arrived;
  await page.goto('/');
  renderer.release();
  await frames(page, 12);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(models).toEqual([]);
  await page.goBack();
  await selected(page, 'observability').click();
  await expect(page.locator('#district-observability')).toBeFocused();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`camera controls, resize and reduced motion work at ${viewport.width}px`, async ({ page }, testInfo) => {
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
    expect((zoomed[1].x - zoomed[0].x) / (initial[1].x - initial[0].x)).toBeCloseTo(1.2, 1);
    await zoomIn.evaluate(button => (button as HTMLButtonElement).click());
    await frames(page);
    expect(await positions()).toEqual(zoomed);
    const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
    for (let i = 0; i < 8 && await zoomOut.isEnabled(); i++) await zoomOut.click();
    await frames(page);
    const minimum = await positions();
    expect((minimum[1].x - minimum[0].x) / (initial[1].x - initial[0].x)).toBeCloseTo(.9, 1);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await expect.poll(positions).toEqual(initial);
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const bounds = await canvas(page).boundingBox();
    await page.mouse.move(bounds!.x + 12, bounds!.y + 12);
    await page.mouse.down();
    await page.mouse.move(bounds!.x + bounds!.width * .6, bounds!.y + bounds!.height * .6, { steps: 12 });
    await page.mouse.up();
    await frames(page);
    const size = await page.locator('.observatory-map').evaluate(map => ({ width: map.clientWidth, height: map.clientHeight }));
    const expected = orbitProjection(size.width, size.height, viewport.width === 390);
    const orbited = await positions();
    for (let i = 0; i < expected.length; i++) {
      expect(Math.abs(orbited[i].x - expected[i].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(orbited[i].y - expected[i].y)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await expect.poll(positions).toEqual(initial);
    await frames(page);
    const still = await canvas(page).screenshot();
    await frames(page, 12);
    expect((await canvas(page).screenshot()).equals(still)).toBe(true);
    for (const link of await page.locator('[data-district-link]').all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); scrollTo(0, 0); });
    await frames(page);
    await page.screenshot({ path: testInfo.outputPath(`observatory-3d-${viewport.width}.png`), fullPage: true });
    await page.setViewportSize(viewport.width === 390 ? { width: 1440, height: 900 } : { width: 390, height: 844 });
    await frames(page);
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'ready');
    await clickMaquette(page, 'public-health', true);
    await expect(selected(page, 'public-health')).toHaveAttribute('aria-current', 'true');
  });
}
