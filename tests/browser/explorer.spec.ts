import { test, expect } from '@playwright/test';

test('project navigation and keyboard component selection', async ({ page }) => {
  await page.goto('/explore/');
  await page.locator('[data-district-link="cnesdata"]').click();
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).click();
  await page.getByText('Architecture and component details', { exact: true }).click();
  const component = page.locator('[data-component-diagram]').nth(1);
  await component.focus();
  await page.keyboard.press('Enter');
  await expect(component).toHaveAttribute('aria-pressed', 'true');
  await expect(component).toBeFocused();
  await expect(page.locator('[data-component-detail][data-selected="true"]')).toHaveCount(1);
  for (const project of ['limnopulse', 'infrastructure']) {
    await page.locator(`nav[aria-label="Explorer projects"] a[href="/explore/${project}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/$`));
    await expect(page.locator('[data-component-diagram]')).not.toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Advance one attempt' })).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator(`a[href="/work/${project}/"]`)).toBeVisible();
  }
});

test('conflict preserves A, reset and scenario change', async ({ page }) => {
  await page.goto('/explore/cnesdata/');
  await page.getByText('Raw object writing, replay and conflict', { exact: true }).click();
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
  await page.locator('[data-district-link="cnesdata"]').click();
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByText('Architecture and component details', { exact: true }).click();
  await page.getByText('Raw object writing, replay and conflict', { exact: true }).click();
  await expect(page.locator('[data-component-diagram]').nth(1)).toBeDisabled();
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
  await page.getByText('Architecture and component details', { exact: true }).tap();
  await page.getByText('Raw object writing, replay and conflict', { exact: true }).tap();
  await page.locator('[data-component-diagram]').first().tap();
  await expect(page.locator('[data-component-diagram]').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Advance one attempt' }).tap();
  await expect(page.locator('[data-result]')).toContainText('stored');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(assets).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});

for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
  test(`${project}: split layout and selection without navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/explore/${project}/`);
    await page.getByText('Architecture and component details', { exact: true }).click();
    const diagrams = page.locator('[data-component-diagram]');
    const total = await diagrams.count();
    const right = page.locator('.component-panel-right [data-component-detail]');
    const bottom = page.locator('.component-panel-bottom [data-component-detail]');
    await expect(right).toHaveCount(Math.ceil(total / 2));
    await expect(bottom).toHaveCount(Math.floor(total / 2));
    const mapBox = (await page.locator('.explorer-map').boundingBox())!;
    const rightBox = (await page.locator('.component-panel-right').boundingBox())!;
    const bottomBox = (await bottom.first().boundingBox())!;
    expect(rightBox.x).toBeGreaterThanOrEqual(mapBox.x + mapBox.width);
    expect(bottomBox.y).toBeGreaterThanOrEqual(Math.max(mapBox.y + mapBox.height, rightBox.y + rightBox.height));
    const controls = [diagrams.nth(1), page.locator('[data-component-card]').last(), page.locator('.relationship-list [data-component-select]').first(), page.locator('.component-relations [data-component-select]').first()];
    for (const control of controls) {
      for (const action of ['click', 'Enter', 'Space']) {
        await control.scrollIntoViewIfNeeded();
        await control.focus();
        const before = await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }));
        if (action === 'click') await control.click();
        else await control.press(action);
        const id = await control.getAttribute('data-component-select');
        await expect(page.locator(`[data-component-diagram="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(`[data-component-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(`[data-component-detail="${id}"]`)).toHaveAttribute('data-selected', 'true');
        await expect(control).toBeFocused();
        expect(await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }))).toEqual(before);
      }
    }
    await page.screenshot({ path: `test-results/${project}-1440.png`, fullPage: true });
    const id = await diagrams.nth(1).getAttribute('data-component-select');
    await page.goto('/about/');
    await page.goto(`/explore/${project}/#component-${id}`);
    await expect(page.locator(`[data-component-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-component-detail="${id}"]`)).not.toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/explore/${project}/`);
    await page.getByText('Architecture and component details', { exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const mobileMap = (await page.locator('.explorer-map').boundingBox())!;
    const mobileRight = (await right.first().boundingBox())!;
    expect(mobileRight.y).toBeGreaterThan(mobileMap.y + mobileMap.height);
    for (let i = 1; i < await bottom.count(); i++) {
      const previous = (await bottom.nth(i - 1).boundingBox())!;
      const current = (await bottom.nth(i).boundingBox())!;
      expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
      expect(current.x).toBe(previous.x);
    }
    await page.screenshot({ path: `test-results/${project}-390.png`, fullPage: true });
  });
}

test('all projects expose static details and only CnesData omits the case visual', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
    await page.goto(`/explore/${project}/`);
    await page.getByText('Architecture and component details', { exact: true }).click();
    const controls = page.locator('[data-component-select]');
    for (const control of await controls.all()) await expect(control).toBeDisabled();
    for (const detail of await page.locator('[data-component-detail]').all()) await expect(detail).toBeVisible();
    await expect(page.getByText('Back to architecture')).toHaveCount(0);
    await page.goto(`/work/${project}/`);
    if (project === 'cnesdata') await expect(page.locator('.visual-stage')).toHaveCount(0);
    else {
      const poster = page.locator('.visual-stage img');
      await expect(poster).toBeVisible();
      expect(await poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
  }
  await context.close();
});
