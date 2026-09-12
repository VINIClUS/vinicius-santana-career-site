import { initializeInfrastructureView } from './infrastructure-client.ts';
import { createExplorerController } from './controller.ts';
import { projectIds, type ProjectId } from './projects.ts';
import { scenarios } from '../../content/scenarios/cnesdata.ts';

export function initializeExplorer() {
  const root = document.querySelector<HTMLElement>('[data-explorer]');
  const projectId = root?.dataset.project;
  if (!root || !projectIds.some(id => id === projectId)) return;
  if (root.dataset.controllerReady === 'true') return;
  root.dataset.controllerReady = 'true';
  const controller = createExplorerController(projectId as ProjectId);
  const links = root.querySelectorAll<HTMLAnchorElement>('[data-component-link]');
  const details = root.querySelectorAll<HTMLElement>('[data-component-detail]');
  const scenario = root.querySelector<HTMLSelectElement>('[data-scenario]');
  const step = root.querySelector<HTMLButtonElement>('[data-step]');
  const reset = root.querySelector<HTMLButtonElement>('[data-reset]');

  const failNode = root.querySelector<HTMLButtonElement>('[data-fail-node]');
  const infraReset = root.querySelector<HTMLButtonElement>('[data-infra-reset]');
  let renderedInfrastructure = controller.getState().infrastructureSimulation;

  function render() {
    const state = controller.getState();
    for (const link of links) {
      if (link.dataset.componentLink === state.selectedComponentId) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const detail of details) detail.dataset.selected = String(detail.dataset.componentDetail === state.selectedComponentId);
    const infra = state.infrastructureSimulation;
    if (infra && failNode && infraReset) {
      for (const node of root!.querySelectorAll<HTMLElement>('[data-infra-node]')) {
        const id = node.dataset.infraNode as keyof typeof infra.nodes;
        node.textContent = `${id}: ${infra.nodes[id]}`;
        node.dataset.status = infra.nodes[id];
      }
      root!.querySelector('[data-infra-workload]')!.textContent = `Workload: ${infra.workloadNodeId}`;
      const failed = infra.nodes['node-02'] === 'failed';
      const poster = root!.querySelector<HTMLImageElement>('[data-infra-poster]')!;
      const source = root!.querySelector<HTMLSourceElement>('[data-infra-poster-mobile]')!;
      poster.src = (failed ? poster.dataset.failedSrc : poster.dataset.initialSrc)!;
      poster.alt = (failed ? poster.dataset.failedAlt : poster.dataset.initialAlt)!;
      source.srcset = (failed ? source.dataset.failedSrc : source.dataset.initialSrc)!;
      failNode.disabled = failed;
      if (infra !== renderedInfrastructure) {
        root!.querySelector('[data-infra-timeline]')!.replaceChildren(...infra.timeline.map(event => {
          const item = document.createElement('li');
          item.textContent = event.description;
          return item;
        }));
        root!.querySelector('[data-infra-announcement]')!.textContent = failed
          ? infra.timeline.map(event => event.description).join(' ')
          : 'Reset complete. Three nodes online; workload on node-02; shared layer available. Timeline cleared.';
        renderedInfrastructure = infra;
      }
    }
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
  failNode?.addEventListener('click', () => controller.dispatch({ type: 'FAIL_NODE', nodeId: 'node-02' }));
  infraReset?.addEventListener('click', () => controller.dispatch({ type: 'RESET' }));
  if (failNode && infraReset) {
    failNode.disabled = false;
    infraReset.disabled = false;
    root.querySelector('[data-infra-help]')!.textContent = 'Run the synthetic failure, then reset to repeat. The scenario transcript remains below.';
  }
  selectFragment();
  render();
  initializeInfrastructureView(root, controller);
  if (scenario && reset) {
    scenario.disabled = false;
    reset.disabled = false;
    root.querySelector('[data-interaction-help]')!.textContent = 'Advance one attempt at a time. Reset restarts the selected scenario; static transcripts remain below.';
  }
}
