import { test, expect } from '@playwright/test';
for (const project of ['cnesdata', 'limnopulse', 'infrastructure']) {
  test(`${project}: split layout and selection without navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/explore/${project}/`);
    const diagrams = page.locator('[data-component-diagram]');
    const total = await diagrams.count();
    const right = page.locator('.component-cards-right [data-component-detail]');
    const bottom = page.locator('.component-cards-bottom [data-component-detail]');
    await expect(right).toHaveCount(Math.ceil(total / 2));
    await expect(bottom).toHaveCount(Math.floor(total / 2));
    const mapBox = (await page.locator('[data-system-graph]').boundingBox())!;
    const rightBox = (await page.locator('.component-cards-right').boundingBox())!;
    const bottomBox = (await bottom.first().boundingBox())!;
    expect(rightBox.x).toBeGreaterThanOrEqual(mapBox.x + mapBox.width);
    expect(bottomBox.y).toBeGreaterThanOrEqual(Math.max(mapBox.y + mapBox.height, rightBox.y + rightBox.height));
    const controls = [diagrams.nth(1), page.locator('[data-component-card]').last(), page.locator('.card-relationships [data-component-select]').first()];
    for (const control of controls) {
      for (const action of ['click', 'Enter', 'Space']) {
        await control.scrollIntoViewIfNeeded();
        await control.focus();
        const before = await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }));
        if (action === 'click') await control.click();
        else await control.press(action);
        const id = await control.getAttribute('data-component-select');
        await expect(page.locator(`[data-component-diagram="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(`[data-component-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator(`[data-component-detail="${id}"]`)).toHaveAttribute('data-selected', 'true');
        await expect(control).toBeFocused();
        expect(await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }))).toEqual(before);
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/${project}-1440.png`, fullPage: true });
    const id = await diagrams.nth(1).getAttribute('data-component-select');
    await page.goto('/about/');
    await page.goto(`/explore/${project}/#component-${id}`);
    await expect(page.locator(`[data-component-card="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`[data-component-detail="${id}"]`)).not.toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/explore/${project}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const mobileMap = (await page.locator('[data-system-graph]').boundingBox())!;
    const mobileRight = (await right.first().boundingBox())!;
    expect(mobileRight.y).toBeGreaterThan(mobileMap.y + mobileMap.height);
    for (let i = 1; i < await bottom.count(); i++) {
      const previous = (await bottom.nth(i - 1).boundingBox())!;
      const current = (await bottom.nth(i).boundingBox())!;
      expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
      expect(current.x).toBe(previous.x);
    }
    await page.screenshot({ path: `test-results/${project}-390.png`, fullPage: true });
  });
}
