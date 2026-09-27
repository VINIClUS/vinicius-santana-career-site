import assert from 'node:assert/strict';
import test from 'node:test';
import { trackJourney } from '../src/features/analytics/journey.ts';

test('trackJourney sends a GA4 event without empty parameters', () => {
  const calls = [];
  globalThis.gtag = (...args) => calls.push(args);
  try {
    trackJourney('project_select', { project_id: 'cnesdata', source: 'label', atlas_mode: '2d', initial_project: undefined, extra: '' });
  } finally {
    delete globalThis.gtag;
  }
  assert.deepEqual(calls, [['event', 'project_select', { project_id: 'cnesdata', source: 'label', atlas_mode: '2d' }]]);
});

test('trackJourney is a no-op when analytics is not loaded', () => {
  assert.equal(globalThis.gtag, undefined);
  assert.doesNotThrow(() => trackJourney('atlas_open'));
});

test('trackJourney never lets an analytics failure escape', () => {
  globalThis.gtag = () => { throw new Error('blocked'); };
  try {
    assert.doesNotThrow(() => trackJourney('case_study_open', { project_id: 'limnopulse' }));
  } finally {
    delete globalThis.gtag;
  }
});
