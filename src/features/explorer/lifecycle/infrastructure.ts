/** Synthetic singleton recovery. External control/storage are explicit assumptions. */
export type InfrastructureCommand =
  | { type: 'INIT' | 'RECONCILE' }
  | { type: 'FAIL_NODE' | 'CONFIRM_FENCE' | 'RESTORE_NODE'; nodeId: string }
  | { type: 'NODE_READY'; nodeId: string; operationId: number }
  | { type: 'WORKLOAD_HEALTHY'; generation: number; operationId?: number }
  | { type: 'SET_STORAGE'; ready: boolean }
  | { type: 'SET_CONTROLLER'; available: boolean }
  | { type: 'SET_DESIRED'; value: 'running' | 'stopped' }
  | { type: 'ADVANCE_CLOCK'; ticks: number };
export interface InfrastructureState {
  profile: 'external-control' | 'three-voters';
  nodes: Record<string, 'offline' | 'booting' | 'ready'>;
  desired: 'running' | 'stopped'; workloadStatus: 'running' | 'interrupted' | 'pending' | 'starting' | 'stopped';
  nodeId: string | null; instanceGeneration: number; unsafeOwner: string | null;
  storageReady: boolean; externalController: boolean; logicalTick: number;
  operationId: number; nodeOperations: Record<string, number>; fenced: string[];
  reconcileAt: number | null; healthyAt: number | null;
}
export function createInfrastructureState(scenarioId: string): InfrastructureState {
  return { profile: scenarioId.includes('quorum') ? 'three-voters' : 'external-control', nodes: { 'node-01': 'ready', 'node-02': 'ready', 'node-03': 'ready' }, desired: 'running', workloadStatus: 'running', nodeId: 'node-02', instanceGeneration: 1, unsafeOwner: null, storageReady: true, externalController: true, logicalTick: 0, operationId: 1, nodeOperations: {}, fenced: [], reconcileAt: null, healthyAt: null };
}
export function projectInfrastructure(s: InfrastructureState) {
  const ready = Object.values(s.nodes).filter(n => n === 'ready').length;
  const quorum = s.profile === 'external-control' || ready >= 2;
  const controllerAvailable = s.profile === 'three-voters' ? quorum : s.externalController;
  const blockedReasons: string[] = [];
  if (s.desired === 'running') {
    if (!quorum) blockedReasons.push('NO_QUORUM');
    if (!controllerAvailable && s.profile === 'external-control') blockedReasons.push('CONTROLLER_UNAVAILABLE');
    if (!s.storageReady) blockedReasons.push('STORAGE_UNAVAILABLE');
    if (s.unsafeOwner) blockedReasons.push('FENCING_REQUIRED');
    // Capacity is assessed after exclusion; boot capacity is still unavailable.
    if (!s.unsafeOwner && ready === 0) blockedReasons.push(s.profile === 'external-control' && Object.values(s.nodes).includes('booting') ? 'NO_READY_NODE' : 'NO_CAPACITY');
  }
  return { profile: s.profile, nodes: { ...s.nodes }, desired: s.desired, workloadStatus: s.workloadStatus, nodeId: s.nodeId, instanceGeneration: s.instanceGeneration, unsafeOwner: s.unsafeOwner, storageReady: s.storageReady, quorum, controllerAvailable, blockedReasons, clientAvailable: s.workloadStatus === 'running' && s.nodeId !== null && s.nodes[s.nodeId] === 'ready' && blockedReasons.length === 0, logicalTick: s.logicalTick };
}
export function reduceInfrastructure(previous: InfrastructureState, command: InfrastructureCommand): { state: InfrastructureState; events: { type: string; description: string }[]; rejection?: string } {
  const s = structuredClone(previous);
  const reject = (rejection: string) => ({ state: previous, events: [{ type: 'REJECTED', description: rejection }], rejection });
  const interrupt = () => { if (s.nodeId) { s.unsafeOwner = s.nodeId; s.nodeId = null; s.workloadStatus = 'interrupted'; s.operationId++; s.healthyAt = null; } };
  const reconcile = () => {
    s.reconcileAt = null;
    if (s.desired !== 'running' || s.nodeId || projectInfrastructure(s).blockedReasons.length) return;
    s.nodeId = Object.keys(s.nodes).sort().find(id => s.nodes[id] === 'ready') ?? null;
    if (s.nodeId) { s.instanceGeneration++; s.operationId++; s.workloadStatus = 'starting'; s.healthyAt = s.logicalTick + 1; }
  };
  switch (command.type) {
    case 'INIT': return { state: previous, events: [] };
    case 'FAIL_NODE':
      if (!(command.nodeId in s.nodes)) return reject('UNKNOWN_NODE');
      if (s.nodes[command.nodeId] === 'offline') return { state: previous, events: [] };
      s.nodes[command.nodeId] = 'offline'; s.nodeOperations[command.nodeId] = (s.nodeOperations[command.nodeId] ?? 0) + 1;
      if (s.nodeId === command.nodeId) interrupt();
      break;
    case 'CONFIRM_FENCE':
      if (!(command.nodeId in s.nodes)) return reject('UNKNOWN_NODE');
      if (!s.fenced.includes(command.nodeId)) s.fenced.push(command.nodeId);
      if (s.unsafeOwner === command.nodeId) { s.unsafeOwner = null; s.workloadStatus = s.desired === 'running' ? 'pending' : 'stopped'; }
      break;
    case 'RESTORE_NODE':
      if (s.nodes[command.nodeId] !== 'offline') return reject('NODE_NOT_OFFLINE');
      s.nodes[command.nodeId] = 'booting'; s.nodeOperations[command.nodeId] = (s.nodeOperations[command.nodeId] ?? 0) + 1;
      break;
    case 'NODE_READY':
      if (s.nodes[command.nodeId] !== 'booting' || command.operationId !== s.nodeOperations[command.nodeId]) return reject('STALE_NODE_READY');
      s.nodes[command.nodeId] = 'ready'; s.reconcileAt = s.logicalTick + 1;
      break;
    case 'RECONCILE': reconcile(); break;
    case 'WORKLOAD_HEALTHY':
      if (s.workloadStatus !== 'starting' || command.generation !== s.instanceGeneration || (command.operationId !== undefined && command.operationId !== s.operationId) || projectInfrastructure(s).blockedReasons.length || !s.nodeId || s.nodes[s.nodeId] !== 'ready') return reject('STALE_OR_UNSAFE_HEALTH');
      s.workloadStatus = 'running'; s.healthyAt = null; break;
    case 'SET_STORAGE': s.storageReady = command.ready; if (!command.ready) interrupt(); else s.reconcileAt = s.logicalTick + 1; break;
    case 'SET_CONTROLLER': s.externalController = command.available; if (!command.available) interrupt(); else s.reconcileAt = s.logicalTick + 1; break;
    case 'SET_DESIRED':
      if (s.desired === command.value) return { state: previous, events: [] };
      s.desired = command.value;
      if (command.value === 'stopped') { s.nodeId = null; s.workloadStatus = 'stopped'; s.healthyAt = null; s.reconcileAt = null; s.operationId++; }
      else { s.workloadStatus = s.unsafeOwner ? 'interrupted' : 'pending'; s.reconcileAt = s.logicalTick + 1; }
      break;
    case 'ADVANCE_CLOCK':
      if (!Number.isSafeInteger(command.ticks) || command.ticks < 0 || command.ticks > 10000) return reject('INVALID_TICKS');
      for (let i = 0; i < command.ticks; i++) { s.logicalTick++; if (s.reconcileAt !== null && s.reconcileAt <= s.logicalTick) reconcile(); if (s.healthyAt !== null && s.healthyAt <= s.logicalTick && !projectInfrastructure(s).blockedReasons.length && s.nodeId && s.nodes[s.nodeId] === 'ready') { s.workloadStatus = 'running'; s.healthyAt = null; } }
      break;
    default: return reject('UNKNOWN_COMMAND');
  }
  if (s.nodeId && projectInfrastructure(s).blockedReasons.length) interrupt();
  return { state: s, events: [{ type: command.type, description: `${command.type}: ${s.workloadStatus}${s.nodeId ? ` em ${s.nodeId} (g${s.instanceGeneration})` : ''}` }] };
}
