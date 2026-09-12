import assert from 'node:assert/strict';
import { projectDefinitions } from '../src/features/explorer/projects.ts';

const expectedDiagrams = {
  cnesdata: {
    primaryComponentId: 'central-api',
    stages: [
      ['Contracts & edge', 'flow', ['canonical-contracts', 'edge-agent']],
      ['Platform core', 'flow', ['central-api', 'tenant-isolation']],
      ['Interfaces & processing', 'flow', ['web-dashboard', 'parquet-to-gold']],
      ['Target runtime', 'support', ['kubernetes']]
    ]
  },
  limnopulse: {
    primaryComponentId: 'evaluator',
    stages: [
      ['Sources', 'flow', ['production-device-layer', 'mqtt-ingestion']],
      ['Authorized access', 'flow', ['telemetry-api']],
      ['Evaluation', 'flow', ['alert-rules', 'evaluator']],
      ['Delivery', 'flow', ['notifications']],
      ['Cloud infrastructure', 'support', ['cloud-infrastructure']]
    ]
  },
  infrastructure: {
    primaryComponentId: 'reference-topology',
    stages: [
      ['Ansible contracts', 'flow', ['ansible-contracts']],
      ['Image builds', 'flow', ['image-builds']],
      ['Operations automation', 'flow', ['operations-automation']],
      ['Reference topology', 'flow', ['reference-topology']]
    ]
  }
};

for (const [projectId, expected] of Object.entries(expectedDiagrams)) {
  const definition = projectDefinitions[projectId];

  assert.equal(definition.primaryComponentId, expected.primaryComponentId, `${projectId} has the specified initial component focus`);
  assert.deepEqual(
    definition.diagram.stages.map(({ label, kind, componentIds }) => [label, kind, componentIds]),
    expected.stages,
    `${projectId} preserves the specified diagram stages`
  );

  const componentIds = new Set(definition.componentIds);
  const stagedComponentIds = definition.diagram.stages.flatMap(stage => stage.componentIds);
  assert.equal(new Set(stagedComponentIds).size, stagedComponentIds.length, `${projectId} assigns each component to only one stage`);
  assert.deepEqual(new Set(stagedComponentIds), componentIds, `${projectId} assigns every component to a diagram stage`);
  assert.ok(componentIds.has(definition.primaryComponentId), `${projectId} primary focus is a component`);

  for (const relation of definition.relations) {
    assert.ok(componentIds.has(relation.from), `${projectId} relation starts at a component`);
    assert.ok(componentIds.has(relation.to), `${projectId} relation ends at a component`);
    assert.match(relation.shortLabel, /\S/, `${projectId} relation has a short label`);
  }
}

assert.equal(projectDefinitions.cnesdata.relations.find(relation => relation.from === 'edge-agent' && relation.to === 'central-api')?.shortLabel, 'Registers manifests');
assert.equal(projectDefinitions.limnopulse.relations.find(relation => relation.from === 'mqtt-ingestion' && relation.to === 'telemetry-api')?.shortLabel, 'Authorized telemetry');
assert.equal(projectDefinitions.limnopulse.relations.find(relation => relation.from === 'alert-rules' && relation.to === 'notifications')?.shortLabel, 'Delivery work');
assert.equal(projectDefinitions.infrastructure.relations.find(relation => relation.from === 'ansible-contracts' && relation.to === 'reference-topology')?.shortLabel, 'Configuration');
assert.equal(projectDefinitions.infrastructure.relations.find(relation => relation.from === 'image-builds' && relation.to === 'reference-topology')?.shortLabel, 'Base images');
