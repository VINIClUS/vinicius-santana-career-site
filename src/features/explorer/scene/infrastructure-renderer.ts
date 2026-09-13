import {
  ACESFilmicToneMapping, Color, DirectionalLight, HemisphereLight, Mesh,
  MeshStandardMaterial, OrthographicCamera, PlaneGeometry, Scene, WebGLRenderer,
} from 'three';
import generated from '../../../content/scenes/generated.json' with { type: 'json' };
import type { ExplorerController } from '../controller.ts';
import { createInfrastructureProjection } from './infrastructure-projection.ts';
import { createModelCache } from './resources.ts';

export interface InfrastructureScene { dispose(): void; setActive(active: boolean): void; }
interface Options {
  host: HTMLElement;
  controller: ExplorerController;
  onReady(): void;
  onFailure(): void;
}

/** Demand rendering: one frame per state/size/visibility change, with no animation loop. */
export function mountInfrastructureScene({ host, controller, onReady, onFailure }: Options): InfrastructureScene {
  const canvas = document.createElement('canvas');
  canvas.dataset.infrastructureCanvas = '';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Infrastructure cluster; current state is described by the simulation below');
  canvas.style.touchAction = 'pan-y';
  host.append(canvas);
  const lifetime = new AbortController();
  const cache = createModelCache(lifetime.signal);
  const scene = new Scene();
  scene.background = new Color('#050a11');
  const camera = new OrthographicCamera();
  const mobile = window.matchMedia('(max-width: 700px)');
  let gl: WebGLRenderer | undefined;
  let projection: ReturnType<typeof createInfrastructureProjection> | undefined;
  let observer: ResizeObserver | undefined;
  let unsubscribe: (() => void) | undefined;
  let frame: number | undefined;
  let disposed = false;
  let ready = false;
  let active = true;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    if (frame !== undefined) cancelAnimationFrame(frame);
    observer?.disconnect();
    unsubscribe?.();
    // Restore shared originals before the model cache disposes its owned resources.
    projection?.dispose();
    cache.dispose([scene]);
    scene.clear();
    gl?.renderLists.dispose();
    gl?.dispose();
    gl?.forceContextLoss();
    canvas.remove();
  };
  const fail = () => { if (!disposed) { dispose(); onFailure(); } };
  const draw = () => {
    frame = undefined;
    if (disposed || !active || document.hidden || !gl || !projection) return;
    try {
      // Re-read immediately before the first frame, including changes during loading.
      const state = controller.getState().infrastructureSimulation;
      if (!state) throw new Error('Infrastructure controller required');
      projection.apply(state);
      gl.render(scene, camera);
      if (gl.getContext().isContextLost()) { fail(); return; }
      if (!ready && gl.info.render.calls > 0) { ready = true; onReady(); }
    } catch { fail(); }
  };
  const invalidate = () => {
    if (!disposed && active && !document.hidden && frame === undefined && projection) frame = requestAnimationFrame(draw);
  };
  const resize = () => {
    if (disposed || !gl) return;
    const preset = generated['detail-infrastructure'].cameras[mobile.matches ? 'mobile' : 'desktop'];
    Object.assign(camera, preset.frustum);
    camera.position.fromArray(preset.position);
    camera.up.fromArray(preset.up);
    camera.zoom = preset.zoom;
    camera.lookAt(...preset.target as [number, number, number]);
    // Retain the authored framing and expand it only for a differently shaped host.
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    const aspect = width / height, authoredAspect = (camera.right - camera.left) / (camera.top - camera.bottom);
    if (aspect > authoredAspect) { camera.left *= aspect / authoredAspect; camera.right *= aspect / authoredAspect; }
    else { camera.top *= authoredAspect / aspect; camera.bottom *= authoredAspect / aspect; }
    camera.updateProjectionMatrix();
    gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    gl.setSize(width, height);
    invalidate();
  };
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(); }, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame !== undefined) { cancelAnimationFrame(frame); frame = undefined; }
    else invalidate();
  }, { signal: lifetime.signal });
  unsubscribe = controller.subscribe(invalidate);
  const initialize = async () => {
    const model = await cache.load(generated['detail-infrastructure'].model.src);
    if (disposed) return;
    projection = createInfrastructureProjection(model);
    scene.add(model, new HemisphereLight('#d9efff', '#17232d', 1.5));
    const key = new DirectionalLight('#d0e5ff', 2.5);
    key.position.set(-7, 14, 8);
    const fill = new DirectionalLight('#68b6df', 1.5);
    fill.position.set(8, 5, -6);
    const floor = new Mesh(new PlaneGeometry(160, 160), new MeshStandardMaterial({ color: '#050a11', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    scene.add(key, fill, floor);
    gl = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.85;
    observer = new ResizeObserver(resize);
    observer.observe(host);
    mobile.addEventListener('change', resize, { signal: lifetime.signal });
    resize();
  };
  void initialize().catch(fail);
  return {
    dispose,
    setActive(value) {
      active = value;
      if (!active && frame !== undefined) { cancelAnimationFrame(frame); frame = undefined; }
      if (active) invalidate();
    },
  };
}
