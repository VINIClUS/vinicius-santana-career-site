import type { ProjectRelation } from './projects.ts';

const graphLabels: Readonly<Record<string, string>> = {
  'central-api→parquet-to-gold': 'Creates a processing-work boundary',
  'kubernetes→central-api': 'Shows the deployment shape',
  'cloud-infrastructure→evaluator': 'Maps managed resources and external scheduling prerequisites',
  'production-device-layer→mqtt-ingestion': 'Marks the production-device boundary beyond the local scaffold',
};

export function relationKey(relation: Pick<ProjectRelation, 'from' | 'to'>): string {
  return `${relation.from}→${relation.to}`;
}

export function graphLabel(relation: ProjectRelation): string {
  return graphLabels[relationKey(relation)] ?? relation.label
    .replace(/\b(?:planned|documented|implemented|historical|illustrative)\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*([a-z])/, (_, initial: string) => initial.toUpperCase())
    .trim();
}
