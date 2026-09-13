import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLimnopulseState, reduceLimnopulse, projectLimnopulse } from '../src/features/explorer/lifecycle/limnopulse.ts';

const fixture = JSON.parse(readFileSync(new URL('../docs/design/systems-atlas-lifecycles-v3/scenarios/limnopulse-end-to-end.json', import.meta.url)));
const negatives = JSON.parse(readFileSync(new URL('../docs/design/systems-atlas-lifecycles-v3/scenarios/negative-cases.json', import.meta.url))).cases.filter(c => c.scenarioId === fixture.id);
function prefix(index) {
  return fixture.checkpoints.slice(0, index + 1).reduce((state, c) => reduceLimnopulse(state, c.command).state, createLimnopulseState());
}
for (const [index, checkpoint] of fixture.checkpoints.entries()) {
  test(`Limnopulse ${checkpoint.id}`, () => assert.deepEqual(projectLimnopulse(prefix(index)), checkpoint.expected));
}
for (const negative of negatives) {
  test(`Limnopulse ${negative.id}${negative.id === 'LP-N02' ? ' approved erratum: prefix -01' : ''}`, () => {
    const id = negative.id === 'LP-N02' ? 'limnopulse-end-to-end-01' : negative.fromCheckpoint;
    let state = prefix(fixture.checkpoints.findIndex(c => c.id === id));
    for (const command of negative.commands) state = reduceLimnopulse(state, command).state;
    const projection = projectLimnopulse(state);
    for (const [key, value] of Object.entries(negative.expectedSubset)) assert.deepEqual(projection[key], value, key);
  });
}
test('Membership revocation blocks queued email before provider invocation', () => {
  const revoked = reduceLimnopulse(prefix(7), { type: 'SET_MEMBERSHIP', active: false }).state;
  const result = reduceLimnopulse(revoked, { type: 'ATTEMPT_DELIVERY', channel: 'email', kind: 'opening' });
  assert.equal(result.state.deliveries['opening:email'].attempts, 0);
  assert.equal(projectLimnopulse(result.state).email, 'suppressed');
});
test('Attempt operation identity rejects a result from a previous attempt', () => {
  const original = prefix(10).deliveries['opening:telegram'].operationId;
  const current = prefix(13);
  const result = reduceLimnopulse(current, { type: 'PROVIDER_RESULT', channel: 'telegram', kind: 'opening', result: 'accepted', operationId: original });
  assert.equal(result.rejection, 'STALE_OPERATION');
  assert.deepEqual(result.state, current);
});
test('Permanent and ambiguous results cannot be retried or shown as accepted', () => {
  for (const resultType of ['permanent', 'unknown']) {
    let state = reduceLimnopulse(prefix(10), { type: 'PROVIDER_RESULT', channel: 'telegram', kind: 'opening', result: resultType }).state;
    state = reduceLimnopulse(state, { type: 'ADVANCE_CLOCK', ticks: 100 }).state;
    state = reduceLimnopulse(state, { type: 'ATTEMPT_DELIVERY', channel: 'telegram', kind: 'opening' }).state;
    assert.equal(state.deliveries['opening:telegram'].attempts, 1);
    assert.equal(state.deliveries['opening:telegram'].providerAccepted, false);
    assert.ok(reduceLimnopulse(state, { type: 'SHOW_MESSAGE', channel: 'telegram', kind: 'opening' }).rejection);
  }
});
test('Invalid sparse and stale windows cannot open incidents', () => {
  for (const ticks of [[0, 3], [0, 1, 2, 3]]) {
    let state = reduceLimnopulse(prefix(1), { type: 'INGEST_WINDOW', values: ticks.map(() => 4), ticks }).state;
    state = reduceLimnopulse(state, { type: 'EVALUATE', evaluationTick: ticks.length === 2 ? 3 : 20 }).state;
    assert.equal(projectLimnopulse(state).incident, 'none');
  }
});
test('Redis failure fails closed and relay duplicates conserve durable IDs', () => {
  const state = prefix(7);
  assert.deepEqual(reduceLimnopulse(state, { type: 'RELAY', kind: 'opening' }).state.deliveries, state.deliveries);
  const unavailable = reduceLimnopulse(state, { type: 'SET_REDIS', available: false }).state;
  const result = reduceLimnopulse(unavailable, { type: 'ATTEMPT_DELIVERY', channel: 'telegram', kind: 'opening' });
  assert.equal(result.state.deliveries['opening:telegram'].attempts, 0);
  assert.equal(result.rejection, 'RATE_LIMIT_UNAVAILABLE');
});
test('A mixed window does not recover an incident while a low sample remains', () => {
  let state = reduceLimnopulse(prefix(17), { type: 'INGEST_CLEAN_WINDOW', values: [6, 4, 6, 6], ticks: [7, 8, 9, 10] }).state;
  state = reduceLimnopulse(state, { type: 'EVALUATE_RECOVERY', evaluationTick: 10 }).state;
  assert.equal(state.incident.status, 'acknowledged');
  assert.equal(state.outboxes.length, 2);
});
test('Recovery macros preserve partial success and suppress an unconfirmed opening channel', () => {
  let state = prefix(9);
  for (const command of [
    { type: 'INGEST_CLEAN_WINDOW', values: [6, 6, 6, 6], ticks: [7, 8, 9, 10] },
    { type: 'EVALUATE_RECOVERY', evaluationTick: 10 },
    { type: 'RELAY', kind: 'recovery' },
    { type: 'ATTEMPT_RECOVERY_CHANNELS' },
    { type: 'PROVIDER_RECOVERY_ACCEPTED' },
  ]) state = reduceLimnopulse(state, command).state;
  assert.equal(projectLimnopulse(state).recoveryEmail, 'accepted');
  assert.equal(projectLimnopulse(state).recoveryTelegram, 'idle');
  assert.equal(state.outboxes.length, 3);
});
test('Transient failures retain Delivery ID and stop after three provider attempts', () => {
  let state = prefix(8);
  const id = state.deliveries['opening:email'].id;
  for (let i = 0; i < 3; i++) {
    state = reduceLimnopulse(state, { type: 'PROVIDER_RESULT', channel: 'email', kind: 'opening', result: '5xx' }).state;
    state = reduceLimnopulse(state, { type: 'ADVANCE_CLOCK', ticks: 16 }).state;
    state = reduceLimnopulse(state, { type: 'ATTEMPT_DELIVERY', channel: 'email', kind: 'opening' }).state;
  }
  assert.equal(state.deliveries['opening:email'].id, id);
  assert.equal(state.deliveries['opening:email'].attempts, 3);
  assert.equal(projectLimnopulse(state).email, 'permanent_failure');
});
test('Conflicting telemetry cannot replace immutable points or mutate the input state', () => {
  const state = prefix(5);
  const before = structuredClone(state);
  const result = reduceLimnopulse(state, { type: 'INGEST_WINDOW', values: [7, 7, 7, 7], ticks: [0, 1, 2, 3] });
  assert.equal(result.rejection, 'READING_CONFLICT');
  assert.deepEqual(result.state, before);
  assert.deepEqual(state, before);
});
