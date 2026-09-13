/** Proposed design contract; not an implementation of the portfolio engines.
 * Expected snapshots in scenarios/ are observables, never reducer inputs.
 * Keep project-specific state/commands in the corresponding domain modules.
 */
export type ProjectId = 'infrastructure' | 'limnopulse' | 'cnesdata';
export type EvidenceStatus = 'implemented' | 'documented' | 'planned' | 'illustrative' | 'historical';
export type LogicalTick = number; // runtime assertion: nonnegative safe integer
export interface DomainEvent {
  readonly id: string;
  readonly causedBy: string;
  readonly logicalTick: LogicalTick;
  readonly kind: string;
  readonly entityIds: readonly string[];
}
export interface TransitionResult<S> {
  readonly state: S;
  readonly events: readonly DomainEvent[];
  readonly rejection?: { readonly code: string; readonly message: string };
}
export type Reducer<S, C> = (state: S, command: C) => TransitionResult<S>;
export interface ScheduledEffect<C> {
  readonly dueTick: LogicalTick;
  readonly sequence: number;
  readonly operationId: string;
  readonly generation: number;
  readonly command: C;
}
export interface PresentationFrame<S> {
  readonly previous: S;
  readonly current: S;
  readonly progress: number; // 0..1, visual time only
  readonly activeEventIds: readonly string[];
}
export interface PlaybackState {
  readonly status: 'ready' | 'playing' | 'paused' | 'complete';
  readonly mode: 'guided' | 'explore';
  readonly scenarioId: string;
  readonly checkpointIndex: number;
  readonly generation: number;
}
export interface VisualActor {
  readonly id: string;
  readonly componentRef: string | null;
  readonly evidenceStatus: EvidenceStatus;
  readonly runtimeState: string;
}
// Keep DOM, WebGL, network APIs and wall-clock time out of Reducer.
// On mode switch/reset, invalidate scheduled effects from older generations.
// Pure per-domain selectors derive renderer, transcript and test projections.
