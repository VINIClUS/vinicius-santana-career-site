import type { ExplorerController } from './controller.ts';
import type { mountInfrastructureScene } from './scene/infrastructure-renderer.ts';

/** Graphics visits are disposable; the HTML-owned controller lasts for the page. */
export function initializeInfrastructureView(root: HTMLElement, controller: ExplorerController) {
  const visual = root.querySelector<HTMLElement>('[data-infra-visual]');
  if (!visual) return;
  const host = visual.querySelector<HTMLElement>('[data-infra-canvas-host]')!;
  const button = visual.querySelector<HTMLButtonElement>('[data-infra-view]')!;
  const status = visual.querySelector<HTMLElement>('[data-infra-view-status]')!;
  let scene: ReturnType<typeof mountInfrastructureScene> | undefined;
  let generation = 0;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let visible = false;
  let loaded = document.readyState === 'complete';
  let autoAttempted = false;
  let away = false;

  const active = () => visible && !document.hidden && !away;
  const fallback = (message = '2D view. Simulation state and history are preserved.') => {
    generation++;
    clearTimeout(deadline);
    scene?.dispose();
    scene = undefined;
    visual.dataset.sceneState = 'fallback';
    button.textContent = 'View 3D';
    status.textContent = message;
  };
  const capable = () => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe || probe.isContextLost()) return false;
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch { return false; }
  };
  const start = async () => {
    autoAttempted = true;
    if (!capable()) {
      fallback('2D view. 3D is unavailable or data saving is enabled. Simulation controls remain available.');
      return;
    }
    const attempt = ++generation;
    visual.dataset.sceneState = 'loading';
    button.textContent = 'View 2D';
    status.textContent = 'Loading 3D. The poster and simulation controls remain available.';
    deadline = setTimeout(() => {
      if (generation === attempt) fallback('3D loading timed out. View 3D retries; simulation state is preserved.');
    }, 15_000);
    try {
      const { mountInfrastructureScene } = await import('./scene/infrastructure-renderer.ts');
      if (generation !== attempt) return;
      const mounted = mountInfrastructureScene({ host, controller,
        onReady() {
          if (generation !== attempt) return;
          clearTimeout(deadline);
          visual.dataset.sceneState = 'ready';
          status.textContent = '3D view. Synthetic cluster state matches the text and timeline.';
        },
        onFailure() {
          if (generation === attempt) fallback('3D unavailable. View 3D retries; simulation state is preserved.');
        },
      });
      // A synchronous graphics failure can invalidate the attempt during mount.
      if (generation !== attempt) mounted.dispose();
      else { scene = mounted; scene.setActive(active()); }
    } catch {
      if (generation === attempt) fallback('3D unavailable. View 3D retries; simulation state is preserved.');
    }
  };
  const update = () => {
    scene?.setActive(active());
    if (loaded && active() && !autoAttempted) void start();
  };
  button.disabled = false;
  button.addEventListener('click', () => {
    if (visual.dataset.sceneState === 'fallback') void start();
    else { autoAttempted = true; fallback(); }
  });
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    update();
  });
  observer.observe(visual);
  window.addEventListener('load', () => { loaded = true; update(); }, { once: true });
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pagehide', () => {
    away = true;
    autoAttempted = true;
    observer.disconnect();
    fallback();
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    away = false;
    observer.observe(visual);
    update();
  });
}
