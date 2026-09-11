import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`Infrastructure failure, transfer and reset at ${width}px`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    });
    const page = await context.newPage();
    const modelRequests: string[] = [];
    page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) modelRequests.push(request.url()); });
    await page.goto('/explore/infrastructure/');
    const simulation = page.locator('[data-infrastructure-simulation]');
    const poster = simulation.locator('[data-infra-poster]');
    const crop = width < 641 ? 'mobile' : 'desktop';
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-02');
    await expect(simulation.locator('[data-infra-timeline] li')).toHaveCount(0);
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`detail-infrastructure-${crop}.webp`);
    await simulation.getByRole('button', { name: 'Fail node-02', exact: true }).tap();
    await expect(simulation.locator('[data-infra-node="node-02"]')).toContainText('failed');
    for (const id of ['node-01', 'node-03']) await expect(simulation.locator(`[data-infra-node="${id}"]`)).toContainText('online');
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-01');
    await expect(simulation.locator('[data-infra-shared]')).toContainText('available');
    await expect(simulation.locator('[data-infra-timeline] li')).toHaveCount(3);
    await expect(simulation.locator('[data-infra-announcement]')).toHaveAttribute('aria-live', 'polite');
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`detail-infrastructure-failed-${crop}.webp`);
    await poster.evaluate((img: HTMLImageElement) => img.decode());
    await expect(simulation.getByRole('button', { name: 'Fail node-02', exact: true })).toBeDisabled();
    await page.locator('[data-component-link]').first().tap();
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-01');
    await simulation.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`infrastructure-failed-${width}.png`), fullPage: true });
    await simulation.getByRole('button', { name: 'Reset simulation', exact: true }).tap();
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-02');
    await expect(simulation.locator('[data-infra-node="node-02"]')).toContainText('online');
    await expect(simulation.locator('[data-infra-timeline] li')).toHaveCount(0);
    await expect.poll(() => poster.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`detail-infrastructure-${crop}.webp`);
    await expect(simulation.getByRole('button', { name: 'Fail node-02', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(modelRequests).toEqual([]);
    await context.close();
  });

  test(`Infrastructure has initial state and full transcript without JavaScript at ${width}px`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/explore/infrastructure/');
    const simulation = page.locator('[data-infrastructure-simulation]');
    await expect(simulation.getByRole('button', { name: 'Fail node-02', exact: true })).toBeDisabled();
    await expect(simulation.getByRole('button', { name: 'Reset simulation', exact: true })).toBeDisabled();
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-02');
    for (const id of ['node-01', 'node-02', 'node-03']) await expect(simulation.locator(`[data-infra-node="${id}"]`)).toContainText('online');
    await expect(simulation.locator('summary', { hasText: 'Scenario transcript' })).toBeVisible();
    await expect(simulation).toContainText('node-01');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`infrastructure-no-js-${width}.png`), fullPage: true });
    await context.close();
  });
}
