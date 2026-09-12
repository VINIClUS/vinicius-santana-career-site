import { test, expect } from '@playwright/test';

const projects = [
  ['cnesdata', 7],
  ['limnopulse', 7],
  ['infrastructure', 4],
] as const;

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const javaScriptEnabled of [true, false]) {
    test(`integrated system views remain navigable at ${viewport.width}px with JavaScript ${javaScriptEnabled}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, viewport, javaScriptEnabled });
      const page = await context.newPage();

      for (const [project, components] of projects) {
        await page.goto(`/explore/${project}/`);
        const view = page.locator('[data-integrated-system-view]');
        await expect(view).toBeVisible();
        await expect(view.locator('[data-component-link]')).toHaveCount(components);
        await expect(view.locator('[data-component-detail]')).toHaveCount(components);
        await expect(view.locator('[data-graph-connector]')).not.toHaveCount(0);
        await expect(view.getByText('Relationships', { exact: true })).toHaveCount(0);
        await expect(view.locator('[data-component-detail] a')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        const firstNode = view.locator('[data-component-link]').first();
        const target = await firstNode.getAttribute('href');
        await firstNode.click();
        await expect(page).toHaveURL(new RegExp(`${target}$`));
        await expect(page.locator(target!)).toBeFocused();
        if (javaScriptEnabled) await expect(firstNode).toHaveAttribute('aria-current', 'true');
      }

      await context.close();
    });
  }
}
