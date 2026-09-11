import { test, expect } from '@playwright/test';

const destinations = {
  cnesdata: '/explore/cnesdata/',
  'public-health': '/#experience',
  infrastructure: '/explore/infrastructure/',
  observability: '/#stack',
  limnopulse: '/explore/limnopulse/',
};

test('all five districts support keyboard selection, links, fragments and history', async ({ page }) => {
  await page.goto('/explore/');
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  for (const [id, href] of Object.entries(destinations)) {
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
  await expect(page.locator('[data-district-link="observability"]')).toHaveAttribute('aria-current', 'true');
  await page.goForward();
  await expect(page.locator('#district-limnopulse')).toBeFocused();
  await page.goto('/explore/#district-unknown');
  await expect(page.locator('[data-district-link][aria-current]')).toHaveCount(0);
  await page.goto('/explore/#district-public-health');
  await expect(page.locator('#district-public-health')).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`five districts stay usable at ${width}px without WebGL and with reduced motion`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    });
    const page = await context.newPage();
    const modelRequests: string[] = [];
    page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
    await page.goto('/explore/');
    for (const id of Object.keys(destinations)) {
      await page.locator(`[data-district-link="${id}"]`).tap();
      await expect(page.locator(`#district-${id}`)).toBeFocused();
      await expect(page.locator(`[data-district-link="${id}"]`)).toHaveAttribute('aria-current', 'true');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/explore/');
    await page.screenshot({ path: testInfo.outputPath(`observatory-${width}.png`), fullPage: true });
    expect(modelRequests).toEqual([]);
    await context.close();
  });

  test(`five district articles and domain destinations work without JavaScript at ${width}px`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto('/explore/');
    for (const [id, href] of Object.entries(destinations)) {
      await page.locator(`a[href="#district-${id}"]`).click();
      await expect(page.locator(`#district-${id}`)).toBeVisible();
      await expect(page.locator(`#district-${id}:target`)).toHaveCount(1);
      await expect(page.locator(`[data-district-link="${id}"]`)).toHaveCSS('outline-style', 'solid');
      await expect(page.locator(`#district-${id} a[href="${href}"]`)).toBeVisible();
    }
    await page.locator('#district-public-health a[href="/#experience"]').click();
    await expect(page.locator('#experience')).toBeVisible();
    await page.goto('/explore/#district-observability');
    await page.locator('#district-observability a[href="/#stack"]').click();
    await expect(page.locator('#stack')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  });
}
