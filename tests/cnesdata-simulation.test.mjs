import assert from 'node:assert/strict';
import test from 'node:test';
import { scenarios } from '../src/content/scenarios/cnesdata.ts';
import { createInitialState, transition, getTranscript } from '../src/features/explorer/simulation/cnesdata.ts';

const step = (state) => transition(state, { type: 'STEP' });
const storedA = [{ key: 'synthetic-key-K', content: 'synthetic-content-A' }];
const expected = {
  'raw-first-write': ['stored'],
  'raw-identical-replay': ['stored', 'replayed'],
  'raw-content-conflict': ['stored', 'conflict']
};

function freeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
}

for (const [id, outcomes] of Object.entries(expected)) {
  test(`${id} starts empty and preserves A through completion`, () => {
    let state = createInitialState(id);
    assert.deepEqual(state, {
      scenarioId: id, nextStepIndex: 0, status: 'ready', objects: [], history: []
    });
    const snapshots = [];
    for (const [index, outcome] of outcomes.entries()) {
      const previous = freeze(state);
      snapshots.push([previous, structuredClone(previous)]);
      state = step(previous);
      assert.equal(state.nextStepIndex, index + 1);
      assert.equal(state.history.at(-1).outcome, outcome);
      assert.deepEqual(state.objects, storedA);
      assert.equal(state.status, index === outcomes.length - 1 ? 'complete' : 'running');
      assert.deepEqual(transition(state, { type: 'RESET' }), createInitialState(id));
    }
    assert.deepEqual(state.history.map((result) => result.outcome), outcomes);
    assert.deepEqual(step(step(state)), state);
    for (const [previous, snapshot] of snapshots) assert.deepEqual(previous, snapshot);
  });

  test(`${id} transcript is deterministic and matches each live transition`, () => {
    const transcript = getTranscript(id);
    assert.equal(transcript.scenarioId, id);
    assert.equal(transcript.evidenceStatus, 'illustrative');
    assert.match(transcript.label, /synthetic demonstration/i);
    assert.ok(transcript.title.length > 0);
    let state = createInitialState(id);
    assert.deepEqual(transcript.initialState, state);
    assert.equal(transcript.steps.length, outcomes.length);
    for (const entry of transcript.steps) {
      state = step(state);
      assert.deepEqual(entry.state, state);
      assert.deepEqual(entry.result, state.history.at(-1));
      assert.ok(entry.description.includes(entry.result.attempt.key));
    }
    assert.deepEqual(getTranscript(id), transcript);
  });
}

test('default selection, selection restart and scenario switching', () => {
  assert.deepEqual(createInitialState(), createInitialState('raw-first-write'));
  const progressed = step(createInitialState('raw-content-conflict'));
  for (const scenarioId of Object.keys(expected)) {
    assert.deepEqual(transition(progressed, { type: 'SELECT_SCENARIO', scenarioId }), createInitialState(scenarioId));
  }
});

test('unknown IDs are inert, empty and recoverable, including object prototype names', () => {
  for (const scenarioId of ['unknown', '', '__proto__', 'constructor', 'toString']) {
    const invalid = createInitialState(scenarioId);
    assert.deepEqual(invalid, {
      scenarioId, nextStepIndex: 0, status: 'invalid-scenario', objects: [], history: []
    });
    assert.deepEqual(step(invalid), invalid);
    assert.deepEqual(transition(invalid, { type: 'RESET' }), invalid);
    assert.equal(getTranscript(scenarioId), null);
    assert.deepEqual(transition(step(createInitialState()), { type: 'SELECT_SCENARIO', scenarioId }), invalid);
    assert.deepEqual(transition(invalid, { type: 'SELECT_SCENARIO', scenarioId: 'raw-identical-replay' }), createInitialState('raw-identical-replay'));
  }
});

test('execution and transcripts preserve scenario definitions', () => {
  const snapshot = structuredClone(scenarios);
  freeze(scenarios);
  for (const scenario of scenarios) getTranscript(scenario.id);
  assert.deepEqual(scenarios, snapshot);
});
