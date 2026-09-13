import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planEvent } from '../src/features/explorer/lifecycle/presentation.ts';

const scenario = JSON.parse(readFileSync(new URL('../src/features/explorer/lifecycle/data/limnopulse-end-to-end.json', import.meta.url)));
const infrastructureScenario = JSON.parse(readFileSync(new URL('../src/features/explorer/lifecycle/data/infra-quorum-recovery.json', import.meta.url)));

test('manual Telegram acceptance focuses Telegram instead of the first provider command (email)', () => {
  const command = { type: 'PROVIDER_RESULT', channel: 'telegram', kind: 'opening', result: 'accepted' };
  const plan = planEvent('limnopulse', { type: command.type, description: 'Telegram accepted' }, { email: 'accepted', telegram: 'attempting' }, { email: 'accepted', telegram: 'accepted' }, scenario, command);
  assert.ok(plan.microbeats.flatMap(beat => beat.primaryActors).some(actor => actor.includes('telegram')));
  assert.ok(!plan.microbeats.flatMap(beat => beat.primaryActors).includes('limno.ses'));
});

test('a rejected Telegram attempt still identifies Telegram when domain state is unchanged', () => {
  const state = { email: 'accepted', telegram: 'retry_wait' };
  const command = { type: 'ATTEMPT_DELIVERY', channel: 'telegram', kind: 'opening' };
  const plan = planEvent('limnopulse', { type: command.type, description: 'Blocked · retry not due' }, state, state, scenario, command);
  assert.ok(plan.microbeats.flatMap(beat => beat.primaryActors).some(actor => actor.includes('telegram')));
  assert.equal(plan.headline, 'Blocked · retry not due');
});

test('manual recovery relay uses recovery context rather than opening relay context', () => {
  const command = { type: 'RELAY', kind: 'recovery' };
  const expected = scenario.checkpoints.find(checkpoint => checkpoint.command.type === 'RELAY' && checkpoint.command.kind === 'recovery');
  const plan = planEvent('limnopulse', { type: 'RELAY', description: 'Recovery relay' }, { recoveryEmail: 'idle' }, { recoveryEmail: 'queued' }, scenario, command);
  assert.equal(plan.checkpointId, expected.id);
});

test('manual infrastructure commands match the checkpoint for the requested node', () => {
  const command = { type: 'FAIL_NODE', nodeId: 'node-01' };
  const expected = infrastructureScenario.checkpoints.find(checkpoint => checkpoint.command.type === command.type && checkpoint.command.nodeId === command.nodeId);
  const plan = planEvent('infrastructure', { type: command.type, description: 'Fail node 01' }, { nodeId: 'node-01' }, { nodeId: null }, infrastructureScenario, command);
  assert.equal(plan.checkpointId, expected.id);
  assert.ok(plan.microbeats.flatMap(beat => beat.primaryActors).includes('infra.node-01'));
  assert.ok(!plan.microbeats.flatMap(beat => beat.primaryActors).includes('infra.node-02'));
});
