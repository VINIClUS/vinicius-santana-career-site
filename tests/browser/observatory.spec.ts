import { test, expect, type Page } from '@playwright/test';

const projects = ['cnesdata', 'limnopulse', 'infrastructure'];
const link = (page: Page, id: string) => page.locator(`[data-district-link="${id}"]`);
const panel = (page: Page, id: string) => page.locator(`[data-district-detail="${id}"]`);

test('project panel selection, replacement, closing and history stay coherent', async ({ page }) => {
  await page.goto('/explore/');
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  expect(await page.locator('[data-district-link]').evaluateAll(links => links.map(item => (item as HTMLElement).dataset.districtLink))).toEqual([
    'cnesdata', 'infrastructure', 'limnopulse',
  ]);

  await link(page, 'cnesdata').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#district-cnesdata$/);
  await expect(link(page, 'cnesdata')).toHaveAttribute('aria-current', 'true');
  await expect(link(page, 'cnesdata')).toHaveAttribute('aria-expanded', 'true');
  await expect(link(page, 'cnesdata')).toHaveAttribute('aria-controls', 'district-cnesdata');
  await expect(panel(page, 'cnesdata')).toBeVisible();
  await expect(link(page, 'cnesdata')).toBeFocused();

  await panel(page, 'cnesdata').getByRole('link', { name: 'Explore CnesData' }).focus();
  await page.goBack();
  await expect(panel(page, 'cnesdata')).toBeHidden();
  await expect(link(page, 'cnesdata')).toBeFocused();
  await page.goForward();
  await expect(panel(page, 'cnesdata')).toBeVisible();

  await link(page, 'limnopulse').click();
  await expect(page).toHaveURL(/#district-limnopulse$/);
  await expect(panel(page, 'cnesdata')).toBeHidden();
  await expect(panel(page, 'limnopulse')).toBeVisible();
  await panel(page, 'limnopulse').getByRole('link', { name: 'Explore Limnopulse' }).focus();
  await page.goBack();
  await expect(panel(page, 'cnesdata')).toBeVisible();
  await expect(link(page, 'cnesdata')).toBeFocused();
  await panel(page, 'cnesdata').getByRole('link', { name: 'Close CnesData panel' }).focus();
  await page.goForward();
  await expect(panel(page, 'limnopulse')).toBeVisible();
  await expect(link(page, 'limnopulse')).toBeFocused();

  await panel(page, 'limnopulse').getByRole('link', { name: 'Close Limnopulse panel' }).click();
  await expect(page).toHaveURL(/\/explore\/$/);
  await expect(page.locator('[data-district-detail]:visible')).toHaveCount(0);
  await expect(link(page, 'limnopulse')).toBeFocused();

  await link(page, 'infrastructure').click();
  await page.getByRole('heading', { name: 'Systems Atlas.' }).click();
  await expect(panel(page, 'infrastructure')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel(page, 'infrastructure')).toBeHidden();
  await expect(page).toHaveURL(/\/explore\/$/);

  await link(page, 'cnesdata').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(panel(page, 'cnesdata')).toBeHidden();
  await expect(page).toHaveURL(/\/explore\/$/);
});

test('mobile supports touch, project changes, closing, repeated activation and history', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/explore/#district-limnopulse');
  await expect(panel(page, 'limnopulse')).toBeVisible();
  await link(page, 'limnopulse').tap();
  await expect(panel(page, 'limnopulse')).toBeHidden();

  await link(page, 'infrastructure').tap();
  await expect(panel(page, 'infrastructure')).toBeVisible();
  await link(page, 'cnesdata').tap();
  await expect(panel(page, 'cnesdata')).toBeVisible();
  await page.goBack();
  await expect(panel(page, 'infrastructure')).toBeVisible();
  await page.goForward();
  await expect(panel(page, 'cnesdata')).toBeVisible();

  await panel(page, 'cnesdata').getByRole('link', { name: 'Close CnesData panel' }).tap();
  await expect(panel(page, 'cnesdata')).toBeHidden();
  await link(page, 'infrastructure').tap();
  await page.keyboard.press('Escape');
  await expect(panel(page, 'infrastructure')).toBeHidden();

  await link(page, 'cnesdata').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(panel(page, 'cnesdata')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('direct and invalid fragments synchronize only the three project panels', async ({ page }) => {
  for (const id of projects) {
    await page.goto(`/explore/#district-${id}`);
    await expect(panel(page, id)).toBeVisible();
    await expect(link(page, id)).toHaveAttribute('aria-current', 'true');
    await expect(link(page, id)).toHaveAttribute('aria-expanded', 'true');
    await expect(panel(page, id).getByRole('link', { name: /^Explore/ })).toHaveAttribute('href', `/explore/${id}/`);
  }
  for (const id of ['unknown', 'public-health', 'observability']) {
    await page.goto(`/explore/#district-${id}`);
    await expect(page.locator('[data-district-detail]:visible')).toHaveCount(0);
    await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`fallback panel works without WebGL at ${viewport.width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    });
    const page = await context.newPage();
    const models: string[] = [];
    page.on('request', request => { if (request.url().endsWith('.glb')) models.push(request.url()); });
    await page.goto('/explore/');
    await link(page, 'infrastructure').tap();
    await expect(panel(page, 'infrastructure')).toBeVisible();
    const geometry = await panel(page, 'infrastructure').evaluate(element => ({
      height: element.getBoundingClientRect().height,
      mapHeight: element.closest('.observatory-stage')!.getBoundingClientRect().height,
      overflowY: getComputedStyle(element).overflowY,
      transitionDuration: getComputedStyle(element).transitionDuration,
      width: getComputedStyle(element).width,
    }));
    if (viewport.width <= 700) expect(geometry.height).toBeLessThanOrEqual(geometry.mapHeight * .6 + 1);
    else expect(Number.parseFloat(geometry.width)).toBeGreaterThanOrEqual(320);
    expect(geometry.overflowY).toBe('auto');
    expect(geometry.transitionDuration.split(',').every(value => value.trim() === '0s')).toBe(true);
    await panel(page, 'infrastructure').getByRole('link', { name: /^Explore/ }).scrollIntoViewIfNeeded();
    await expect(panel(page, 'infrastructure').getByRole('link', { name: /^Explore/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(models).toEqual([]);
    await context.close();
  });

  test(`project panels remain fragment-accessible without JavaScript at ${viewport.width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport });
    const page = await context.newPage();
    await page.goto('/explore/');
    for (const id of projects) {
      await link(page, id).click();
      await expect(panel(page, id)).toBeVisible();
      await expect(panel(page, id)).toHaveCSS('pointer-events', 'auto');
      await expect(page.locator(`.observatory-regions:visible [data-region="${id}"] .region-selection`)).toHaveCSS('opacity', '1');
      await expect(panel(page, id).locator('li')).toHaveCount(4);
      await expect(panel(page, id).getByRole('link', { name: /^Explore/ })).toHaveAttribute('href', `/explore/${id}/`);
      await panel(page, id).getByRole('link', { name: /Close/ }).focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/explore\/$/);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}
