import { test, expect } from '@playwright/test';

const projects = ['cnesdata', 'limnopulse', 'infrastructure'] as const;

for (const project of projects) {
  test(`${project}: desktop graph and component cards remain side by side`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/explore/${project}/#system`);
    await page.locator('[data-system-view]').screenshot({ path: testInfo.outputPath(`${project}-desktop.png`) });
    const diagram = await page.locator('[data-system-graph]').boundingBox();
    const detail = await page.locator('[data-component-cards]').boundingBox();
    expect(diagram!.x + diagram!.width).toBeLessThan(detail!.x);
  });

  test(`${project}: diagram keyboard traversal retains focus and simulation state`, async ({ page }) => {
    await page.goto(`/explore/${project}/`);
    await expect(page.locator('[data-explorer]')).toHaveAttribute('data-controller-ready', 'true');
    if (project === 'cnesdata') await page.locator('[data-step]').click();
    if (project === 'infrastructure') await page.locator('[data-fail-node]').click();
    const simulation = page.locator(project === 'cnesdata' ? '[data-progress]' : '[data-infra-workload]');
    const before = project === 'limnopulse' ? null : await simulation.textContent();
    const controls = page.locator('[data-system-graph] [data-component-link]');
    const ids = await controls.evaluateAll(links => links.map(link => (link as HTMLElement).dataset.componentLink));
    await controls.first().focus();
    for (const [key, index] of [['ArrowRight', 1], ['ArrowRight', 2], ['End', ids.length - 1], ['ArrowRight', 0], ['ArrowLeft', ids.length - 1], ['Home', 0], ['ArrowDown', 1], ['ArrowUp', 0]] as const) {
      await page.keyboard.press(key);
      await expect(page).toHaveURL(new RegExp(`#component-${ids[index]}$`));
      await expect(controls.nth(index)).toBeFocused();
      await expect(controls.nth(index)).toHaveAttribute('aria-current', 'true');
      await expect(page.locator(`[data-component-detail="${ids[index]}"]`)).toBeVisible();
      await expect(page.locator('[data-system-graph] [aria-current="true"]')).toHaveCount(1);
    }
    if (before !== null) await expect(simulation).toHaveText(before);
    await page.goBack();
    await expect(page.locator(`[data-component-detail="${ids[1]}"]`)).toBeFocused();
    await expect(controls.nth(1)).toHaveAttribute('aria-current', 'true');
    await page.goForward();
    await expect(page.locator(`[data-component-detail="${ids[0]}"]`)).toBeFocused();
    await expect(controls.first()).toHaveAttribute('aria-current', 'true');
    if (before !== null) await expect(simulation).toHaveText(before);
    if (project !== 'limnopulse') {
      await page.locator(project === 'cnesdata' ? '[data-reset]' : '[data-infra-reset]').click();
      await expect(controls.first()).toHaveAttribute('aria-current', 'true');
    }
    await expect(page.locator('[data-component-cards] a')).toHaveCount(0);
  });
}

test('Infrastructure renders three parallel inputs directed only to reference topology', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/explore/infrastructure/#system');
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

test('connectors announce both endpoints without relying on their decorative arrows', async ({ page }) => {
  await page.goto('/explore/infrastructure/');
  const connectors = page.locator('[data-graph-connector]');
  for (const connector of await connectors.all()) {
    await expect(connector).toHaveAttribute('aria-label', /Connection from .+ to .+:/);
  }
});
