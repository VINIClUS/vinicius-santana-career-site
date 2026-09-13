export type Channel = 'email' | 'telegram';
export type NotificationKind = 'opening' | 'recovery';
export type DeliveryStatus = 'queued' | 'attempting' | 'retry_wait' | 'accepted' | 'permanent_failure' | 'unknown' | 'suppressed';
export type LimnopulseCommand =
  | { type: 'INIT' | 'VERIFY_BINDING' | 'ATTEMPT_RECOVERY_CHANNELS' | 'PROVIDER_RECOVERY_ACCEPTED' }
  | { type: 'CONFIGURE_RULE'; metric: string; threshold: number; operator: '<'; windowTicks: number; durationTicks: number; authorized?: boolean }
  | { type: 'ENABLE_PREFERENCE'; channel: Channel }
  | { type: 'PUBLISH_READING'; value: number; deviceId: string }
  | { type: 'INGEST_WINDOW' | 'INGEST_CLEAN_WINDOW'; values: number[]; ticks: number[] }
  | { type: 'EVALUATE' | 'EVALUATE_RECOVERY'; evaluationTick: number }
  | { type: 'RELAY'; kind: NotificationKind }
  | { type: 'ATTEMPT_DELIVERY' | 'SHOW_MESSAGE' | 'DUPLICATE_QUEUE_JOB'; channel: Channel; kind: NotificationKind }
  | { type: 'PROVIDER_RESULT'; channel: Channel; kind: NotificationKind; result: 'accepted' | 'rate_limited' | 'transient_failure' | '5xx' | 'permanent' | 'permanent_failure' | 'unknown'; retryAfterTicks?: number; operationId: string }
  | { type: 'OPEN_INCIDENT'; tenantId?: string; pondId?: string }
  | { type: 'ACKNOWLEDGE'; expectedVersion: number; authorized?: boolean }
  | { type: 'ADVANCE_CLOCK'; ticks: number }
  | { type: 'SET_WINDOW_QUALITY'; valid: boolean }
  | { type: 'SET_MEMBERSHIP'; active: boolean }
  | { type: 'SET_REDIS'; available: boolean };

export interface LimnopulseDelivery {
  id: string; channel: Channel; kind: NotificationKind; status: DeliveryStatus;
  attempts: number; dueTick: number | null; operationId: string | null; providerAccepted: boolean;
}
export interface LimnopulseState {
  logicalTick: number;
  rule: { metric: string; threshold: number; windowTicks: number; durationTicks: number; version: number } | null;
  recipient: { membershipActive: boolean; telegramBound: boolean; telegramEnabled: boolean; suppressed: Channel[] };
  telemetry: { points: { id: string; value: number; tick: number; deviceId: string; tenantId: string }[]; window: { values: number[]; ticks: number[] }; valid: boolean; published: { value: number; deviceId: string } | null };
  condition: 'normal' | 'low';
  incident: { status: 'none' | 'open' | 'acknowledged' | 'recovered'; id: string | null; version: number; openedTick: number | null; history: string[] };
  outboxes: { id: string; channel: Channel; kind: NotificationKind; incidentId: string }[];
  deliveries: Partial<Record<`${NotificationKind}:${Channel}`, LimnopulseDelivery>>;
  userView: 'idle' | 'message_shown' | 'incident_opened' | 'acknowledged' | 'recovery_shown';
  redisAvailable: boolean;
}
export interface LimnopulseEvent { type: string; description: string }
export interface LimnopulseResult { state: LimnopulseState; events: LimnopulseEvent[]; rejection?: string }
const channels: Channel[] = ['email', 'telegram'];
const deliveryKey = (kind: NotificationKind, channel: Channel): `${NotificationKind}:${Channel}` => `${kind}:${channel}`;
export function createLimnopulseState(): LimnopulseState {
  return { logicalTick: 0, rule: null, recipient: { membershipActive: true, telegramBound: false, telegramEnabled: false, suppressed: [] }, telemetry: { points: [], window: { values: [], ticks: [] }, valid: false, published: null }, condition: 'normal', incident: { status: 'none', id: null, version: 0, openedTick: null, history: [] }, outboxes: [], deliveries: {}, userView: 'idle', redisAvailable: true };
}
function eligible(s: LimnopulseState, channel: Channel, kind: NotificationKind): boolean {
  return s.recipient.membershipActive && !s.recipient.suppressed.includes(channel) &&
    (channel === 'email' || (s.recipient.telegramBound && s.recipient.telegramEnabled)) &&
    (kind === 'opening' || s.deliveries[deliveryKey('opening', channel)]?.providerAccepted === true);
}
function validWindow(s: LimnopulseState, at: number): boolean {
  const { ticks, values } = s.telemetry.window;
  if (!s.rule || !s.telemetry.valid || ticks.length < 2 || ticks.length !== values.length || !values.every(Number.isFinite)) return false;
  const first = ticks[0]!;
  const last = ticks[ticks.length - 1]!;
  return last - first >= Math.max(s.rule.windowTicks, s.rule.durationTicks) && at >= last && at - last <= s.rule.windowTicks && ticks.every((tick, i) => Number.isInteger(tick) && tick >= 0 && (i === 0 || tick - ticks[i - 1]! === 1));
}
function outbox(s: LimnopulseState, kind: NotificationKind) {
  for (const channel of channels) {
    if (kind === 'recovery' && !eligible(s, channel, kind)) continue;
    const id = `${s.incident.id}:${kind}:${channel}`;
    if (!s.outboxes.some(o => o.id === id)) s.outboxes.push({ id, channel, kind, incidentId: s.incident.id! });
  }
}
export function reduceLimnopulse(previous: LimnopulseState, command: LimnopulseCommand): LimnopulseResult {
  if (command.type === 'INIT') return { state: createLimnopulseState(), events: [{ type: 'INIT', description: 'Synthetic monitoring system ready.' }] };
  // Recovery macros use the identical claim, preflight and provider result paths.
  if (command.type === 'ATTEMPT_RECOVERY_CHANNELS' || command.type === 'PROVIDER_RECOVERY_ACCEPTED') {
    let state = previous;
    const events: LimnopulseEvent[] = [];
    let rejection: string | undefined;
    for (const channel of channels) {
      const result = reduceLimnopulse(state, command.type === 'ATTEMPT_RECOVERY_CHANNELS'
        ? { type: 'ATTEMPT_DELIVERY', channel, kind: 'recovery' }
        : { type: 'PROVIDER_RESULT', channel, kind: 'recovery', result: 'accepted', operationId: state.deliveries[deliveryKey('recovery', channel)]?.operationId ?? '' });
      state = result.state; events.push(...result.events); rejection ??= result.rejection;
    }
    return { state, events, ...(rejection ? { rejection } : {}) };
  }
  const s = structuredClone(previous);
  const reject = (reason: string, state = previous): LimnopulseResult => ({ state, events: [{ type: 'REJECTED', description: reason }], rejection: reason });
  let description: string;
  switch (command.type) {
    case 'CONFIGURE_RULE':
      if (command.authorized === false || !s.recipient.membershipActive) return reject('FORBIDDEN');
      if (!Number.isFinite(command.threshold) || !Number.isInteger(command.windowTicks) || !Number.isInteger(command.durationTicks) || command.windowTicks < 1 || command.durationTicks < 1 || command.operator !== '<') return reject('INVALID_RULE');
      s.rule = { metric: command.metric, threshold: command.threshold, windowTicks: command.windowTicks, durationTicks: command.durationTicks, version: (s.rule?.version ?? 0) + 1 };
      description = 'Synthetic rule persisted with a new version.'; break;
    case 'VERIFY_BINDING':
      if (!s.recipient.membershipActive) return reject('FORBIDDEN');
      s.recipient.telegramBound = true; description = 'Telegram binding verified; preference remains separate.'; break;
    case 'ENABLE_PREFERENCE':
      if (!s.recipient.membershipActive || (command.channel === 'telegram' && !s.recipient.telegramBound)) return reject('INELIGIBLE_RECIPIENT');
      if (command.channel === 'telegram') s.recipient.telegramEnabled = true;
      description = 'Channel preference enabled.'; break;
    case 'SET_MEMBERSHIP': s.recipient.membershipActive = command.active; if (!command.active) s.userView = 'idle'; description = 'Membership updated.'; break;
    case 'SET_REDIS': s.redisAvailable = command.available; description = 'Rate limiter availability updated.'; break;
    case 'PUBLISH_READING':
      if (command.deviceId !== 'dev-demo-01' || !Number.isFinite(command.value)) return reject('UNKNOWN_DEVICE_OR_INVALID_READING');
      s.telemetry.published = { value: command.value, deviceId: command.deviceId }; description = 'Known device published a synthetic MQTT reading.'; break;
    case 'INGEST_WINDOW': case 'INGEST_CLEAN_WINDOW': {
      if (command.values.length !== command.ticks.length || !command.values.every(Number.isFinite) || !command.ticks.every(t => Number.isInteger(t) && t >= 0)) return reject('INVALID_WINDOW');
      s.telemetry.window = { values: [...command.values], ticks: [...command.ticks] };
      for (const [i, tick] of command.ticks.entries()) {
        const id = `dev-demo-01:${tick}`;
        const existing = s.telemetry.points.find(p => p.id === id);
        if (existing && existing.value !== command.values[i]) return reject('READING_CONFLICT');
        if (!existing) s.telemetry.points.push({ id, value: command.values[i]!, tick, deviceId: 'dev-demo-01', tenantId: 'tenant-demo-A' });
      }
      s.logicalTick = Math.max(s.logicalTick, ...command.ticks);
      s.telemetry.valid = true;
      s.telemetry.valid = validWindow(s, s.logicalTick);
      if (s.telemetry.valid) {
        if (command.values.every(v => v < s.rule!.threshold)) s.condition = 'low';
        else if (command.values.every(v => v >= s.rule!.threshold)) s.condition = 'normal';
      }
      description = s.telemetry.valid ? 'InfluxDB persisted a covered window with device and tenant provenance.' : 'Window persisted, but coverage is insufficient.'; break;
    }
    case 'SET_WINDOW_QUALITY': s.telemetry.valid = command.valid; description = 'Window quality updated.'; break;
    case 'EVALUATE': case 'EVALUATE_RECOVERY': {
      if (!validWindow(s, command.evaluationTick) || command.evaluationTick < s.logicalTick) return reject('INSUFFICIENT_DATA');
      s.logicalTick = command.evaluationTick;
      if (command.type === 'EVALUATE') {
        if (s.incident.status === 'none' && s.condition === 'low' && s.telemetry.window.values.every(v => v < s.rule!.threshold)) {
          s.incident = { status: 'open', id: 'evt-demo-01', version: 1, openedTick: command.evaluationTick, history: ['open'] };
          outbox(s, 'opening');
        }
        description = 'Evaluator committed incident and opening outboxes atomically.';
      } else {
        if ((s.incident.status === 'open' || s.incident.status === 'acknowledged') && s.condition === 'normal' && s.telemetry.window.values.every(v => v >= s.rule!.threshold) && s.telemetry.window.ticks[0]! > s.incident.openedTick!) {
          s.incident.status = 'recovered'; s.incident.version++; s.incident.history.push('recovered'); outbox(s, 'recovery');
        }
        description = 'Evaluator processed the qualified clean window; recovery notifications retain opening correlation.';
      }
      break;
    }
    case 'RELAY':
      for (const item of s.outboxes.filter(o => o.kind === command.kind)) {
        const key = deliveryKey(item.kind, item.channel);
        if (!s.deliveries[key]) s.deliveries[key] = { id: `delivery:${item.id}`, channel: item.channel, kind: item.kind, status: eligible(s, item.channel, item.kind) ? 'queued' : 'suppressed', attempts: 0, dueTick: null, operationId: null, providerAccepted: false };
      }
      description = 'Relay persisted immutable Delivery identities and published eligible IDs to separate SQS queues.'; break;
    case 'DUPLICATE_QUEUE_JOB': description = 'Duplicate transport job retained the same Delivery identity.'; break;
    case 'ATTEMPT_DELIVERY': {
      const d = s.deliveries[deliveryKey(command.kind, command.channel)];
      if (!d || !['queued', 'retry_wait'].includes(d.status)) return reject('DELIVERY_NOT_RETRYABLE');
      if (!eligible(s, command.channel, command.kind)) { d.status = 'suppressed'; return reject('INELIGIBLE_RECIPIENT', s); }
      if (d.dueTick !== null && s.logicalTick < d.dueTick) return reject('RETRY_NOT_DUE');
      if (command.channel === 'telegram' && !s.redisAvailable) return reject('RATE_LIMIT_UNAVAILABLE');
      d.attempts++; d.operationId = `${d.id}:attempt-${d.attempts}`; d.status = 'attempting';
      description = `${command.channel} worker claimed a fenced Attempt and invoked the fake provider.`; break;
    }
    case 'PROVIDER_RESULT': {
      const d = s.deliveries[deliveryKey(command.kind, command.channel)];
      if (!d || d.status !== 'attempting' || command.operationId !== d.operationId) return reject('STALE_OPERATION');
      if (command.result === 'accepted') { d.status = 'accepted'; d.providerAccepted = true; d.dueTick = null; }
      else if (command.result === 'unknown') { d.status = 'unknown'; d.dueTick = null; }
      else if (command.result === 'permanent' || command.result === 'permanent_failure' || d.attempts >= 3) { d.status = 'permanent_failure'; d.dueTick = null; if (!s.recipient.suppressed.includes(command.channel)) s.recipient.suppressed.push(command.channel); }
      else { d.status = 'retry_wait'; d.dueTick = s.logicalTick + Math.max(1, command.retryAfterTicks ?? 2 ** d.attempts); }
      description = `${command.channel} fake provider result: ${d.status}. Provider acceptance is distinct from human acknowledgment.`; break;
    }
    case 'ADVANCE_CLOCK':
      if (!Number.isInteger(command.ticks) || command.ticks < 0) return reject('INVALID_TICK');
      s.logicalTick += command.ticks; description = 'Logical clock advanced; no provider calls are automatic.'; break;
    case 'SHOW_MESSAGE':
      if (!eligible(s, command.channel, command.kind) || !s.deliveries[deliveryKey(command.kind, command.channel)]?.providerAccepted) return reject('MESSAGE_NOT_ACCEPTED');
      s.userView = command.kind === 'opening' ? 'message_shown' : 'recovery_shown'; description = 'Illustrative device displays the accepted message; this is not a provider read receipt.'; break;
    case 'OPEN_INCIDENT':
      if (!s.recipient.membershipActive || (command.tenantId !== undefined && command.tenantId !== 'tenant-demo-A') || (command.pondId !== undefined && command.pondId !== 'pond-demo-01')) return reject('FORBIDDEN');
      if (!s.incident.id) return reject('NO_INCIDENT');
      s.userView = 'incident_opened'; description = 'Authorized API returned the incident detail.'; break;
    case 'ACKNOWLEDGE':
      if (!s.recipient.membershipActive || command.authorized === false) return reject('FORBIDDEN');
      if (command.expectedVersion !== s.incident.version) return reject('VERSION_CONFLICT');
      if (s.incident.status !== 'open') return reject('INCIDENT_NOT_OPEN');
      s.incident.status = 'acknowledged'; s.incident.version++; s.incident.history.push('acknowledged'); s.userView = 'acknowledged'; description = 'Acknowledgment persisted; the environmental condition remains unchanged.'; break;
    default: return reject('UNKNOWN_COMMAND');
  }
  return { state: s, events: [{ type: command.type, description }] };
}
export function projectLimnopulse(s: LimnopulseState) {
  const email = s.deliveries['opening:email']; const telegram = s.deliveries['opening:telegram'];
  return { ruleConfigured: s.rule !== null, membershipActive: s.recipient.membershipActive, telegramBound: s.recipient.telegramBound, telegramEnabled: s.recipient.telegramEnabled, samples: s.telemetry.points.length, windowValid: s.telemetry.valid, condition: s.condition, incident: s.incident.status, incidentId: s.incident.id, incidentVersion: s.incident.version, outboxCount: s.outboxes.length, queueCount: Object.values(s.deliveries).filter(d => ['queued', 'attempting', 'retry_wait'].includes(d.status)).length, email: email?.status ?? 'idle', telegram: telegram?.status ?? 'idle', telegramAttempts: telegram?.attempts ?? 0, retryDueTick: telegram?.dueTick ?? null, userView: s.userView, openingConfirmed: { email: email?.providerAccepted ?? false, telegram: telegram?.providerAccepted ?? false }, recoveryEmail: s.deliveries['recovery:email']?.status ?? 'idle', recoveryTelegram: s.deliveries['recovery:telegram']?.status ?? 'idle', logicalTick: s.logicalTick };
}
