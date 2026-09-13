import { Component, type ReactNode } from 'react';
import { createRoot, events, useFrame, type RootState, type ThreeEvent } from '@react-three/fiber';
import {
  Color, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
  OrthographicCamera, Scene, Shape, ShapeGeometry, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { overview, type OverviewLayout } from '../../../content/scenes/index.ts';
import { districtIds, type DistrictId } from '../districts.ts';
import type { ObservatoryController } from '../observatory-controller.ts';
import { createModelCache } from './resources.ts';
import { applyOverviewCamera, atlasVisual, configureOverviewRenderer, createOverviewComposition } from './composition.ts';
import { regionPoints } from './atlas-world.mjs';
import { createMotionPlayback } from './motion-playback.ts';

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

function DistrictScene({ world, options, hover, draw, wasDraggedGesture }: {
  world: Group; options: Options; hover(id: DistrictId | null): void; draw(state: RootState): void;
  wasDraggedGesture(): boolean;
}) {
  // Render on demand, then announce readiness only after WebGL has drawn the loaded maquettes.
  useFrame(draw, 1);
  const district = (event: ThreeEvent<MouseEvent | PointerEvent>) => {
    let object: Object3D | null = event.object;
    while (object) {
      const id = object.userData.districtId as DistrictId | undefined;
      if (id && districtIds.includes(id)) {
        event.stopPropagation();
        return id;
      }
      object = object.parent;
    }
    return null;
  };
  return <primitive object={world} dispose={null}
    onClick={(event: ThreeEvent<MouseEvent>) => {
      if (wasDraggedGesture() || event.delta > 4) return;
      const id = district(event);
      if (id) options.onSelect(id);
    }}
    onPointerMove={(event: ThreeEvent<PointerEvent>) => { if (event.pointerType !== 'touch') hover(district(event)); }}
    onPointerOut={() => hover(null)}
  />;
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
  scene.background = new Color(atlasVisual.palette.background);
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
  let intersection: IntersectionObserver | undefined;
  let motion: ReturnType<typeof createMotionPlayback> | undefined;
  let inViewport = true;
  let pointerGesture: { id: number; x: number; y: number; dragged: boolean } | undefined;
  let draggedGesture = false;
  const active = () => inViewport && document.visibilityState === 'visible';
  const composition = createOverviewComposition(world);
  const labels = districtIds.map(id => ({ element: host.querySelector<HTMLElement>(`[data-district-link="${id}"]`)!, id }));
  const regions = [...host.querySelectorAll<SVGGElement>('[data-region]')];
  const polygons = [...host.querySelectorAll<SVGPolygonElement>('[data-region-points]')];
  let hovered: DistrictId | null = null;
  let focused: DistrictId | null = null;
  const materials = new Map<DistrictId, { material: MeshStandardMaterial; emissive: Color; intensity: number }[]>();
  const hubLabel = host.querySelector<HTMLElement>('.observatory-hub')!;
  const projection = new Vector3();
  const projectLabels = () => {
    camera.updateMatrixWorld();
    const place = (element: HTMLElement, position: readonly [number, number, number]) => {
      projection.set(...position).project(camera);
      element.style.left = `${(projection.x + 1) * 50}%`;
      element.style.top = `${(1 - projection.y) * 50}%`;
    };
    for (const { element, id } of labels) {
      const anchor = composition.labelPosition(id, projection);
      if (anchor) place(element, anchor.toArray());
      const points = composition.regionOutline(id)?.map(point => {
        point.project(camera);
        return `${(point.x + 1) * 500},${(1 - point.y) * 500}`;
      }).join(' ');
      for (const polygon of polygons) {
        if (polygon.dataset.regionPoints === id && points) polygon.setAttribute('points', points);
      }
    }
    place(hubLabel, layout.hubPosition);
  };
  const invalidate = () => {
    if (disposed) return;
    projectLabels();
    if (!ready || active()) state?.invalidate();
  };
  // Instant, finite highlights. Persistent selection lives in the controller/HTML overlay.
  const highlight = () => {
    for (const region of regions) region.dataset.hovered = String(region.dataset.region === hovered);
    for (const { element, id } of labels) element.dataset.hovered = String(id === hovered);
    canvas.style.cursor = hovered ? 'pointer' : '';
    for (const [id, entries] of materials) for (const { material, emissive, intensity } of entries) {
      material.emissive.copy(emissive);
      material.emissiveIntensity = intensity;
      if (id === hovered || id === focused) {
        material.emissive.set(atlasVisual.palette[id]);
        material.emissiveIntensity = 0.12;
      }
    }
    invalidate();
  };
  const hover = (id: DistrictId | null) => {
    if (disposed || hovered === id) return;
    hovered = id;
    highlight();
  };
  for (const { element, id } of labels) {
    element.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') hover(id); }, { signal: lifetime.signal });
    element.addEventListener('pointerleave', () => hover(null), { signal: lifetime.signal });
    element.addEventListener('focus', () => { focused = id; highlight(); }, { signal: lifetime.signal });
    element.addEventListener('blur', () => { focused = null; highlight(); }, { signal: lifetime.signal });
  }
  canvas.addEventListener('pointerleave', () => hover(null), { signal: lifetime.signal });
  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    draggedGesture = false;
    pointerGesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
  }, { signal: lifetime.signal });
  canvas.addEventListener('pointermove', event => {
    if (!pointerGesture || event.pointerId !== pointerGesture.id) return;
    if (Math.hypot(event.clientX - pointerGesture.x, event.clientY - pointerGesture.y) > 4) pointerGesture.dragged = true;
  }, { signal: lifetime.signal });
  canvas.addEventListener('pointerup', event => {
    if (!pointerGesture || event.pointerId !== pointerGesture.id) return;
    draggedGesture = pointerGesture.dragged;
    pointerGesture = undefined;
  }, { signal: lifetime.signal });
  canvas.addEventListener('pointercancel', event => {
    if (!pointerGesture || event.pointerId !== pointerGesture.id) return;
    pointerGesture = undefined;
    draggedGesture = false;
  }, { signal: lifetime.signal });
  const wasDraggedGesture = () => draggedGesture;
  const resetCamera = () => {
    const preset = layout.camera;
    applyOverviewCamera(camera, layout);
    if (controls) {
      controls.target.set(...preset.target);
      // Remove old limits before evaluating the new responsive camera's initial angles.
      controls.minAzimuthAngle = -Infinity;
      controls.maxAzimuthAngle = Infinity;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI;
      controls.update();
      const azimuth = controls.getAzimuthalAngle(), polar = controls.getPolarAngle();
      controls.minAzimuthAngle = azimuth - layout.interaction.horizontalDegrees * Math.PI / 180;
      controls.maxAzimuthAngle = azimuth + layout.interaction.horizontalDegrees * Math.PI / 180;
      controls.minPolarAngle = polar - layout.interaction.verticalDegrees * Math.PI / 180;
      controls.maxPolarAngle = polar + layout.interaction.verticalDegrees * Math.PI / 180;
      controls.minZoom = preset.zoom * layout.interaction.minZoom;
      controls.maxZoom = preset.zoom * layout.interaction.maxZoom;
      controls.saveState();
    }
    invalidate();
  };
  const applyLayout = (next: OverviewLayout) => {
    layout = next;
    composition.applyLayout(layout);
    resetCamera();
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lifetime.abort();
    motion?.dispose();
    observer?.disconnect();
    intersection?.disconnect();
    for (const element of [...regions, ...labels.map(label => label.element)]) delete element.dataset.hovered;
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
    await composition.load(cache, lifetime.signal);
    if (disposed) return;
    const hitMaterial = new MeshBasicMaterial({ side: DoubleSide, visible: false });
    for (const [id, group] of composition.groups!) {
      const unique = new Set<MeshStandardMaterial>();
      group.traverse(object => {
        // Only explicit structural surfaces and the authored footprint take hits.
        if (!object.userData.atlasPickable) object.raycast = () => {};
        if (object instanceof Mesh && object.userData.atlasPickable) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material instanceof MeshStandardMaterial) unique.add(material);
          }
        }
      });
      materials.set(id, [...unique].map(material => ({ material, emissive: material.emissive.clone(), intensity: material.emissiveIntensity })));
      const points = regionPoints(atlasVisual.regions[id].outline, id === 'infrastructure');
      const shape = new Shape();
      points.forEach((point, i) => i ? shape.lineTo(point.x, -point.z) : shape.moveTo(point.x, -point.z));
      shape.closePath();
      const geometry = new ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      const hit = new Mesh(geometry, hitMaterial);
      hit.name = `region-hit-${id}`;
      hit.position.y = 0.16;
      group.add(hit);
    }
    gl = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    configureOverviewRenderer(gl);
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
    const updateViewport = (value: boolean) => {
      const changed = inViewport !== value;
      inViewport = value;
      motion?.update();
      if (active()) {
        if (changed) invalidate();
      } else hover(null);
    };
    if (typeof IntersectionObserver === 'function') {
      intersection = new IntersectionObserver(entries => updateViewport(entries[0]?.isIntersecting ?? false));
      intersection.observe(host);
    } else {
      const updateViewportFromBounds = () => {
        const bounds = host.getBoundingClientRect();
        updateViewport(bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.right > 0
          && bounds.top < window.innerHeight && bounds.left < window.innerWidth);
      };
      updateViewportFromBounds();
      window.addEventListener('scroll', updateViewportFromBounds, { passive: true, signal: lifetime.signal });
      window.addEventListener('resize', updateViewportFromBounds, { signal: lifetime.signal });
    }
    document.addEventListener('visibilitychange', () => {
      motion?.update();
      if (active()) invalidate();
      else hover(null);
    }, { signal: lifetime.signal });
    const draw = (value: RootState) => {
      // The initial complete frame may load offscreen; later updates resume only on view.
      if (disposed || (ready && !active())) return;
      try {
        value.gl.render(value.scene, value.camera);
        if (!ready && !value.gl.getContext().isContextLost() && value.gl.info.render.calls > 0) {
          ready = true;
          options.onReady();
          if (!disposed) motion = createMotionPlayback({
            world,
            controlHost: host.closest('[data-observatory]')!.querySelector<HTMLElement>('[data-scene-controls]')!,
            active,
            // Ambient frames don't project HTML labels, resize GL or touch controller state.
            render() {
              if (disposed || !active()) return;
              try { value.gl.render(value.scene, value.camera); }
              catch { options.onFailure(); }
            },
          });
        }
      } catch { options.onFailure(); }
    };
    focused = labels.find(label => label.element === document.activeElement)?.id ?? null;
    highlight();
    root.render(<SceneBoundary onFailure={options.onFailure}><DistrictScene world={world} options={options} hover={hover} draw={draw} wasDraggedGesture={wasDraggedGesture} /></SceneBoundary>);
  };
  void initialize().catch(() => { if (!disposed) options.onFailure(); });
  return {
    dispose,
    zoom(direction) {
      if (disposed) return;
      camera.zoom = Math.max(layout.camera.zoom * layout.interaction.minZoom, Math.min(layout.camera.zoom * layout.interaction.maxZoom, camera.zoom + direction * 0.1 * layout.camera.zoom));
      camera.updateProjectionMatrix();
      controls?.update();
      invalidate();
    },
    reset() { if (!disposed) resetCamera(); },
  };
}
