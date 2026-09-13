import type { Command, DomainEvent, Plan, Projection, Scenario } from './types.ts';
export function getPresentationPlan(scenario: Scenario, checkpointId: string): Plan {
  const checkpoint = scenario.checkpoints.find(cp => cp.id === checkpointId);
  if (!checkpoint) throw new Error(`Unknown checkpoint ${checkpointId}`);
  return checkpoint.plan;
}
const value = (state: Projection, key: string) => {
  const item = state[key];
  return Array.isArray(item) ? item.join(', ') || 'none' : item === null || item === undefined ? 'none' : String(item).replaceAll('_', ' ');
};
export function describeOutcome(project: string, state: Projection): string {
  if (project === 'limnopulse') return `Incident: ${value(state,'incident')}. Email: ${value(state,'email')}; Telegram: ${value(state,'telegram')}. User: ${value(state,'userView')}.`;
  if (project === 'cnesdata') return `CURRENT: ${value(state,'currentVersion')}. Candidate: ${value(state,'candidateVersion')}. User reads: ${value(state,'servedVersion')}. Run: ${value(state,'run')}.`;
  if ('desiredReplicas' in state) return `Target: ${value(state,'desiredReplicas')} replicas. Ready: ${value(state,'readyReplicas')}. Capacity: ${value(state,'usedSlots')} used, ${value(state,'reservedSlots')} reserved across ${value(state,'physicalHosts')} physical hosts.`;
  return `Workload: ${value(state,'workloadStatus')} on ${value(state,'nodeId')}. Generation ${value(state,'instanceGeneration')}. ${state.clientAvailable ? 'Client can access the service.' : `Waiting: ${value(state,'blockedReasons')}.`}`;
}
export function planEvent(project: string, event: DomainEvent, previous: Projection, current: Projection, scenario?: Scenario, command?: Command): Plan {
  const matching = scenario?.checkpoints.find(cp => cp.command.type === (command?.type ?? event.type)
    && Object.entries(command ?? {}).every(([key, expected]) => key === 'type' || expected === undefined || JSON.stringify(cp.command[key]) === JSON.stringify(expected)));
  if (matching) return JSON.stringify(previous)===JSON.stringify(current)
    ? { ...matching.plan,headline:event.description,motion:'hold',microbeats:[{...matching.plan.microbeats[0]!,label:event.description,routeKind:null}] }
    : { ...matching.plan, headline: event.description };
  const primaryActors = project === 'limnopulse' ? ['limno.delivery-record','limno.user']
    : project === 'cnesdata' ? ['cnes.pointer','cnes.api'] : ['infra.controller','infra.workload'];
  return { checkpointId:'manual',scenarioId:'manual',chapterId:'manual',headline:event.description,
    motion: JSON.stringify(previous) === JSON.stringify(current) ? 'hold' : 'confirm',outcomeFields:[],
    defaultPhaseMs:{orient:400,focus:250,action:850,settle:1100},
    microbeats:[{id:`manual:${event.type}`,label:event.description,primaryActors,routeKind:null,layout:'pair'}] };
}
/** Stable slots within each chapter; actors that share a shot must never overlap. */
export function actorSlots(scenario: Scenario, chapterId: string): Record<string, number> {
  const beats = scenario.checkpoints.filter(cp => cp.plan.chapterId === chapterId).flatMap(cp => cp.plan.microbeats);
  const neighbors = new Map<string, Set<string>>();
  for (const beat of beats) for (const actor of beat.primaryActors) {
    if (!neighbors.has(actor)) neighbors.set(actor, new Set());
    for (const other of beat.primaryActors) if (actor !== other) neighbors.get(actor)!.add(other);
  }
  const ids = [...neighbors.keys()].sort((a,b) => neighbors.get(b)!.size - neighbors.get(a)!.size);
  const slots: Record<string,number> = {};
  for (const id of ids) {
    const used = new Set([...neighbors.get(id)!].map(other => slots[other]));
    let slot = 0; while (used.has(slot)) slot++;
    slots[id] = slot;
  }
  return slots;
}
