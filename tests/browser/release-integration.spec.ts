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

async function activatePrimaryNavigation(page: Page, href: string, mobile: boolean) {
  if (mobile) {
    const menu = page.locator('[data-menu-toggle]');
    await menu.focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
  }
  const link = page.locator(`nav[aria-label="Primary navigation"] a[href="${href}"]`);
  await link.focus({ timeout: 5_000 });
  await page.keyboard.press('Enter');
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
      await expect(page.getByRole('link', { name: 'Work', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    }

    await page.getByRole('link', { name: 'Explore my work', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/explore\/$/);
    for (const slug of ['cnesdata', 'limnopulse', 'infrastructure']) {
      const project = page.locator(`[data-district-link="${slug}"]`);
      await project.focus();
      await page.keyboard.press('Enter');
      await expect(project).toHaveAttribute('aria-current', 'true');
      await expect(page.locator(`#district-${slug}`)).toBeFocused();
      const projectLink = page.locator(`#district-${slug} a[href="/explore/${slug}/"]`);
      await projectLink.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(`/explore/${slug}/$`));
      await expectLoadedImagesAndNoHorizontalOverflow(page);
      await page.getByRole('navigation', { name: 'Case study navigation' }).getByRole('link', { name: /Back to Atlas/ }).click();
      await expect(page).toHaveURL(/\/explore\/$/);
    }

    await activatePrimaryNavigation(page, '/explore/', viewport.width < 820);
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

    await page.getByRole('navigation', { name: 'Case study navigation', exact: true }).getByRole('link', { name: 'Back to Atlas', exact: false }).click();
    await expect(page).toHaveURL(/\/explore\/$/);
    await page.getByRole('button', { name: 'View 2D', exact: true }).click();
    await expect(page.locator('[data-observatory]')).toHaveAttribute('data-scene-state', 'fallback');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await activatePrimaryNavigation(page, '/about/', viewport.width < 820);
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.locator('body')).toHaveClass(/\bobservatory\b/);
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await activatePrimaryNavigation(page, '/resume/', viewport.width < 820);
    await expect(page).toHaveURL(/\/resume\/$/);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute('aria-current', 'page');
    await expectLoadedImagesAndNoHorizontalOverflow(page);

    await activatePrimaryNavigation(page, '/#contact', viewport.width < 820);
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.getByRole('heading', { name: 'A quick path to the practical details.', exact: true })).toBeVisible();
    await expectLoadedImagesAndNoHorizontalOverflow(page);
  });
}
