import { createExplorerController } from './controller.ts';
import { projectDefinitions, projectIds, type ProjectId } from './projects.ts';

export function initializeExplorer() {
  const root = document.querySelector<HTMLElement>('[data-explorer]');
  const projectId = root?.dataset.project;
  if (!root || !projectIds.some(id => id === projectId)) return;
  if (root.dataset.controllerReady === 'true') return;
  const controller = createExplorerController(projectId as ProjectId);
  const controls = root.querySelectorAll<HTMLButtonElement>('[data-component-select]');
  const details = root.querySelectorAll<HTMLElement>('[data-component-detail]');

  function render() {
    const state = controller.getState();
    for (const control of controls) {
      const selected = control.dataset.componentSelect === state.selectedComponentId;
      control.setAttribute('aria-pressed', String(selected));
      control.dataset.selected = String(selected);
    }
    for (const detail of details) detail.dataset.selected = String(detail.dataset.componentDetail === state.selectedComponentId);
  }

  const selectFragment = () => {
    const detail = Array.from(details).find(item => `#${item.id}` === window.location.hash);
    if (detail || ['#system', '#system-title', '#details-title'].includes(window.location.hash)) {
      const disclosure = root.querySelector<HTMLDetailsElement>('[data-component-disclosure]');
      if (disclosure) disclosure.open = true;
    }
    controller.dispatch({ type: 'SELECT_COMPONENT', componentId: detail?.dataset.componentDetail ?? projectDefinitions[projectId as ProjectId].primaryComponentId });
  };
  window.addEventListener('hashchange', selectFragment);
  controller.subscribe(render);
  for (const control of controls) control.disabled = false;
  root.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLButtonElement>('[data-component-select]');
    if (control && root.contains(control)) {
      controller.dispatch({ type: 'SELECT_COMPONENT', componentId: control.dataset.componentSelect! });
    }
  });
  selectFragment();
  render();
  root.dataset.controllerReady = 'true';
}
