import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function getAboutLayout(page: Page) {
  return page.locator('.about-grid').evaluate((grid) => {
    const copy = grid.querySelector('.about-copy');
    const cards = grid.querySelector('.role-fit-cards');
    const roleCards = [...grid.querySelectorAll('.role-card')];
    if (!copy || !cards || roleCards.length !== 2) throw new Error('Expected About copy and exactly two role cards');

    const gridBox = grid.getBoundingClientRect();
    const copyBox = copy.getBoundingClientRect();
    const cardsBox = cards.getBoundingClientRect();
    const cardBoxes = roleCards.map((card) => card.getBoundingClientRect());
    return {
      grid: { x: gridBox.x, width: gridBox.width },
      copy: { bottom: copyBox.bottom },
      cards: { x: cardsBox.x, y: cardsBox.y, width: cardsBox.width },
      cardBoxes: cardBoxes.map(({ x, y, width }) => ({ x, y, width })),
      columns: getComputedStyle(cards).gridTemplateColumns.split(' ').length
    };
  });
}

for (const width of [1121, 1440]) {
  test(`About cards remain below the copy in two full-width columns at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const homeLayout = await getAboutLayout(page);
    expect(homeLayout.columns).toBe(2);
    expect(homeLayout.cards.y - homeLayout.copy.bottom).toBeGreaterThanOrEqual(32);
    expect(Math.abs(homeLayout.cards.x - homeLayout.grid.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(homeLayout.cards.width - homeLayout.grid.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(homeLayout.cardBoxes[0].width - homeLayout.cardBoxes[1].width)).toBeLessThanOrEqual(1);

    await page.goto('/about/');
    const aboutCards = page.locator('.role-fit-cards');
    await expect(aboutCards.locator('.role-card')).toHaveCount(2);
    const aboutWidths = await aboutCards.locator('.role-card').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    expect(await aboutCards.evaluate((cards) => getComputedStyle(cards).gridTemplateColumns.split(' ').length)).toBe(2);
    expect(Math.abs(aboutWidths[0] - aboutWidths[1])).toBeLessThanOrEqual(1);
  });
}

test('About cards stack in one column on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const layout = await getAboutLayout(page);
  expect(layout.columns).toBe(1);
  expect(layout.cardBoxes[1].y).toBeGreaterThan(layout.cardBoxes[0].y);
  expect(Math.abs(layout.cardBoxes[0].x - layout.cardBoxes[1].x)).toBeLessThanOrEqual(1);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const experiencePage of [
    { name: 'Home', path: '/#experience', headingId: 'home-municipal-experience' },
    { name: 'About', path: '/about/', headingId: 'about-municipal-experience' }
  ]) {
    test(`${experiencePage.name} experience timeline connects both role markers at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(experiencePage.path);

    const card = page.locator(`.timeline-card[aria-labelledby="${experiencePage.headingId}"]`);
    await expect(card.locator('h3')).toHaveText('Prefeitura de Presidente Epitácio');
    await expect(card.locator('.timeline-role')).toHaveCount(2);

    const geometry = await card.evaluate((article) => {
      const roles = [...article.querySelectorAll<HTMLElement>('.timeline-role')];
      const markerCenter = (role: HTMLElement) => {
        const box = role.getBoundingClientRect();
        const marker = getComputedStyle(role, '::before');
        return {
          x: box.left + Number.parseFloat(marker.left) + Number.parseFloat(marker.width) / 2,
          y: box.top + Number.parseFloat(marker.top) + Number.parseFloat(marker.height) / 2
        };
      };
      const connector = getComputedStyle(roles[0], '::after');
      const firstBox = roles[0].getBoundingClientRect();
      const connectorTop = firstBox.top + Number.parseFloat(connector.top);
      const connectorBottom = firstBox.bottom - Number.parseFloat(connector.bottom);
      const headings = roles.map((role) => role.querySelector('h4')!.getBoundingClientRect());
      const periods = roles.map((role) => role.querySelector('.role-period')!.getBoundingClientRect());

      return {
        markers: roles.map(markerCenter),
        connector: {
          content: connector.content,
          x: firstBox.left + Number.parseFloat(connector.left) + Number.parseFloat(connector.width) / 2,
          top: connectorTop,
          bottom: connectorBottom
        },
        metadataDoesNotOverlap: headings.every((heading, index) =>
          heading.right <= periods[index].left || heading.bottom <= periods[index].top
        ),
        noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth
      };
    });

    expect(geometry.connector.content).not.toBe('none');
    expect(Math.abs(geometry.connector.x - geometry.markers[0].x)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.connector.top - geometry.markers[0].y)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.connector.bottom - geometry.markers[1].y)).toBeLessThanOrEqual(1);
    expect(geometry.metadataDoesNotOverlap).toBe(true);
    expect(geometry.noHorizontalOverflow).toBe(true);
    });
  }
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`SO-10 route and visual contracts at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('ViniciusSantana');
    await expect(page.locator('.header-resume')).toBeVisible();
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
    expect(requests.filter(url => /renderer\.[^/]+\.js(?:\?|$)|detail-[^/]+\.glb(?:\?|$)/i.test(url))).toEqual([]);
    if (viewport.width < 820) {
      const toggle = page.locator('[data-menu-toggle]');
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('nav[aria-label="Primary navigation"] a[href="/explore/"]')).toHaveText('Work');
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
    await page.getByRole('link', { name: 'Explore my work', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/explore\/$/);
    await expect(page.locator('[data-district-link]')).toHaveCount(3);
    await capture('atlas');
    for (const slug of ['cnesdata', 'limnopulse', 'infrastructure']) {
      await page.goto(`/explore/${slug}/`);
      await expect(page).toHaveURL(new RegExp(`/explore/${slug}/$`));
      await expect(page.locator('.header-resume')).toBeVisible();
      for (const anchor of ['overview', 'system', 'engineering', 'results']) {
        const link = page.locator(`.section-nav a[href="#${anchor}"]`);
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
        await expect(page.locator(`#${anchor}`)).toBeInViewport();
      }
      await capture(slug);
      await page.getByRole('navigation', { name: 'Case study navigation' }).getByRole('link', { name: /Back to Atlas/ }).click();
      await expect(page).toHaveURL(/\/explore\/$/);
    }
    await page.locator('.header-resume').click();
    await expect(page).toHaveURL(/\/resume\/$/);
    await expect(page.locator('a[download]')).toHaveAttribute('href', '/assets/vinicius-santana-resume.pdf');
  });
}

test('CnesData detail write, replay, conflict and reset', async ({ page }) => {
  await page.goto('/explore/cnesdata/#simulation');
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
  await page.goto('/explore/cnesdata/');
  await page.locator('.section-nav a[href="#simulation"]').click();
  for (const id of ['raw-first-write', 'raw-identical-replay', 'raw-content-conflict']) {
    await expect(page.locator(`#transcript-${id}`)).toContainText('synthetic-content-A');
  }
  await expect(page.getByRole('button', { name: 'Advance one attempt' })).toBeDisabled();
  await context.close();
});
