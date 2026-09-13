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
        await expect(view.locator('[data-component-diagram]')).toHaveCount(components);
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
            const pathSamples = Array.from({ length: 99 }, (_, index) => path.getPointAtLength(length * (index + 1) / 100))
              .map(point => new DOMPoint(point.x, point.y).matrixTransform(matrix));
            const crossedNodes = unrelatedNodes
              .filter(node => {
                const box = node.getBoundingClientRect();
                return pathSamples.some(point => point.x > box.left && point.x < box.right && point.y > box.top && point.y < box.bottom);
              })
              .map(node => node.dataset.graphNode);
            const pathMissesLabel = !pathSamples.some(point => point.x >= label.left && point.x <= label.right && point.y >= label.top && point.y <= label.bottom);
            return { overlappingLabels, crossedNodes, pathMissesLabel };
          });
          expect(obstructions, `${project}: ${relation.from} → ${relation.to}`).toEqual({ overlappingLabels: [], crossedNodes: [], pathMissesLabel: false });
        }
        const labelCollisions = await view.locator('[data-graph-edge-label]').evaluateAll(labels => labels.flatMap((label, index) => {
          const box = label.getBoundingClientRect();
          const minimumGap = 4;
          return labels.slice(index + 1)
            .filter(candidate => {
              const candidateBox = candidate.getBoundingClientRect();
              return !(box.right + minimumGap <= candidateBox.left || candidateBox.right + minimumGap <= box.left || box.bottom + minimumGap <= candidateBox.top || candidateBox.bottom + minimumGap <= box.top);
            })
            .map(candidate => `${label.textContent?.trim()} / ${candidate.textContent?.trim()}`);
        }));
        expect(labelCollisions, `${project}: connector labels`).toEqual([]);
        if (project === 'limnopulse') {
          const bandHeadingCollisions = await view.locator('[data-graph-edge-label]').evaluateAll(labels => {
            const headings = [...document.querySelectorAll<HTMLElement>('.operational-bands h4')];
            const minimumGap = 4;
            const textBoxFor = (heading: HTMLElement) => {
              const range = document.createRange();
              range.selectNodeContents(heading);
              return range.getBoundingClientRect();
            };
            return labels.flatMap(label => {
              const box = label.getBoundingClientRect();
              return headings
                .filter(heading => {
                  const headingBox = textBoxFor(heading);
                  return !(box.right + minimumGap <= headingBox.left || headingBox.right + minimumGap <= box.left || box.bottom + minimumGap <= headingBox.top || headingBox.bottom + minimumGap <= box.top);
                })
                .map(heading => `${label.textContent?.trim()} / ${heading.textContent?.trim()}`);
            });
          });
          expect(bandHeadingCollisions, 'limnopulse: connector labels / band headings').toEqual([]);

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

        if (javaScriptEnabled) {
          for (const link of await view.locator('[data-component-diagram]').all()) {
            await link.click();
            const selectedContent = await link.evaluate(element => {
              const container = element.getBoundingClientRect();
              const children = [...element.children].filter(child => getComputedStyle(child).display !== 'none');
              const overflowingChildren = children
                .filter(child => {
                  const box = child.getBoundingClientRect();
                  return box.left < container.left || box.right > container.right || box.top < container.top || box.bottom > container.bottom;
                })
                .map(child => child.textContent?.trim());
              const overlappingChildren = children.flatMap((child, index) => {
                const box = child.getBoundingClientRect();
                return children.slice(index + 1)
                  .filter(candidate => {
                    const candidateBox = candidate.getBoundingClientRect();
                    return !(box.right <= candidateBox.left || candidateBox.right <= box.left || box.bottom <= candidateBox.top || candidateBox.bottom <= box.top);
                  })
                  .map(candidate => `${child.textContent?.trim()} / ${candidate.textContent?.trim()}`);
              });
              return { overflowingChildren, overlappingChildren };
            });
            expect(selectedContent, `${project}: selected ${await link.getAttribute('data-component-diagram')}`).toEqual({ overflowingChildren: [], overlappingChildren: [] });
          }
        }

        const firstNode = view.locator('[data-component-diagram]').first();
        const selectionURL = page.url();
        if (javaScriptEnabled) {
          await firstNode.click();
          await expect(firstNode).toHaveAttribute('aria-pressed', 'true');
          await expect(firstNode).toBeFocused();
        } else {
          await expect(firstNode).toBeDisabled();
          for (const control of await view.locator('[data-component-select]').all()) {
            await expect(control).toBeDisabled();
          }
        }
        await expect(page).toHaveURL(selectionURL);
      }

      await context.close();
    });
  }
}
