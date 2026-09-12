import { test, expect } from '@playwright/test';

const projects = ['cnesdata', 'limnopulse', 'infrastructure'] as const;

for (const project of projects) {
  test(`${project}: desktop connectors never cover component cards`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/explore/${project}/#system`);
    const intersections = await page.locator('[data-system-view]').evaluate(view => {
      const cards = [...view.querySelectorAll('.system-blocks a')].map(card => card.getBoundingClientRect());
      return [...view.querySelectorAll('.stage-arrow')].filter(arrow => {
        const box = arrow.getBoundingClientRect();
        return cards.some(card => box.left < card.right && box.right > card.left && box.top < card.bottom && box.bottom > card.top);
      }).map(arrow => arrow.textContent?.trim());
    });
    await page.locator('[data-system-view]').screenshot({ path: testInfo.outputPath(`${project}-desktop.png`) });
    expect(intersections).toEqual([]);
    const diagram = await page.locator('.system-diagram').boundingBox();
    const detail = await page.locator('.system-detail-panel').boundingBox();
    expect(diagram!.x + diagram!.width).toBeLessThan(detail!.x);
  });

  test(`${project}: diagram keyboard traversal retains focus and simulation state`, async ({ page }) => {
    await page.goto(`/explore/${project}/`);
    await expect(page.locator('[data-explorer]')).toHaveAttribute('data-controller-ready', 'true');
    if (project === 'cnesdata') await page.locator('[data-step]').click();
    if (project === 'infrastructure') await page.locator('[data-fail-node]').click();
    const simulation = page.locator(project === 'cnesdata' ? '[data-progress]' : '[data-infra-workload]');
    const before = project === 'limnopulse' ? null : await simulation.textContent();
    const controls = page.locator('.system-blocks [data-component-link]');
    const ids = await controls.evaluateAll(links => links.map(link => (link as HTMLElement).dataset.componentLink));
    await controls.first().focus();
    for (const [key, index] of [['ArrowRight', 1], ['ArrowRight', 2], ['End', ids.length - 1], ['ArrowRight', 0], ['ArrowLeft', ids.length - 1], ['Home', 0], ['ArrowDown', 1], ['ArrowUp', 0]] as const) {
      await page.keyboard.press(key);
      await expect(page).toHaveURL(new RegExp(`#component-${ids[index]}$`));
      await expect(controls.nth(index)).toBeFocused();
      await expect(controls.nth(index)).toHaveAttribute('aria-current', 'true');
      await expect(page.locator(`[data-component-detail="${ids[index]}"]`)).toBeVisible();
      await expect(page.locator('.system-blocks [aria-current="true"]')).toHaveCount(1);
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
    const relationshipLink = page.locator('.relationship-direction a').first();
    await relationshipLink.focus();
    const fragment = page.url();
    await page.keyboard.press('End');
    await expect(relationshipLink).toBeFocused();
    expect(page.url()).toBe(fragment);
  });
}

test('Infrastructure renders three parallel inputs directed only to reference topology', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/explore/infrastructure/#system');
  const edges = page.locator('.system-stages .stage-arrow');
  await expect(edges).toHaveCount(3);
  expect(await edges.evaluateAll(arrows => arrows.map(arrow => [arrow.getAttribute('data-connector-from'), arrow.getAttribute('data-connector-to')]).sort())).toEqual([
    ['ansible-contracts', 'reference-topology'],
    ['image-builds', 'reference-topology'],
    ['operations-automation', 'reference-topology'],
  ]);
  const inputs = page.locator('.system-stage').filter({ hasNot: page.locator('[data-component-link="reference-topology"]') });
  const positions = await inputs.evaluateAll(stages => stages.map(stage => stage.getBoundingClientRect().x));
  expect(new Set(positions).size).toBe(1);
  const target = await page.locator('.system-blocks [data-component-link="reference-topology"]').boundingBox();
  expect(target!.x).toBeGreaterThan(positions[0]);
});

test('relationship fallback announces direction without relying on its visual arrow', async ({ page }) => {
  await page.goto('/explore/infrastructure/');
  const directions = page.locator('.relationship-direction');
  for (const direction of await directions.all()) {
    expect(await direction.ariaSnapshot()).toMatch(/text: to/);
  }
});
