/** Stateless replicas consume a finite virtual pool; physical hosts never scale. */
export interface ScalingIdentity {
  requestId?: string;
  generation?: number;
  workerGenerations: Record<string, number>;
  replicaGenerations?: Record<string, number>;
}
interface ScalingReplicaIdentity extends ScalingIdentity {
  replicaGenerations: Record<string, number>;
}
type ScalingUnfencedCommand =
  | { type: 'INIT' | 'EVALUATE_SCALE_POLICY' }
  | { type: 'SET_LOAD'; value: number }
  | { type: 'ADVANCE_CLOCK'; ticks: number }
  | { type: 'RESERVE_WORKERS'; ids: string[]; requestId: string };
type ScalingWorkerOperation =
  | { type: 'START_REPLICAS'; ids: string[]; workerIds: string[] }
  | { type: 'PROVISION_WORKERS' | 'WORKERS_BOOTED' | 'WORKERS_READY' | 'RELEASE_WORKERS' | 'PROVISION_TIMEOUT'; ids: string[] };
type ScalingReplicaOperation =
  | { type: 'DRAIN_REPLICAS'; ids: string[]; inFlight?: number }
  | { type: 'REPLICAS_HEALTHY' | 'DRAIN_COMPLETE' | 'STOP_REPLICAS'; ids: string[] };
export type ScalingCommand = ScalingUnfencedCommand | (ScalingWorkerOperation & ScalingIdentity) | (ScalingReplicaOperation & ScalingReplicaIdentity);
export type ScalingCommandInput = ScalingUnfencedCommand | ((ScalingWorkerOperation | ScalingReplicaOperation) & Partial<ScalingReplicaIdentity>);
type WorkerStatus = 'absent' | 'reserved' | 'provisioning' | 'booting' | 'ready';
type ReplicaStatus = 'absent' | 'starting' | 'ready' | 'draining' | 'stopped';
export interface ScalingState {
  workers: Record<string, WorkerStatus>; replicas: Record<string, ReplicaStatus>;
  replicaWorkers: Record<string, string>; requests: Record<string, string>; deadlines: Record<string, number>; replicaInFlight: Record<string, number>;
  workerRequests: Record<string, string>; workerGenerations: Record<string, number>; replicaGenerations: Record<string, number>;
  desiredReplicas: number; load: number; inFlight: number; logicalTick: number; loadSince: number; cooldownUntil: number;
}
export function createScalingState(): ScalingState {
  return { workers: { 'worker-01': 'ready', 'worker-02': 'absent', 'worker-03': 'absent' }, replicas: { 'replica-01': 'ready', 'replica-02': 'absent', 'replica-03': 'absent' }, replicaWorkers: { 'replica-01': 'worker-01' }, requests: {}, deadlines: {}, replicaInFlight: {}, workerRequests: { 'worker-01': 'initial' }, workerGenerations: { 'worker-01': 1 }, replicaGenerations: { 'replica-01': 1 }, desiredReplicas: 1, load: 0.2, inFlight: 0, logicalTick: 0, loadSince: 0, cooldownUntil: 0 };
}
export function projectScaling(s: ScalingState) {
  const statuses = Object.values(s.workers);
  return { physicalHosts: 3, totalSlots: 4, usedSlots: statuses.filter(v => v !== 'absent' && v !== 'reserved').length, reservedSlots: statuses.filter(v => v === 'reserved').length, workers: { ...s.workers }, replicas: { ...s.replicas }, desiredReplicas: s.desiredReplicas, readyReplicas: Object.values(s.replicas).filter(v => v === 'ready').length, load: s.load, inFlight: s.inFlight, logicalTick: s.logicalTick, cooldownUntil: s.cooldownUntil, blockedReasons: [] as string[] };
}
/** Capture at scheduling time, never when an asynchronous callback finally arrives. */
export function normalizeScalingCommand(s: ScalingState, command: ScalingCommandInput): ScalingCommand {
  if (!('ids' in command) || command.type === 'RESERVE_WORKERS') return structuredClone(command) as ScalingCommand;
  const replicaIds = command.type === 'START_REPLICAS' ? [] : command.ids.filter(id => id.startsWith('replica-'));
  const workerIds = command.type === 'START_REPLICAS' ? command.workerIds : command.ids.map(id => id.startsWith('replica-') ? s.replicaWorkers[id] : id);
  return {
    ...structuredClone(command),
    workerGenerations: structuredClone(command.workerGenerations ?? Object.fromEntries(workerIds.map(id => [id, s.workerGenerations[id] ?? 0]))),
    ...(replicaIds.length ? { replicaGenerations: structuredClone(command.replicaGenerations ?? Object.fromEntries(replicaIds.map(id => [id, s.replicaGenerations[id] ?? 0]))) } : {}),
  } as ScalingCommand;
}
export function reduceScaling(previous: ScalingState, command: ScalingCommand): { state: ScalingState; events: { type: string; description: string }[]; rejection?: string } {
  const s = structuredClone(previous);
  const reject = (rejection: string) => ({ state: previous, events: [{ type: 'REJECTED', description: rejection }], rejection });
  if ('ids' in command && (!command.ids.length || new Set(command.ids).size !== command.ids.length || command.ids.some(id => !/^(worker|replica)-[A-Za-z0-9]+$/.test(id)))) return reject('INVALID_IDENTITIES');
  if ('ids' in command && command.type !== 'RESERVE_WORKERS') {
    const replicaIds = command.type === 'START_REPLICAS' ? [] : command.ids.filter(id => id.startsWith('replica-'));
    const workerIds = command.type === 'START_REPLICAS' ? command.workerIds : command.ids.map(id => id.startsWith('replica-') ? s.replicaWorkers[id] : id);
    if (!command.workerGenerations || (replicaIds.length > 0 && !command.replicaGenerations)) return reject('STALE_OPERATION');
    if (workerIds.some(id => (command.requestId !== undefined && command.requestId !== s.workerRequests[id]) || command.workerGenerations[id] !== s.workerGenerations[id]) || replicaIds.some(id => command.replicaGenerations![id] !== s.replicaGenerations[id])) return reject('STALE_OPERATION');
    if (command.generation !== undefined && (replicaIds.length ? replicaIds.some(id => command.generation !== s.replicaGenerations[id]) : workerIds.some(id => command.generation !== s.workerGenerations[id]))) return reject('STALE_OPERATION');
  }
  const release = (id: string) => { s.workers[id] = 'absent'; delete s.deadlines[id]; };
  switch (command.type) {
    case 'INIT': return { state: previous, events: [] };
    case 'SET_LOAD':
      if (!Number.isFinite(command.value) || command.value < 0 || command.value > 1) return reject('INVALID_LOAD');
      if (command.value !== s.load) s.loadSince = s.logicalTick;
      s.load = command.value; break;
    case 'ADVANCE_CLOCK':
      if (!Number.isSafeInteger(command.ticks) || command.ticks < 0) return reject('INVALID_TICKS');
      s.logicalTick += command.ticks;
      for (const [id, deadline] of Object.entries(s.deadlines)) if (deadline <= s.logicalTick && ['reserved', 'provisioning', 'booting'].includes(s.workers[id])) release(id);
      break;
    case 'EVALUATE_SCALE_POLICY': {
      if (s.logicalTick - s.loadSince < 2 || s.logicalTick < s.cooldownUntil) break;
      const desired = s.load >= 0.8 ? 3 : s.load <= 0.3 ? 1 : s.desiredReplicas;
      if (desired !== s.desiredReplicas) { s.desiredReplicas = desired; s.cooldownUntil = s.logicalTick + 4; }
      break;
    }
    case 'RESERVE_WORKERS': {
      const payload = JSON.stringify([...command.ids].sort());
      if (Object.hasOwn(s.requests, command.requestId)) return s.requests[command.requestId] === payload ? { state: previous, events: [] } : reject('REQUEST_CONFLICT');
      if (!command.requestId || command.ids.some(id => s.workers[id] && s.workers[id] !== 'absent')) return reject('WORKER_EXISTS');
      const p = projectScaling(s);
      if (p.usedSlots + p.reservedSlots + command.ids.length > p.totalSlots) return reject('NO_CAPACITY');
      s.requests[command.requestId] = payload;
      for (const id of command.ids) { s.workers[id] = 'reserved'; s.deadlines[id] = s.logicalTick + 10; s.workerRequests[id] = command.requestId; s.workerGenerations[id] = (s.workerGenerations[id] ?? 0) + 1; }
      break;
    }
    case 'PROVISION_WORKERS':
    case 'WORKERS_BOOTED':
    case 'WORKERS_READY': {
      const [from, to]: [WorkerStatus, WorkerStatus] = command.type === 'PROVISION_WORKERS' ? ['reserved', 'provisioning'] : command.type === 'WORKERS_BOOTED' ? ['provisioning', 'booting'] : ['booting', 'ready'];
      if (command.ids.some(id => s.workers[id] !== from)) return reject('INVALID_WORKER_TRANSITION');
      for (const id of command.ids) { s.workers[id] = to; if (to === 'ready') delete s.deadlines[id]; }
      break;
    }
    case 'START_REPLICAS':
      if (command.ids.length !== command.workerIds.length || new Set(command.workerIds).size !== command.workerIds.length || command.ids.some(id => s.replicas[id] && !['absent', 'stopped'].includes(s.replicas[id])) || command.workerIds.some(id => s.workers[id] !== 'ready' || Object.entries(s.replicaWorkers).some(([replica, worker]) => worker === id && !['stopped', 'absent'].includes(s.replicas[replica])))) return reject('NO_READY_CAPACITY');
      if (Object.values(s.replicas).filter(v => !['absent', 'stopped'].includes(v)).length + command.ids.length > s.desiredReplicas) return reject('DESIRED_EXCEEDED');
      command.ids.forEach((id, index) => { s.replicas[id] = 'starting'; s.replicaWorkers[id] = command.workerIds[index]; s.replicaGenerations[id] = (s.replicaGenerations[id] ?? 0) + 1; }); break;
    case 'REPLICAS_HEALTHY':
      if (command.ids.some(id => s.replicas[id] !== 'starting' || s.workers[s.replicaWorkers[id]] !== 'ready')) return reject('STALE_REPLICA_HEALTH');
      command.ids.forEach(id => { s.replicas[id] = 'ready'; }); break;
    case 'DRAIN_REPLICAS':
      if (command.ids.some(id => s.replicas[id] !== 'ready') || !Number.isSafeInteger(command.inFlight ?? 0) || (command.inFlight ?? 0) < 0) return reject('INVALID_DRAIN');
      command.ids.forEach((id, index) => {
        s.replicas[id] = 'draining';
        s.replicaInFlight[id] = Math.floor((command.inFlight ?? 0) / command.ids.length) + (index < (command.inFlight ?? 0) % command.ids.length ? 1 : 0);
      }); s.inFlight += command.inFlight ?? 0; break;
    case 'DRAIN_COMPLETE':
      if (command.ids.some(id => s.replicas[id] !== 'draining')) return reject('NOT_DRAINING');
      command.ids.forEach(id => { s.replicaInFlight[id] = 0; });
      s.inFlight = Object.values(s.replicaInFlight).reduce((sum, count) => sum + count, 0); break;
    case 'STOP_REPLICAS':
      if (command.ids.some(id => s.replicas[id] !== 'draining' || (s.replicaInFlight[id] ?? 0) > 0)) return reject('DRAIN_REQUIRED');
      command.ids.forEach(id => { s.replicas[id] = 'stopped'; }); break;
    case 'RELEASE_WORKERS':
      if (command.ids.some(id => !s.workers[id] || s.workers[id] === 'absent' || Object.entries(s.replicaWorkers).some(([replica, worker]) => worker === id && !['absent', 'stopped'].includes(s.replicas[replica])))) return reject('ACTIVE_REPLICA');
      command.ids.forEach(release); break;
    case 'PROVISION_TIMEOUT':
      if (command.ids.some(id => !['reserved', 'provisioning', 'booting'].includes(s.workers[id]))) return reject('NO_PENDING_PROVISION');
      command.ids.forEach(release); break;
    default: return reject('UNKNOWN_COMMAND');
  }
  return { state: s, events: [{ type: command.type, description: `${command.type}: ${projectScaling(s).readyReplicas}/${s.desiredReplicas} réplicas prontas; 3 hosts físicos` }] };
}
