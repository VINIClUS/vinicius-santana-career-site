import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/features/explorer/lifecycle/player.ts';

function setup() {
  const pending = [];
  const dispatched = [];
  const player = createPlayer({
    schedule: fn => { pending.push(fn); return () => {}; },
    apply: index => { dispatched.push(index); },
    rebuild: index => { dispatched.push(`rebuild:${index}`); },
    changed: () => {},
    beatCount: () => 2,
    count: 3,
    durations: { orient: 1, focus: 1, action: 1, settle: 1 },
  });
  return { player, pending, dispatched };
}
test('pause freezes a shot and obsolete callback cannot dispatch', () => {
  const { player, pending, dispatched } = setup();
  player.play();
  const callback = pending.shift();
  player.pause(); callback();
  assert.equal(player.snapshot().phase, 'orient');
  assert.deepEqual(dispatched, []);
  assert.equal(player.snapshot().playing, false);
});
test('reset invalidates old generation even after resuming', () => {
  const { player, pending, dispatched } = setup();
  player.play(); const stale = pending.shift();
  player.reset(); player.play(); stale();
  assert.equal(player.snapshot().phase, 'orient');
  assert.deepEqual(dispatched, ['rebuild:0']);
});
test('next settles a pending presentation before applying another command', () => {
  const { player, dispatched } = setup();
  player.next();
  assert.equal(player.snapshot().phase, 'settle');
  assert.equal(player.snapshot().beat, 1);
  assert.deepEqual(dispatched, []);
  player.next();
  assert.deepEqual(dispatched, [1]);
});
test('previous and chapter seek rebuild a prefix and remain paused', () => {
  const { player, dispatched } = setup();
  player.seek(2); player.previous();
  assert.deepEqual(dispatched, ['rebuild:2', 'rebuild:1']);
  assert.equal(player.snapshot().playing, false);
});
test('an off-script interruption preserves domain and cancels tour until replay', () => {
  const { player, pending, dispatched } = setup();
  player.play(); const stale = pending.shift(); player.interrupt(); stale();
  player.play(); player.next();
  assert.deepEqual(dispatched, []);
  assert.equal(player.snapshot().guided, false);
  player.reset(); assert.equal(player.snapshot().guided, true);
});
test('a full passage visits each command once and ends with no scheduled motion', () => {
  const { player, pending, dispatched } = setup();
  player.play();
  for (let i=0; pending.length && i<100; i++) pending.shift()();
  assert.deepEqual(dispatched, [1,2]);
  assert.equal(player.snapshot().playing, false);
  assert.equal(player.snapshot().complete, true);
});
test('dispose invalidates callbacks and all controls', () => {
  const { player, pending, dispatched } = setup();
  player.play(); const stale=pending.shift(); player.dispose(); stale();
  player.reset(); player.seek(2); player.play();
  assert.deepEqual(dispatched, []);
});
test('pause during action preserves the exact shot when resumed', () => {
  const { player, pending, dispatched } = setup();
  player.play(); pending.shift()(); pending.shift()();
  assert.equal(player.snapshot().phase, 'action');
  const stale = pending.shift();
  player.pause();
  const frozen = player.snapshot();
  player.play(); stale();
  assert.equal(player.snapshot().phase, frozen.phase);
  assert.equal(player.snapshot().index, frozen.index);
  assert.equal(player.snapshot().beat, frozen.beat);
  assert.deepEqual(dispatched, []);
  pending.shift()();
  assert.equal(player.snapshot().phase, 'settle');
});
test('chapter seek invalidates an action callback even if playback restarts immediately', () => {
  const { player, pending, dispatched } = setup();
  player.play(); pending.shift()(); pending.shift()();
  const stale = pending.shift();
  player.seek(2);
  assert.equal(player.snapshot().playing, false);
  player.play(); stale();
  assert.deepEqual(dispatched, ['rebuild:2']);
  assert.equal(player.snapshot().index, 2);
  assert.equal(player.snapshot().phase, 'orient');
});
test('replacement player cannot be advanced by an old cycle callback', () => {
  const old = setup(); old.player.play();
  const callback = old.pending.shift(); old.player.dispose();
  const replacement = setup(); replacement.player.play(); callback();
  assert.deepEqual(old.dispatched, []);
  assert.deepEqual(replacement.dispatched, []);
  assert.equal(replacement.player.snapshot().phase, 'orient');
});
test('next during active playback freezes then completes only the pending operation', () => {
  const { player, pending, dispatched } = setup();
  player.play(); pending.shift()(); pending.shift()();
  const callback = pending.shift(); player.next(); callback();
  assert.equal(player.snapshot().playing, false);
  assert.equal(player.snapshot().phase, 'settle');
  assert.equal(player.snapshot().index, 0);
  assert.deepEqual(dispatched, []);
  player.next(); assert.deepEqual(dispatched, [1]);
});
test('completed autoplay is one passage and replay explicitly reconstructs the initial state', () => {
  const { player, pending, dispatched } = setup();
  player.play();
  while (pending.length) pending.shift()();
  player.play(); player.next();
  assert.deepEqual(dispatched, [1, 2]);
  assert.equal(pending.length, 0);
  player.reset();
  assert.equal(player.snapshot().complete, false);
  assert.equal(player.snapshot().playing, false);
  assert.deepEqual(dispatched, [1, 2, 'rebuild:0']);
});
