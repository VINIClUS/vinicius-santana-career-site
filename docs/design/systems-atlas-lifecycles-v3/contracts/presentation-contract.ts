/** V3 design types only. Adapt to existing code; these are not implemented APIs.
 * Behavior is owned by project reducers. Never use fixture.expected as input.
 */
import type { DomainEvent, PresentationFrame } from './simulation-contract.ts';

export type VisualRouteKind =
  | 'data' | 'control' | 'query' | 'persist' | 'transaction'
  | 'restart' | 'traffic' | 'receipt' | 'illustration'
  | 'user-action' | 'transform' | 'replay' | 'publish';
export type VisualPhase = 'orient' | 'focus' | 'action' | 'settle';
export interface VisualBeat {
  readonly id: string;
  readonly label: string;
  /** Runtime validation: one to three IDs, all present in actor-bindings. */
  readonly primaryActors: readonly string[];
  readonly routeKind: VisualRouteKind | null;
  readonly layout: 'single' | 'pair' | 'triad';
  readonly claim: string;
}
export interface CheckpointPresentation {
  readonly checkpointId: string;
  readonly scenarioId: string;
  readonly chapterId: string;
  readonly stateRef: string;
  readonly previousCheckpointId: string | null;
  readonly headline: string;
  readonly motion: string;
  readonly outcomeFields: readonly string[];
  readonly defaultPhaseMs: Readonly<Record<VisualPhase, number>>;
  readonly microbeats: readonly VisualBeat[];
  readonly advancePolicy: string;
}
export interface Chapter {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly summary: string;
  readonly checkpointIds: readonly string[];
}
export interface ServiceActor {
  readonly id: string;
  readonly label: string;
  readonly assetId: string;
  readonly legacyGroup: string;
  readonly componentRef: string | null;
}
export interface VisualFrame<S> {
  readonly frame: PresentationFrame<S>;
  readonly chapterId: string;
  readonly beatId: string;
  readonly phase: VisualPhase;
  readonly headline: string;
  readonly primaryActors: readonly string[];
  readonly outcome: string;
}
/** A per-project adapter supports both the guided tour and off-script events. */
export interface ProjectPresentationAdapter<S> {
  planEvent(event: DomainEvent, previous: S, current: S): readonly VisualBeat[];
  describeOutcome(state: S): string;
}
/** Proposed lookup signature: data-only, no DOM, network or vendor graphics imports. */
export type GetPresentationPlan = (
  scenarioId: string, checkpointId: string
) => CheckpointPresentation;
