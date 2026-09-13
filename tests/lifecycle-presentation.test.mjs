import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPresentationPlan, describeOutcome, planEvent, actorSlots } from '../src/features/explorer/lifecycle/presentation.ts';
const ids = ['infra-exhaustion-recovery','infra-quorum-recovery','infra-provision-scale','limnopulse-end-to-end','cnesdata-end-to-end'];
for (const id of ids) test(`${id}: each explanatory shot binds 1–3 distinct actors and command-only data`, () => {
  const scenario = JSON.parse(readFileSync(`src/features/explorer/lifecycle/data/${id}.json`));
  assert.doesNotMatch(JSON.stringify(scenario), /"expected"|"stateRef"/);
  assert.equal(scenario.chapters.length, 6);
  for (const checkpoint of scenario.checkpoints) {
    const plan = getPresentationPlan(scenario, checkpoint.id);
    for (const beat of plan.microbeats) {
      assert.ok(beat.primaryActors.length >= 1 && beat.primaryActors.length <= 3);
      assert.equal(new Set(beat.primaryActors).size, beat.primaryActors.length);
      for (const actor of beat.primaryActors) assert.ok(scenario.actors.some(a => a.id === actor), actor);
    }
  }
  for (const chapter of scenario.chapters) {
    const slots = actorSlots(scenario, chapter.id);
    for (const cp of scenario.checkpoints.filter(cp => cp.plan.chapterId === chapter.id))
      for (const beat of cp.plan.microbeats)
        assert.equal(new Set(beat.primaryActors.map(id => slots[id])).size, beat.primaryActors.length);
  }
});
test('outcomes use live projection; unknown and partial channel success remain explicit', () => {
  const text = describeOutcome('limnopulse', { incident:'open', email:'accepted',telegram:'unknown',userView:'idle' });
  assert.match(text,/accepted/); assert.match(text,/unknown/); assert.doesNotMatch(text,/read by/);
});
test('manual events get a presentation without any checkpoint', () => {
  const plan = planEvent('infrastructure', { type:'blocked', description:'Storage unavailable' }, {}, { storageReady:false });
  assert.equal(plan.headline,'Storage unavailable');
  assert.ok(plan.microbeats[0].primaryActors.length > 0);
});

test('membership query reaches storage before returning a response to the user', () => {
  const scenario=JSON.parse(readFileSync('src/features/explorer/lifecycle/data/limnopulse-end-to-end.json'));
  const beats=getPresentationPlan(scenario,'limnopulse-end-to-end-16').microbeats;
  const requests=beats.filter(b=>b.routeKind==='query'||b.routeKind==='receipt');
  assert.deepEqual(requests.map(b=>b.primaryActors),[
    ['limno.user','limno.api'],['limno.api','limno.incident'],['limno.incident','limno.api'],['limno.api','limno.user'],
  ]);
});

test('scale-in release identifies the two released workers rather than the surviving worker', () => {
  const scenario=JSON.parse(readFileSync('src/features/explorer/lifecycle/data/infra-provision-scale.json'));
  const cp=scenario.checkpoints.at(-1);
  const ids=cp.plan.microbeats.flatMap(b=>b.primaryActors);
  assert.ok(ids.includes('scale.worker-02'));
  assert.ok(ids.includes('scale.worker-03'));
  assert.ok(!ids.includes('scale.worker-01'));
});
