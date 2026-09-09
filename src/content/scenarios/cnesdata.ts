export type SyntheticKey = 'synthetic-key-K';
export type SyntheticContent = 'synthetic-content-A' | 'synthetic-content-B';

export interface WriteAttempt {
  readonly key: SyntheticKey;
  readonly content: SyntheticContent;
}

export interface ScenarioDefinition {
  readonly id: string;
  readonly title: string;
  readonly attempts: readonly WriteAttempt[];
}

export const demonstration = {
  label: 'Synthetic demonstration',
  evidenceStatus: 'illustrative',
  scope: 'An illustrative raw-object contract using fictional identifiers and content. It does not represent the full current CnesData API or measured operational results.'
} as const;

export const scenarios: readonly ScenarioDefinition[] = [
  {
    id: 'raw-first-write',
    title: 'First write to a new key',
    attempts: [{ key: 'synthetic-key-K', content: 'synthetic-content-A' }]
  },
  {
    id: 'raw-identical-replay',
    title: 'Identical replay without duplication',
    attempts: [
      { key: 'synthetic-key-K', content: 'synthetic-content-A' },
      { key: 'synthetic-key-K', content: 'synthetic-content-A' }
    ]
  },
  {
    id: 'raw-content-conflict',
    title: 'Content conflict preserves the first write',
    attempts: [
      { key: 'synthetic-key-K', content: 'synthetic-content-A' },
      { key: 'synthetic-key-K', content: 'synthetic-content-B' }
    ]
  }
];
