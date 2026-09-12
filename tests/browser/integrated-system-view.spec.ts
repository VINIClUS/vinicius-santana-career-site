import { test, expect } from '@playwright/test';
import { projectDefinitions } from '../../src/features/explorer/projects.ts';

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
        await expect(view.locator('[data-graph-connector]')).toHaveCount(projectDefinitions[project].relations.length);
        for (const relation of projectDefinitions[project].relations) {
          const connector = view.locator(`[data-graph-connector][data-connector-from="${relation.from}"][data-connector-to="${relation.to}"]`);
          await expect(connector).toHaveCount(1);
          await expect(connector.locator('svg > path')).toHaveCount(1);
          await expect(view.locator(`[data-graph-node="${relation.from}"]`)).toHaveCount(1);
          await expect(view.locator(`[data-graph-node="${relation.to}"]`)).toHaveCount(1);
          const endpointDistances = await connector.evaluate((element, ids) => {
            const path = element.querySelector('svg > path')!;
            const svg = path.ownerSVGElement!;
            const matrix = svg.getScreenCTM()!;
            const point = (distance: number) => {
              const value = path.getPointAtLength(distance);
              return new DOMPoint(value.x, value.y).matrixTransform(matrix);
            };
            const distanceTo = (point: DOMPoint, node: Element) => {
              const box = node.getBoundingClientRect();
              const x = Math.max(box.left, Math.min(point.x, box.right));
              const y = Math.max(box.top, Math.min(point.y, box.bottom));
              return Math.hypot(point.x - x, point.y - y);
            };
            return [
              distanceTo(point(0), document.querySelector(`[data-graph-node="${ids.from}"]`)!),
              distanceTo(point(path.getTotalLength()), document.querySelector(`[data-graph-node="${ids.to}"]`)!),
            ];
          }, { from: relation.from, to: relation.to });
          expect(endpointDistances[0]).toBeLessThanOrEqual(3);
          expect(endpointDistances[1]).toBeLessThanOrEqual(3);
        }
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
