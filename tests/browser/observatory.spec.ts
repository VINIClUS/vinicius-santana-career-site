import { test, expect } from '@playwright/test';

const projects = {
  cnesdata: '/explore/cnesdata/',
  limnopulse: '/explore/limnopulse/',
  infrastructure: '/explore/infrastructure/',
} as const;
const domains = { 'public-health': '/#experience', observability: '/#stack' } as const;

test('the three projects support keyboard selection, canonical links, fragments and history', async ({ page }) => {
  await page.goto('/explore/');
  const selectors = page.locator('[data-district-link]');
  await expect(selectors).toHaveCount(3);
  await expect.poll(() => selectors.evaluateAll(links => links.map(link => link.getAttribute('data-district-link'))))
    .toEqual(['cnesdata', 'limnopulse', 'infrastructure']);
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  for (const [id, href] of Object.entries(projects)) {
    const link = page.locator(`[data-district-link="${id}"]`);
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#district-${id}$`));
    await expect(link).toHaveAttribute('aria-current', 'true');
    const detail = page.locator(`#district-${id}`);
    await expect(detail).toBeFocused();
    await expect(detail.locator(`a[href="${href}"]`)).toBeVisible();
  }
  await page.goBack();
  await expect(page.locator('[data-district-link="limnopulse"]')).toHaveAttribute('aria-current', 'true');
  await page.goForward();
  await expect(page.locator('#district-infrastructure')).toBeFocused();
});

test('unknown fragments clear selection and legacy domain fragments replace the route', async ({ page }) => {
  await page.goto('/explore/#district-cnesdata');
  await expect(page.locator('[data-district-link="cnesdata"]')).toHaveAttribute('aria-current', 'true');
  await page.evaluate(() => { location.hash = '#district-unknown'; });
  await expect(page).toHaveURL(/#district-unknown$/);
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  await page.goto('/about/');
  await page.goto('/explore/#district-public-health');
  await expect(page).toHaveURL(/\/#experience$/);
  await expect(page.locator('#experience')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.goto('/explore/#district-observability');
  await expect(page).toHaveURL(/\/#stack$/);
  await expect(page.locator('#stack')).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`three projects stay usable at ${viewport.width}px without WebGL and with reduced motion`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
    const page = await context.newPage();
    const modelRequests: string[] = [];
    page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
    await page.goto('/explore/');
    await expect.poll(() => page.locator('[data-district-link]').evaluateAll(links => links.map(link => link.getAttribute('data-district-link'))))
      .toEqual(['cnesdata', 'limnopulse', 'infrastructure']);
    for (const id of Object.keys(projects)) {
      await page.locator(`[data-district-link="${id}"]`).tap();
      await expect(page.locator(`#district-${id}`)).toBeFocused();
      await expect(page.locator(`[data-district-link="${id}"]`)).toHaveAttribute('aria-current', 'true');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/explore/');
    await page.screenshot({ path: testInfo.outputPath(`observatory-${viewport.width}.png`), fullPage: true });
    expect(modelRequests).toEqual([]);
    await context.close();
  });

  test(`project summaries and secondary context survive without JavaScript at ${viewport.width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport });
    const page = await context.newPage();
    await page.goto('/explore/');
    await expect.poll(() => page.locator('[data-district-link]').evaluateAll(links => links.map(link => link.getAttribute('data-district-link'))))
      .toEqual(['cnesdata', 'limnopulse', 'infrastructure']);
    for (const [id, href] of Object.entries(projects)) {
      await page.locator(`a[href="#district-${id}"]`).click();
      await expect(page.locator(`#district-${id}:target`)).toHaveCount(1);
      await expect(page.locator(`[data-district-link="${id}"]`)).toHaveCSS('outline-style', 'solid');
      await expect(page.locator(`#district-${id} a[href="${href}"]`)).toBeVisible();
    }
    for (const [id, href] of Object.entries(domains)) {
      await expect(page.locator(`#district-${id}`)).toBeVisible();
      await expect(page.locator(`#district-${id} a[href="${href}"]`)).toBeVisible();
      await expect(page.locator(`[data-district-link="${id}"]`)).toHaveCount(0);
    }
    await page.locator('#district-public-health a[href="/#experience"]').click();
    await expect(page.locator('#experience')).toBeVisible();
    await page.goBack();
    await page.locator('#district-observability a[href="/#stack"]').click();
    await expect(page.locator('#stack')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}
