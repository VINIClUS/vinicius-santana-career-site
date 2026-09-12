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
  const regions = [...map.querySelectorAll<SVGGElement>('[data-region]')];
  const polygons = [...map.querySelectorAll<SVGPolygonElement>('[data-region-points]')];
  const originalPoints = polygons.map(polygon => polygon.getAttribute('points')!);
  let scene: ObservatoryScene | undefined;
  let stopped = false;
  let loadingDeadline: ReturnType<typeof setTimeout> | undefined;
  const pending = new AbortController();

  const render = () => {
    const { selectedDistrictId } = controller.getState();
    for (const link of links) {
      if (link.dataset.districtLink === selectedDistrictId) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const article of articles) article.dataset.selected = String(article.dataset.districtDetail === selectedDistrictId);
    for (const region of regions) region.dataset.selected = String(region.dataset.region === selectedDistrictId);
  };
  const redirectLegacyFragment = () => {
    const destination = location.hash === '#district-public-health' ? '/#experience'
      : location.hash === '#district-observability' ? '/#stack' : null;
    if (!destination) return false;
    location.replace(destination);
    return true;
  };
  const syncFragment = (focus: 'always' | 'preserve' | 'none' = 'preserve') => {
    if (redirectLegacyFragment()) return;
    const districtId = districtIds.find(id => location.hash === `#district-${id}`) ?? null;
    controller.dispatch({ type: 'SELECT_DISTRICT', districtId });
    const detail = districtId ? root.querySelector<HTMLElement>(`[data-district-detail="${districtId}"]`) : null;
    // Link navigation already focuses its target before hashchange; traversal may
    // retain an old article. Preserve any focus chosen after navigation completes.
    if (detail && (focus === 'always' || (focus === 'preserve' && (document.activeElement === document.body || document.activeElement === detail)))) detail.focus({ preventScroll: true });
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
    let pendingLinkHash: string | undefined;
    let focusedTraversalHash: string | undefined;
    window.addEventListener('popstate', () => {
      if (pendingLinkHash === location.hash) return;
      // Traversal owns a new focus destination even when the browser retains the
      // previous article. Its later hashchange must not focus a second time.
      syncFragment('always');
      focusedTraversalHash = location.hash;
    }, { signal });
    window.addEventListener('hashchange', () => {
      syncFragment(focusedTraversalHash === location.hash ? 'none' : 'preserve');
      pendingLinkHash = undefined;
      focusedTraversalHash = undefined;
    }, { signal });
    for (const link of links) link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      pendingLinkHash = link.hash === location.hash ? undefined : link.hash;
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
  if (!redirectLegacyFragment() && capable()) {
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
          links.find(link => link.dataset.districtLink === districtId)?.click();
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
