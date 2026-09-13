import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenarios } from '../src/features/explorer/lifecycle/catalog.ts';
const registry=JSON.parse(readFileSync('docs/design/systems-atlas-production-assets.json'));
test('all lifecycle actors use local verified SVGs with recorded upstream provenance',()=>{
  for(const scenario of scenarios)for(const actor of scenario.actors){
    const entry=registry.assets.find(asset=>asset.id===actor.assetId);
    assert.ok(entry,actor.id);
    const bytes=readFileSync(entry.targetPath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.finalSha256);
    assert.match(entry.upstreamSha256,/^[a-f0-9]{64}$/);
    assert.ok(entry.version&&entry.sourceUrl&&entry.sanitization&&entry.license);
    assert.ok(existsSync(entry.licenseRecord));
    assert.doesNotMatch(bytes.toString(),/<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=|url\((?!#)/i);
    assert.match(bytes.toString(),/viewBox=/);
  }
});
test('approved functional icons and official AWS service identities remain distinct',()=>{
  assert.deepEqual(registry.approvedOverrides,{telegraf:'Lucide funnel',influxdb:'Lucide chart-line',mqtt:'Lucide radio'});
  assert.notEqual(registry.assets.find(a=>a.id==='aws-ses').finalSha256,registry.assets.find(a=>a.id==='aws-sqs').finalSha256);
});
