import { demonstration, scenarios } from '../../../content/scenarios/cnesdata.ts';
import type { WriteAttempt } from '../../../content/scenarios/cnesdata.ts';

export type Command =
  | { readonly type: 'SELECT_SCENARIO'; readonly scenarioId: string }
  | { readonly type: 'STEP' }
  | { readonly type: 'RESET' };

export type WriteOutcome = 'stored' | 'replayed' | 'conflict';

export interface WriteResult {
  readonly outcome: WriteOutcome;
  readonly attempt: WriteAttempt;
}

export interface SimulationState {
  readonly scenarioId: string;
  readonly nextStepIndex: number;
  readonly status: 'ready' | 'running' | 'complete' | 'invalid-scenario';
  readonly objects: readonly WriteAttempt[];
  readonly history: readonly WriteResult[];
}

export interface TranscriptStep {
  readonly description: string;
  readonly result: WriteResult;
  readonly state: SimulationState;
}

export interface ScenarioTranscript {
  readonly scenarioId: string;
  readonly title: string;
  readonly label: typeof demonstration.label;
  readonly evidenceStatus: typeof demonstration.evidenceStatus;
  readonly scope: string;
  readonly initialState: SimulationState;
  readonly steps: readonly TranscriptStep[];
}

function findScenario(scenarioId: string) {
  return scenarios.find((scenario) => scenario.id === scenarioId);
}

export function createInitialState(scenarioId = 'raw-first-write'): SimulationState {
  return {
    scenarioId,
    nextStepIndex: 0,
    status: findScenario(scenarioId) ? 'ready' : 'invalid-scenario',
    objects: [],
    history: []
  };
}

export function transition(state: SimulationState, command: Command): SimulationState {
  if (command.type === 'SELECT_SCENARIO') return createInitialState(command.scenarioId);
  if (state.status === 'invalid-scenario') return state;
  if (command.type === 'RESET') return createInitialState(state.scenarioId);
  if (state.status === 'complete') return state;

  const scenario = findScenario(state.scenarioId);
  const definition = scenario?.attempts[state.nextStepIndex];
  if (!scenario || !definition) return state;

  const attempt: WriteAttempt = { ...definition };
  const existing = state.objects.find((object) => object.key === attempt.key);
  const outcome: WriteOutcome = !existing
    ? 'stored'
    : existing.content === attempt.content ? 'replayed' : 'conflict';
  const nextStepIndex = state.nextStepIndex + 1;

  return {
    scenarioId: state.scenarioId,
    nextStepIndex,
    status: nextStepIndex === scenario.attempts.length ? 'complete' : 'running',
    objects: outcome === 'stored' ? [...state.objects, attempt] : state.objects,
    history: [...state.history, { outcome, attempt }]
  };
}

function describeResult(result: WriteResult): string {
  const { key, content } = result.attempt;
  switch (result.outcome) {
    case 'stored': return `Stored ${content} at ${key}. One object exists.`;
    case 'replayed': return `Accepted identical replay of ${content} at ${key}. The stored object is unchanged; no duplicate was created.`;
    case 'conflict': return `Rejected conflicting ${content} at ${key}. The originally stored content remains intact.`;
  }
}

export function getTranscript(scenarioId: string): ScenarioTranscript | null {
  const scenario = findScenario(scenarioId);
  if (!scenario) return null;

  const initialState = createInitialState(scenarioId);
  let state = initialState;
  const steps: TranscriptStep[] = [];
  for (const _attempt of scenario.attempts) {
    state = transition(state, { type: 'STEP' });
    const result = state.history[state.history.length - 1];
    if (result) steps.push({ description: describeResult(result), result, state });
  }

  return { scenarioId, title: scenario.title, ...demonstration, initialState, steps };
}
