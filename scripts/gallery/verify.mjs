import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const expectedIds = [
  'district-cnesdata', 'district-limnopulse', 'district-infrastructure', 'hub',
  'detail-cnesdata', 'detail-infrastructure', 'overview', 'detail-infrastructure-failed',
];

const server = spawn(process.execPath, ['--experimental-strip-types', 'scripts/gallery/server.mjs'], { env: { ...process.env, PORT: '4323' }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await Promise.race([once(server.stdout, 'data'), once(server, 'exit').then(() => { throw new Error('Gallery server failed'); })]);
  browser = await chromium.launch();
  await mkdir('test-results/gallery', { recursive: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4323/');
    const images = page.locator('img');
    assert.deepEqual(await page.locator('main article').evaluateAll(cards => cards.map(card => card.id)), expectedIds);
    assert.equal(await images.count(), expectedIds.length);
    for (const id of expectedIds) {
      const img = page.locator(`#${id} img`);
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(element => element.decode());
      const state = await img.evaluate(element => ({ width: element.naturalWidth, src: element.currentSrc }));
      assert.ok(state.width > 0);
      assert.equal(new URL(state.src).pathname, `/assets/posters/${id}-${name}.webp`);
      const served = await context.request.get(state.src);
      assert.equal(served.status(), 200, state.src);
      assert.match(served.headers()['content-type'], /^image\/webp/);
      assert.ok((await served.body()).length > 0, state.src);
    }
    assert.equal(await page.locator('canvas').count(), 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `test-results/gallery/${name}-no-js.png`, fullPage: true });
    await context.close();
  }
  const noWebGL = await browser.newContext();
  await noWebGL.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  const page = await noWebGL.newPage();
  await page.goto('http://127.0.0.1:4323/');
  const button = page.locator('[data-model]').first();
  await button.click();
  await page.getByText('3D unavailable — poster remains available').waitFor();
  assert.ok(await page.locator('#district-cnesdata img').isVisible());
  await noWebGL.close();
  const normal = await browser.newContext();
  const modelPage = await normal.newPage();
  await modelPage.goto('http://127.0.0.1:4323/');
  await modelPage.locator('[data-model]').first().click();
  await modelPage.getByText('Drag to orbit · scroll to zoom').waitFor();
  assert.equal(await modelPage.locator('canvas').count(), 1);
  await normal.close();
  console.log('Gallery passed: desktop/mobile without JavaScript, unavailable WebGL fallback, and GLB viewer.');
} finally {
  await browser?.close();
  server.kill();
}
