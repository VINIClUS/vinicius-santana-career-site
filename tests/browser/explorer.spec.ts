import { test, expect } from '@playwright/test';

test('project navigation and keyboard component selection', async ({ page }) => {
  await page.goto('/explore/');
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).click();
  const component = page.locator('[data-component-link]').nth(1);
  await component.focus();
  await page.keyboard.press('Enter');
  await expect(component).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-component-detail][data-selected="true"]')).toBeFocused();
  for (const project of ['limnopulse', 'infrastructure']) {
    await page.locator(`nav[aria-label="Explorer projects"] a[href="/explore/${project}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/$`));
    await expect(page.locator('[data-component-link]')).not.toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Advance one attempt' })).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator(`a[href="/work/${project}/"]`)).toBeVisible();
  }
});

test('conflict preserves A, reset and scenario change', async ({ page }) => {
  await page.goto('/explore/cnesdata/');
  const scenario = page.getByLabel('Scenario');
  const step = page.getByRole('button', { name: 'Advance one attempt' });
  await expect(step).toBeEnabled();
  await scenario.selectOption('raw-content-conflict');
  await step.click();
  await expect(page.locator('[data-progress]')).toHaveText('1 of 2 attempts · running');
  await step.click();
  await expect(page.locator('[data-result]')).toContainText('conflict');
  await expect(page.locator('[data-objects]')).toContainText('synthetic-content-A');
  await expect(page.locator('[data-objects]')).not.toContainText('synthetic-content-B');
  await expect(step).toBeDisabled();
  await page.getByRole('button', { name: 'Reset scenario' }).click();
  await expect(scenario).toHaveValue('raw-content-conflict');
  await expect(page.locator('[data-progress]')).toHaveText('0 of 2 attempts · ready');
  await scenario.selectOption('raw-identical-replay');
  await step.click();
  await step.click();
  await expect(page.locator('[data-result]')).toContainText('replayed');
  await expect(page.locator('[data-objects] li')).toHaveCount(1);
});

test('static navigation, details and every transcript without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/explore/');
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).click();
  await page.locator('[data-component-link]').nth(1).click();
  await expect(page).toHaveURL(/#component-/);
  await expect(page.locator('[data-component-detail]').nth(1)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance one attempt' })).toBeDisabled();
  for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
    await expect(page.locator(`#transcript-${id}`)).toBeVisible();
    await expect(page.locator(`#transcript-${id}`)).toContainText('synthetic-content-A');
  }
  await page.locator('nav[aria-label="Explorer projects"] a[href="/explore/limnopulse/"]').click();
  await expect(page.getByRole('heading', { name: 'Limnopulse', exact: true })).toBeVisible();
  await context.close();
});

test('touch walkthrough remains usable without WebGL or 3D assets', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  const page = await context.newPage();
  const assets: string[] = [];
  page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) assets.push(request.url()); });
  await page.goto('/explore/cnesdata/');
  await page.locator('[data-component-link]').first().tap();
  await expect(page.locator('[data-component-link]').first()).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Advance one attempt' }).tap();
  await expect(page.locator('[data-result]')).toContainText('stored');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(assets).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});
