import { Component, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';
import { createRoot, events, useFrame, type RootState, type ThreeEvent } from '@react-three/fiber';
import {
  ACESFilmicToneMapping, BufferGeometry, Color, DirectionalLight, Group, HemisphereLight,
  GridHelper, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  OrthographicCamera, PlaneGeometry, RingGeometry, Scene, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { districts, hub, overview, type OverviewLayout } from '../../../content/scenes/index.ts';
import { districtIds, type DistrictId } from '../districts.ts';
import type { ObservatoryController } from '../observatory-controller.ts';
import { createModelCache } from './resources.ts';

export interface ObservatoryScene { dispose(): void; zoom(direction: 1 | -1): void; reset(): void; }
interface Options {
  host: HTMLElement;
  controller: ObservatoryController;
  onSelect(id: DistrictId): void;
  onReady(): void;
  onFailure(): void;
}

class SceneBoundary extends Component<{ children: ReactNode; onFailure(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function DistrictScene({ world, options, select, draw }: {
  world: Group; options: Options; select(id: DistrictId | null): void; draw(state: RootState): void;
}) {
  const selected = useSyncExternalStore(options.controller.subscribe, () => options.controller.getState().selectedDistrictId);
  useLayoutEffect(() => { select(selected); }, [selected, select]);
  // Render on demand, then announce readiness only after WebGL has drawn the loaded maquettes.
  useFrame(draw, 1);
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 4) return;
    let object: Object3D | null = event.object;
    while (object) {
      const id = object.userData.districtId as DistrictId | undefined;
      if (id && districtIds.includes(id)) {
        event.stopPropagation();
        options.onSelect(id);
        return;
      }
      object = object.parent;
    }
  };
  return <primitive object={world} dispose={null} onClick={click} />;
}

export function mountObservatoryScene(options: Options): ObservatoryScene {
  const { host } = options;
  const canvas = document.createElement('canvas');
  canvas.dataset.observatoryCanvas = '';
  canvas.setAttribute('aria-label', 'Interactive 3D systems districts; use the district links for keyboard navigation');
  canvas.setAttribute('role', 'img');
  host.append(canvas);
  const lifetime = new AbortController();
  const cache = createModelCache(lifetime.signal);
  const world = new Group();
  world.name = 'systems-observatory';
  const scene = new Scene();
  scene.background = new Color('#050a11');
  const camera = new OrthographicCamera();
  const mobile = window.matchMedia('(max-width: 700px)');
  let layout = mobile.matches ? overview.layouts.mobile : overview.layouts.desktop;
  let disposed = false;
  let ready = false;
  let root: ReturnType<typeof createRoot> | undefined;
  let state: RootState | undefined;
  let gl: WebGLRenderer | undefined;
  let controls: OrbitControls | undefined;
  let observer: ResizeObserver | undefined;
  const groups = new Map<DistrictId, Group>();
  const selectedRing = new Mesh(new RingGeometry(3.02, 3.1, 64), new MeshBasicMaterial({ color: '#74d7f0', transparent: true, opacity: 0.6, depthWrite: false }));
  selectedRing.rotation.x = -Math.PI / 2;
  selectedRing.visible = false;
  world.add(selectedRing);
  const connectors = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color: '#335466', transparent: true, opacity: 0.55 }));
  world.add(connectors);
  let hubModel: Object3D | undefined;
  const labels = districtIds.map(id => ({ element: host.querySelector<HTMLElement>(`[data-district-link="${id}"]`)!, id }));
  const hubLabel = host.querySelector<HTMLElement>('.observatory-hub')!;
  const projection = new Vector3();
  const projectLabels = () => {
    camera.updateMatrixWorld();
    const place = (element: HTMLElement, position: readonly [number, number, number]) => {
      projection.set(...position).project(camera);
      element.style.left = `${(projection.x + 1) * 50}%`;
      element.style.top = `${(1 - projection.y) * 50}%`;
    };
    for (const { element, id } of labels) place(element, layout.placements[id]);
    place(hubLabel, layout.hubPosition);
  };
  const invalidate = () => {
    if (disposed) return;
    projectLabels();
    state?.invalidate();
  };
  const resetCamera = () => {
    const preset = layout.camera;
    Object.assign(camera, preset.frustum);
    camera.position.set(...preset.position);
    camera.up.set(...preset.up);
    camera.zoom = preset.zoom;
    camera.lookAt(new Vector3(...preset.target));
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.set(...preset.target);
      // Remove old limits before evaluating the new responsive camera's initial angles.
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.update();
      const azimuth = controls.getAzimuthalAngle(), polar = controls.getPolarAngle();
      controls.minAzimuthAngle = azimuth - Math.PI / 12;
      controls.maxAzimuthAngle = azimuth + Math.PI / 12;
      controls.minPolarAngle = polar - Math.PI / 36;
      controls.maxPolarAngle = polar + Math.PI / 36;
      controls.minZoom = preset.zoom * 0.9;
      controls.maxZoom = preset.zoom * 1.2;
      controls.saveState();
    }
    invalidate();
  };
  const applyLayout = (next: OverviewLayout) => {
    layout = next;
    for (const [id, group] of groups) {
      group.position.set(...layout.placements[id]);
      group.scale.setScalar(layout.districtScale);
    }
    hubModel?.position.set(...layout.hubPosition);
    const points: Vector3[] = [];
    for (const id of districtIds) points.push(new Vector3(layout.hubPosition[0], 0.2, layout.hubPosition[2]), new Vector3(layout.placements[id][0], 0.2, layout.placements[id][2]));
    connectors.geometry.dispose();
    connectors.geometry = new BufferGeometry().setFromPoints(points);
    const selected = options.controller.getState().selectedDistrictId;
    if (selected) selectedRing.position.set(layout.placements[selected][0], 0.04, layout.placements[selected][2]);
    resetCamera();
  };
  const select = (id: DistrictId | null) => {
    selectedRing.visible = id !== null;
    if (id) selectedRing.position.set(layout.placements[id][0], 0.04, layout.placements[id][2]);
    invalidate();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    observer?.disconnect();
    controls?.removeEventListener('change', invalidate);
    controls?.dispose();
    // Stop R3F scheduling before releasing GPU resources. Its unmount also disconnects events.
    state?.setFrameloop('never');
    root?.unmount();
    cache.dispose([world]);
    scene.clear();
    gl?.renderLists.dispose();
    gl?.dispose();
    canvas.remove();
  };
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    if (!disposed) options.onFailure();
  }, { signal: lifetime.signal });
  const initialize = async () => {
    const models = await Promise.all([cache.load(hub.model.src), ...districtIds.map(id => cache.load(districts[id].model.src))]);
    if (disposed) return;
    hubModel = models[0]!;
    world.add(hubModel);
    districtIds.forEach((id, index) => {
      const group = new Group();
      group.name = `placement-${id}`;
      group.userData.districtId = id;
      const object = models[index + 1]!;
      group.add(object);
      groups.set(id, group);
      world.add(group);
    });
    world.add(new HemisphereLight('#d9efff', '#17232d', 1.5));
    const key = new DirectionalLight('#d0e5ff', 2.5);
    key.position.set(-7, 14, 8);
    const fill = new DirectionalLight('#68b6df', 1.5);
    fill.position.set(8, 5, -6);
    world.add(key, fill);
    const floor = new Mesh(new PlaneGeometry(160, 160), new MeshStandardMaterial({ color: '#050a11', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.025;
    world.add(floor);
    const grid = new GridHelper(60, 30, '#162835', '#12212d');
    grid.position.y = -0.02;
    world.add(grid);
    gl = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.85;
    controls = new OrbitControls(camera, canvas);
    // OrbitControls connects with touch-action:none. Restore native vertical scrolling
    // after connection; horizontal gestures still orbit and taps still reach picking.
    canvas.style.touchAction = 'pan-y';
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.5;
    controls.addEventListener('change', invalidate);
    applyLayout(layout);
    // This camera uses the authored frustum rather than Fiber's automatic aspect adjustment.
    Object.assign(camera, { manual: true });
    root = createRoot(canvas);
    await root.configure({ gl, scene, camera, events, frameloop: 'demand', dpr: Math.min(window.devicePixelRatio || 1, 1.5), size: { width: host.clientWidth, height: host.clientHeight, top: 0, left: 0 }, onCreated(value) { state = value; } });
    if (disposed) return;
    const resize = () => {
      if (disposed) return;
      const next = mobile.matches ? overview.layouts.mobile : overview.layouts.desktop;
      state?.setSize(host.clientWidth, host.clientHeight);
      if (next !== layout) applyLayout(next);
      invalidate();
    };
    observer = new ResizeObserver(resize);
    observer.observe(host);
    mobile.addEventListener('change', resize, { signal: lifetime.signal });
    const draw = (value: RootState) => {
      if (disposed) return;
      try {
        value.gl.render(value.scene, value.camera);
        if (!ready && !value.gl.getContext().isContextLost() && value.gl.info.render.calls > 0) {
          ready = true;
          options.onReady();
        }
      } catch { options.onFailure(); }
    };
    root.render(<SceneBoundary onFailure={options.onFailure}><DistrictScene world={world} options={options} select={select} draw={draw} /></SceneBoundary>);
  };
  void initialize().catch(() => { if (!disposed) options.onFailure(); });
  return {
    dispose,
    zoom(direction) {
      if (disposed) return;
      camera.zoom = Math.max(layout.camera.zoom * 0.9, Math.min(layout.camera.zoom * 1.2, camera.zoom + direction * 0.1 * layout.camera.zoom));
      camera.updateProjectionMatrix();
      controls?.update();
      invalidate();
    },
    reset() { if (!disposed) resetCamera(); },
  };
}
