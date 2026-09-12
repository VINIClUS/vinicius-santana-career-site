import { districtIds, type DistrictId } from './districts.ts';
import { createObservatoryController } from './observatory-controller.ts';
import type { ObservatoryScene } from './scene/renderer.tsx';

const root = document.querySelector<HTMLElement>('[data-observatory]');
if (root) {
  const controller = createObservatoryController();
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-district-link]')];
  const articles = [...root.querySelectorAll<HTMLElement>('[data-district-detail]')];
  const closeLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-district-close]')];
  const map = root.querySelector<HTMLElement>('.observatory-map')!;
  const toolbar = root.querySelector<HTMLElement>('[data-scene-controls]')!;
  const labels = [...links, root.querySelector<HTMLElement>('.observatory-hub')!];
  const originalStyles = labels.map(label => label.getAttribute('style'));
  const regions = [...map.querySelectorAll<SVGGElement>('[data-region]')];
  const polygons = [...map.querySelectorAll<SVGPolygonElement>('[data-region-points]')];
  const originalPoints = polygons.map(polygon => polygon.getAttribute('points')!);
  let scene: ObservatoryScene | undefined;
  let stopped = false;
  let loadingDeadline: ReturnType<typeof setTimeout> | undefined;
  let focusedPanelDistrictId: DistrictId | null = null;
  const pending = new AbortController();

  const render = () => {
    const { selectedDistrictId } = controller.getState();
    for (const link of links) {
      const selected = link.dataset.districtLink === selectedDistrictId;
      link.setAttribute('aria-expanded', String(selected));
      if (selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const article of articles) article.dataset.selected = String(article.dataset.districtDetail === selectedDistrictId);
    for (const region of regions) region.dataset.selected = String(region.dataset.region === selectedDistrictId);
  };
  const syncFragment = () => {
    const districtId = districtIds.find(id => location.hash === `#district-${id}`) ?? null;
    const previousDistrictId = controller.getState().selectedDistrictId;
    const restoreFocus = focusedPanelDistrictId === previousDistrictId && districtId !== previousDistrictId;
    controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
    if (restoreFocus) links.find(link => link.dataset.districtLink === (districtId ?? previousDistrictId))?.focus({ preventScroll: true });
  };
  const historyDepth = () => {
    const value = (history.state as { __atlasPanelDepth?: unknown } | null)?.__atlasPanelDepth;
    return typeof value === 'number' && value > 0 ? value : 0;
  };
  const closePanel = (restoreFocus = true) => {
    const selectedDistrictId = controller.getState().selectedDistrictId;
    if (!selectedDistrictId) return;
    const depth = historyDepth();
    if (depth > 0) history.go(-depth);
    else history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    controller.dispatch({ type: 'SELECT_DISTRICT', districtId: null });
    if (restoreFocus) links.find(link => link.dataset.districtLink === selectedDistrictId)?.focus({ preventScroll: true });
  };
  const selectDistrict = (districtId: DistrictId) => {
    const repeated = controller.getState().selectedDistrictId === districtId;
    if (repeated) { closePanel(); return; }
    const depth = historyDepth();
    const nextDepth = depth > 0 ? depth + 1 : location.hash === '' ? 1 : 0;
    history.pushState({ ...history.state, __atlasPanelDepth: nextDepth }, '', `#district-${districtId}`);
    controller.dispatch({ type: 'ACTIVATE_DISTRICT', districtId });
  };
  const use2D = () => {
    const canvas = map.querySelector('[data-observatory-canvas]');
    const restoreFocus = toolbar.contains(document.activeElement) || (canvas !== null && canvas === document.activeElement);
    stopped = true;
    clearTimeout(loadingDeadline);
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
    polygons.forEach((polygon, index) => polygon.setAttribute('points', originalPoints[index]!));
    if (restoreFocus) (links.find(link => link.dataset.districtLink === controller.getState().selectedDistrictId) ?? links[0])?.focus({ preventScroll: true });
  };
  let nativeEvents: AbortController | undefined;
  let unsubscribe: (() => void) | undefined;
  const connectNavigation = () => {
    nativeEvents?.abort();
    unsubscribe?.();
    nativeEvents = new AbortController();
    unsubscribe = controller.subscribe(render);
    const { signal } = nativeEvents;
    // Fragment traversal also emits hashchange; listening to popstate would focus twice.
    window.addEventListener('hashchange', syncFragment, { signal });
    document.addEventListener('focusin', event => {
      const panelId = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-district-detail]')?.dataset.districtDetail
        : undefined;
      focusedPanelDistrictId = districtIds.find(id => id === panelId) ?? null;
    }, { signal });
    for (const link of links) link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const districtId = districtIds.find(id => id === link.dataset.districtLink);
      if (districtId) selectDistrict(districtId);
    }, { signal });
    for (const closeLink of closeLinks) closeLink.addEventListener('click', event => {
      event.preventDefault();
      closePanel();
    }, { signal });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && controller.getState().selectedDistrictId) {
        event.preventDefault();
        closePanel();
      }
    }, { signal });
    render();
    syncFragment();
  };
  connectNavigation();
  root.dataset.controllerReady = 'true';
  toolbar.addEventListener('click', event => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-scene-action]')?.dataset.sceneAction;
    if (action === 'fallback') use2D();
    if (action === 'zoom-in') scene?.zoom(1);
    if (action === 'zoom-out') scene?.zoom(-1);
    if (action === 'reset') scene?.reset();
  }, { signal: pending.signal });
  window.addEventListener('pagehide', () => {
    use2D();
    nativeEvents?.abort();
    unsubscribe?.();
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
    const startedAt = performance.now();
    const expired = () => performance.now() - startedAt >= 15_000;
    root.dataset.sceneState = 'loading';
    toolbar.hidden = false;
    loadingDeadline = setTimeout(() => use2D(), 15_000);
    void import('./scene/renderer.tsx').then(({ mountObservatoryScene }) => {
      if (stopped) return;
      if (expired()) { use2D(); return; }
      scene = mountObservatoryScene({
        host: map, controller,
        onSelect(districtId: DistrictId) {
          selectDistrict(districtId);
        },
        onReady() {
          if (stopped) return;
          if (expired()) { use2D(); return; }
          clearTimeout(loadingDeadline);
          root.dataset.sceneState = 'ready';
          for (const button of toolbar.querySelectorAll<HTMLButtonElement>('button')) button.disabled = false;
          toolbar.hidden = false;
        },
        onFailure() { use2D(); },
      });
    }).catch(() => use2D());
  }
}
