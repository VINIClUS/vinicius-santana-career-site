import test from 'node:test';
import assert from 'node:assert/strict';
import { createEsusdataState, reduceEsusdata, projectEsusdata } from '../src/features/explorer/lifecycle/esusdata.ts';
import scenario from '../src/features/explorer/lifecycle/data/esusdata-c1-target.json' with { type: 'json' };
import { loadEngine } from '../src/features/explorer/lifecycle/engine.ts';
import { execute } from '../src/features/explorer/lifecycle/types.ts';

const apply = (state, command) => reduceEsusdata(state, command).state;
function ready() {
  let state = createEsusdataState();
  for (const command of [
    { type: 'AUTHORIZE' }, { type: 'READ_PEC', budget: 6 }, { type: 'SEAL_EXTRACT', valid: true }, { type: 'CALCULATE_C1' }
  ]) state = apply(state, command);
  return state;
}
test('fictional C1 uses 3 scheduled and 2 walk-in encounters, excludes 1 unmapped row, and stages 60% / Ótimo', () => {
  const result = projectEsusdata(ready());
  assert.equal(result.scheduled, 3);
  assert.equal(result.walkIn, 2);
  assert.equal(result.excluded, 1);
  assert.equal(result.percentage, 60);
  assert.equal(result.classification, 'Ótimo');
  assert.equal(result.published, false);
  assert.deepEqual(result.methodologyPending, ['A', 'B', 'D', 'E']);
});
test('publication requires complete methodology and a live grant', () => {
  const state = ready();
  assert.equal(reduceEsusdata(state, { type: 'PUBLISH_C1' }).rejection, 'METHODOLOGY_INCOMPLETE');
  const target = apply(state, { type: 'VALIDATE_TARGET_GATES' });
  const published = apply(target, { type: 'PUBLISH_C1' });
  assert.equal(projectEsusdata(published).published, true);
  assert.equal(projectEsusdata(apply(published, { type: 'QUERY_RESULT' })).dashboard, '60% / Ótimo · hypothetical target');
  assert.equal(reduceEsusdata(apply(target, { type: 'REVOKE_GRANT' }), { type: 'PUBLISH_C1' }).rejection, 'GRANT_REVOKED');
  const incompleteBranch = apply(published, { type: 'RESET_METHOD_GATES' });
  assert.equal(projectEsusdata(incompleteBranch).published, false);
  assert.equal(reduceEsusdata(incompleteBranch, { type: 'PUBLISH_C1' }).rejection, 'METHODOLOGY_INCOMPLETE');
});
test('read budget, extract validity, and revoked grants block their boundaries', () => {
  const authorized = apply(createEsusdataState(), { type: 'AUTHORIZE' });
  assert.equal(reduceEsusdata(authorized, { type: 'READ_PEC', budget: 5 }).rejection, 'READ_BUDGET_EXCEEDED');
  const read = apply(authorized, { type: 'READ_PEC', budget: 6 });
  assert.equal(reduceEsusdata(read, { type: 'SEAL_EXTRACT', valid: false }).rejection, 'INVALID_EXTRACT');
  assert.equal(reduceEsusdata(apply(ready(), { type: 'REVOKE_GRANT' }), { type: 'QUERY_RESULT' }).rejection, 'GRANT_REVOKED');
});
test('six authored chapters publish only the hypothetical target and then serve its evidence', async () => {
  const adapter = await loadEngine(scenario.id);
  let state = adapter.initialize();
  assert.equal(scenario.chapters.length, 6);
  assert.equal(scenario.checkpoints.length, 6);
  for (const [index, checkpoint] of scenario.checkpoints.entries()) {
    const result = execute(adapter, state, checkpoint.command);
    assert.equal(result.rejection, undefined, checkpoint.id);
    state = result.state;
    assert.equal(adapter.project(state).published, index >= 4);
  }
  assert.equal(adapter.project(state).dashboard, '60% / Ótimo · hypothetical target');
  assert.deepEqual(scenario.variations.map(variation => variation.id), ['ESUS-N01', 'ESUS-N02', 'ESUS-N03', 'ESUS-N04']);
});
test('each negative operation reports its intended publication or evidence blocker from the initial tour state', async () => {
  const adapter = await loadEngine(scenario.id);
  const initial = execute(adapter, adapter.initialize(), scenario.checkpoints[0].command).state;
  const expected = {
    'ESUS-N01': 'READ_BUDGET_EXCEEDED',
    'ESUS-N02': 'INVALID_EXTRACT',
    'ESUS-N03': 'GRANT_REVOKED',
    'ESUS-N04': 'METHODOLOGY_INCOMPLETE',
  };
  for (const variation of scenario.variations) {
    const result = execute(adapter, initial, { type: 'SEQUENCE', commands: variation.commands });
    assert.equal(result.rejection, expected[variation.id], variation.id);
  }
});
