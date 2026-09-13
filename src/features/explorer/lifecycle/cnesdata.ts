/** Synthetic, local model of the documented raw contract and planned publication cycle.
 * No IO, identity provider, Parquet encoder or analytical engine runs here.
 */
type Source = 'CNES_LOCAL' | 'CNES_NATIONAL';
type Job = 'none' | 'PENDING' | 'LEASED' | 'SUCCEEDED' | 'FAILED_FINAL';
type Run = 'PLANNED' | 'WAITING_INPUTS' | 'PROCESSING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELED';
export type CnesdataCommand =
  | { type: 'INIT' | 'EXTRACT_LOCAL' | 'START_RUN' | 'NORMALIZE_SOURCES' | 'RECONCILE_COMPETENCIA' | 'MATERIALIZE_SERVING' | 'VERIFY_ARTIFACTS' | 'SHOW_SERVING' | 'REVOKE_AGENT' | 'REVOKE_MEMBERSHIP' }
  | { type: 'REQUEST_EXTRACTION'; tenantId?: string; source?: Source; competencia: string; snapshotMode?: 'FULL' | 'DELTA' }
  | { type: 'CLAIM_JOB'; agentId: string }
  | { type: 'PACKAGE_PARQUET'; compression: string; externalGzip: boolean }
  | { type: 'PUT_RAW_OBJECT'; snapshotId: string; fence: number; contentVariant?: string; agentId?: string }
  | { type: 'REPLAY_RAW_OBJECT'; snapshotId: string; fence?: number; agentId?: string }
  | { type: 'ACCEPT_RAW_MANIFEST'; source: Source; fence?: number; agentId?: string }
  | { type: 'EXTRACT_NATIONAL_PF' | 'NATIONAL_SOURCE_NOT_PUBLISHED'; competencia: string }
  | { type: 'ACCEPT_NATIONAL_RAW'; snapshotId: string }
  | { type: 'CREATE_DATASET_VERSION'; versionId: string }
  | { type: 'PUBLISH_CURRENT'; expectedVersion: string; fence: number }
  | { type: 'ROLLBACK_CURRENT'; versionId: string; expectedVersion: string; fence: number }
  | { type: 'AUTHORIZE_AND_READ'; tenantId: string }
  | { type: 'FAIL_PROCESSING'; unit: string }
  | { type: 'ADVANCE_CLOCK'; ticks: number }
  | { type: 'REGISTER_DELTA_MANIFEST'; baseSnapshotId: string; sequence: number; previousManifestHash: string; schemaVersion?: number };
interface RawRow { establishment: string; professional: string; hours: string }
interface NormalizedRow { establishment: string; professional: string; hours: number; source: Source; competencia: string; runId: string; snapshotId: string }
interface ComparedRow { establishment: string; professional: string; localHours: number; nationalHours: number; different: boolean; lineage: NormalizedRow[] }
interface Serving { run_id: string; competencia: string; comparedRows: number; differentRows: number; sameRows: number; rows: ComparedRow[] }
interface RawObject { key: string; bytes: string; hash: string; source: Source; snapshotId: string }
interface Manifest { key: string; snapshotId: string; source: Source; dataKey: string; hash: string; dataHash: string; schemaVersion: number; sequence: number; acceptedTick: number }
interface Artifact { runId: string; schemaVersion: number; bytes: string; hash: string; readable: boolean }
interface Version { id: string; tenantId: string; runId: string; serving: Serving; verified: boolean }
export interface CnesdataState {
  profile: string; job: Job; fence: number; identityVerified: boolean;
  tenantId: string; competencia: string; owner: string | null; leaseUntil: number;
  trustedAgents: Record<string, { tenantId: string; revoked: boolean }>; membershipActive: boolean;
  local: RawRow[]; national: RawRow[]; packaged: boolean; snapshotMode: 'FULL' | 'DELTA'; latestLocalSnapshot: string | null;
  raw: Record<string, RawObject>; manifests: Record<string, Manifest>; canonicalHead: Manifest | null;
  normalizedRows: NormalizedRow[]; reconciliation: ComparedRow[] | null; serving: Serving | null;
  artifacts: Record<string, Artifact>; artifactsVerified: boolean; run: Run; runId: string;
  candidateVersion: string | null; currentVersion: string; servedVersion: string | null;
  versions: Record<string, Version>; response: Serving | null; userView: string; logicalTick: number;
  resyncReason: string | null; replacementFullJobCreated: boolean; nationalUnavailable: boolean;
  deltaReceipt: { fence: number; bytes: string } | null;
}
export interface CnesdataResult { state: CnesdataState; events: { type: string; description: string }[]; rejection?: string }

// Input-only copy of design/sample-data.json. Its expected section is deliberately absent.
const localSample: RawRow[] = [
  { establishment: ' EST-A ', professional: 'PROF-A', hours: '040 ' },
  { establishment: 'EST-B', professional: 'PROF-B', hours: '020' },
  { establishment: 'EST-C', professional: 'PROF-C', hours: '030' },
];
const nationalSample: RawRow[] = [
  { establishment: 'EST-A', professional: 'PROF-A', hours: '20' },
  { establishment: 'EST-B', professional: 'PROF-B', hours: '20' },
  { establishment: 'EST-C', professional: 'PROF-C', hours: '30' },
];
// Deterministic checksum for synthetic strings; never represented as a production hash.
function hash(bytes: string) {
  let value = 2166136261;
  for (const char of bytes) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return `synthetic-fnv-${(value >>> 0).toString(16)}`;
}
export function createCnesdataState(profile = 'aws-target'): CnesdataState {
  const previous: Serving = { run_id: 'run-demo-00', competencia: '2026-06', comparedRows: 0, differentRows: 0, sameRows: 0, rows: [] };
  return {
    profile, job: 'none', fence: 0, identityVerified: false, tenantId: 'tenant-demo-A', competencia: '2026-07', owner: null, leaseUntil: 0,
    trustedAgents: { 'agent-demo-01': { tenantId: 'tenant-demo-A', revoked: false } }, membershipActive: true,
    local: [], national: [], packaged: false, snapshotMode: 'FULL', latestLocalSnapshot: null,
    raw: {}, manifests: {}, canonicalHead: null, normalizedRows: [], reconciliation: null, serving: null,
    artifacts: {}, artifactsVerified: false, run: 'PLANNED', runId: 'run-demo-01', candidateVersion: null,
    currentVersion: 'v-demo-00', servedVersion: null,
    versions: { 'v-demo-00': { id: 'v-demo-00', tenantId: 'tenant-demo-A', runId: previous.run_id, serving: previous, verified: true } },
    response: null, userView: 'previous_version', logicalTick: 0, resyncReason: null, replacementFullJobCreated: false, nationalUnavailable: false, deltaReceipt: null,
  };
}
export function projectCnesdata(s: CnesdataState): Record<string, unknown> {
  return {
    profile: s.profile, job: s.job, fence: s.fence, identityVerified: s.identityVerified,
    localRows: s.local.length, nationalRows: s.national.length, rawObjects: Object.keys(s.raw).length,
    localAccepted: Object.values(s.manifests).some(m => m.source === 'CNES_LOCAL'),
    nationalAccepted: Object.values(s.manifests).some(m => m.source === 'CNES_NATIONAL'),
    normalized: new Set(s.normalizedRows.map(row => row.source)).size, reconciled: s.reconciliation !== null,
    servingReady: s.serving !== null, artifactsVerified: s.artifactsVerified, run: s.run, runId: s.runId,
    candidateVersion: s.candidateVersion, currentVersion: s.currentVersion, servedVersion: s.servedVersion,
    userView: s.userView, logicalTick: s.logicalTick, replacementFullJobCreated: s.replacementFullJobCreated,
    resyncReason: s.resyncReason, competencia: s.competencia,
    comparedRows: s.serving?.comparedRows ?? 0, differentRows: s.serving?.differentRows ?? 0, sameRows: s.serving?.sameRows ?? 0,
  };
}
/** All rows are synthetic; the visual stage shows only work actually performed so far. */
export function projectCnesdataSamples(s: CnesdataState) {
  return structuredClone({
    local: s.local, national: s.national, normalized: s.normalizedRows,
    comparison: s.reconciliation ?? [], serving: s.serving,
  });
}
/** Scenario adapter only: reducers accept real fences/hashes, never fixture placeholders. */
export function normalizeCnesdataCommand(state: CnesdataState, command: { type: string; [key: string]: unknown }): CnesdataCommand {
  const normalized = { ...command };
  if (normalized.fence === 'current') normalized.fence = state.fence;
  if (normalized.previousManifestHash === 'canonical-head-from-state') normalized.previousManifestHash = state.canonicalHead?.hash ?? '';
  return normalized as CnesdataCommand;
}
function authorizedWorker(s: CnesdataState, fence: number, agentId = s.owner) {
  const agent = agentId ? s.trustedAgents[agentId] : undefined;
  return s.identityVerified && agentId === s.owner && agent && !agent.revoked && agent.tenantId === s.tenantId && fence === s.fence && s.logicalTick < s.leaseUntil;
}
function rawKey(s: CnesdataState, source: Source, snapshotId: string, file = 'data.parquet') {
  return `raw/${s.tenantId}/${source}/${s.competencia}/${snapshotId}/${file}`;
}
function validRaw(object: RawObject | undefined) {
  return object !== undefined && hash(object.bytes) === object.hash;
}
function storeRaw(s: CnesdataState, source: Source, snapshotId: string, bytes: string, file = 'data.parquet') {
  const key = rawKey(s, source, snapshotId, file);
  const prior = s.raw[key];
  if (prior) return prior.bytes === bytes ? 'replayed' : 'conflict';
  s.raw[key] = { key, bytes, hash: hash(bytes), source, snapshotId };
  return 'stored';
}
function acceptManifest(s: CnesdataState, source: Source, snapshotId: string, sequence = 1) {
  const key = rawKey(s, source, snapshotId, 'manifest.json');
  const prior = s.manifests[key];
  if (prior) return false;
  const dataKey = rawKey(s, source, snapshotId);
  const data = s.raw[dataKey];
  if (!data) return false;
  const bytes = JSON.stringify({ source, snapshotId, dataKey, dataHash: data.hash, competencia: s.competencia, schemaVersion: 1, sequence });
  storeRaw(s, source, snapshotId, bytes, 'manifest.json');
  const manifest: Manifest = { key, source, snapshotId, dataKey, dataHash: data.hash, hash: hash(bytes), schemaVersion: 1, sequence, acceptedTick: s.logicalTick };
  s.manifests[key] = manifest;
  if (source === 'CNES_LOCAL') s.canonicalHead = manifest;
  return true;
}
function artifact(s: CnesdataState, name: string, data: unknown) {
  const bytes = JSON.stringify(data);
  s.artifacts[name] = { runId: s.runId, schemaVersion: 1, bytes, hash: hash(bytes), readable: true };
}
export function reduceCnesdata(previous: CnesdataState, command: CnesdataCommand): CnesdataResult {
  const s = structuredClone(previous);
  const reject = (rejection: string): CnesdataResult => ({ state: previous, events: [], rejection });
  const done = (description: string): CnesdataResult => ({ state: s, events: [{ type: command.type, description }] });
  const noop = (): CnesdataResult => ({ state: previous, events: [] });
  const wire = command as unknown as Record<string, unknown>;
  if (wire.fence === 'current' || wire.previousManifestHash === 'canonical-head-from-state') return reject('UNRESOLVED_PLACEHOLDER');
  const terminal = s.run === 'FAILED' || s.run === 'CANCELED';
  switch (command.type) {
    case 'INIT': return { state: createCnesdataState(s.profile), events: [] };
    case 'REQUEST_EXTRACTION':
      if (command.tenantId && command.tenantId !== s.tenantId) return reject('ACCESS_DENIED');
      if (s.job === 'LEASED' || s.job === 'PENDING' || terminal) return reject('JOB_NOT_REQUESTABLE');
      if (command.competencia !== s.competencia) return reject('COMPETENCIA_MISMATCH');
      s.job = 'PENDING'; s.snapshotMode = command.snapshotMode ?? 'FULL'; s.run = 'WAITING_INPUTS';
      s.identityVerified = false; s.owner = null;
      // A requested DELTA reuses the synthetic local capture; no replacement is scheduled.
      if (s.snapshotMode === 'FULL') s.packaged = false;
      return done('Job solicitado explicitamente; Run aguarda as duas fontes.');
    case 'CLAIM_JOB': {
      const identity = s.trustedAgents[command.agentId];
      if (!identity || identity.revoked || identity.tenantId !== s.tenantId) return reject('AGENT_NOT_VERIFIED');
      if (s.job !== 'PENDING') return reject('JOB_NOT_PENDING');
      s.job = 'LEASED'; s.fence += 1; s.owner = command.agentId; s.leaseUntil = s.logicalTick + 30; s.identityVerified = true;
      return done(`Identidade verificada pelo gateway sintético; lease concedido com fence ${s.fence}.`);
    }
    case 'EXTRACT_LOCAL':
      if (s.job !== 'LEASED' || !authorizedWorker(s, s.fence)) return reject('INVALID_LEASE');
      s.local = structuredClone(localSample);
      return done('Edge leu três linhas sintéticas da origem municipal.');
    case 'PACKAGE_PARQUET':
      if (!authorizedWorker(s, s.fence) || !s.local.length) return reject('LOCAL_INPUT_MISSING');
      if (command.compression !== 'zstd' || command.externalGzip) return reject('INVALID_ENCODING');
      s.packaged = true;
      return done('Captura local preparada: data.parquet, Zstd interno e checksum sintético.');
    case 'PUT_RAW_OBJECT': {
      if (!authorizedWorker(s, command.fence, command.agentId ?? s.owner) || s.job !== 'LEASED') return reject('INVALID_LEASE');
      if (!s.packaged) return reject('PARQUET_NOT_READY');
      if (!/^[a-zA-Z0-9-]+$/.test(command.snapshotId)) return reject('INVALID_SNAPSHOT');
      const bytes = JSON.stringify({ format: 'parquet-synthetic', compression: 'zstd', rows: s.local, variant: command.contentVariant ?? 'original' });
      const outcome = storeRaw(s, 'CNES_LOCAL', command.snapshotId, bytes);
      if (outcome === 'conflict') return reject('RAW_CONFLICT');
      if (outcome === 'replayed') return noop();
      s.latestLocalSnapshot = command.snapshotId;
      return done('Bytes raw imutáveis aceitos; manifesto e CURRENT ainda independentes.');
    }
    case 'REPLAY_RAW_OBJECT':
      if (!authorizedWorker(s, command.fence ?? s.fence, command.agentId ?? s.owner)) return reject('INVALID_LEASE');
      if (!s.raw[rawKey(s, 'CNES_LOCAL', command.snapshotId)]) return reject('RAW_NOT_FOUND');
      return noop();
    case 'ACCEPT_RAW_MANIFEST':
      if (!authorizedWorker(s, command.fence ?? s.fence, command.agentId ?? s.owner)) return reject('INVALID_LEASE');
      if (command.source !== 'CNES_LOCAL' || !s.latestLocalSnapshot) return reject('RAW_NOT_FOUND');
      if (s.snapshotMode !== 'FULL') return reject('DELTA_REQUIRES_CHAIN');
      if (!validRaw(s.raw[rawKey(s, command.source, s.latestLocalSnapshot)])) return reject('INVALID_INPUT');
      if (!acceptManifest(s, command.source, s.latestLocalSnapshot)) return noop();
      s.job = 'SUCCEEDED'; s.resyncReason = null;
      return done('Manifesto irmão aceito; Job concluído sem publicar CURRENT.');
    case 'EXTRACT_NATIONAL_PF':
      if (command.competencia !== s.competencia) return reject('COMPETENCIA_MISMATCH');
      if (s.nationalUnavailable) return reject('SOURCE_NOT_PUBLISHED');
      s.national = structuredClone(nationalSample);
      return done('Adapter central validou competência e leu três registros PF sintéticos.');
    case 'ACCEPT_NATIONAL_RAW':
      if (!s.national.length || s.nationalUnavailable) return reject('NATIONAL_INPUT_MISSING');
      if (!/^[a-zA-Z0-9-]+$/.test(command.snapshotId)) return reject('INVALID_SNAPSHOT');
      if (storeRaw(s, 'CNES_NATIONAL', command.snapshotId, JSON.stringify(s.national)) === 'conflict') return reject('RAW_CONFLICT');
      if (!acceptManifest(s, 'CNES_NATIONAL', command.snapshotId)) return noop();
      return done('Raw e manifesto nacionais persistidos separadamente da origem municipal.');
    case 'START_RUN':
      if (terminal) return reject('RUN_TERMINAL');
      if (s.run !== 'WAITING_INPUTS') return reject('RUN_NOT_WAITING');
      if (!projectCnesdata(s).localAccepted || !projectCnesdata(s).nationalAccepted) return reject('WAITING_INPUTS');
      s.run = 'PROCESSING';
      return done('Inputs completos: processamento central iniciado.');
    case 'NORMALIZE_SOURCES': {
      if (s.run !== 'PROCESSING') return reject(terminal ? 'RUN_TERMINAL' : 'RUN_NOT_PROCESSING');
      if (s.normalizedRows.length) return noop();
      const rows: NormalizedRow[] = [];
      for (const source of ['CNES_LOCAL', 'CNES_NATIONAL'] as const) {
        const manifest = Object.values(s.manifests).find(m => m.source === source);
        if (!manifest || !validRaw(s.raw[manifest.dataKey]) || s.raw[manifest.dataKey].hash !== manifest.dataHash) return reject('INVALID_INPUT');
        const decoded = JSON.parse(s.raw[manifest.dataKey].bytes) as RawRow[] | { rows: RawRow[] };
        const input = Array.isArray(decoded) ? decoded : decoded.rows;
        for (const row of input) {
          const hours = Number(row.hours.trim());
          if (!Number.isInteger(hours) || hours < 0) return reject('INVALID_SOURCE_ROW');
          rows.push({ establishment: row.establishment.trim(), professional: row.professional.trim(), hours, source, competencia: s.competencia, runId: s.runId, snapshotId: manifest.snapshotId });
        }
      }
      s.normalizedRows = rows;
      artifact(s, 'normalized', rows);
      return done('Duas fontes normalizadas com tipos, identidade e proveniência preservados.');
    }
    case 'RECONCILE_COMPETENCIA': {
      if (s.run !== 'PROCESSING' || new Set(s.normalizedRows.map(r => r.source)).size !== 2) return reject('NORMALIZED_INPUTS_MISSING');
      if (s.reconciliation) return noop();
      const national = s.normalizedRows.filter(r => r.source === 'CNES_NATIONAL');
      const rows: ComparedRow[] = [];
      for (const local of s.normalizedRows.filter(r => r.source === 'CNES_LOCAL')) {
        const remote = national.find(r => r.establishment === local.establishment && r.professional === local.professional && r.competencia === local.competencia);
        if (!remote) return reject('COMPARISON_INPUT_MISSING');
        rows.push({ establishment: local.establishment, professional: local.professional, localHours: local.hours, nationalHours: remote.hours, different: local.hours !== remote.hours, lineage: [local, remote] });
      }
      s.reconciliation = rows; artifact(s, 'reconciliation', rows);
      return done(`${rows.length} linhas comparadas; ${rows.filter(r => r.different).length} divergência ilustrativa, com linhagem.`);
    }
    case 'MATERIALIZE_SERVING':
      if (s.run !== 'PROCESSING' || !s.reconciliation) return reject('RECONCILIATION_MISSING');
      if (s.serving) return noop();
      s.serving = { run_id: s.runId, competencia: s.competencia, comparedRows: s.reconciliation.length, differentRows: s.reconciliation.filter(r => r.different).length, sameRows: s.reconciliation.filter(r => !r.different).length, rows: structuredClone(s.reconciliation) };
      artifact(s, 'serving', s.serving);
      return done('JSON da tela materializado a partir do mesmo Run da reconciliação.');
    case 'VERIFY_ARTIFACTS':
      if (terminal) return reject('RUN_TERMINAL');
      if (s.run !== 'PROCESSING' || !s.serving || !s.reconciliation) return reject('ARTIFACTS_INCOMPLETE');
      if (['normalized', 'reconciliation', 'serving'].some(name => {
        const a = s.artifacts[name]; return !a || !a.readable || a.hash !== hash(a.bytes) || a.runId !== s.runId || a.schemaVersion !== 1;
      })) return reject('ARTIFACT_VERIFICATION_FAILED');
      s.artifactsVerified = true; s.run = 'PUBLISHING';
      return done('Completude, checksum sintético, schema e leitura verificados antes da publicação.');
    case 'CREATE_DATASET_VERSION': {
      if (s.run !== 'PUBLISHING' || !s.artifactsVerified || !s.serving) return reject('ARTIFACTS_NOT_VERIFIED');
      const existing = s.versions[command.versionId];
      if (existing) return existing.runId === s.runId && JSON.stringify(existing.serving) === JSON.stringify(s.serving) ? noop() : reject('VERSION_CONFLICT');
      s.versions[command.versionId] = { id: command.versionId, tenantId: s.tenantId, runId: s.runId, serving: structuredClone(s.serving), verified: true };
      s.candidateVersion = command.versionId;
      return done(`Versão imutável ${command.versionId} criada; CURRENT permanece em ${s.currentVersion}.`);
    }
    case 'PUBLISH_CURRENT':
      if (s.run !== 'PUBLISHING' || !s.artifactsVerified || !s.candidateVersion || !s.versions[s.candidateVersion]?.verified) return reject('CANDIDATE_NOT_READY');
      if (!authorizedWorker(s, command.fence)) return reject('INVALID_LEASE');
      if (command.expectedVersion !== s.currentVersion) return reject('CAS_CONFLICT');
      s.currentVersion = s.candidateVersion; s.run = 'PUBLISHED';
      return done(`CAS confirmado: CURRENT aponta para ${s.currentVersion}.`);
    case 'ROLLBACK_CURRENT':
      if (!authorizedWorker(s, command.fence)) return reject('INVALID_LEASE');
      if (command.expectedVersion !== s.currentVersion) return reject('CAS_CONFLICT');
      if (!s.versions[command.versionId]?.verified || s.versions[command.versionId].tenantId !== s.tenantId) return reject('UNKNOWN_VERSION');
      s.currentVersion = command.versionId;
      return done(`Rollback condicional para ${s.currentVersion}; histórico e requisição fixada preservados.`);
    case 'AUTHORIZE_AND_READ':
      if (!s.membershipActive || command.tenantId !== s.tenantId) {
        s.servedVersion = null; s.response = null; s.userView = 'access_denied';
        return { state: s, events: [], rejection: 'ACCESS_DENIED' };
      }
      if (!s.versions[s.currentVersion]?.verified) return reject('UNKNOWN_VERSION');
      s.servedVersion = s.currentVersion; s.response = null;
      return done(`Acesso autorizado; a requisição fixou ${s.servedVersion} uma única vez.`);
    case 'SHOW_SERVING':
      if (!s.membershipActive) return reject('ACCESS_DENIED');
      if (!s.servedVersion) return reject('REQUEST_NOT_AUTHORIZED');
      s.response = structuredClone(s.versions[s.servedVersion].serving);
      s.userView = s.servedVersion === s.currentVersion ? 'current_version' : 'previous_version';
      return done(`Resposta materializada de ${s.servedVersion}, Run ${s.response.run_id}; nenhuma leitura de raw pelo usuário.`);
    case 'FAIL_PROCESSING':
      if (s.run !== 'PROCESSING' && s.run !== 'PUBLISHING') return reject('RUN_NOT_PROCESSING');
      s.run = 'FAILED'; s.artifactsVerified = false;
      return done(`Falha em ${command.unit}; CURRENT anterior preservado.`);
    case 'ADVANCE_CLOCK':
      if (!Number.isSafeInteger(command.ticks) || command.ticks < 0) return reject('INVALID_TICKS');
      s.logicalTick += command.ticks;
      return done(`Relógio lógico avançou para ${s.logicalTick}; nenhum FULL substituto foi agendado.`);
    case 'REVOKE_AGENT':
      if (s.owner && s.trustedAgents[s.owner]) s.trustedAgents[s.owner].revoked = true;
      s.identityVerified = false;
      return done('Agente revogado; futuras mutações são rejeitadas.');
    case 'REVOKE_MEMBERSHIP':
      s.membershipActive = false; s.servedVersion = null; s.response = null; s.userView = 'access_denied';
      return done('Membership revogada; dados e referências da resposta removidos.');
    case 'NATIONAL_SOURCE_NOT_PUBLISHED':
      if (command.competencia !== s.competencia) return reject('COMPETENCIA_MISMATCH');
      s.nationalUnavailable = true;
      return done('Fonte nacional ainda não publicada; competência solicitada preservada.');
    case 'REGISTER_DELTA_MANIFEST': {
      if (!authorizedWorker(s, s.fence)) return reject('INVALID_LEASE');
      const receiptBytes = JSON.stringify({ baseSnapshotId: command.baseSnapshotId, sequence: command.sequence, previousManifestHash: command.previousManifestHash, schemaVersion: command.schemaVersion ?? 1 });
      if (s.job === 'SUCCEEDED' || s.job === 'FAILED_FINAL') {
        return s.deltaReceipt?.fence === s.fence && s.deltaReceipt.bytes === receiptBytes ? noop() : reject('TERMINAL_REPLAY_CONFLICT');
      }
      if (s.job !== 'LEASED') return reject('INVALID_LEASE');
      if (s.snapshotMode !== 'DELTA' || !s.latestLocalSnapshot) return reject('DELTA_NOT_REQUESTED');
      if (!validRaw(s.raw[rawKey(s, 'CNES_LOCAL', s.latestLocalSnapshot)])) return reject('INVALID_INPUT');
      const head = s.canonicalHead;
      const base = Object.values(s.manifests).find(m => m.snapshotId === command.baseSnapshotId && m.source === 'CNES_LOCAL');
      // The R3b policy order is observable; confirmed head and bytes remain intact.
      const reason = s.resyncReason ? 'AGENT_RESYNC_REQUIRED'
        : !base || !head ? 'BASE_UNKNOWN'
        : command.sequence !== head.sequence + 1 ? 'SEQUENCE_GAP'
        : command.previousManifestHash !== head.hash ? 'HASH_CHAIN_MISMATCH'
        : (command.schemaVersion ?? 1) !== head.schemaVersion ? 'SCHEMA_INCOMPATIBLE'
        : s.logicalTick - base.acceptedTick > 20 ? 'BASE_TOO_OLD'
        : command.sequence > 10 ? 'CHAIN_TOO_LONG' : null;
      if (reason) {
        s.resyncReason = reason; s.job = 'FAILED_FINAL'; s.deltaReceipt = { fence: s.fence, bytes: receiptBytes };
        return { state: s, events: [{ type: 'RESYNC_REQUIRED', description: `${reason}: Job falhou definitivamente; FULL exige solicitação explícita.` }], rejection: reason };
      }
      acceptManifest(s, 'CNES_LOCAL', s.latestLocalSnapshot, command.sequence); s.job = 'SUCCEEDED'; s.deltaReceipt = { fence: s.fence, bytes: receiptBytes };
      return done('DELTA autenticado aceito na cadeia canônica; CURRENT permanece independente.');
    }
    default: return reject('UNKNOWN_COMMAND');
  }
}
