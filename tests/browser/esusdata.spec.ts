import { expect, test } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`Esusdata Atlas and case study remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
    });
    await page.goto('/explore/#district-esusdata');
    const selector = page.locator('[data-district-link="esusdata"]');
    await expect(selector).toBeVisible();
    await expect(page.locator('#district-esusdata')).toBeVisible();
    await expect(page.locator('[data-observatory] canvas')).toHaveCount(0);
    await expect(page.locator('[data-observatory] picture img')).toBeVisible();
    await page.locator('#district-esusdata a[href="/explore/esusdata/"]').click();
    await expect(page).toHaveURL(/\/explore\/esusdata\/$/);
    await expect(page.locator('h1')).toHaveText('Esusdata');
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.locator('script[src], link[href]').evaluateAll(elements => elements.map(element => element.getAttribute('src') ?? element.getAttribute('href')).filter(Boolean).some(url => /\.glb\b/.test(url!)))).toBe(false);
    const disclosure = page.locator('[data-component-disclosure]');
    await disclosure.locator('summary').click();
    const component = page.locator('[data-component-diagram="pec-source"]');
    await component.focus();
    await page.keyboard.press('Enter');
    await expect(component).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-component-detail="pec-source"]')).toHaveAttribute('data-selected', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('Esusdata transcript identifies target publication and current C1 blocker without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/explore/esusdata/');
  await expect(page.locator('canvas')).toHaveCount(0);
  const transcript = page.locator('.life-transcripts').first();
  await transcript.locator('summary').click();
  await expect(transcript).toContainText('60% / Ótimo');
  await expect(transcript).toContainText(/real C1 publication remains blocked/i);
  await context.close();
});

test('revoking a municipal grant hides the hypothetical panel and labels consultation as blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
  });
  await page.goto('/explore/esusdata/');
  await page.locator('[data-life-chapter="5"]').click();
  await page.locator('[data-life-next]').click();
  await expect(page.locator('[data-life-recipient]')).toBeVisible();
  await page.locator('.life-try summary').click();
  await page.getByRole('button', { name: 'Revoke municipal grant' }).click();
  await expect(page.locator('[data-life-recipient]')).toBeHidden();
  await expect(page.locator('[data-life-records]')).toContainText('municipal grant revoked; consultation blocked');
  await expect(page.locator('[data-life-outcome]')).toContainText('grant revoked; access blocked');
});
