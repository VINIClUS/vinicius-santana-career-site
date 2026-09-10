import { createExplorerController } from './controller.ts';
import { projectIds, type ProjectId } from './projects.ts';
import { scenarios } from '../../content/scenarios/cnesdata.ts';

export function initializeExplorer() {
  const root = document.querySelector<HTMLElement>('[data-explorer]');
  const projectId = root?.dataset.project;
  if (!root || !projectIds.some(id => id === projectId)) return;
  const controller = createExplorerController(projectId as ProjectId);
  const links = root.querySelectorAll<HTMLAnchorElement>('[data-component-link]');
  const details = root.querySelectorAll<HTMLElement>('[data-component-detail]');
  const scenario = root.querySelector<HTMLSelectElement>('[data-scenario]');
  const step = root.querySelector<HTMLButtonElement>('[data-step]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');

  function render() {
    const state = controller.getState();
    for (const link of links) {
      if (link.dataset.componentLink === state.selectedComponentId) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const detail of details) detail.dataset.selected = String(detail.dataset.componentDetail === state.selectedComponentId);
    const simulation = state.simulation;
    if (!simulation || !scenario || !step || !reset) return;
    scenario.value = simulation.scenarioId;
    const definition = scenarios.find(item => item.id === simulation.scenarioId);
    root!.querySelector('[data-progress]')!.textContent = `${simulation.nextStepIndex} of ${definition?.attempts.length ?? 0} attempts · ${simulation.status}`;
    const result = simulation.history.at(-1);
    root!.querySelector('[data-result]')!.textContent = result
      ? `Result: ${result.outcome}. ${result.outcome === 'conflict' ? 'Content A remains intact; content B was rejected.' : result.outcome === 'replayed' ? 'Accepted without duplication.' : 'One object stored.'}`
      : 'No attempts yet.';
    const list = (selector: string, values: string[], empty: string) => {
      root!.querySelector(selector)!.replaceChildren(...(values.length ? values : [empty]).map(value => {
        const item = document.createElement('li');
        item.textContent = value;
        return item;
      }));
    };
    list('[data-objects]', simulation.objects.map(object => `${object.key} → ${object.content}`), 'No objects stored.');
    list('[data-attempts]', simulation.history.map(item => `${item.attempt.key} + ${item.attempt.content}: ${item.outcome}`), 'No attempts yet.');
    step.disabled = simulation.status === 'complete' || simulation.status === 'invalid-scenario';
  }

  const selectFragment = () => {
    const detail = Array.from(details).find(item => `#${item.id}` === window.location.hash);
    controller.dispatch({ type: 'SELECT_COMPONENT', componentId: detail?.dataset.componentDetail ?? null });
    detail?.focus({ preventScroll: true });
  };
  controller.subscribe(render);
  window.addEventListener('hashchange', selectFragment);
  // Native fragment navigation handles history, scrolling and the no-JS path.
  root.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>('a[href^="#component-"]');
    if (link && link.hash === window.location.hash) selectFragment();
  });
  scenario?.addEventListener('change', () => controller.dispatch({ type: 'SELECT_SCENARIO', scenarioId: scenario.value }));
  step?.addEventListener('click', () => controller.dispatch({ type: 'STEP' }));
  reset?.addEventListener('click', () => controller.dispatch({ type: 'RESET' }));
  selectFragment();
  render();
  if (scenario && reset) {
    scenario.disabled = false;
    reset.disabled = false;
    root.querySelector('[data-interaction-help]')!.textContent = 'Advance one attempt at a time. Reset restarts the selected scenario; static transcripts remain below.';
  }
}
