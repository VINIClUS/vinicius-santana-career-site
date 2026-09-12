import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { load } from 'js-yaml';
import { createExplorerController } from '../src/features/explorer/controller.ts';
import { projectDefinitions, projectIds } from '../src/features/explorer/projects.ts';

test('data IDs and relations are internally valid', async () => {
  const source = await readFile(new URL('../src/content/case-studies.yaml', import.meta.url), 'utf8');
  const cases = load(source);
  assert.deepEqual(projectIds, cases.map(project => project.id));
  for (const [index, id] of projectIds.entries()) {
    const definition = projectDefinitions[id];
    assert.deepEqual(definition.componentIds, cases[index].architecture.map(component => component.id));
    assert.equal(new Set(definition.componentIds).size, definition.componentIds.length);
    for (const relation of definition.relations) {
      assert.ok(definition.componentIds.includes(relation.from));
      assert.ok(definition.componentIds.includes(relation.to));
      assert.notEqual(relation.from, relation.to);
    }
  }
});

test('selection notifies once for changed state and unsubscribe works', () => {
  const controller = createExplorerController('cnesdata');
  let notifications = 0;
  const unsubscribe = controller.subscribe(() => notifications++);
  controller.dispatch({ type: 'SELECT_COMPONENT', componentId: 'edge-agent' });
  controller.dispatch({ type: 'SELECT_COMPONENT', componentId: 'edge-agent' });
  controller.dispatch({ type: 'SELECT_COMPONENT', componentId: 'unknown' });
  assert.equal(notifications, 1);
  assert.equal(controller.getState().selectedComponentId, 'edge-agent');
  unsubscribe();
  controller.dispatch({ type: 'SELECT_COMPONENT', componentId: null });
  assert.equal(notifications, 1);
});

test('component selection preserves simulation progress', () => {
  const controller = createExplorerController('cnesdata');
  controller.dispatch({ type: 'SELECT_SCENARIO', scenarioId: 'raw-identical-replay' });
  controller.dispatch({ type: 'STEP' });
  const simulation = controller.getState().simulation;
  controller.dispatch({ type: 'SELECT_COMPONENT', componentId: 'central-api' });
  assert.deepEqual(controller.getState().simulation, simulation);
});

test('each controller starts clean and reset restores its selected scenario', () => {
  const first = createExplorerController('cnesdata');
  first.dispatch({ type: 'SELECT_SCENARIO', scenarioId: 'raw-content-conflict' });
  first.dispatch({ type: 'STEP' });
  first.dispatch({ type: 'RESET' });
  assert.equal(first.getState().simulation.scenarioId, 'raw-content-conflict');
  assert.equal(first.getState().simulation.nextStepIndex, 0);
  assert.equal(createExplorerController('cnesdata').getState().simulation.scenarioId, 'raw-first-write');
});

test('non-simulation projects ignore simulation commands', () => {
  const controller = createExplorerController('limnopulse');
  const initial = controller.getState();
  let notifications = 0;
  controller.subscribe(() => notifications++);
  controller.dispatch({ type: 'SELECT_SCENARIO', scenarioId: 'raw-content-conflict' });
  controller.dispatch({ type: 'STEP' });
  controller.dispatch({ type: 'RESET' });
  assert.equal(controller.getState(), initial);
  assert.equal(notifications, 0);
  assert.equal('simulation' in initial, false);
});

test('Infrastructure dispatch is isolated, notifies changes, and selection preserves progress', () => {
  const infra = createExplorerController('infrastructure');
  const cnes = createExplorerController('cnesdata');
  const initial = infra.getState();
  const cnesInitial = cnes.getState();
  let notifications = 0;
  const unsubscribe = infra.subscribe(() => notifications++);
  cnes.dispatch({ type: 'FAIL_NODE', nodeId: 'node-02' });
  assert.strictEqual(cnes.getState(), cnesInitial);
  infra.dispatch({ type: 'STEP' });
  infra.dispatch({ type: 'SELECT_SCENARIO', scenarioId: 'raw-content-conflict' });
  assert.strictEqual(infra.getState(), initial);
  infra.dispatch({ type: 'FAIL_NODE', nodeId: 'node-02' });
  assert.equal(infra.getState().infrastructureSimulation.workloadNodeId, 'node-01');
  infra.dispatch({ type: 'FAIL_NODE', nodeId: 'node-02' });
  assert.equal(notifications, 1);
  const failed = infra.getState().infrastructureSimulation;
  infra.dispatch({ type: 'SELECT_COMPONENT', componentId: projectDefinitions.infrastructure.componentIds[0] });
  assert.strictEqual(infra.getState().infrastructureSimulation, failed);
  infra.dispatch({ type: 'RESET' });
  assert.deepEqual(infra.getState().infrastructureSimulation, initial.infrastructureSimulation);
  assert.equal(notifications, 3);
  unsubscribe();
  infra.dispatch({ type: 'FAIL_NODE', nodeId: 'node-02' });
  assert.equal(notifications, 3);
});


test('Limnopulse relationships preserve the storage and outbox boundaries', () => {
  const relations = projectDefinitions.limnopulse.relations;
  assert.ok(relations.some(relation => relation.from === 'mqtt-ingestion' && relation.to === 'telemetry-api' && /InfluxDB/.test(relation.label)));
  assert.ok(relations.some(relation => relation.from === 'evaluator' && relation.to === 'mqtt-ingestion' && /windows.*InfluxDB/i.test(relation.label)));
  assert.ok(relations.some(relation => relation.from === 'alert-rules' && relation.to === 'evaluator'));
  assert.ok(relations.some(relation => relation.from === 'evaluator' && relation.to === 'alert-rules' && /events.*outboxes/i.test(relation.label)));
  assert.ok(relations.some(relation => relation.from === 'alert-rules' && relation.to === 'notifications' && /relay.*SQS/i.test(relation.label)));
  assert.ok(!relations.some(relation => relation.from === 'telemetry-api' && ['alert-rules', 'evaluator'].includes(relation.to)));
  assert.ok(!relations.some(relation => relation.from === 'evaluator' && relation.to === 'notifications'));
});
