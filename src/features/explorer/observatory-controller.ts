import { districtIds, type DistrictId } from './districts.ts';

export interface ObservatoryState { readonly selectedDistrictId: DistrictId | null; }
export type ObservatoryCommand =
  | { readonly type: 'SELECT_DISTRICT'; readonly districtId: DistrictId | null }
  | { readonly type: 'ACTIVATE_DISTRICT'; readonly districtId: DistrictId };
export interface ObservatoryController {
  getState(): ObservatoryState;
  dispatch(command: ObservatoryCommand): void;
  subscribe(listener: () => void): () => void;
}
export function createObservatoryController(): ObservatoryController {
  let state: ObservatoryState = { selectedDistrictId: null };
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(command) {
      const id = command.districtId;
      if (id !== null && !districtIds.includes(id)) return;
      const selectedDistrictId = command.type === 'ACTIVATE_DISTRICT' && id === state.selectedDistrictId ? null : id;
      if (selectedDistrictId === state.selectedDistrictId) return;
      state = { selectedDistrictId };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
