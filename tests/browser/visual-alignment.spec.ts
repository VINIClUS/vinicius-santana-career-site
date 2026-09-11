import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`SO-10 route and visual contracts at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('ViniciusSantana');
    await expect(page.locator('.header-resume')).toBeVisible();
    await expect(page.locator('canvas, astro-island')).toHaveCount(0);
    for (const id of ['about', 'experience', 'projects', 'stack', 'contact', 'case-cnesdata', 'case-aquafarm', 'case-esus-pec-bootstrap', 'case-infra-ansible', 'case-packer-proxmox-templates']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    async function capture(name: string) {
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect(img).toHaveJSProperty('complete', true);
        expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await mkdir('test-results/so-10', { recursive: true });
      await page.screenshot({ path: `test-results/so-10/${name}-${viewport.width}.png`, fullPage: true });
    }
    await capture('home');
    expect(requests.filter(url => /\.(glb|gltf|ktx2)(?:\?|$)|three|react-dom/i.test(url))).toEqual([]);
    if (viewport.width < 820) {
      const toggle = page.locator('[data-menu-toggle]');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/work/"]')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await page.locator('.hero-actions a[href="/work/"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/work\/$/);
    await expect(page.locator('.visual-work-card')).toHaveCount(4);
    const columns = await page.locator('.work-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(viewport.width > 1100 ? 4 : 1);
    await expect(page.getByRole('link', { name: 'View experience' })).toHaveAttribute('href', '/#experience');
    await capture('work');
    for (const slug of ['cnesdata', 'limnopulse', 'infrastructure']) {
      await page.locator(`.project-actions a[href="/work/${slug}/"]`).click();
      await expect(page).toHaveURL(new RegExp(`/work/${slug}/$`));
      await expect(page.locator('.header-resume')).toBeVisible();
      for (const anchor of ['overview', 'architecture', 'engineering', 'results']) {
        const link = page.locator(`.section-nav a[href="#${anchor}"]`);
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
        await expect(page.locator(`#${anchor}`)).toBeInViewport();
      }
      await capture(slug);
      await page.locator('.case-footer a[href="/work/"]').click();
    }
    await page.locator('.header-resume').click();
    await expect(page).toHaveURL(/\/resume\/$/);
    await expect(page.locator('a[download]')).toHaveAttribute('href', '/assets/vinicius-santana-resume.pdf');
  });
}

test('CnesData detail write, replay, conflict and reset', async ({ page }) => {
  await page.goto('/work/cnesdata/#simulation');
  const scenario = page.getByLabel('Scenario');
  const step = page.getByRole('button', { name: 'Advance one attempt' });
  for (const [id, result] of [['raw-first-write', 'stored'], ['raw-identical-replay', 'replayed'], ['raw-content-conflict', 'conflict']]) {
    await scenario.selectOption(id);
    await step.click();
    if (id !== 'raw-first-write') await step.click();
    await expect(page.locator('[data-result]')).toContainText(result);
    await expect(page.locator('[data-objects] li')).toHaveCount(1);
    await expect(page.locator('[data-objects]')).toContainText('synthetic-content-A');
    await expect(page.locator('[data-objects]')).not.toContainText('synthetic-content-B');
    await expect(step).toBeDisabled();
    await page.getByRole('button', { name: 'Reset scenario' }).click();
    await expect(page.locator('[data-progress]')).toContainText('ready');
    await expect(page.locator('[data-objects]')).toHaveText('No objects stored.');
  }
});

test('detail transcripts and destinations survive without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.header-resume')).toBeVisible();
  await page.locator('.hero-actions a[href="/work/"]').click();
  await page.locator('.project-actions a[href="/work/cnesdata/"]').click();
  await page.locator('.section-nav a[href="#simulation"]').click();
  for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
    await expect(page.locator(`#transcript-${id}`)).toContainText('synthetic-content-A');
  }
  await expect(page.getByRole('button', { name: 'Advance one attempt' })).toBeDisabled();
  await context.close();
});
