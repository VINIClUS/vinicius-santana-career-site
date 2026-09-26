/** Fictional local tour. The target-gate command is an explicit hypothetical assumption. */
export interface EsusdataState {
  grantActive: boolean;
  authorized: boolean;
  rowsRead: number;
  extractValid: boolean;
  calculated: boolean;
  targetGatesCompleted: boolean;
  published: boolean;
  dashboard: string | null;
}
export type EsusdataCommand =
  | { type: 'AUTHORIZE' | 'CALCULATE_C1' | 'VALIDATE_TARGET_GATES' | 'RESET_METHOD_GATES' | 'PUBLISH_C1' | 'QUERY_RESULT' | 'REVOKE_GRANT' }
  | { type: 'READ_PEC'; budget: number }
  | { type: 'SEAL_EXTRACT'; valid: boolean };
export function createEsusdataState(): EsusdataState {
  return { grantActive: true, authorized: false, rowsRead: 0, extractValid: false, calculated: false, targetGatesCompleted: false, published: false, dashboard: null };
}
export function projectEsusdata(state: EsusdataState) {
  return {
    ...state,
    scheduled: state.calculated ? 3 : 0,
    walkIn: state.calculated ? 2 : 0,
    excluded: state.calculated ? 1 : 0,
    percentage: state.calculated ? 100 * 3 / (3 + 2) : null,
    classification: state.calculated ? 'Ótimo' : null,
    methodologyPending: state.targetGatesCompleted ? [] : ['A', 'B', 'D', 'E'],
  };
}
export function reduceEsusdata(previous: EsusdataState, command: EsusdataCommand): { state: EsusdataState; events: { type: string; description: string }[]; rejection?: string } {
  const reject = (reason: string) => ({ state: previous, events: [{ type: 'REJECTED', description: reason }], rejection: reason });
  const state = { ...previous };
  switch (command.type) {
    case 'AUTHORIZE':
      if (!state.grantActive) return reject('GRANT_REVOKED');
      state.authorized = true; break;
    case 'READ_PEC':
      if (!state.authorized || !state.grantActive) return reject('NOT_AUTHORIZED');
      if (!Number.isSafeInteger(command.budget) || command.budget < 6) return reject('READ_BUDGET_EXCEEDED');
      state.rowsRead = 6; break;
    case 'SEAL_EXTRACT':
      if (state.rowsRead !== 6) return reject('NO_SOURCE_ROWS');
      if (!command.valid) return reject('INVALID_EXTRACT');
      state.extractValid = true; break;
    case 'CALCULATE_C1':
      if (!state.extractValid) return reject('INVALID_EXTRACT');
      state.calculated = true; break;
    case 'VALIDATE_TARGET_GATES':
      if (!state.calculated) return reject('NO_CANDIDATE');
      state.targetGatesCompleted = true; break;
    case 'RESET_METHOD_GATES':
      state.targetGatesCompleted = false; state.published = false; state.dashboard = null; break;
    case 'PUBLISH_C1':
      if (!state.grantActive) return reject('GRANT_REVOKED');
      if (!state.calculated) return reject('NO_CANDIDATE');
      if (!state.targetGatesCompleted) return reject('METHODOLOGY_INCOMPLETE');
      state.published = true; break;
    case 'QUERY_RESULT':
      if (!state.grantActive) return reject('GRANT_REVOKED');
      if (!state.published) return reject('NOT_PUBLISHED');
      state.dashboard = '60% / Ótimo · hypothetical target'; break;
    case 'REVOKE_GRANT': state.grantActive = false; state.dashboard = null; break;
    default: return reject('UNKNOWN_COMMAND');
  }
  return { state, events: [{ type: command.type, description: command.type.replaceAll('_', ' ').toLowerCase() }] };
}
