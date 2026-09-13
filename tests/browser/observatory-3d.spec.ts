import { test, expect, type Page, type Route } from '@playwright/test';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { districts, overview, type DistrictId } from '../../src/content/scenes/index.ts';
import { projectToPoster } from '../../src/features/explorer/observatory-projection.ts';

test.use({ hasTouch: true });

const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'] as const;
const stage = (page: Page) => page.locator('[data-observatory]');
const canvas = (page: Page) => page.locator('canvas[data-observatory-canvas]');
const selected = (page: Page, id: string) => page.locator(`[data-district-link="${id}"]`);
const ready = (page: Page) => expect(stage(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 15000 });
const regionOutlines = (page: Page) => page.locator('.observatory-regions:visible .region-selection').evaluateAll(polygons => polygons.map(element => {
  const polygon = element as SVGPolygonElement;
  const matrix = polygon.getScreenCTM()!;
  const bounds = polygon.closest('.observatory-map')!.getBoundingClientRect();
  return Array.from(polygon.points).map(point => {
    const screen = point.matrixTransform(matrix);
    return { x: screen.x - bounds.x, y: screen.y - bounds.y };
  });
}));

function disjoint(a: { x: number; y: number }[], b: { x: number; y: number }[]) {
  const cross = (p: typeof a[number], q: typeof a[number], r: typeof a[number]) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i]!, q = a[(i + 1) % a.length]!, r = b[j]!, s = b[(j + 1) % b.length]!;
    if (cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0) return false;
  }
  const inside = (point: typeof a[number], polygon: typeof a) => {
    let result = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const p = polygon[i]!, q = polygon[j]!;
      if ((p.y > point.y) !== (q.y > point.y) && point.x < (q.x - p.x) * (point.y - p.y) / (q.y - p.y) + p.x) result = !result;
    }
    return result;
  };
  return !inside(a[0]!, b) && !inside(b[0]!, a);
}

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

async function maquettePoint(page: Page, id: string) {
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  const layout = page.viewportSize()!.width <= 700 ? overview.layouts.mobile : overview.layouts.desktop;
  const district = id as DistrictId;
  const transform = new Matrix4().compose(new Vector3(...layout.placements[district]), new Quaternion().setFromEuler(new Euler(...layout.rotations[district])), new Vector3().setScalar(layout.districtScale));
  const point = projectToPoster(new Vector3(...districts[district].model.anchors.center!).applyMatrix4(transform).toArray(), layout.camera);
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error(`Missing project ${id}`);
  const x = box.x + box.width * point.x / 100, y = box.y + box.height * point.y / 100;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.matches('canvas[data-observatory-canvas]'), { x, y })).toBe(true);
  return { x, y };
}

async function clickMaquette(page: Page, id: string, tap = false) {
  const { x, y } = await maquettePoint(page, id);
  if (tap) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function clickHub(page: Page) {
  const box = await page.locator('.observatory-hub').boundingBox();
  if (!box) throw new Error('Missing hub');
  await page.mouse.click(box.x + box.width / 2, box.y - 15);
}

test('readiness waits for all four models, then ambient motion can pause', async ({ page }) => {
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
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBeGreaterThan(draws);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await frames(page);
  const paused = await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws);
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => (window as typeof window & { observatoryDraws: number }).observatoryDraws)).toBe(paused);
});

test('readable labels match the poster and stay inside the map at the camera limits', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  // This matrix compares authored geometry and camera limits; ambient playback has
  // dedicated running/paused coverage and should not add draws to every orbit step.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const measurements = [];
  const rectangles = () => page.locator('.observatory-map').evaluate(map => {
    const bounds = map.getBoundingClientRect();
    return [...map.querySelectorAll<HTMLElement>('[data-district-link]')].map(link => {
      const rect = link.getBoundingClientRect();
      return { id: link.dataset.districtLink, left: rect.left - bounds.left, top: rect.top - bounds.top, right: rect.right - bounds.left, bottom: rect.bottom - bounds.top, width: rect.width, height: rect.height, font: parseFloat(getComputedStyle(link).fontSize), panelWidth: bounds.width, panelHeight: bounds.height };
    });
  });
  const check = async (width: number, state: string) => {
    const boxes = await rectangles();
    const outlines = await regionOutlines(page);
    measurements.push({ width, state, boxes, outlines });
    expect(outlines).toHaveLength(3);
    for (let a = 0; a < outlines.length; a++) for (let b = a + 1; b < outlines.length; b++) {
      expect(disjoint(outlines[a]!, outlines[b]!), `${width} ${state}: region footprints overlap`).toBe(true);
    }
    for (const box of boxes) {
      expect(box.font, `${width} ${state} ${box.id}: readable name`).toBeGreaterThanOrEqual(14);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.left, `${width} ${state} ${box.id}: left`).toBeGreaterThanOrEqual(0);
      expect(box.top, `${width} ${state} ${box.id}: top`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${width} ${state} ${box.id}: right`).toBeLessThanOrEqual(box.panelWidth);
      expect(box.bottom, `${width} ${state} ${box.id}: bottom`).toBeLessThanOrEqual(box.panelHeight);
    }
    for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
      const x = boxes[a]!, y = boxes[b]!;
      expect(x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top, `${width} ${state}: ${x.id}/${y.id} collision`).toBe(true);
    }
    return boxes;
  };
  try {
    for (const width of [320, 360, 390, 700, 701, 768, 779, 780, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 701 ? 844 : 900 });
      const renderer = holdRequest(page, '**/_astro/renderer.*.js');
      await renderer.installed;
      await page.goto('/explore/');
      await renderer.arrived;
      const poster = await check(width, 'poster');
      renderer.release();
      await ready(page);
      await page.unroute('**/_astro/renderer.*.js');
      const runtime = await check(width, 'initial-3d');
      for (let i = 0; i < poster.length; i++) {
        expect(Math.abs(poster[i]!.left - runtime[i]!.left)).toBeLessThanOrEqual(2);
        expect(Math.abs(poster[i]!.top - runtime[i]!.top)).toBeLessThanOrEqual(2);
      }
      for (const zoom of ['zoom-out', 'zoom-in']) {
        await page.locator(`[data-scene-action="${zoom}"]`).evaluate(button => { for (let i = 0; i < 8; i++) (button as HTMLButtonElement).click(); });
        for (const horizontal of [-1, 1]) for (const vertical of [-1, 1]) {
          await page.locator('.observatory-map').scrollIntoViewIfNeeded();
          const box = (await canvas(page).boundingBox())!;
          const x = box.x + 12, y = box.y + 12;
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.mouse.move(x + horizontal * box.width * 3, y + vertical * box.height * 3, { steps: 3 });
          await page.mouse.up();
          await frames(page, 2);
          await check(width, `${zoom}/${horizontal}/${vertical}`);
        }
      }
      await page.locator('[data-scene-action="reset"]').evaluate(button => (button as HTMLButtonElement).click());
      const reset = await check(width, 'reset');
      for (let i = 0; i < runtime.length; i++) expect(reset[i]!.left).toBeCloseTo(runtime[i]!.left, 0);
    }
  } finally {
    await testInfo.attach('atlas-label-framing.json', { body: JSON.stringify(measurements, null, 2), contentType: 'application/json' });
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`selected fragment keeps poster and first complete 3D outlines aligned at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const renderer = holdRequest(page, '**/_astro/renderer.*.js');
    await renderer.installed;
    await page.goto('/explore/#district-cnesdata');
    await renderer.arrived;
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const poster = await regionOutlines(page);
    const authoredPoints = await page.locator('[data-region-points]').evaluateAll(polygons => polygons.map(polygon => polygon.getAttribute('points')));
    const outline = page.locator('.observatory-regions:visible [data-region="cnesdata"] .region-selection');
    await expect(outline).toHaveCSS('opacity', '1');
    await page.locator('.observatory-map').screenshot({ path: testInfo.outputPath(`fragment-poster-${viewport.width}.png`) });
    renderer.release();
    await ready(page);
    const runtime = await regionOutlines(page);
    for (let r = 0; r < 3; r++) for (let p = 0; p < poster[r]!.length; p++) {
      expect(Math.hypot(poster[r]![p]!.x - runtime[r]![p]!.x, poster[r]![p]!.y - runtime[r]![p]!.y)).toBeLessThanOrEqual(2);
    }
    await expect(outline).toHaveCSS('opacity', '1');
    await page.locator('.observatory-map').screenshot({ path: testInfo.outputPath(`fragment-first-3d-${viewport.width}.png`) });
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'View 2D', exact: true }).click();
    const fallback = await regionOutlines(page);
    expect(await page.locator('[data-region-points]').evaluateAll(polygons => polygons.map(polygon => polygon.getAttribute('points')))).toEqual(authoredPoints);
    for (let r = 0; r < 3; r++) for (let p = 0; p < poster[r]!.length; p++) {
      expect(Math.hypot(poster[r]![p]!.x - fallback[r]![p]!.x, poster[r]![p]!.y - fallback[r]![p]!.y)).toBeLessThanOrEqual(2);
    }
    await expect(outline).toHaveCSS('opacity', '1');
    await testInfo.attach('region-parity.json', { body: JSON.stringify({ viewport, poster, runtime, fallback }), contentType: 'application/json' });
  });
}

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
  await expect(page.locator('#district-limnopulse')).toBeVisible();
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
  for (const [index, id] of projectIds.entries()) {
    await page.locator('.observatory-map').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    if (index === 0) await clickMaquette(page, id);
    else await selected(page, id).click();
    await expect(selected(page, id)).toHaveAttribute('aria-current', 'true');
    await expect(page).toHaveURL(new RegExp(`#district-${id}$`));
    await expect(page.locator(`#district-${id}`)).toHaveAttribute('data-selected', 'true');
    expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThanOrEqual(1);
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

test('dragging away and back over a maquette does not activate it', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  const start = await maquettePoint(page, 'cnesdata');
  const historyLength = await page.evaluate(() => history.length);
  const scroll = await page.evaluate(() => scrollY);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 120, start.y + 80, { steps: 6 });
  await page.mouse.move(start.x, start.y, { steps: 6 });
  await page.mouse.up();
  await frames(page);
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  await expect(page).toHaveURL(/\/explore\/$/);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  await expect(page.locator('#district-cnesdata')).not.toBeFocused();

  await clickMaquette(page, 'cnesdata');
  await expect(selected(page, 'cnesdata')).toHaveAttribute('aria-current', 'true');
  await expect(page).toHaveURL(/#district-cnesdata$/);
});

test('native and mesh selection clear the previous target styling', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await clickMaquette(page, 'limnopulse');
  await expect(selected(page, 'limnopulse')).toHaveCSS('outline-style', 'solid');
  await selected(page, 'infrastructure').click();
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  await expect(selected(page, 'limnopulse')).toHaveCSS('outline-style', 'none');
  await expect(page.locator('#district-limnopulse')).toHaveCSS('outline-style', 'none');
});

test('project activation does not move focus into the non-modal panel', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await selected(page, 'cnesdata').focus();
  await page.keyboard.press('Enter');
  await expect(selected(page, 'cnesdata')).toBeFocused();
  await expect(page.locator('#district-cnesdata')).not.toBeFocused();
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

test('regional hover and keyboard focus remain transient beside a persistent selection', async ({ page }) => {
  await page.goto('/explore/');
  await ready(page);
  await selected(page, 'cnesdata').click();
  const historyLength = await page.evaluate(() => history.length);
  const selection = page.locator('.observatory-regions:visible [data-region="cnesdata"] .region-selection');
  const hover = page.locator('.observatory-regions:visible [data-region="limnopulse"] .region-highlight');
  const focus = page.locator('.observatory-regions:visible [data-region="infrastructure"] .region-highlight');
  await selected(page, 'limnopulse').hover();
  await expect(selection).toHaveCSS('opacity', '1');
  await expect(hover).toHaveCSS('opacity', '1');
  await page.keyboard.press('Tab');
  await selected(page, 'infrastructure').focus();
  await expect(focus).toHaveCSS('stroke', 'rgb(244, 229, 166)');
  await expect(selected(page, 'infrastructure')).toHaveCSS('outline-color', 'rgb(244, 229, 166)');
  await expect(selection).toHaveCSS('opacity', '1');
  await expect(page).toHaveURL(/#district-cnesdata$/);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  await page.mouse.move(2, 2);
  await selected(page, 'infrastructure').evaluate(link => (link as HTMLElement).blur());
  await expect(hover).toHaveCSS('opacity', '0');
  await expect(focus).toHaveCSS('opacity', '0');
  await expect(selection).toHaveCSS('opacity', '1');
});

for (const blocked of ['renderer', 'model']) {
  test(`rejects ${blocked} completion after the monotonic 15-second deadline`, async ({ page }) => {
    await page.addInitScript(() => {
      const state = window as typeof window & { advanceAtlasNow: () => void };
      const original = performance.now.bind(performance);
      let offset = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => original() + offset });
      state.advanceAtlasNow = () => { offset += 15_001; };
    });
    const held = holdRequest(page, blocked === 'renderer' ? '**/_astro/renderer.*.js' : '**/hub.glb');
    await held.installed;
    await page.goto('/explore/');
    await held.arrived;
    await page.evaluate(() => (window as typeof window & { advanceAtlasNow: () => void }).advanceAtlasNow());
    held.release();
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await expect(page.locator('.observatory-map picture')).toBeVisible();
  });
}

test('Atlas suspends hidden and offscreen redraws and resumes with current framing', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { atlasDraws: number; atlasVisibility: (value: DocumentVisibilityState) => void };
    state.atlasDraws = 0;
    for (const method of ['drawArrays', 'drawElements'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args: number[]) { state.atlasDraws++; return Reflect.apply(original, this, args); };
    }
    let visibility: DocumentVisibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    state.atlasVisibility = value => { visibility = value; document.dispatchEvent(new Event('visibilitychange')); };
  });
  const draws = () => page.evaluate(() => (window as typeof window & { atlasDraws: number }).atlasDraws);
  await page.goto('/explore/');
  await ready(page);
  await frames(page);
  await page.evaluate(() => (window as typeof window & { atlasVisibility: (value: DocumentVisibilityState) => void }).atlasVisibility('hidden'));
  const initial = await draws();
  await page.setViewportSize({ width: 1210, height: 800 });
  await page.waitForTimeout(2_000);
  expect(await draws()).toBe(initial);
  await page.evaluate(() => (window as typeof window & { atlasVisibility: (value: DocumentVisibilityState) => void }).atlasVisibility('visible'));
  await expect.poll(draws).toBeGreaterThan(initial);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '1000px';
    document.querySelector('[data-observatory]')!.append(spacer);
  });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.observatory-map')).not.toBeInViewport();
  await frames(page);
  const offscreen = await draws();
  await page.setViewportSize({ width: 360, height: 844 });
  await page.waitForTimeout(2_000);
  expect(await draws()).toBe(offscreen);
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  await expect.poll(draws).toBeGreaterThan(offscreen);
});

test('Atlas stays interactive and bounds-suspends redraws without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined });
    const state = window as typeof window & { atlasDraws: number };
    state.atlasDraws = 0;
    for (const method of ['drawArrays', 'drawElements'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args: number[]) { state.atlasDraws++; return Reflect.apply(original, this, args); };
    }
  });
  const draws = () => page.evaluate(() => (window as typeof window & { atlasDraws: number }).atlasDraws);
  await page.goto('/explore/');
  await ready(page);
  await clickMaquette(page, 'limnopulse');
  await expect(selected(page, 'limnopulse')).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  const positions = () => page.locator('[data-district-link]').evaluateAll(links => links.map(link => ({
    x: (link as HTMLElement).offsetLeft,
    y: (link as HTMLElement).offsetTop,
  })));
  const initial = await positions();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(positions).not.toEqual(initial);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const spacer = document.createElement('div');
    spacer.style.height = '1000px';
    document.querySelector('[data-observatory]')!.append(spacer);
  });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.observatory-map')).not.toBeInViewport();
  await frames(page);
  const offscreen = await draws();
  await page.setViewportSize({ width: 360, height: 844 });
  await page.waitForTimeout(2_000);
  expect(await draws()).toBe(offscreen);
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  await expect.poll(draws).toBeGreaterThan(offscreen);
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
  await expect(selected(page, 'cnesdata')).toBeFocused();
  await canvas(page).evaluate(element => (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
  await expect(selected(page, 'cnesdata')).toBeFocused();
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
  await expect(page.locator('#district-infrastructure')).toBeVisible();
  await expect(selected(page, 'infrastructure')).toHaveAttribute('aria-current', 'true');
  expect(await page.evaluate(() => (window as typeof window & { atlasFocusCalls: () => number }).atlasFocusCalls())).toBe(0);
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
    await expect(page.locator('#district-infrastructure')).toBeVisible();
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
    await expect(page.locator('#district-cnesdata')).toBeVisible();
    await expect(page.locator('#district-cnesdata a.button')).toHaveAttribute('href', '/explore/cnesdata/');
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
    expect((zoomed[1]!.x - zoomed[0]!.x) / (initial[1]!.x - initial[0]!.x)).toBeCloseTo(viewport.width === 390 ? 1.05 : 1.1, 1);
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
      const x = canvasBox!.x + canvasBox!.width * .9;
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
