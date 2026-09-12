import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { Object3D } from 'three';

interface PreferenceProbe {
  events: { matches: boolean; trusted: boolean }[];
  firstPose: string | null;
  scene?: Object3D;
  pose(): string;
}

async function installPreferenceProbe(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & {
      ambientPreferenceProbe: PreferenceProbe;
      captureAmbientRenderer(renderer: object): void;
    };
    const pose = (scene?: Object3D) => {
      const objects: unknown[] = [];
      scene?.traverse(object => {
        if (object.userData.atlasMotion) objects.push({ name: object.name, position: object.position.toArray(), rotation: object.rotation.toArray(), scale: object.scale.toArray() });
      });
      return JSON.stringify(objects);
    };
    const probe: PreferenceProbe = state.ambientPreferenceProbe = { events: [], firstPose: null, pose: () => pose(state.ambientPreferenceProbe.scene) };
    const native = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const result = native(query);
      if (query.includes('prefers-reduced-motion')) result.addEventListener('change', event => {
        probe.events.push({ matches: event.matches, trusted: event.isTrusted });
      });
      return result;
    };
    // Read-only access to the real rendered scene; production code carries no probe.
    state.captureAmbientRenderer = renderer => {
      let render: (scene: Object3D, camera: unknown) => void;
      Object.defineProperty(renderer, 'render', {
        configurable: true,
        get: () => render,
        set(original: (scene: Object3D, camera: unknown) => void) {
          render = (scene, camera) => {
            probe.scene = scene;
            if (probe.firstPose === null && pose(scene) !== '[]') probe.firstPose = pose(scene);
            return original.call(renderer, scene, camera);
          };
        },
      });
    };
  });
  let injected = false;
  await page.route('**/*.js', async route => {
    const response = await route.fetch(), source = await response.text();
    const pattern = /([\w$]+)\.renderLists=([\w$]+),\1\.shadowMap=([\w$]+),\1\.state=([\w$]+),\1\.info=([\w$]+)/g;
    const match = [...source.matchAll(pattern)][0];
    if (!match) { await route.fulfill({ response }); return; }
    injected = true;
    await route.fulfill({ response, body: source.replace(pattern, `${match[1]}.renderLists=${match[2]},${match[1]}.shadowMap=${match[3]},${match[1]}.state=${match[4]},window.captureAmbientRenderer(${match[1]}),${match[1]}.info=${match[5]}`) });
  });
  return () => expect(injected, 'real renderer transform observation installed').toBe(true);
}

// Trace DOM snapshots may flush style/media work and mask the production race.
test.use({ trace: 'off' });

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
for (const presentation of ['Home', 'Atlas']) {
  const path = presentation === 'Home' ? '/' : '/explore/';
  test(`${presentation} normal-first pause resume honors the trusted reduced-motion transition`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await installFrameCounter(page);
    const verifyProbe = await installPreferenceProbe(page);
    await page.goto(path);
    const visual = page.locator(presentation === 'Home' ? '[data-preview-host]' : '.observatory-map');
    await visual.scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible({ timeout: 15_000 });
    verifyProbe();
    await page.waitForTimeout(3_000);
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.mouse.move(0, 0);
    await visual.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_500);
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await page.mouse.move(0, 0);
    await visual.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2_500);
    const snapshot = () => page.evaluate(() => {
      const state = window as typeof window & { ambientPreferenceProbe: PreferenceProbe; ambientFrames: number; ambientRafRequests: number };
      const probe = state.ambientPreferenceProbe, button = document.querySelector<HTMLButtonElement>('[data-motion-control]')!;
      return { events: probe.events, firstPose: probe.firstPose, pose: probe.pose(), frames: state.ambientFrames, requests: state.ambientRafRequests,
        control: { text: button.textContent, state: button.dataset.motionState, disabled: button.disabled } };
    });
    const running = await snapshot();
    expect(running.firstPose).not.toBeNull();
    expect(running.pose).not.toBe(running.firstPose);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // No locator/style/native .matches polling may deliver or consume the transition
    // before this observation. Only real browser media events can update playback.
    await page.waitForTimeout(500);
    const reducedStart = await snapshot();
    await page.waitForTimeout(2_000);
    const reducedEnd = await snapshot();
    const evidence = testInfo.outputPath('normal-first-native-preference.json');
    await writeFile(evidence, JSON.stringify({ presentation, running, reducedStart, reducedEnd }, null, 2));
    await testInfo.attach('normal-first-native-preference.json', { path: evidence, contentType: 'application/json' });
    expect(reducedStart.control).toEqual({ text: 'Motion off (reduced motion)', state: 'reduced', disabled: true });
    expect(reducedStart.events).toContainEqual({ matches: true, trusted: true });
    expect(reducedStart.pose).toBe(running.firstPose);
    expect(reducedEnd.pose).toBe(running.firstPose);
    expect(reducedEnd.frames).toBe(reducedStart.frames);
    expect(reducedEnd.requests).toBe(reducedStart.requests);
  });
}
