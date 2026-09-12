import { test, expect, type Page, type Route } from '@playwright/test';

const preview = (page: Page) => page.locator('[data-home-preview]');
const host = (page: Page) => page.locator('[data-home-preview] [data-preview-host]');
const poster = (page: Page) => page.locator('[data-home-preview] picture');
const canvas = (page: Page) => host(page).locator('canvas');
const ready = (page: Page) => expect(preview(page)).toHaveAttribute('data-preview-state', 'ready', { timeout: 15_000 });
const isPreviewAsset = (url: string) => /(?:preview|composition|resources|scheduler|districts|project)[^/]*\.js(?:\?|$)|\.glb(?:\?|$)/.test(url);

async function frames(page: Page, count = 5) {
  await page.evaluate(async count => {
    for (let index = 0; index < count; index++) await new Promise(requestAnimationFrame);
  }, count);
}

function holdRequest(page: Page, pattern: string, respond: (route: Route) => Promise<void> = route => route.continue()) {
  let release!: () => void;
  let requested!: (route: Route) => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const arrived = new Promise<Route>(resolve => { requested = resolve; });
  const installed = page.route(pattern, async route => {
    requested(route);
    await held;
    await respond(route).catch(() => {});
  });
  return { installed, arrived, release };
}

async function installDrawCounter(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { homePreviewDraws: number };
    state.homePreviewDraws = 0;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawArrays', 'drawElements'] as const) {
        const original = prototype[method];
        prototype[method] = function (...args: number[]) {
          state.homePreviewDraws++;
          return Reflect.apply(original, this, args);
        };
      }
    }
  });
}

test('starts as a meaningful poster and exposes one keyboard-operable Explore link', async ({ page }) => {
  const renderer = holdRequest(page, '**/_astro/preview.*.js');
  await renderer.installed;
  await page.goto('/');
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'loading');
  await expect(poster(page)).toBeVisible();
  await expect(canvas(page)).toHaveCount(0);
  const links = page.getByRole('link', { name: 'Explore my work', exact: true });
  await expect(links).toHaveCount(1);
  await expect(links).toHaveAttribute('href', '/explore/');
  await links.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/explore\/$/);
  renderer.release();
});

test('loads exactly the four overview models, draws once, then stays idle', async ({ page }) => {
  await installDrawCounter(page);
  const models: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('.glb')) models.push(new URL(request.url()).pathname.split('/').at(-1)!);
  });
  await page.goto('/');
  await ready(page);
  expect(models.sort()).toEqual([
    'district-cnesdata.glb',
    'district-infrastructure.glb',
    'district-limnopulse.glb',
    'hub.glb',
  ]);
  await expect(canvas(page)).toHaveCount(1);
  await expect(canvas(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(canvas(page)).not.toHaveAttribute('tabindex', /.+/);
  await expect(page.getByRole('button', { name: /zoom|reset|2d/i })).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBeGreaterThan(0);
  await frames(page);
  const settled = await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws);
  await frames(page, 12);
  expect(await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBe(settled);
});

test('keeps the poster in layout until the first completed draw', async ({ page }) => {
  const model = holdRequest(page, '**/hub.glb');
  await model.installed;
  await page.goto('/');
  await model.arrived;
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'loading');
  await expect(poster(page)).toBeVisible();
  await expect(poster(page)).toHaveCSS('visibility', 'visible');
  model.release();
  await ready(page);
  await expect(poster(page)).toHaveCSS('visibility', 'hidden');
  await expect(poster(page)).toHaveCSS('display', /^(?!none$).+/);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 779, height: 900 },
  { width: 780, height: 900 },
]) {
  test(`poster geometry is stable when the preview activates at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const model = holdRequest(page, '**/hub.glb');
    await model.installed;
    await page.goto('/');
    await model.arrived;
    const before = await poster(page).boundingBox();
    expect(before).not.toBeNull();
    model.release();
    await ready(page);
    const after = await poster(page).boundingBox();
    expect(after).toEqual(before);
    const image = poster(page).locator('img');
    const currentSrc = await image.evaluate(element => (element as HTMLImageElement).currentSrc);
    expect(currentSrc).toMatch(viewport.width >= 780 ? /overview-desktop\.webp$/ : /overview-mobile\.webp$/);
    expect(after!.width / after!.height).toBeCloseTo(viewport.width >= 780 ? 1200 / 800 : 720 / 900, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('the preview activation requires load, a real viewport intersection and idle time', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { runHomeIdle?: () => void };
    const callbacks: IdleRequestCallback[] = [];
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    window.cancelIdleCallback = id => { callbacks[id - 1] = () => {}; };
    state.runHomeIdle = () => callbacks.splice(0).forEach(callback => callback({ didTimeout: false, timeRemaining: () => 50 }));
  });
  const previewRequests: string[] = [];
  page.on('request', request => { if (/\/preview\.[^/]+\.js(?:\?|$)/.test(request.url())) previewRequests.push(request.url()); });
  await page.goto('/');
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'poster');
  expect(previewRequests).toEqual([]);
  await page.evaluate(() => (window as typeof window & { runHomeIdle: () => void }).runHomeIdle());
  await ready(page);
  expect(previewRequests).toHaveLength(1);
});

test('does not activate before the load event even when intersection and idle are ready', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { runHomeIdle?: () => void };
    const callbacks: IdleRequestCallback[] = [];
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    window.cancelIdleCallback = id => { callbacks[id - 1] = () => {}; };
    state.runHomeIdle = () => callbacks.splice(0).forEach(callback => callback({ didTimeout: false, timeRemaining: () => 50 }));
  });
  const posterRequest = holdRequest(page, '**/overview-*.webp');
  await posterRequest.installed;
  const assets: string[] = [];
  page.on('request', request => { if (isPreviewAsset(request.url())) assets.push(request.url()); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await posterRequest.arrived;
  await page.evaluate(() => (window as typeof window & { runHomeIdle: () => void }).runHomeIdle());
  expect(assets).toEqual([]);
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'poster');
  posterRequest.release();
  await page.waitForLoadState('load');
  await page.evaluate(() => (window as typeof window & { runHomeIdle: () => void }).runHomeIdle());
  await ready(page);
});

test('does not activate while initially offscreen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 100 });
  const assets: string[] = [];
  page.on('request', request => { if (isPreviewAsset(request.url())) assets.push(request.url()); });
  await page.goto('/');
  await expect(preview(page)).not.toBeInViewport();
  await frames(page, 12);
  expect(assets).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await preview(page).scrollIntoViewIfNeeded();
  await ready(page);
});

test('uses the timer fallback when idle callbacks are unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'requestIdleCallback', { value: undefined });
    Object.defineProperty(window, 'cancelIdleCallback', { value: undefined });
  });
  await page.goto('/');
  await ready(page);
});

test('revalidates visibility when idle work is delivered', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      runHomeIdle?: () => void;
      setHomeVisibility?: (value: DocumentVisibilityState, emit?: boolean) => void;
    };
    let visibility: DocumentVisibilityState = 'visible';
    const callbacks: IdleRequestCallback[] = [];
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    window.cancelIdleCallback = id => { callbacks[id - 1] = () => {}; };
    state.runHomeIdle = () => callbacks.splice(0).forEach(callback => callback({ didTimeout: false, timeRemaining: () => 50 }));
    state.setHomeVisibility = (value, emit = true) => {
      visibility = value;
      if (emit) document.dispatchEvent(new Event('visibilitychange'));
    };
  });
  const assets: string[] = [];
  page.on('request', request => { if (/preview\.|\.glb(?:$|\?)/.test(request.url())) assets.push(request.url()); });
  await page.goto('/');
  await page.evaluate(() => {
    const state = window as typeof window & { runHomeIdle: () => void; setHomeVisibility: (value: DocumentVisibilityState, emit?: boolean) => void };
    state.setHomeVisibility('hidden', false);
    state.runHomeIdle();
  });
  expect(assets).toEqual([]);
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'poster');
  await page.evaluate(() => {
    const state = window as typeof window & { runHomeIdle: () => void; setHomeVisibility: (value: DocumentVisibilityState, emit?: boolean) => void };
    state.setHomeVisibility('visible');
    state.runHomeIdle();
  });
  await ready(page);
});

for (const capability of ['save-data', 'no-webgl', 'no-intersection-observer', 'unknown-visibility'] as const) {
  test(`${capability} retains the poster without preview downloads`, async ({ page }) => {
    await page.addInitScript(capability => {
      if (capability === 'save-data') Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
      if (capability === 'no-webgl') HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
      if (capability === 'no-intersection-observer') Object.defineProperty(window, 'IntersectionObserver', { value: undefined });
      if (capability === 'unknown-visibility') Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => undefined });
    }, capability);
    const assets: string[] = [];
    page.on('request', request => { if (isPreviewAsset(request.url())) assets.push(request.url()); });
    await page.goto('/');
    await frames(page, 8);
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
    await expect(poster(page)).toBeVisible();
    await expect(canvas(page)).toHaveCount(0);
    expect(assets).toEqual([]);
  });
}

for (const failure of ['import', 'model'] as const) {
  test(`${failure} failure restores the poster and keeps navigation usable`, async ({ page }) => {
    if (failure === 'import') await page.route('**/_astro/preview.*.js', route => route.abort());
    else await page.route('**/district-limnopulse.glb', route => route.fulfill({ status: 200, body: 'invalid GLB' }));
    await page.goto('/');
    await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
    await expect(poster(page)).toBeVisible();
    await expect(canvas(page)).toHaveCount(0);
    await page.getByRole('link', { name: 'Explore my work', exact: true }).click();
    await expect(page).toHaveURL(/\/explore\/$/);
  });
}

test('one 15 second deadline covers the renderer import and model loading', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));
  // Install after the clock so its idle shim cannot overwrite our activation seam.
  await page.addInitScript(() => {
    const state = window as typeof window & {
      homeIdleCount?: () => number;
      runHomeIdle?: () => void;
    };
    const callbacks: IdleRequestCallback[] = [];
    window.requestIdleCallback = callback => { callbacks.push(callback); return callbacks.length; };
    window.cancelIdleCallback = id => { callbacks[id - 1] = () => {}; };
    state.homeIdleCount = () => callbacks.length;
    state.runHomeIdle = () => callbacks.splice(0).forEach(callback => callback({ didTimeout: false, timeRemaining: () => 50 }));
  });
  const renderer = holdRequest(page, '**/_astro/preview.*.js');
  const model = holdRequest(page, '**/hub.glb');
  await renderer.installed;
  await model.installed;
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { homeIdleCount: () => number }).homeIdleCount())).toBeGreaterThan(0);
  await page.evaluate(() => (window as typeof window & { runHomeIdle: () => void }).runHomeIdle());
  await renderer.arrived;
  await page.clock.fastForward(10_000);
  renderer.release();
  await model.arrived;
  await page.clock.fastForward(4_999);
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'loading');
  await page.clock.fastForward(1);
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
  model.release();
  await page.clock.resume();
  await frames(page, 12);
  await expect(canvas(page)).toHaveCount(0);
  await expect(poster(page)).toBeVisible();
});

test('rejects a first draw completed after the monotonic activation deadline', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { advanceHomeNow?: (milliseconds: number) => void };
    const original = performance.now.bind(performance);
    let offset = 0;
    Object.defineProperty(performance, 'now', { configurable: true, value: () => original() + offset });
    state.advanceHomeNow = milliseconds => { offset += milliseconds; };
  });
  const model = holdRequest(page, '**/hub.glb');
  await model.installed;
  await page.goto('/');
  await model.arrived;
  await page.evaluate(() => (window as typeof window & { advanceHomeNow: (milliseconds: number) => void }).advanceHomeNow(15_001));
  model.release();
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
  await expect(canvas(page)).toHaveCount(0);
  await expect(poster(page)).toBeVisible();
});

test('pagehide aborts activation, ignores late completion and persisted pageshow keeps the poster', async ({ page }) => {
  const model = holdRequest(page, '**/hub.glb');
  await model.installed;
  await page.goto('/');
  await model.arrived;
  const canceled = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/hub.glb') });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  model.release();
  expect((await canceled).failure()?.errorText).toContain('ABORTED');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await frames(page, 12);
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
  await expect(canvas(page)).toHaveCount(0);
  await expect(poster(page)).toBeVisible();
});

test('context loss falls back to the poster without affecting navigation', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await canvas(page).evaluate(element => {
    const extension = (element as HTMLCanvasElement).getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Real WebGL context-loss extension unavailable');
    extension.loseContext();
  });
  await expect(preview(page)).toHaveAttribute('data-preview-state', 'fallback');
  await expect(canvas(page)).toHaveCount(0);
  await expect(poster(page)).toBeVisible();
  await page.getByRole('link', { name: 'Explore my work', exact: true }).click();
  await expect(page).toHaveURL(/\/explore\/$/);
});

test('does not draw while hidden or offscreen and redraws after becoming active', async ({ page }) => {
  await installDrawCounter(page);
  await page.addInitScript(() => {
    const state = window as typeof window & { setHomeVisibility?: (value: DocumentVisibilityState) => void };
    let visibility: DocumentVisibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    state.setHomeVisibility = value => { visibility = value; document.dispatchEvent(new Event('visibilitychange')); };
  });
  await page.goto('/');
  await ready(page);
  await frames(page);
  const initial = await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws);
  await page.evaluate(() => (window as typeof window & { setHomeVisibility: (value: DocumentVisibilityState) => void }).setHomeVisibility('hidden'));
  await page.setViewportSize({ width: 1210, height: 800 });
  await frames(page, 10);
  expect(await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBe(initial);
  await page.evaluate(() => (window as typeof window & { setHomeVisibility: (value: DocumentVisibilityState) => void }).setHomeVisibility('visible'));
  await expect.poll(() => page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBeGreaterThan(initial);
  const visible = await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(preview(page)).not.toBeInViewport();
  await page.setViewportSize({ width: 1200, height: 800 });
  await frames(page, 10);
  expect(await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBe(visible);
  await preview(page).scrollIntoViewIfNeeded();
  await page.setViewportSize({ width: 1190, height: 800 });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBeGreaterThan(visible);
  await frames(page, 10);
  const resized = await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws);
  await frames(page, 10);
  expect(await page.evaluate(() => (window as typeof window & { homePreviewDraws: number }).homePreviewDraws)).toBe(resized);
});

test('mobile touch scrolling works over the decorative preview with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  const bounds = await host(page).boundingBox();
  expect(bounds).not.toBeNull();
  const client = await page.context().newCDPSession(page);
  const x = bounds!.x + bounds!.width / 2;
  const startY = Math.min(bounds!.y + bounds!.height - 20, 800);
  const endY = Math.max(bounds!.y + 20, startY - 250);
  const before = await page.evaluate(() => scrollY);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: endY }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});

test('legacy Home fragments redirect to their Explore destinations', async ({ page }) => {
  const destinations = {
    'case-cnesdata': '/explore/cnesdata/',
    'case-aquafarm': '/explore/limnopulse/',
    'case-esus-pec-bootstrap': '/explore/infrastructure/',
    'case-infra-ansible': '/explore/infrastructure/',
    'case-packer-proxmox-templates': '/explore/infrastructure/',
  } as const;
  await page.goto('/');
  await expect(page.locator('#projects .hero-actions')).toHaveCount(1);
  for (const [fragment, destination] of Object.entries(destinations)) {
    await page.goto(`/#${fragment}`);
    await expect(page).toHaveURL(new RegExp(`${destination.replaceAll('/', '\\/')}$`));
  }
});

test('the Home introduction and destinations remain meaningful without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#projects')).toContainText(/work|systems|projects/i);
  await expect(page.getByRole('link', { name: 'Explore my work', exact: true })).toHaveAttribute('href', '/explore/');
  for (const id of ['case-cnesdata', 'case-aquafarm', 'case-esus-pec-bootstrap', 'case-infra-ansible', 'case-packer-proxmox-templates']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(poster(page)).toBeVisible();
  await context.close();
});
