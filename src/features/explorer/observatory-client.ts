import { districtIds, type DistrictId } from './districts.ts';
import { createObservatoryController } from './observatory-controller.ts';

const root = document.querySelector<HTMLElement>('[data-observatory]');
if (root) {
  const controller = createObservatoryController();
  const links = root.querySelectorAll<HTMLAnchorElement>('[data-district-link]');
  const articles = root.querySelectorAll<HTMLElement>('[data-district-detail]');
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
  controller.subscribe(render);
  window.addEventListener('hashchange', syncFragment);
  for (const link of links) link.addEventListener('click', () => {
    // Clicking the current fragment does not emit hashchange, but still moves focus.
    if (link.hash === location.hash) {
      const districtId = link.dataset.districtLink as DistrictId;
      root.querySelector<HTMLElement>(`[data-district-detail="${districtId}"]`)?.focus({ preventScroll: true });
    }
  });
  render();
  syncFragment();
}
