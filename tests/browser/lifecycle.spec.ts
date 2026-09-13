import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const limnopulseFixture = JSON.parse(readFileSync(new URL('../../docs/design/systems-atlas-lifecycles-v3/scenarios/limnopulse-end-to-end.json', import.meta.url), 'utf8'));

const root = (page: Page) => page.locator('[data-lifecycle]');
const stage = (page: Page) => root(page).locator('[data-life-stage]');
const control = (page: Page, name: string) => root(page).locator(`[data-life-${name}]`);
async function ready(page: Page, project = 'limnopulse', fragment = '#simulation') {
  await page.goto(`/explore/${project}/${fragment}`);
  await expect(control(page, 'replay')).toBeEnabled();
  await stage(page).scrollIntoViewIfNeeded();
}
async function invariants(page: Page) {
  await expect(root(page).locator('[data-current-stage]')).toHaveCount(1);
  await expect(root(page).locator('[data-current-stage]')).toHaveAttribute('aria-current', 'step');
  const actors = await root(page).locator('[data-primary-actor]').count();
  expect(actors).toBeGreaterThanOrEqual(1);
  expect(actors).toBeLessThanOrEqual(3);
  expect(await root(page).locator('[data-moving-artifact]').count()).toBeLessThanOrEqual(1);
}
async function noMotion(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-playing', 'false');
  await expect(root(page).locator('[data-moving-artifact]')).toHaveCount(0);
  expect(await root(page).evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
}
async function checkpoint(page: Page, index: number) {
  await control(page, 'replay').click();
  await root(page).evaluate((element, count) => {
    const next = element.querySelector<HTMLButtonElement>('[data-life-next]')!;
    for (let i = 0; i < count; i++) { next.click(); next.click(); }
  }, index);
}

test('recipient buttons open and acknowledge the same incident without clearing its low condition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await checkpoint(page, 15);
  await control(page, 'next').click();
  const before = JSON.parse((await control(page, 'technical').textContent())!).state;
  await expect(control(page, 'recipient')).toContainText('synthetic recipient');
  await control(page, 'recipient-open').click();
  const opened = JSON.parse((await control(page, 'technical').textContent())!).state;
  expect(opened.userView).toBe('incident_opened');
  expect(opened.incidentId).toBe(before.incidentId);
  await control(page, 'recipient-ack').click();
  const acknowledged = JSON.parse((await control(page, 'technical').textContent())!).state;
  expect(acknowledged.incidentId).toBe(before.incidentId);
  expect(acknowledged.incident).toBe('acknowledged');
  expect(acknowledged.incidentVersion).toBe(before.incidentVersion + 1);
  expect(acknowledged.condition).toBe('low');
  await expect(control(page, 'recipient')).toContainText(/acknowledged/i);
  await expect(control(page, 'recipient-ack')).toBeDisabled();
  await expect(control(page, 'progress')).toContainText('Exploring');
  await noMotion(page);
});

test('CnesData preview retains source captures until normalization finishes its final shot', async ({ page }) => {
  await page.clock.install();
  await ready(page, 'cnesdata', '#technical');
  await checkpoint(page, 11);
  await stage(page).scrollIntoViewIfNeeded();
  await expect(control(page, 'sample-title')).toHaveText('Source captures');
  await control(page, 'play').evaluate((button: HTMLButtonElement) => button.click());
  await page.clock.runFor(1500);
  await expect(stage(page)).toHaveAttribute('data-phase', 'settle');
  await expect(control(page, 'progress')).toContainText('shot 1 / 3');
  await expect(control(page, 'sample-title')).toHaveText('Source captures');
  await page.clock.runFor(5200);
  await expect(control(page, 'progress')).toContainText('shot 3 / 3');
  await expect(control(page, 'sample-title')).toHaveText('Normalized records');
  await control(page, 'play').evaluate((button: HTMLButtonElement) => button.click());
  await noMotion(page);
});

for (const [project, cycles] of [
  ['infrastructure', ['infra-exhaustion-recovery', 'infra-quorum-recovery', 'infra-provision-scale']],
  ['limnopulse', ['limnopulse-end-to-end']],
  ['cnesdata', ['cnesdata-end-to-end']],
] as const) {
  test(`${project}: all cycles expose six chapters, truthful state and bounded scene actors`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page, project);
    for (const cycle of cycles) {
      await control(page, 'scenario').selectOption(cycle);
      await expect(control(page, 'progress')).toContainText('operation 1 /');
      await expect(root(page).locator('[data-life-chapter]')).toHaveCount(6);
      for (let chapter = 0; chapter < 6; chapter++) {
        await root(page).locator(`[data-life-chapter="${chapter}"]`).click();
        await invariants(page);
        await noMotion(page);
        await expect(root(page).locator('[data-current-stage]')).toHaveAttribute('data-life-chapter', String(chapter));
        await expect(control(page, 'title')).not.toBeEmpty();
        await expect(control(page, 'outcome')).not.toBeEmpty();
        const technical = JSON.parse((await control(page, 'technical').textContent())!);
        expect(technical.command.type).toBeTruthy();
        expect(Object.keys(technical.state).length).toBeGreaterThan(0);
      }
      await control(page, 'previous').click();
      await noMotion(page);
      await control(page, 'replay').click();
      await expect(control(page, 'progress')).toContainText('operation 1 /');
      await noMotion(page);
    }
  });
}

test('pause freezes real artifact animation; replay and cycle replacement cancel it', async ({ page }) => {
  await page.clock.install();
  await ready(page, 'infrastructure', '#technical');
  await root(page).locator('[data-life-chapter="1"]').click();
  await control(page, 'play').click();
  await page.clock.runFor(650);
  await invariants(page);
  await expect(root(page).locator('[data-moving-artifact]')).toHaveCount(1);
  expect(await root(page).evaluate(el => el.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true);
  await control(page, 'play').click();
  await noMotion(page);
  const snapshot = await control(page, 'progress').textContent();
  const transform = await control(page, 'artifact').evaluate(el => getComputedStyle(el).transform);
  await page.clock.runFor(5000);
  await expect(control(page, 'progress')).toHaveText(snapshot!);
  expect(await control(page, 'artifact').evaluate(el => getComputedStyle(el).transform)).toBe(transform);
  await control(page, 'play').click();
  await control(page, 'replay').click();
  await page.clock.runFor(5000);
  await expect(control(page, 'progress')).toContainText('operation 1 /');
  await noMotion(page);
  await root(page).locator('[data-life-chapter="1"]').click();
  await control(page, 'play').click();
  await page.clock.runFor(650);
  await expect(root(page).locator('[data-moving-artifact]')).toHaveCount(1);
  await control(page, 'scenario').selectOption('infra-quorum-recovery');
  await page.clock.runFor(5000);
  await expect(control(page, 'progress')).toContainText('operation 1 /');
  await noMotion(page);
  await control(page, 'scenario').evaluate((element: HTMLSelectElement) => {
    for (const id of ['infra-exhaustion-recovery', 'infra-provision-scale']) {
      element.value = id; element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await expect(control(page, 'scenario')).toHaveValue('infra-provision-scale');
  await expect.poll(async () => JSON.parse((await control(page, 'technical').textContent())!).state.desiredReplicas).toBe(1);
  await page.clock.runFor(5000);
  await expect(control(page, 'progress')).toContainText('operation 1 /');
  await noMotion(page);
});

test('all 24 Limnopulse outcomes match the engine checkpoint shown after settling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  for (const [index, checkpoint] of limnopulseFixture.checkpoints.entries()) {
    if (index > 0) await control(page, 'next').click();
    await control(page, 'next').click();
    const technical = JSON.parse((await control(page, 'technical').textContent())!);
    expect(technical.state).toEqual(checkpoint.expected);
    const expected = checkpoint.expected;
    const words = (value: string) => value.replaceAll('_', ' ');
    await expect(control(page, 'outcome')).toHaveText(`Incident: ${words(expected.incident)}. Email: ${words(expected.email)}; Telegram: ${words(expected.telegram)}. User: ${words(expected.userView)}.`);
    await invariants(page);
    await noMotion(page);
  }
  expect(await control(page, 'data').textContent()).not.toContain('"expected"');
});

test('manual actions preserve the domain, cancel the remaining tour and require Replay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await root(page).locator('[data-life-chapter="3"]').click();
  const before = JSON.parse((await control(page, 'technical').textContent())!).state;
  await root(page).getByText('Try a scenario', { exact: true }).click();
  await root(page).getByRole('button', { name: 'Revoke membership' }).click();
  const after = JSON.parse((await control(page, 'technical').textContent())!).state;
  expect(after.membershipActive).toBe(false);
  expect(after.incidentId).toBe(before.incidentId);
  expect(after.outboxCount).toBe(before.outboxCount);
  expect.soft(JSON.parse((await control(page, 'technical').textContent())!).command).toMatchObject({ type: 'SET_MEMBERSHIP', active: false });
  await expect(control(page, 'progress')).toContainText('Exploring');
  await expect(control(page, 'play')).toBeDisabled();
  await expect(control(page, 'next')).toBeDisabled();
  await noMotion(page);
  await control(page, 'replay').click();
  expect(JSON.parse((await control(page, 'technical').textContent())!).state.membershipActive).toBe(true);
  await expect(control(page, 'play')).toBeEnabled();
});

test('manual Telegram provider result focuses Telegram and reports the applied command', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await root(page).locator('[data-life-chapter="3"]').click();
  await root(page).getByText('Try a scenario', { exact: true }).click();
  for (const label of ['Email aceito', 'Tentativa Telegram', 'Telegram aceito']) {
    await control(page, 'operation').selectOption({ label });
    await control(page, 'apply').click();
  }
  const technical = JSON.parse((await control(page, 'technical').textContent())!);
  expect(technical.state.telegram).toBe('accepted');
  expect.soft(technical.command).toMatchObject({ type: 'PROVIDER_RESULT', channel: 'telegram', kind: 'opening' });
  expect.soft(await root(page).locator('[data-primary-actor]').evaluateAll(actors => actors.map(actor => actor.getAttribute('data-primary-actor')).join(' '))).toContain('telegram');
  await noMotion(page);
});

for (const reason of ['reduced-motion', 'save-data', 'technical-fragment']) {
  test(`${reason} suppresses autoplay even when the stage becomes visible`, async ({ page }) => {
    if (reason === 'reduced-motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    if (reason === 'save-data') await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
    await ready(page, 'limnopulse', reason === 'technical-fragment' ? '#component-mqtt' : '#simulation');
    await page.waitForTimeout(1000);
    await noMotion(page);
    await expect(control(page, 'progress')).toContainText('operation 1 /');
  });
}

test('leaving the viewport pauses autoplay and returning does not resume it', async ({ page }) => {
  await ready(page);
  await expect(stage(page)).toHaveAttribute('data-playing', 'true');
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect(stage(page)).toHaveAttribute('data-playing', 'false');
  const progress = await control(page, 'progress').textContent();
  await stage(page).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await noMotion(page);
  await expect(control(page, 'progress')).toHaveText(progress!);
});

test('visibilitychange pauses presentation and becoming visible does not resume', async ({ page }) => {
  await ready(page);
  await expect(stage(page)).toHaveAttribute('data-playing', 'true');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await noMotion(page);
  const progress = await control(page, 'progress').textContent();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1000);
  await expect(control(page, 'progress')).toHaveText(progress!);
  await noMotion(page);
});

test('technical component selection keeps URL, scroll and keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const details = page.locator('[data-component-diagram]').nth(1);
  const componentId = await details.getAttribute('data-component-select');
  await page.goto(`/explore/limnopulse/#component-${componentId}`);
  await expect(details).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-component-disclosure]')).toHaveAttribute('open', '');
  // The generic map remains accessible in its native disclosure.
  await details.evaluate(el => { for (let parent = el.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true; });
  await details.scrollIntoViewIfNeeded();
  await details.focus();
  const before = await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }));
  await details.press('Enter');
  await expect(details).toHaveAttribute('aria-pressed', 'true');
  await expect(details).toBeFocused();
  expect(await page.evaluate(() => ({ url: location.href, x: scrollX, y: scrollY }))).toEqual(before);
});

test('without JavaScript every canonical checkpoint has a built transcript and disabled controls', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await context.newPage();
  for (const [project, count] of [['infrastructure', 48], ['limnopulse', 24], ['cnesdata', 19]] as const) {
    await page.goto(`/explore/${project}/#simulation`);
    await expect(root(page)).toBeVisible();
    await invariants(page);
    for (const item of await root(page).locator('button, select').all()) await expect(item).toBeDisabled();
    await root(page).getByText('Read the complete lifecycle transcript', { exact: true }).click();
    await expect(root(page).locator('.life-transcripts li')).toHaveCount(count);
    await expect(root(page).locator('.life-transcripts li').last()).toBeVisible();
    await expect(control(page, 'outcome')).not.toBeEmpty();
  }
  await context.close();
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  test(`lifecycle ${viewport.width}px: readable labels, 44px controls and no horizontal overflow without WebGL`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext; });
    await ready(page);
    for (let chapter = 0; chapter < 6; chapter++) {
      await root(page).locator(`[data-life-chapter="${chapter}"]`).click();
      await invariants(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const label of await root(page).locator('[data-primary-actor] strong').all()) {
        expect(await label.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(viewport.width > 600 ? 16 : 14);
      }
    }
    for (const button of await root(page).locator('.life-controls button').all()) {
      const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    await control(page, 'play').focus(); await expect(control(page, 'play')).toBeFocused();
    await expect(page.locator('canvas')).toHaveCount(0);
    await root(page).screenshot({ path: `test-results/lifecycle-${viewport.width}.png` });
  });
}
