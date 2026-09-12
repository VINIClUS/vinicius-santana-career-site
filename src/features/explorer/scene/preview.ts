import { ACESFilmicToneMapping, Color, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { overview } from '../../../content/scenes/index.ts';
import { applyOverviewCamera, createOverviewComposition } from './composition.ts';
import { createModelCache } from './resources.ts';

export interface HomePreview {
  setActive(active: boolean): void;
  dispose(): void;
}

interface Options {
  host: HTMLElement;
  active: boolean;
  onReady(): void;
  onFailure(): void;
}

/** A fixed, decorative overview. The launcher owns eligibility and its load deadline. */
export function mountHomePreview(options: Options): HomePreview {
  const { host } = options;
  const lifetime = new AbortController();
  const cache = createModelCache(lifetime.signal);
  const composition = createOverviewComposition();
  const scene = new Scene();
  scene.background = new Color('#050a11');
  scene.add(composition.world);
  const camera = new OrthographicCamera();
  const desktop = window.matchMedia('(min-width: 780px)');
  const canvas = document.createElement('canvas');
  canvas.dataset.homePreviewCanvas = '';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.pointerEvents = 'none';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  let active = options.active;
  let disposed = false;
  let ready = false;
  let loaded = false;
  let dirty = true;
  let frame: number | undefined;
  let gl: WebGLRenderer | undefined;
  let observer: ResizeObserver | undefined;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    observer?.disconnect();
    cache.dispose([composition.world]);
    scene.clear();
    gl?.renderLists.dispose();
    gl?.dispose();
    gl?.forceContextLoss();
    canvas.remove();
  };
  const fail = () => {
    if (disposed) return;
    dispose();
    options.onFailure();
  };
  const draw = () => {
    frame = undefined;
    if (disposed || !active || !loaded || !dirty || !gl) return;
    try {
      const width = host.clientWidth, height = host.clientHeight;
      if (width <= 0 || height <= 0) return;
      const layout = desktop.matches ? overview.layouts.desktop : overview.layouts.mobile;
      composition.applyLayout(layout);
      applyOverviewCamera(camera, layout);
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      gl.setSize(width, height, false);
      gl.render(scene, camera);
      if (gl.getContext().isContextLost() || gl.info.render.calls === 0) {
        fail();
        return;
      }
      dirty = false;
      if (!ready) {
        ready = true;
        options.onReady();
      }
    } catch { fail(); }
  };
  const schedule = () => {
    if (!disposed && active && loaded && dirty && frame === undefined) frame = requestAnimationFrame(draw);
  };
  const invalidate = () => {
    dirty = true;
    schedule();
  };
  const initialize = async () => {
    // Let the synchronous mount return its disposable handle before callbacks can run.
    await composition.load(cache, lifetime.signal);
    if (disposed) return;
    gl = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.85;
    host.append(canvas);
    observer = new ResizeObserver(invalidate);
    observer.observe(host);
    desktop.addEventListener('change', invalidate, { signal: lifetime.signal });
    loaded = true;
    schedule();
  };
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    fail();
  }, { signal: lifetime.signal });
  void initialize().catch(fail);
  return {
    dispose,
    setActive(value) {
      if (disposed || active === value) return;
      active = value;
      if (!active && frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
      if (active) schedule();
    },
  };
}
