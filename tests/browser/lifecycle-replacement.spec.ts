import { test, expect } from '@playwright/test';
import { openTechnicalDetails } from './support/technical-details';

for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
  test(`${project}: lifecycle replaces every retired standalone demonstration`, async ({ page }) => {
    await page.goto(`/explore/${project}/#simulation`);
    await expect(page.locator('[data-lifecycle]')).toHaveCount(1);
    await expect(page.locator('#simulation[data-lifecycle]')).toBeVisible();
    await expect(page.locator('[data-life-replay]')).toBeEnabled();
    await expect(page.getByText('Synthetic demonstration', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Infrastructure failover', exact: true, includeHidden: true })).toHaveCount(0);
    await expect(page.locator('[data-step], [data-scenario], [data-reset], [id^="transcript-raw-"], [data-infrastructure-simulation], [data-fail-node], [data-infra-reset], #infra-title, [data-primitive-disclosure]')).toHaveCount(0);
  });
}

for (const width of [1440, 390, 320]) {
  test(`all System View cards form one vertical column at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : width === 320 ? 740 : 844 });
    for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
      await page.goto(`/explore/${project}/#system`);
      await openTechnicalDetails(page);
      await expect(page.locator('[data-component-cards]')).toHaveCount(1);
      const boxes = await page.locator('[data-component-detail]').evaluateAll(cards => cards.map(card => {
        const r = card.getBoundingClientRect(); return { x: r.x, right: r.right, y: r.y, bottom: r.bottom, width: r.width };
      }));
      for (const [index, box] of boxes.entries()) {
        expect(Math.abs(box.x - boxes[0].x)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(1);
        expect(box.right).toBeLessThanOrEqual(width);
        if (index) expect(box.y).toBeGreaterThanOrEqual(boxes[index - 1].bottom);
      }
      const graph = (await page.locator('[data-system-graph]').boundingBox())!;
      if (width === 1440) expect(boxes[0].x).toBeGreaterThanOrEqual(graph.x + graph.width);
      else expect(boxes[0].y).toBeGreaterThanOrEqual(graph.y + graph.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('[data-system-view]').screenshot({
        path: testInfo.outputPath(`${project}-${width}.png`),
        // Exclude fixed navigation from this component-only, full-height capture.
        style: '.site-header, .skip-link { visibility: hidden !important; }',
      });
    }
  });
}
