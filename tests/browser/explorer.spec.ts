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
    if (project === 'infrastructure') await expect(page.locator(`a[href="/work/${project}/"]`)).toHaveCount(0);
    else await expect(page.locator(`a[href="/work/${project}/"]`)).toBeVisible();
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
  for (const id of ['overview', 'architecture', 'engineering', 'results', 'evidence', 'limitations']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByLabel('Scenario')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset scenario' })).toBeDisabled();
  await expect(page.locator('img[src*="detail-cnesdata"]')).toBeVisible();
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`canonical CnesData narrative, history and all scenarios at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const models: string[] = [];
    page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) models.push(request.url()); });
    await page.goto('/explore/cnesdata/');
    await expect(page).toHaveTitle('CnesData — Vinicius Santana');
    await expect(page.locator('a[href="/work/cnesdata/"]')).toHaveCount(0);
    for (const id of ['overview', 'architecture', 'engineering', 'simulation', 'results', 'evidence', 'limitations']) {
      await page.locator(`a[href="#${id}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    const first = page.locator('[data-component-link]').first();
    const second = page.locator('[data-component-link]').nth(1);
    const firstHash = (await first.getAttribute('href'))!;
    const secondHash = (await second.getAttribute('href'))!;
    await first.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${firstHash}$`));
    await expect(first).toHaveAttribute('aria-current', 'true');
    await expect(page.locator(firstHash)).toBeFocused();
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${secondHash}$`));
    await expect(second).toHaveAttribute('aria-current', 'true');
    await expect(page.locator(secondHash)).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${firstHash}$`));
    await expect(page.locator(firstHash)).toBeFocused();
    await expect(first).toHaveAttribute('aria-current', 'true');
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`${secondHash}$`));
    await expect(page.locator(secondHash)).toBeFocused();

    const scenario = page.getByLabel('Scenario');
    const advance = page.getByRole('button', { name: 'Advance one attempt' });
    const expected = [
      ['raw-first-write', ['stored']],
      ['raw-identical-replay', ['stored', 'replayed']],
      ['raw-content-conflict', ['stored', 'conflict']],
    ] as const;
    for (const [id, outcomes] of expected) {
      await scenario.selectOption(id);
      await expect(page.locator('[data-objects]')).toHaveText('No objects stored.');
      for (const [index, outcome] of outcomes.entries()) {
        await advance.click();
        await expect(page.locator('[data-progress]')).toHaveText(`${index + 1} of ${outcomes.length} attempts · ${index + 1 === outcomes.length ? 'complete' : 'running'}`);
        await expect(page.locator('[data-result]')).toContainText(`Result: ${outcome}.`);
        await expect(page.locator('[data-objects] li')).toHaveCount(1);
        await expect(page.locator('[data-objects]')).toContainText('synthetic-content-A');
        await expect(page.locator('[data-objects]')).not.toContainText('synthetic-content-B');
        const transcriptStep = page.locator(`#transcript-${id} > ol > li`).nth(index);
        await expect(transcriptStep).toContainText(`Result: ${outcome}. Stored objects: 1.`);
        await expect(transcriptStep).toContainText('synthetic-content-A');
      }
      await expect(advance).toBeDisabled();
      await page.getByRole('button', { name: 'Reset scenario' }).click();
      await expect(scenario).toHaveValue(id);
      await expect(page.locator('[data-progress]')).toHaveText(`0 of ${outcomes.length} attempts · ready`);
      await expect(advance).toBeEnabled();
    }
    const poster = page.locator('img[src*="detail-cnesdata"]');
    await poster.scrollIntoViewIfNeeded();
    await expect(poster).toBeVisible();
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(models).toEqual([]);
    await page.goto('/explore/cnesdata/');
    await page.screenshot({ path: testInfo.outputPath(`cnesdata-${viewport.width}.png`), fullPage: true });
  });
}
