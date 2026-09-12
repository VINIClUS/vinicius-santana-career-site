import assert from 'node:assert/strict';
import test from 'node:test';
import { graphLabel, relationKey } from '../src/features/explorer/system-view.ts';

test('stable relation identity keeps connector copy neutral when source editorial text changes', () => {
  assert.equal(
    graphLabel({ from: 'central-api', to: 'parquet-to-gold', label: 'A future planned editorial rewrite' }),
    'Creates a processing-work boundary'
  );
  assert.equal(relationKey({ from: 'central-api', to: 'parquet-to-gold', label: 'ignored' }), 'central-api→parquet-to-gold');
});

test('unmapped connector copy removes status language without changing relation identity', () => {
  assert.equal(
    graphLabel({ from: 'source', to: 'target', label: 'Planned documented illustrative delivery handoff' }), 'Delivery handoff');
});
