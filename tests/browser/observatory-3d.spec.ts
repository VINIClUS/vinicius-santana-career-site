import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true });

const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'];
const stage = (page: Page) => page.locator('[data-observatory]');
const canvas = (page: Page) => page.locator('canvas[data-observatory-canvas]');
const link = (page: Page, id: string) => page.locator(`[data-district-link="${id}"]`);
const panel = (page: Page, id: string) => page.locator(`[data-district-detail="${id}"]`);
const ready = (page: Page) => expect(stage(page)).toHaveAttribute('data-scene-state', 'ready', { timeout: 15000 });

async function frames(page: Page, count = 5) {
  await page.evaluate(async count => {
    for (let index = 0; index < count; index++) await new Promise(requestAnimationFrame);
  }, count);
}

async function clickMaquette(page: Page, id: string, tap = false) {
  await page.locator('.observatory-map').scrollIntoViewIfNeeded();
  const box = await link(page, id).boundingBox();
  if (!box) throw new Error(`Missing project ${id}`);
  if (tap) await page.touchscreen.tap(box.x + box.width / 2, box.y - 15);
  else await page.mouse.click(box.x + box.width / 2, box.y - 15);
}

test('3D overview loads only three project maquettes and the hub', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url().split('/').at(-1)!); });
  await page.goto('/explore/');
  await ready(page);
  expect(models.sort()).toEqual([
    'district-cnesdata.glb',
    'district-infrastructure.glb',
    'district-limnopulse.glb',
    'hub.glb',
  ]);
  await expect(canvas(page)).toBeVisible();
  expect(await page.locator('canvas').evaluate(element => Boolean((element as HTMLCanvasElement).getContext('webgl2')))).toBe(true);
});

test('maquette selection keeps geometry stable and synchronizes panels and history', async ({ page }) => {
  const models: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
  await page.goto('/explore/');
  await ready(page);
  const before = await canvas(page).screenshot();

  await clickMaquette(page, 'cnesdata');
  await expect(panel(page, 'cnesdata')).toBeVisible();
  await expect(link(page, 'cnesdata')).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(/#district-cnesdata$/);
  await frames(page);
  const selected = await canvas(page).screenshot();
  expect(selected.equals(before)).toBe(false);

  await clickMaquette(page, 'limnopulse');
  await expect(panel(page, 'limnopulse')).toBeVisible();
  await page.goBack();
  await expect(panel(page, 'cnesdata')).toBeVisible();
  await page.goForward();
  await expect(panel(page, 'limnopulse')).toBeVisible();
  await clickMaquette(page, 'limnopulse');
  await expect(page.locator('[data-district-detail]:visible')).toHaveCount(0);
  expect(models.some(url => url.includes('/detail-'))).toBe(false);
});

for (const failure of ['import', 'initialization'] as const) {
  test(`${failure} failure returns to the 2D poster with working panels`, async ({ page }) => {
    if (failure === 'import') await page.route('**/_astro/renderer.*.js', route => route.abort());
    if (failure === 'initialization') await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      let webglCalls = 0;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type === 'webgl2' && ++webglCalls > 1) return null;
        return Reflect.apply(getContext, this, [type, ...args]);
      } as typeof getContext;
    });
    await page.goto('/explore/');
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await link(page, 'cnesdata').click();
    await expect(panel(page, 'cnesdata')).toBeVisible();
  });
}

for (const failure of ['overview', 'context'] as const) {
  test(`${failure} failure returns to the 2D poster with working panels`, async ({ page }) => {
    if (failure === 'overview') await page.route('**/district-limnopulse.glb', route => route.fulfill({ status: 200, body: 'invalid GLB' }));
    await page.goto('/explore/');
    if (failure === 'context') {
      await ready(page);
      await canvas(page).evaluate(element => {
        (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
      });
    }
    await expect(stage(page)).toHaveAttribute('data-scene-state', 'fallback');
    await expect(canvas(page)).toHaveCount(0);
    await expect(page.locator('.observatory-map picture')).toBeVisible();
    await link(page, 'infrastructure').click();
    await expect(panel(page, 'infrastructure')).toBeVisible();
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`3D triangular layout stays contained at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('/explore/');
    await ready(page);
    for (const id of projectIds) {
      const bounds = await link(page, id).boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    }
    await clickMaquette(page, 'infrastructure', viewport.width <= 700);
    await expect(panel(page, 'infrastructure')).toBeVisible();
    await expect(panel(page, 'infrastructure')).toHaveCSS('opacity', '1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`observatory-panel-${viewport.width}.png`), fullPage: true });
  });
}
