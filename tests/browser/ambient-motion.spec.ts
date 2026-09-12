import { test, expect, type Page } from '@playwright/test';

async function installFrameCounter(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { ambientFrames: number; ambientRafRequests: number };
    state.ambientFrames = 0;
    state.ambientRafRequests = 0;
    const request = window.requestAnimationFrame;
    window.requestAnimationFrame = callback => {
      state.ambientRafRequests++;
      return request.call(window, callback);
    };
    const clear = WebGL2RenderingContext.prototype.clear;
    WebGL2RenderingContext.prototype.clear = function (mask) {
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.matches('[data-home-preview-canvas], [data-observatory-canvas]')) state.ambientFrames++;
      return clear.call(this, mask);
    };
  });
}
const frames = (page: Page) => page.evaluate(() => (window as typeof window & { ambientFrames: number }).ambientFrames);
const requests = (page: Page) => page.evaluate(() => (window as typeof window & { ambientRafRequests: number }).ambientRafRequests);

for (const presentation of ['Home', 'Atlas']) {
  const path = presentation === 'Home' ? '/' : '/explore/';
  const canvasSelector = presentation === 'Home' ? '[data-home-preview-canvas]' : '[data-observatory-canvas]';
  test(`${presentation} ambient motion runs, pauses without draws, and resumes by keyboard`, async ({ page }) => {
    await installFrameCounter(page);
    await page.goto(path);
    const pause = page.getByRole('button', { name: 'Pause motion', exact: true });
    await expect(pause).toBeVisible({ timeout: 15_000 });
    const canvas = page.locator(canvasSelector);
    const first = await canvas.screenshot();
    const initial = await frames(page);
    await page.waitForTimeout(600);
    expect(await frames(page)).toBeGreaterThan(initial);
    expect(await canvas.screenshot()).not.toEqual(first);
    const box = await pause.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await pause.focus();
    await page.keyboard.press('Enter');
    const resume = page.getByRole('button', { name: 'Resume motion', exact: true });
    await expect(resume).toBeFocused();
    const frozen = await canvas.screenshot();
    // Element screenshots can scroll/resize a tall Atlas canvas. Settle that view update
    // before measuring an untouched paused window.
    await page.waitForTimeout(150);
    const paused = await frames(page);
    const pausedRequests = await requests(page);
    await page.waitForTimeout(2_000);
    expect(await frames(page)).toBe(paused);
    expect(await requests(page)).toBe(pausedRequests);
    expect(await canvas.screenshot()).toEqual(frozen);
    await page.keyboard.press('Space');
    await expect(pause).toBeFocused();
    await expect.poll(() => frames(page)).toBeGreaterThan(paused);
    await page.evaluate(() => {
      const state = window as typeof window & { ambientLayoutChanges: number };
      state.ambientLayoutChanges = 0;
      const observer = new MutationObserver(records => { state.ambientLayoutChanges += records.length; });
      for (const element of document.querySelectorAll('[data-region-points], [data-district-link], .observatory-hub, canvas')) {
        observer.observe(element, { attributes: true, attributeFilter: ['style', 'points', 'width', 'height'] });
      }
    });
    const before = await frames(page);
    await page.waitForTimeout(2_000);
    const count = await frames(page) - before;
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(49);
    expect(await page.evaluate(() => (window as typeof window & { ambientLayoutChanges: number }).ambientLayoutChanges)).toBe(0);
    expect(new URL(page.url()).hash).toBe('');
  });

  test(`${presentation} reduced motion stays authored and responds to preference changes`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await installFrameCounter(page);
    await page.goto(path);
    const control = page.getByRole('button', { name: 'Motion off (reduced motion)', exact: true });
    await expect(control).toBeVisible({ timeout: 15_000 });
    await expect(control).toBeDisabled();
    const authored = await page.locator(canvasSelector).screenshot();
    await page.waitForTimeout(200);
    const initial = await frames(page);
    const initialRequests = await requests(page);
    await page.waitForTimeout(2_000);
    expect(await frames(page)).toBe(initial);
    expect(await requests(page)).toBe(initialRequests);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeEnabled();
    await expect.poll(() => frames(page)).toBeGreaterThan(initial);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(control).toBeDisabled();
    expect(await page.locator(canvasSelector).screenshot()).toEqual(authored);
    await page.waitForTimeout(200);
    const reduced = await frames(page);
    const reducedRequests = await requests(page);
    await page.waitForTimeout(2_000);
    expect(await frames(page)).toBe(reduced);
    expect(await requests(page)).toBe(reducedRequests);
  });

  test(`${presentation} removes the focused motion utility on context loss and stops all draws`, async ({ page }) => {
    await installFrameCounter(page);
    await page.goto(path);
    const pause = page.getByRole('button', { name: 'Pause motion', exact: true });
    await expect(pause).toBeVisible({ timeout: 15_000 });
    await pause.focus();
    await page.locator(canvasSelector).evaluate(element => {
      (element as HTMLCanvasElement).getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext();
    });
    await expect(page.locator(canvasSelector)).toHaveCount(0);
    await expect(page.locator('[data-motion-control]')).toHaveCount(0);
    if (presentation === 'Home') await expect(page.getByRole('link', { name: 'Explore my work', exact: true })).toBeFocused();
    else await expect(page.locator('[data-district-link]').first()).toBeFocused();
    const stopped = await frames(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(2_000);
    expect(await frames(page)).toBe(stopped);
  });

  test(`${presentation} pagehide removes motion work and pageshow cannot restart it`, async ({ page }) => {
    await installFrameCounter(page);
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible({ timeout: 15_000 });
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await expect(page.locator('[data-motion-control]')).toHaveCount(0);
    await expect(page.locator(canvasSelector)).toHaveCount(0);
    await page.waitForTimeout(200);
    const stopped = await frames(page);
    const stoppedRequests = await requests(page);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForTimeout(2_000);
    expect(await frames(page)).toBe(stopped);
    expect(await requests(page)).toBe(stoppedRequests);
  });
}
