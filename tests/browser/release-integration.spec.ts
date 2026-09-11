import { test, expect, type Page } from '@playwright/test';

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

async function expectLoadedImagesAndNoHorizontalOverflow(page: Page) {
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

for (const viewport of viewports) {
  test(`SO-09 release journey at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    if (viewport.width < 820) {
      const menu = page.locator('[data-menu-toggle]');
      await menu.focus();
      await page.keyboard.press('Enter');
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('link', { name: 'Explore', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    }

    await page.locator('.hero-actions a[href="/work/"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/work\/$/);
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    for (const slug of ['cnesdata', 'limnopulse', 'infrastructure']) {
      const project = page.locator(`.visual-work-card a[href="/work/${slug}/"]`);
      await project.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/work/${slug}/$`));
      await expect(page.locator('.visual-stage img')).toBeVisible();
      await expectLoadedImagesAndNoHorizontalOverflow(page);
      await page.locator('.case-footer a[href="/work/"]').click();
      await expect(page).toHaveURL(/\/work\/$/);
    }

    await page.getByRole('link', { name: 'Explore', exact: true }).click();
    await expect(page).toHaveURL(/\/explore\/$/);
    await expect(page.locator('[data-observatory]')).toHaveAttribute('data-scene-state', 'ready', { timeout: 15000 });
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    const infrastructureDistrict = page.locator('[data-district-link="infrastructure"]');
    await infrastructureDistrict.focus();
    await page.keyboard.press('Enter');
    await expect(infrastructureDistrict).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#district-infrastructure')).toBeFocused();
    await page.locator('#district-infrastructure a[href="/explore/infrastructure/"]').click();
    await expect(page).toHaveURL(/\/explore\/infrastructure\/$/);

    const simulation = page.locator('[data-infrastructure-simulation]');
    await simulation.getByRole('button', { name: 'Fail node-02', exact: true }).click();
    await expect(simulation.locator('[data-infra-node="node-02"]')).toContainText('failed');
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-01');
    await simulation.getByRole('button', { name: 'Reset simulation', exact: true }).click();
    await expect(simulation.locator('[data-infra-node="node-02"]')).toContainText('online');
    await expect(simulation.locator('[data-infra-workload]')).toContainText('node-02');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'All systems', exact: true }).click();
    await expect(page).toHaveURL(/\/explore\/$/);
    await page.getByRole('button', { name: 'View 2D', exact: true }).click();
    await expect(page.locator('[data-observatory]')).toHaveAttribute('data-scene-state', 'fallback');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'About', exact: true }).click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.locator('body')).toHaveClass(/\bobservatory\b/);
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'Resume', exact: true }).click();
    await expect(page).toHaveURL(/\/resume\/$/);
    await expect(page.getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute('aria-current', 'page');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'Contact', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.getByRole('heading', { name: 'A quick path to the practical details.', exact: true })).toBeVisible();
    await expectLoadedImagesAndNoHorizontalOverflow(page);
  });
}
