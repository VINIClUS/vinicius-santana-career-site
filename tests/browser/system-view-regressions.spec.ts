import { openTechnicalDetails } from './support/technical-details';
import { test, expect } from '@playwright/test';

const projects = ['cnesdata', 'limnopulse', 'infrastructure'] as const;

for (const project of projects) {
  test(`${project}: desktop graph and component cards remain side by side`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/explore/${project}/#system`);
    await openTechnicalDetails(page);
    await page.locator('[data-system-view]').screenshot({ path: testInfo.outputPath(`${project}-desktop.png`) });
    const diagram = await page.locator('[data-system-graph]').boundingBox();
    const detail = await page.locator('.component-cards-right').boundingBox();
    expect(diagram!.x + diagram!.width).toBeLessThan(detail!.x);
  });

  test(`${project}: native keyboard selection retains focus and lifecycle state`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/explore/${project}/`);
    await openTechnicalDetails(page);
    await expect(page.locator('[data-explorer]')).toHaveAttribute('data-controller-ready', 'true');
    await page.locator('[data-life-chapter="1"]').click();
    await expect(page.locator('[data-current-stage]')).toHaveAttribute('data-life-chapter', '1');
    const progress = page.locator('[data-life-progress]');
    const before = await progress.innerText();
    const controls = page.locator('[data-system-graph] [data-component-diagram]');
    const selectionURL = page.url();
    for (const [key, index] of [['Enter', 1], ['Space', 2], ['Enter', 0]] as const) {
      const control = controls.nth(index);
      await control.focus();
      const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      await page.keyboard.press(key);
      await expect(page).toHaveURL(selectionURL);
      await expect(control).toBeFocused();
      await expect(control).toHaveAttribute('aria-pressed', 'true');
      const id = await control.getAttribute('data-component-diagram');
      await expect(page.locator(`[data-component-detail="${id}"]`)).toHaveAttribute('data-selected', 'true');
      await expect(page.locator('[data-system-graph] [aria-pressed="true"]')).toHaveCount(1);
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    }
    await expect(progress).toHaveText(before);
    await page.locator('[data-life-replay]').click();
    await expect(page.locator('[data-current-stage]')).toHaveAttribute('data-life-chapter', '0');
    await expect(progress).toContainText('operation 1 /');
    await expect(controls.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-component-cards] a')).toHaveCount(0);
  });
}

test('Limnopulse stacks before the parent chapter narrows its graph column', async ({ page }) => {
  await page.setViewportSize({ width: 901, height: 900 });
  await page.goto('/explore/limnopulse/#component-production-device-layer');
  await openTechnicalDetails(page);
  const diagram = await page.locator('[data-system-graph]').boundingBox();
  const detail = await page.locator('.component-cards-right').boundingBox();
  expect(diagram!.y + diagram!.height).toBeLessThan(detail!.y);
  const selectedNode = page.locator('[data-component-diagram="production-device-layer"]');
  expect(await selectedNode.evaluate(node => node.scrollHeight <= node.clientHeight)).toBe(true);
});

test('Infrastructure renders three parallel inputs directed only to reference topology', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/explore/infrastructure/#system');
  await openTechnicalDetails(page);
  const edges = page.locator('[data-system-graph] [data-graph-connector]');
  await expect(edges).toHaveCount(3);
  expect(await edges.evaluateAll(arrows => arrows.map(arrow => [arrow.getAttribute('data-connector-from'), arrow.getAttribute('data-connector-to')]).sort())).toEqual([
    ['ansible-contracts', 'reference-topology'],
    ['image-builds', 'reference-topology'],
    ['operations-automation', 'reference-topology'],
  ]);
  const inputs = page.locator('[data-graph-node="ansible-contracts"], [data-graph-node="image-builds"], [data-graph-node="operations-automation"]');
  const positions = await inputs.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().x));
  expect(new Set(positions).size).toBe(1);
  const target = await page.locator('[data-graph-node="reference-topology"]').boundingBox();
  expect(target!.x).toBeGreaterThan(positions[0]);
});

test('connector labels paint above every connector path', async ({ page }) => {
  await page.goto('/explore/cnesdata/#system');
  await openTechnicalDetails(page);
  const layers = await page.locator('[data-graph-connector]').evaluateAll(connectors => connectors.map(connector => ({
    connector: getComputedStyle(connector).zIndex,
    path: getComputedStyle(connector.querySelector('svg')!).zIndex,
    label: getComputedStyle(connector.querySelector('[data-graph-edge-label]')!).zIndex,
  })));
  expect(layers.every(layer => layer.connector === 'auto' && layer.path === 'auto' && Number(layer.label) > 0)).toBe(true);
});

test('connectors announce both endpoints without relying on their decorative arrows', async ({ page }) => {
  await page.goto('/explore/infrastructure/');
  await openTechnicalDetails(page);
  const connectors = page.locator('[data-graph-connector]');
  await expect(page.getByRole('img', { name: /Connection from .+ to .+:/ })).toHaveCount(3);
  for (const connector of await connectors.all()) {
    await expect(connector).toHaveAttribute('aria-label', /Connection from .+ to .+:/);
  }
});
