import { test, expect } from '@playwright/test';

test('Infrastructure keeps its failover simulation readable without a project visual asset', async ({ page }) => {
  const loadedAssets: string[] = [];
  page.on('request', request => {
    if (/detail-infrastructure|infrastructure-renderer|\.(?:glb|gltf|ktx2)(?:\?|$)/.test(request.url())) loadedAssets.push(request.url());
  });

  await page.goto('/explore/infrastructure/');
  const simulation = page.locator('[data-infrastructure-simulation]');
  const scheme = simulation.locator('[data-infra-scheme]');
  await expect(scheme).toBeVisible();
  await expect(scheme.locator('[data-infra-scheme-node]')).toHaveCount(3);
  await expect(scheme.locator('[data-infra-scheme-shared]')).toContainText('available');
  await expect(simulation.locator('canvas, picture, img, [data-infra-view]')).toHaveCount(0);

  await simulation.getByRole('button', { name: 'Fail node-02', exact: true }).click();
  await expect(scheme).toHaveAttribute('data-workload-node', 'node-01');
  await expect(scheme.locator('[data-infra-scheme-node="node-02"]')).toHaveAttribute('data-status', 'failed');
  await expect(simulation.locator('[data-infra-timeline] li')).toHaveCount(3);

  await simulation.getByRole('button', { name: 'Reset simulation', exact: true }).click();
  await expect(scheme).toHaveAttribute('data-workload-node', 'node-02');
  await expect(simulation.locator('[data-infra-timeline] li')).toHaveCount(0);
  expect(loadedAssets).toEqual([]);
});
