import { test, expect, type Page } from '@playwright/test';

// Wall-clock playback makes the exported clips show real transfers and pauses.
test.setTimeout(65000);
async function seek(page: Page, index: number) {
  await page.locator('[data-life-replay]').evaluate((button: HTMLButtonElement) => button.click());
  await page.locator('[data-lifecycle]').evaluate((root, count) => {
    const next = root.querySelector<HTMLButtonElement>('[data-life-next]')!;
    for (let i = 0; i < count; i++) { next.click(); next.click(); }
  }, index);
}
async function frame(page: Page, name: string) {
  await page.locator('[data-life-stage]').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.screenshot({ path: test.info().outputPath(`${name}.png`) });
}
async function play(page: Page, milliseconds: number) {
  await page.locator('[data-life-stage]').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.locator('[data-life-play]').evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.locator('[data-life-stage]')).toHaveAttribute('data-playing', 'true');
  await page.waitForTimeout(milliseconds);
  await page.locator('[data-life-play]').evaluate((button: HTMLButtonElement) => { if (button.textContent === 'Pause') button.click(); });
  await expect(page.locator('[data-moving-artifact]')).toHaveCount(0);
}
const recordings = [
  { cycle: 'limnopulse-end-to-end', project: 'limnopulse', viewport: { width: 1440, height: 1000 }, shots: [{ index: 7, duration: 24500, label: 'outbox-delivery-sqs-worker-ses' }, { index: 11, duration: 1000, label: 'retry-wait' }, { index: 15, duration: 3000, label: 'recipient' }] },
  { cycle: 'infra-exhaustion-recovery', project: 'infrastructure', viewport: { width: 390, height: 844 }, shots: [{ index: 1, duration: 11000, label: 'fence-restart' }, { index: 11, duration: 1000, label: 'no-capacity' }, { index: 12, duration: 8500, label: 'boot-ready-autostart' }] },
  { cycle: 'infra-quorum-recovery', project: 'infrastructure', viewport: { width: 1440, height: 1000 }, shots: [{ index: 7, duration: 4500, label: 'quorum-storage-independent' }, { index: 11, duration: 6500, label: 'storage-guard-recovery' }] },
  { cycle: 'infra-provision-scale', project: 'infrastructure', viewport: { width: 320, height: 740 }, shots: [{ index: 13, duration: 10000, label: 'drain-stop-release' }] },
  { cycle: 'cnesdata-end-to-end', project: 'cnesdata', viewport: { width: 390, height: 844 }, shots: [{ index: 5, duration: 4500, label: 'raw-immutable-replay' }, { index: 15, duration: 11500, label: 'candidate-cas-authorized-read' }] },
];
for (const recording of recordings) {
  test.describe(`${recording.cycle} recording`, () => {
    test(`recorded passage at ${recording.viewport.width}px`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, viewport: recording.viewport, recordVideo: { dir: test.info().outputPath('video'), size: recording.viewport } });
      const page = await context.newPage();
      try {
      await page.goto(`/explore/${recording.project}/#technical`);
      await expect(page.locator('[data-life-replay]')).toBeEnabled();
      await page.locator('[data-life-scenario]').selectOption(recording.cycle);
      await expect(page.locator('[data-life-progress]')).toContainText('operation 1 /');
      await frame(page, 'initial');
      for (const shot of recording.shots) {
        await seek(page, shot.index);
        await frame(page, `${shot.label}-before`);
        await play(page, shot.duration);
        await frame(page, `${shot.label}-paused`);
        await page.locator('[data-life-next]').evaluate((button: HTMLButtonElement) => { if (!button.disabled) button.click(); });
        await frame(page, `${shot.label}-result`);
      }
      await test.info().attach('recording-scope', { body: JSON.stringify(recording, null, 2), contentType: 'application/json' });
      } finally {
        const video = page.video();
        await context.close();
        if (video) await test.info().attach('passage', { path: await video.path(), contentType: 'video/webm' });
      }
    });
  });
}
