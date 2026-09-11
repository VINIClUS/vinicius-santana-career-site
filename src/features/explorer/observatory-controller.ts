import { districtIds, type DistrictId } from './districts.ts';

export interface ObservatoryState { readonly selectedDistrictId: DistrictId | null; }
export type ObservatoryCommand = { readonly type: 'SELECT_DISTRICT'; readonly districtId: DistrictId | null };
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
      if (command.type !== 'SELECT_DISTRICT') return;
      const id = command.districtId;
      if (id === state.selectedDistrictId || (id !== null && !districtIds.includes(id))) return;
      state = { selectedDistrictId: id };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
