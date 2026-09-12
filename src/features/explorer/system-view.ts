import type { ProjectRelation } from './projects.ts';

const graphLabels: Readonly<Record<string, string>> = {
  'Creates planned processing work': 'Creates a processing-work boundary',
  'Represents the planned deployment shape': 'Shows the deployment shape',
  'Documents managed resources and external scheduling prerequisites': 'Maps managed resources and external scheduling prerequisites',
  'Marks a planned production boundary beyond the local scaffold': 'Marks the production-device boundary beyond the local scaffold',
};

export function graphLabel(relation: ProjectRelation): string {
  return graphLabels[relation.label] ?? relation.label;
}
