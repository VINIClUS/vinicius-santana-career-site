import { districtIds, type DistrictId } from './districts.ts';
import { createObservatoryController } from './observatory-controller.ts';
import type { ObservatoryScene } from './scene/renderer.tsx';

const root = document.querySelector<HTMLElement>('[data-observatory]');
if (root) {
  const controller = createObservatoryController();
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-district-link]')];
  const articles = root.querySelectorAll<HTMLElement>('[data-district-detail]');
  const map = root.querySelector<HTMLElement>('.observatory-map')!;
  const toolbar = root.querySelector<HTMLElement>('[data-scene-controls]')!;
  const labels = [...links, root.querySelector<HTMLElement>('.observatory-hub')!];
  const originalStyles = labels.map(label => label.getAttribute('style'));
  let scene: ObservatoryScene | undefined;
  let stopped = false;
  const pending = new AbortController();

  const render = () => {
    const { selectedDistrictId } = controller.getState();
    for (const link of links) {
      if (link.dataset.districtLink === selectedDistrictId) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const article of articles) article.dataset.selected = String(article.dataset.districtDetail === selectedDistrictId);
  };
  const syncFragment = () => {
    const districtId = districtIds.find(id => location.hash === `#district-${id}`) ?? null;
    controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
    if (districtId) root.querySelector<HTMLElement>(`[data-district-detail="${districtId}"]`)?.focus({ preventScroll: true });
  };
  const use2D = (focus = false) => {
    const canvas = map.querySelector('[data-observatory-canvas]');
    const restoreFocus = focus || toolbar.contains(document.activeElement) || (canvas !== null && canvas === document.activeElement);
    stopped = true;
    pending.abort();
    scene?.dispose();
    scene = undefined;
    root.dataset.sceneState = 'fallback';
    toolbar.hidden = true;
    labels.forEach((label, index) => {
      const style = originalStyles[index];
      if (style == null) label.removeAttribute('style');
      else label.setAttribute('style', style);
    });
    if (restoreFocus) (links.find(link => link.dataset.districtLink === controller.getState().selectedDistrictId) ?? links[0])?.focus({ preventScroll: true });
  };
  let nativeEvents: AbortController;
  let unsubscribe: () => void;
  const connectNavigation = () => {
    nativeEvents = new AbortController();
    unsubscribe = controller.subscribe(render);
    const { signal } = nativeEvents;
    // Fragment traversal also emits hashchange; listening to popstate would focus twice.
    window.addEventListener('hashchange', syncFragment, { signal });
    for (const link of links) link.addEventListener('click', () => {
      // Native fragments own scrolling and history; repeated fragments still focus the article.
      if (link.hash === location.hash) root.querySelector<HTMLElement>(`[data-district-detail="${link.dataset.districtLink}"]`)?.focus({ preventScroll: true });
    }, { signal });
    render();
    syncFragment();
  };
  connectNavigation();
  root.dataset.controllerReady = 'true';
  toolbar.addEventListener('click', event => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scene-action]')?.dataset.sceneAction;
    if (action === 'fallback') use2D(true);
    if (action === 'zoom-in') scene?.zoom(1);
    if (action === 'zoom-out') scene?.zoom(-1);
    if (action === 'reset') scene?.reset();
  }, { signal: pending.signal });
  window.addEventListener('pagehide', () => {
    use2D();
    nativeEvents.abort();
    unsubscribe();
  });
  // A bfcache return stays in 2D but keeps normal fragment navigation usable.
  window.addEventListener('pageshow', event => { if (event.persisted) connectNavigation(); });

  const capable = () => {
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return false;
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe || probe.isContextLost()) return false;
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return true;
    } catch { return false; }
  };
  if (capable()) {
    root.dataset.sceneState = 'loading';
    void import('./scene/renderer.tsx').then(({ mountObservatoryScene }) => {
      if (stopped) return;
      scene = mountObservatoryScene({
        host: map, controller,
        onSelect(districtId: DistrictId) {
          if (location.hash !== `#district-${districtId}`) history.pushState(null, '', `#district-${districtId}`);
          controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
        },
        onReady() {
          if (stopped) return;
          root.dataset.sceneState = 'ready';
          toolbar.hidden = false;
        },
        onFailure() { use2D(); },
      });
    }).catch(() => use2D());
  }
}
