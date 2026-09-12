import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const { javaScriptEnabled, reducedMotion } of [
    { javaScriptEnabled: true, reducedMotion: 'no-preference' },
    { javaScriptEnabled: true, reducedMotion: 'reduce' },
    { javaScriptEnabled: false, reducedMotion: 'reduce' },
  ] as const) {
    test(`canonical Limnopulse at ${viewport.width}, JavaScript ${javaScriptEnabled}, motion ${reducedMotion}`, async ({ browser, baseURL }, testInfo) => {
      const mobile = viewport.width === 390;
      const context = await browser.newContext({ baseURL, viewport, javaScriptEnabled, hasTouch: mobile, isMobile: mobile, reducedMotion });
      const page = await context.newPage();
      await page.goto('/explore/');
      await page.getByRole('link', { name: 'Explore LimnoPulse', exact: true }).click();
      await expect(page).toHaveTitle('Limnopulse — Vinicius Santana');
      const models: string[] = [];
      page.on('request', request => { if (/\.(glb|gltf|ktx2)(?:\?|$)/.test(request.url())) models.push(request.url()); });
      // Reload with the listener attached to cover initial project requests too.
      await page.reload();
      await expect(page.locator('[data-component-detail]')).toHaveCount(7);
      await expect(page.locator('a[href="/work/limnopulse/"]')).toHaveCount(0);
      await expect(page.locator('canvas, [data-simulation], #simulation')).toHaveCount(0);
      for (const id of ['overview', 'architecture', 'engineering', 'results', 'evidence', 'limitations']) {
        await page.locator(`a[href="#${id}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        await expect(page.locator(`#${id}`)).toBeVisible();
      }
      const links = page.locator('[data-component-link]');
      const firstHash = (await links.first().getAttribute('href'))!;
      const secondHash = (await links.nth(1).getAttribute('href'))!;
      for (const index of [0, 1]) {
        const link = links.nth(index);
        if (mobile) await link.tap();
        else { await link.focus(); await page.keyboard.press('Enter'); }
        const hash = index === 0 ? firstHash : secondHash;
        await expect(page).toHaveURL(new RegExp(`${hash}$`));
        await expect(page.locator(hash)).toBeVisible();
        await expect(page.locator(hash)).toBeFocused();
        if (javaScriptEnabled) await expect(link).toHaveAttribute('aria-current', 'true');
      }
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${firstHash}$`));
      if (javaScriptEnabled) await expect(page.locator(firstHash)).toBeFocused();
      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`${secondHash}$`));
      if (javaScriptEnabled) await expect(page.locator(secondHash)).toBeFocused();
      await page.goto('/explore/limnopulse/#architecture-title');
      await expect(page.getByRole('heading', { name: 'System View', exact: true })).toBeInViewport();
      await expect(page.locator('#component-cloud-infrastructure')).toContainText('Documented');
      await expect(page.locator('#component-production-device-layer')).toContainText('Planned');
      const evidence = page.locator('#evidence a[href^="https://github.com/VINIClUS/limnopulse"]');
      await expect(evidence).toHaveCount(5);
      await evidence.last().scrollIntoViewIfNeeded();
      await evidence.last().focus();
      await expect(evidence.last()).toBeFocused();
      await expect(evidence.last()).toHaveAccessibleName(/Open .+ in a new tab/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(models).toEqual([]);
      await page.goto('/explore/limnopulse/');
      await page.screenshot({ path: testInfo.outputPath(`limnopulse-${viewport.width}-js-${javaScriptEnabled}-${reducedMotion}.png`), fullPage: true });
      await context.close();
    });
  }
}
