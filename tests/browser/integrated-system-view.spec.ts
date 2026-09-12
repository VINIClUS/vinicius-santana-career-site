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
            const matrix = path.ownerSVGElement!.getScreenCTM()!;
            const point = (distance: number) => {
              const value = path.getPointAtLength(distance);
              return new DOMPoint(value.x, value.y).matrixTransform(matrix);
            };
            const distanceTo = (candidate: DOMPoint, node: Element) => {
              const box = node.getBoundingClientRect();
              const x = Math.max(box.left, Math.min(candidate.x, box.right));
              const y = Math.max(box.top, Math.min(candidate.y, box.bottom));
              return Math.hypot(candidate.x - x, candidate.y - y);
            };
            const edgeDistance = (candidate: DOMPoint, node: Element) => {
              const box = node.getBoundingClientRect();
              return Math.min(Math.abs(candidate.x - box.left), Math.abs(candidate.x - box.right), Math.abs(candidate.y - box.top), Math.abs(candidate.y - box.bottom));
            };
            const end = path.getTotalLength();
            const source = document.querySelector(`[data-graph-node="${ids.from}"]`)!;
            const target = document.querySelector(`[data-graph-node="${ids.to}"]`)!;
            return [
              distanceTo(point(0), source),
              distanceTo(point(end), target),
              edgeDistance(point(0), source),
              edgeDistance(point(end), target),
              distanceTo(point(Math.max(0, end - 4)), target),
            ];
          }, { from: relation.from, to: relation.to });
          expect(endpointDistances[0]).toBeLessThanOrEqual(3);
          expect(endpointDistances[1]).toBeLessThanOrEqual(3);
          expect(endpointDistances[2]).toBeLessThanOrEqual(5);
          expect(endpointDistances[3]).toBeLessThanOrEqual(5);
          expect(endpointDistances[4]).toBeGreaterThan(3);
          const obstructions = await connector.evaluate(element => {
            const label = element.querySelector('[data-graph-edge-label]')!.getBoundingClientRect();
            const path = element.querySelector('svg > path')!;
            const matrix = path.ownerSVGElement!.getScreenCTM()!;
            const from = element.getAttribute('data-connector-from');
            const to = element.getAttribute('data-connector-to');
            const nodes = [...document.querySelectorAll<HTMLElement>('[data-graph-node]')];
            const overlappingLabels = nodes
              .filter(node => {
                const box = node.getBoundingClientRect();
                return !(label.right <= box.left || box.right <= label.left || label.bottom <= box.top || box.bottom <= label.top);
              })
              .map(node => node.dataset.graphNode);
            const unrelatedNodes = nodes.filter(node => ![from, to].includes(node.dataset.graphNode ?? null));
            const length = path.getTotalLength();
            const crossedNodes = unrelatedNodes
              .filter(node => {
                const box = node.getBoundingClientRect();
                return Array.from({ length: 99 }, (_, index) => path.getPointAtLength(length * (index + 1) / 100))
                  .map(point => new DOMPoint(point.x, point.y).matrixTransform(matrix))
                  .some(point => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom);
              })
              .map(node => node.dataset.graphNode);
            return { overlappingLabels, crossedNodes };
          });
          expect(obstructions, `${project}: ${relation.from} → ${relation.to}`).toEqual({ overlappingLabels: [], crossedNodes: [] });
        }
        if (project === 'limnopulse') {
          const forward = view.locator('[data-connector-from="alert-rules"][data-connector-to="evaluator"]');
          const reverse = view.locator('[data-connector-from="evaluator"][data-connector-to="alert-rules"]');
          const separation = await forward.evaluate(element => {
            const reverseElement = document.querySelector<HTMLElement>('[data-connector-from="evaluator"][data-connector-to="alert-rules"]')!;
            const path = element.querySelector('svg > path')!;
            const reversePath = reverseElement.querySelector('svg > path')!;
            const matrix = path.ownerSVGElement!.getScreenCTM()!;
            const point = (candidate: SVGPathElement, distance: number) => {
              const value = candidate.getPointAtLength(distance);
              return new DOMPoint(value.x, value.y).matrixTransform(matrix);
            };
            const a = point(path, path.getTotalLength() / 2);
            const b = point(reversePath, reversePath.getTotalLength() / 2);
            const firstLabel = element.querySelector('[data-graph-edge-label]')!.getBoundingClientRect();
            const secondLabel = reverseElement.querySelector('[data-graph-edge-label]')!.getBoundingClientRect();
            const overlap = !(firstLabel.right <= secondLabel.left || secondLabel.right <= firstLabel.left || firstLabel.bottom <= secondLabel.top || secondLabel.bottom <= firstLabel.top);
            return { pathDistance: Math.hypot(a.x - b.x, a.y - b.y), overlap };
          });
          await expect(reverse).toHaveCount(1);
          expect(separation.pathDistance).toBeGreaterThan(12);
          expect(separation.overlap).toBe(false);

          for (const selector of [
            '[data-connector-from="cloud-infrastructure"][data-connector-to="evaluator"]',
            '[data-connector-from="production-device-layer"][data-connector-to="mqtt-ingestion"]',
          ]) {
            const obstruction = await view.locator(selector).evaluate(element => {
              const path = element.querySelector('svg > path')!;
              const matrix = path.ownerSVGElement!.getScreenCTM()!;
              const label = element.querySelector('[data-graph-edge-label]')!.getBoundingClientRect();
              const from = element.getAttribute('data-connector-from');
              const to = element.getAttribute('data-connector-to');
              const blockers = [...document.querySelectorAll('[data-graph-node]')]
                .filter(node => ![from, to].includes((node as HTMLElement).dataset.graphNode ?? null))
                .map(node => node.getBoundingClientRect());
              const inside = (x: number, y: number) => blockers.some(blocker => x > blocker.left && x < blocker.right && y > blocker.top && y < blocker.bottom);
              const length = path.getTotalLength();
              const pathCrosses = Array.from({ length: 99 }, (_, index) => path.getPointAtLength(length * (index + 1) / 100))
                .map(point => new DOMPoint(point.x, point.y).matrixTransform(matrix))
                .some(point => inside(point.x, point.y));
              const labelOverlaps = blockers.some(blocker => !(label.right <= blocker.left || blocker.right <= label.left || label.bottom <= blocker.top || blocker.bottom <= label.top));
              return { pathCrosses, labelOverlaps };
            });
            expect(obstruction).toEqual({ pathCrosses: false, labelOverlaps: false });
          }
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
