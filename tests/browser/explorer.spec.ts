import { test, expect } from '@playwright/test';

test('project navigation and keyboard component selection', async ({ page }) => {
  await page.goto('/explore/');
  await page.locator('[data-district-link="cnesdata"]').click();
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).click();
  const component = page.locator('[data-component-diagram]').nth(1);
  await component.focus();
  await page.keyboard.press('Enter');
  await expect(component).toHaveAttribute('aria-pressed', 'true');
  await expect(component).toBeFocused();
  for (const project of ['limnopulse', 'infrastructure']) {
    await page.locator(`nav[aria-label="Explorer projects"] a[href="/explore/${project}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/$`));
    await expect(page.locator('[data-component-diagram]')).not.toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Advance one attempt' })).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator(`a[href="/work/${project}/"]`)).toHaveCount(0);
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

test('canonical routes keep the primary detail selected at #system while simulations run', async ({ page }) => {
  for (const [project, primaryComponent] of [
    ['cnesdata', 'central-api'],
    ['limnopulse', 'evaluator'],
    ['infrastructure', 'reference-topology'],
  ]) {
    await page.goto(`/explore/${project}/`);
    await expect(page.locator(`[data-component-detail="${primaryComponent}"]`)).toBeVisible();
    await page.locator('a[href="#system"]').click();
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/#system$`));
    await expect(page.locator(`[data-component-detail="${primaryComponent}"]`)).toBeVisible();

    if (project === 'cnesdata') {
      await page.getByRole('button', { name: 'Advance one attempt' }).click();
      await expect(page.locator('[data-result]')).toContainText('stored');
    }
    if (project === 'infrastructure') {
      await page.getByRole('button', { name: 'Fail node-02' }).click();
      await expect(page.locator('[data-infra-workload]')).toContainText('node-01');
    }
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/#system$`));
  }
});

test('static navigation, details and every transcript without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/explore/');
  await page.locator('[data-district-link="cnesdata"]').click();
  await page.getByRole('link', { name: 'Explore CnesData', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-component-diagram]').nth(1)).toBeDisabled();
  await expect(page).toHaveURL(/\/explore\/cnesdata\/$/);
  await expect(page.locator('[data-component-detail]').nth(1)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance one attempt' })).toBeDisabled();
  for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
    await expect(page.locator(`#transcript-${id}`)).toBeVisible();
    await expect(page.locator(`#transcript-${id}`)).toContainText('synthetic-content-A');
  }
  for (const id of ['overview', 'system', 'simulation', 'engineering', 'results', 'evidence', 'limitations']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.getByLabel('Scenario')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reset scenario' })).toBeDisabled();
  await expect(page.locator('[data-system-view]')).toHaveCount(1);
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
  await page.locator('[data-component-diagram]').first().tap();
  await expect(page.locator('[data-component-diagram]').first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Advance one attempt' }).tap();
  await expect(page.locator('[data-result]')).toContainText('stored');
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(assets).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});

test('component selection keeps the detail panel usable at 360px', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();

  for (const [project, component] of [
    ['cnesdata', 'edge-agent'],
    ['limnopulse', 'mqtt-ingestion'],
    ['infrastructure', 'image-builds'],
  ]) {
    await page.goto(`/explore/${project}/`);
    const link = page.locator(`[data-component-diagram="${component}"]`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/explore/${project}/$`));
    await expect(page.locator(`[data-component-detail="${component}"]`)).toHaveAttribute('data-selected', 'true');
    await expect(page.locator(`[data-component-detail="${component}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await context.close();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 844 }]) {
  test(`direct component fragments initialize and reload their selected details at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);

    for (const [project, component] of [
      ['cnesdata', 'edge-agent'],
      ['limnopulse', 'mqtt-ingestion'],
      ['infrastructure', 'image-builds'],
    ]) {
      const destination = `/explore/${project}/#component-${component}`;
      const detail = page.locator(`[data-component-detail="${component}"]`);
      const link = page.locator(`[data-component-diagram="${component}"]`).first();

      await page.goto(destination);
      await expect(page.locator('[data-explorer]')).toHaveAttribute('data-controller-ready', 'true');
      await expect(page).toHaveURL(destination);
      await expect(link).toHaveAttribute('aria-pressed', 'true');
      await expect(detail).toHaveAttribute('data-selected', 'true');
      await expect(detail).toBeVisible();

      await page.reload();
      await expect(page.locator('[data-explorer]')).toHaveAttribute('data-controller-ready', 'true');
      await expect(page).toHaveURL(destination);
      await expect(link).toHaveAttribute('aria-pressed', 'true');
      await expect(detail).toHaveAttribute('data-selected', 'true');
      await expect(detail).toBeVisible();
    }
  });
}

test('system views retain components, connectors, evidence status and transcripts without JavaScript at 360px', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 360, height: 844 }, javaScriptEnabled: false });
  const page = await context.newPage();

  for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
    await page.goto(`/explore/${project}/`);
    await expect(page.locator('[data-component-detail]')).not.toHaveCount(0);
    await expect(page.locator('[data-component-detail]').last()).toBeVisible();
    await expect(page.locator('[data-graph-connector]').first()).toBeAttached();
    await expect(page.locator('[data-component-detail] .component-status')).toHaveCount(0);
    await expect(page.locator('#evidence .status').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  await page.goto('/explore/cnesdata/');
  for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
    await expect(page.locator(`#transcript-${id}`)).toBeVisible();
  }

  await context.close();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`canonical CnesData narrative, selection and all scenarios at ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const models: string[] = [];
    page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) models.push(request.url()); });
    await page.goto('/explore/cnesdata/');
    await expect(page).toHaveTitle('CnesData — Vinicius Santana');
    await expect(page.locator('a[href="/work/cnesdata/"]')).toHaveCount(0);
    for (const id of ['overview', 'system', 'simulation', 'engineering', 'results', 'evidence', 'limitations']) {
      await page.locator(`a[href="#${id}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    const first = page.locator('[data-component-diagram]').first();
    const second = page.locator('[data-component-diagram]').nth(1);
    const selectionURL = page.url();
    for (const control of [first, second]) {
      await control.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(selectionURL);
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      await expect(control).toBeFocused();
    }

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
    await expect(page.locator('[data-system-view]')).toHaveCount(1);
    await expect(page.locator('img[src*="detail-cnesdata"]')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(models).toEqual([]);
    await page.goto('/explore/cnesdata/');
    await page.screenshot({ path: testInfo.outputPath(`cnesdata-${viewport.width}.png`), fullPage: true });
  });
}
