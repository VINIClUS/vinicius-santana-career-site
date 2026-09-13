import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCnesdataState, reduceCnesdata, projectCnesdata, projectCnesdataSamples, normalizeCnesdataCommand } from '../src/features/explorer/lifecycle/cnesdata.ts';

const root = new URL('../docs/design/systems-atlas-lifecycles-v3/', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const scenario = read('scenarios/cnesdata-end-to-end.json');
const negatives = read('scenarios/negative-cases.json').cases.filter(c => c.scenarioId === scenario.id);
const apply = (state, command) => reduceCnesdata(state, normalizeCnesdataCommand(state, command));
function prefix(index) {
  let state = createCnesdataState();
  for (const checkpoint of scenario.checkpoints.slice(0, index + 1)) {
    const result = apply(state, checkpoint.command);
    assert.equal(result.rejection, undefined, checkpoint.id);
    state = result.state;
  }
  return state;
}
for (const [index, checkpoint] of scenario.checkpoints.entries()) {
  test(`CnesData checkpoint ${checkpoint.id}`, () => {
    const projection = projectCnesdata(prefix(index));
    for (const [key, value] of Object.entries(checkpoint.expected)) assert.deepEqual(projection[key], value, key);
  });
}
for (const variant of negatives) {
  test(`CnesData negative ${variant.id}: ${variant.reason}`, () => {
    let state = prefix(scenario.checkpoints.findIndex(cp => cp.id === variant.fromCheckpoint));
    for (const command of variant.commands) state = apply(state, command).state;
    const projection = projectCnesdata(state);
    for (const [key, value] of Object.entries(variant.expectedSubset)) assert.deepEqual(projection[key], value, key);
  });
}
test('sample transformation compares three rows, preserves source/run/competencia and immutable raw', () => {
  const sample = read('design/sample-data.json');
  const raw = prefix(10);
  assert.deepEqual(raw.local, sample.local);
  assert.deepEqual(raw.national, sample.national);
  const state = prefix(18);
  assert.deepEqual(state.raw, raw.raw);
  assert.equal(state.serving.comparedRows, sample.expected.comparedRows);
  assert.equal(state.serving.differentRows, sample.expected.differentRows);
  assert.equal(state.serving.sameRows, sample.expected.sameRows);
  for (const row of state.normalizedRows) {
    assert.ok(['CNES_LOCAL', 'CNES_NATIONAL'].includes(row.source));
    assert.equal(row.competencia, sample.competencia);
    assert.equal(row.runId, sample.expected.run_id);
    assert.equal(typeof row.hours, 'number');
    assert.equal(row.establishment, row.establishment.trim());
  }
});
test('raw bytes conflict preserves first bytes and hash and replay creates no events', () => {
  const state = prefix(5);
  const conflict = apply(state, { type: 'PUT_RAW_OBJECT', snapshotId: 'snap-local-01', fence: 1, contentVariant: 'different' });
  assert.equal(conflict.rejection, 'RAW_CONFLICT');
  assert.deepEqual(conflict.state.raw, state.raw);
  assert.deepEqual(apply(state, { type: 'REPLAY_RAW_OBJECT', snapshotId: 'snap-local-01' }).events, []);
});
test('raw lease, trusted agent membership, owner and fence are checked at mutation time', () => {
  const leased = prefix(4);
  for (const command of [{ type: 'ADVANCE_CLOCK', ticks: 31 }, { type: 'REVOKE_AGENT' }]) {
    const state = apply(leased, command).state;
    const result = apply(state, { type: 'PUT_RAW_OBJECT', snapshotId: 'late', fence: state.fence });
    assert.ok(result.rejection);
    assert.equal(Object.keys(result.state.raw).length, 0);
  }
  assert.ok(apply(leased, { type: 'PUT_RAW_OBJECT', snapshotId: 'wrong', fence: 0 }).rejection);
  assert.ok(apply(leased, { type: 'PUT_RAW_OBJECT', snapshotId: 'wrong', fence: 1, agentId: 'impostor' }).rejection);
  assert.ok(apply(prefix(1), { type: 'CLAIM_JOB', agentId: 'impostor' }).rejection);
});
test('placeholder fence is rejected by reducer but normalized from live state', () => {
  const state = prefix(4);
  const command = { type: 'PUT_RAW_OBJECT', snapshotId: 'real', fence: 'current' };
  assert.equal(reduceCnesdata(state, command).rejection, 'UNRESOLVED_PLACEHOLDER');
  assert.equal(normalizeCnesdataCommand(state, command).fence, state.fence);
  assert.equal(apply(state, command).rejection, undefined);
});
test('failure is terminal and does not publish even with valid worker fence', () => {
  let state = apply(prefix(15), { type: 'FAIL_PROCESSING', unit: 'serving' }).state;
  for (const command of [{ type: 'START_RUN' }, { type: 'VERIFY_ARTIFACTS' }, { type: 'PUBLISH_CURRENT', expectedVersion: 'v-demo-00', fence: 1 }]) {
    const result = apply(state, command);
    assert.ok(result.rejection);
    state = result.state;
  }
  assert.equal(state.currentVersion, 'v-demo-00');
});
test('read pins a full version across conditional rollback, membership revocation hides output', () => {
  const pinned = prefix(17);
  const rolled = apply(pinned, { type: 'ROLLBACK_CURRENT', versionId: 'v-demo-00', expectedVersion: 'v-demo-01', fence: 1 });
  assert.equal(rolled.rejection, undefined);
  const response = apply(rolled.state, { type: 'SHOW_SERVING' }).state;
  assert.equal(response.currentVersion, 'v-demo-00');
  assert.equal(response.servedVersion, 'v-demo-01');
  assert.equal(response.response.run_id, 'run-demo-01');
  assert.equal(response.response.comparedRows, 3);
  const revoked = apply(pinned, { type: 'REVOKE_MEMBERSHIP' }).state;
  assert.equal(apply(revoked, { type: 'SHOW_SERVING' }).rejection, 'ACCESS_DENIED');
  assert.equal(revoked.servedVersion, null);
  assert.equal(revoked.response, null);
});
test('local profile changes deployment labels without changing rules', () => {
  const local = createCnesdataState('local');
  assert.equal(projectCnesdata(local).profile, 'local');
  assert.equal(local.currentVersion, 'v-demo-00');
});
test('manifest rejects corrupted raw bytes even when stored checksum was not changed', () => {
  const state = prefix(5);
  state.raw[Object.keys(state.raw)[0]].bytes = 'corrupted';
  const result = apply(state, { type: 'ACCEPT_RAW_MANIFEST', source: 'CNES_LOCAL' });
  assert.equal(result.rejection, 'INVALID_INPUT');
  assert.equal(Object.keys(result.state.manifests).length, 0);
});
test('normalization reads accepted raw bytes, independent of mutable Edge working buffer', () => {
  const state = prefix(10);
  state.local[0].hours = '999';
  const result = apply(state, { type: 'NORMALIZE_SOURCES' });
  assert.equal(result.rejection, undefined);
  assert.equal(result.state.normalizedRows[0].hours, 40);
});
test('unauthorized follow-up never leaves previous private response visible', () => {
  const denied = apply(prefix(18), { type: 'AUTHORIZE_AND_READ', tenantId: 'tenant-demo-B' });
  assert.equal(denied.rejection, 'ACCESS_DENIED');
  assert.equal(denied.state.servedVersion, null);
  assert.equal(denied.state.response, null);
});
function deltaState(initial = prefix(7)) {
  let state = initial;
  for (const command of [
    { type: 'REQUEST_EXTRACTION', competencia: '2026-07', snapshotMode: 'DELTA' },
    { type: 'CLAIM_JOB', agentId: 'agent-demo-01' },
    { type: 'PUT_RAW_OBJECT', snapshotId: `delta-${state.fence + 1}`, fence: 'current' },
  ]) {
    const result = apply(state, command); assert.equal(result.rejection, undefined); state = result.state;
  }
  return state;
}
for (const reason of ['AGENT_RESYNC_REQUIRED', 'BASE_UNKNOWN', 'SEQUENCE_GAP', 'HASH_CHAIN_MISMATCH', 'SCHEMA_INCOMPATIBLE', 'BASE_TOO_OLD', 'CHAIN_TOO_LONG']) {
  test(`DELTA ${reason} retains head, fails final, and creates no replacement FULL`, () => {
    let state = prefix(7);
    if (reason === 'CHAIN_TOO_LONG') {
      for (let sequence = 2; sequence <= 10; sequence++) {
        state = deltaState(state);
        const result = apply(state, { type: 'REGISTER_DELTA_MANIFEST', baseSnapshotId: 'snap-local-01', sequence, previousManifestHash: 'canonical-head-from-state' });
        assert.equal(result.rejection, undefined); state = result.state;
      }
    }
    state = deltaState(state);
    const command = { type: 'REGISTER_DELTA_MANIFEST', baseSnapshotId: 'snap-local-01', sequence: state.canonicalHead.sequence + 1, previousManifestHash: state.canonicalHead.hash };
    if (reason === 'AGENT_RESYNC_REQUIRED') state.resyncReason = 'SEQUENCE_GAP';
    if (reason === 'BASE_UNKNOWN') command.baseSnapshotId = 'missing';
    if (reason === 'SEQUENCE_GAP') command.sequence++;
    if (reason === 'HASH_CHAIN_MISMATCH') command.previousManifestHash = 'wrong';
    if (reason === 'SCHEMA_INCOMPATIBLE') command.schemaVersion = 9;
    if (reason === 'BASE_TOO_OLD') state = apply(state, { type: 'ADVANCE_CLOCK', ticks: 21 }).state;
    const head = structuredClone(state.canonicalHead);
    const result = apply(state, command);
    assert.equal(result.rejection, reason);
    assert.equal(result.state.job, 'FAILED_FINAL');
    assert.deepEqual(result.state.canonicalHead, head);
    assert.equal(result.state.currentVersion, 'v-demo-00');
    assert.equal(result.state.replacementFullJobCreated, false);
    const replay = apply(result.state, command);
    assert.equal(replay.rejection, undefined, 'authenticated identical terminal replay');
    assert.deepEqual(replay.events, []);
    assert.deepEqual(replay.state, result.state);
  });
}
test('accepted DELTA terminal replay is idempotent, conflicting replay is rejected', () => {
  const state = deltaState();
  const command = normalizeCnesdataCommand(state, { type: 'REGISTER_DELTA_MANIFEST', baseSnapshotId: 'snap-local-01', sequence: 2, previousManifestHash: 'canonical-head-from-state' });
  const accepted = apply(state, command);
  assert.equal(accepted.rejection, undefined);
  assert.equal(apply(accepted.state, command).rejection, undefined);
  assert.deepEqual(apply(accepted.state, command).events, []);
  assert.ok(apply(accepted.state, { ...command, sequence: 99 }).rejection);
});
test('presentation selector exposes actual stage rows, counts, and lineage without mutable aliases', () => {
  const state = prefix(18);
  const samples = projectCnesdataSamples(state);
  assert.deepEqual(samples.local, read('design/sample-data.json').local);
  assert.equal(samples.normalized.length, 6);
  assert.equal(samples.comparison.length, 3);
  assert.equal(samples.comparison.filter(row => row.different).length, 1);
  assert.equal(samples.comparison.filter(row => !row.different).length, 2);
  assert.equal(samples.comparison[0].lineage.length, 2);
  assert.equal(samples.serving.run_id, 'run-demo-01');
  samples.local[0].hours = '999';
  assert.equal(state.local[0].hours, '040 ');
  assert.equal(projectCnesdataSamples(prefix(0)).serving, null);
});
