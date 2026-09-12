import { test, expect, type Page } from '@playwright/test';

const compatibilityRoutes = [
  ['/work/', '/explore/'],
  ['/work/cnesdata/', '/explore/cnesdata/'],
  ['/work/limnopulse/', '/explore/limnopulse/'],
  ['/work/infrastructure/', '/explore/infrastructure/'],
] as const;

async function expectCompatibilityMetadata(page: Page, destination: string) {
  const canonicalDestination = new URL(destination, 'https://dev.vinisantana.com').href;
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalDestination);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalDestination);
  await expect(page.locator('a[data-compatibility-link]')).toHaveAttribute('href', destination);
}

test('JavaScript compatibility redirects preserve raw query and fragment data', async ({ page, baseURL }) => {
  const cases = [
    ['/work/?tag=one&tag=two&encoded=a%2Fb%20c', '/explore/?tag=one&tag=two&encoded=a%2Fb%20c'],
    ['/work/cnesdata/?next=https%3A%2F%2Fevil.example%2Fpwn#architecture', '/explore/cnesdata/?next=https%3A%2F%2Fevil.example%2Fpwn#architecture'],
    ['/work/limnopulse/?url=https%3A%2F%2Fevil.example%2Foutside#architecture', '/explore/limnopulse/?url=https%3A%2F%2Fevil.example%2Foutside#architecture'],
    ['/work/infrastructure/?redirect=%2Fwork%2Fcnesdata%2F#architecture', '/explore/infrastructure/?redirect=%2Fwork%2Fcnesdata%2F#architecture'],
  ] as const;

  for (const [source, destination] of cases) {
    await page.goto(source);
    await expect(page).toHaveURL(destination);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  }
});

test('no-JavaScript compatibility pages expose metadata and working fallback links', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();

  for (const [source, destination] of compatibilityRoutes) {
    await page.goto(source);
    await expect(page).toHaveURL(source);
    await expectCompatibilityMetadata(page, destination);
    await page.locator('a[data-compatibility-link]').click();
    await expect(page).toHaveURL(destination);
  }

  await context.close();
});

test('Back and Forward do not revisit any compatibility page', async ({ page }) => {
  for (const [source, destination] of compatibilityRoutes) {
    const suffix = source === '/work/' ? '?from=history' : '?from=history#architecture';
    await page.goto('/about/');
    await page.evaluate(url => { window.location.href = url; }, `${source}${suffix}`);
    await expect(page).toHaveURL(`${destination}${suffix}`);

    await page.goBack();
    await expect(page).toHaveURL('/about/');
    await page.goForward();
    await expect(page).toHaveURL(`${destination}${suffix}`);
  }
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`primary navigation is canonical across Atlas and projects at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const mobile = viewport.width === 390;

    for (const path of ['/explore/', '/explore/cnesdata/', '/explore/limnopulse/', '/explore/infrastructure/']) {
      await page.goto(path);
      const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
      if (mobile) {
        const toggle = page.locator('[data-menu-toggle]');
        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      }
      const work = navigation.getByRole('link', { name: 'Work', exact: true });
      await expect(navigation.getByRole('link', { name: 'About', exact: true })).toHaveAttribute('href', '/about/');
      await expect(navigation.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/#contact');
      await expect(navigation.getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute('href', '/resume/');
      await expect(navigation.getByRole('link', { name: 'Explore', exact: true })).toHaveCount(0);
      await expect(work).toHaveAttribute('href', '/explore/');
      await expect(work).toHaveAttribute('aria-current', 'page');
      await work.focus();
      await expect(work).toBeFocused();
    }
  });
}
