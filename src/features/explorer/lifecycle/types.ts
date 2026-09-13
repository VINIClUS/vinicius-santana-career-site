export type Command = { type: string; [key: string]: unknown };
export interface DomainEvent { type: string; description: string }
export type Projection = Record<string, unknown>;
export interface DomainAdapter {
  initialize(): unknown;
  dispatch(state: unknown, command: Command): { state: unknown; events: DomainEvent[]; rejection?: unknown };
  project(state: unknown): Projection;
  samples?(state: unknown): { title: string; columns: string[]; rows: string[][]; provenance: string };
}
export interface Beat {
  id: string; label: string; primaryActors: string[]; routeKind: string | null; layout: string;
}
export interface Plan {
  checkpointId: string; scenarioId: string; chapterId: string; headline: string;
  motion: string; outcomeFields: string[];
  defaultPhaseMs: { orient: number; focus: number; action: number; settle: number };
  microbeats: Beat[];
}
export interface Checkpoint {
  id: string; title: string; caption: string; command: Command; evidenceStatus: string; plan: Plan;
}
export interface Actor { id: string; label: string; assetId: string; profiles: string[] }
export interface Chapter { id: string; number: number; title: string; summary: string; checkpointIds: string[] }
export interface Scenario {
  id: string; project: string; title: string; subtitle: string; assumptions: string[];
  evidenceStatus: string; profile: string; chapters: Chapter[]; checkpoints: Checkpoint[]; actors: Actor[];
  variations?: { id: string; label: string; commands: Command[] }[];
}
export function execute(adapter: DomainAdapter, state: unknown, command: Command): { state: unknown; events: DomainEvent[]; rejection?: unknown } {
  if (command.type !== 'SEQUENCE') return adapter.dispatch(state, command);
  const events: DomainEvent[] = [];
  for (const part of command.commands as Command[]) {
    const result = execute(adapter, state, part); state = result.state; events.push(...result.events);
    if (result.rejection) return { state, events, rejection: result.rejection };
  }
  return { state, events };
}
export function reconstruct(adapter: DomainAdapter, scenario: Scenario, index: number) {
  let state = adapter.initialize();
  for (const checkpoint of scenario.checkpoints.slice(0, index + 1)) state = execute(adapter, state, checkpoint.command).state;
  return state;
}
