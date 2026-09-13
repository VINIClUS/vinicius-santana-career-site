import { test, expect, type Page } from '@playwright/test';

const compatibilityRoutes = [
  ['/work/', '/explore/'],
  ['/work/cnesdata/', '/explore/cnesdata/'],
  ['/work/limnopulse/', '/explore/limnopulse/'],
  ['/work/infrastructure/', '/explore/infrastructure/'],
] as const;

test('browser tests block the production analytics script', async ({ page }) => {
  const analyticsUrl = 'https://www.googletagmanager.com/gtag/js?id=G-2DY87DZC90';
  const failedRequest = page.waitForEvent('requestfailed', {
    predicate: request => request.url() === analyticsUrl
  });

  await page.goto('/');

  const request = await failedRequest;
  expect(request.failure()?.errorText).toMatch(/ERR_(?:NAME_NOT_RESOLVED|CONNECTION_REFUSED)/);
});

async function expectCompatibilityMetadata(page: Page, destination: string) {
  const canonicalDestination = new URL(destination, 'https://vinisantana.com').href;
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalDestination);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonicalDestination);
  await expect(page.locator('a[data-compatibility-link]')).toHaveAttribute('href', destination);
}

test('JavaScript compatibility redirects map only the retired architecture fragment', async ({ page, baseURL }) => {
  const cases = [
    ['/work/?tag=one&tag=two&encoded=a%2Fb%20c', '/explore/?tag=one&tag=two&encoded=a%2Fb%20c'],
    ['/work/cnesdata/?next=https%3A%2F%2Fevil.example%2Fpwn#architecture', '/explore/cnesdata/?next=https%3A%2F%2Fevil.example%2Fpwn#system'],
    ['/work/limnopulse/?url=https%3A%2F%2Fevil.example%2Foutside#architecture', '/explore/limnopulse/?url=https%3A%2F%2Fevil.example%2Foutside#system'],
    ['/work/infrastructure/?redirect=%2Fwork%2Fcnesdata%2F#architecture', '/explore/infrastructure/?redirect=%2Fwork%2Fcnesdata%2F#system'],
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

test('Back and Forward do not revisit compatibility pages after fragment normalization', async ({ page }) => {
  for (const [source, destination] of compatibilityRoutes) {
    const suffix = source === '/work/' ? '?from=history' : '?from=history#architecture';
    const expectedSuffix = source === '/work/' ? suffix : '?from=history#system';
    await page.goto('/about/');
    await page.evaluate(url => { window.location.href = url; }, `${source}${suffix}`);
    await expect(page).toHaveURL(`${destination}${expectedSuffix}`);

    await page.goBack();
    await expect(page).toHaveURL('/about/');
    await page.goForward();
    await expect(page).toHaveURL(`${destination}${expectedSuffix}`);
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
      await expect(navigation.getByRole('link', { name: 'LinkedIn', exact: true })).toHaveAttribute('href', 'https://linkedin.com/in/vinsantana');
      await expect(navigation.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/VINIClUS');
      for (const social of ['LinkedIn', 'GitHub']) {
        const link = navigation.getByRole('link', { name: social, exact: true });
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
      await expect(navigation.getByRole('link', { name: 'Resume', exact: true })).toHaveCount(0);
      await expect(navigation.getByRole('link', { name: 'Explore', exact: true })).toHaveCount(0);
      await expect(work).toHaveAttribute('href', '/explore/');
      await expect(work).toHaveAttribute('aria-current', 'page');
      await work.focus();
      await expect(work).toBeFocused();
    }
  });
}
