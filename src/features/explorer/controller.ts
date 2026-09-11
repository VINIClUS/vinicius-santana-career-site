import { createInitialInfraState, transitionInfrastructure, type InfraCommand, type InfraState } from './simulation/infrastructure.ts';
import { createInitialState, transition } from './simulation/cnesdata.ts';
import type { Command as SimulationCommand, SimulationState } from './simulation/cnesdata.ts';
import { projectDefinitions } from './projects.ts';
import type { ProjectId } from './projects.ts';

export type ExplorerCommand =
  | { readonly type: 'SELECT_COMPONENT'; readonly componentId: string | null }
  | SimulationCommand
  | InfraCommand;

export interface ExplorerState {
  readonly projectId: ProjectId;
  readonly selectedComponentId: string | null;
  readonly simulation?: SimulationState;
  readonly infrastructureSimulation?: InfraState;
}

export interface ExplorerController {
  getState(): ExplorerState;
  dispatch(command: ExplorerCommand): void;
  subscribe(listener: () => void): () => void;
}

export function createExplorerController(projectId: ProjectId): ExplorerController {
  let state: ExplorerState = projectId === 'cnesdata'
    ? { projectId, selectedComponentId: null, simulation: createInitialState() }
    : projectId === 'infrastructure'
      ? { projectId, selectedComponentId: null, infrastructureSimulation: createInitialInfraState() }
      : { projectId, selectedComponentId: null };
  const listeners = new Set<() => void>();

  function publish(nextState: ExplorerState): void {
    if (nextState === state) return;
    state = nextState;
    for (const listener of listeners) listener();
  }

  return {
    getState: () => state,
    dispatch(command) {
      if (command.type === 'SELECT_COMPONENT') {
        if (command.componentId === state.selectedComponentId) return;
        if (command.componentId !== null && !projectDefinitions[projectId].componentIds.includes(command.componentId)) return;
        publish({ ...state, selectedComponentId: command.componentId });
        return;
      }
      if (state.infrastructureSimulation && (command.type === 'FAIL_NODE' || command.type === 'RESET')) {
        const infrastructureSimulation = transitionInfrastructure(state.infrastructureSimulation, command);
        if (infrastructureSimulation !== state.infrastructureSimulation) publish({ ...state, infrastructureSimulation });
        return;
      }
      if (!state.simulation || command.type === 'FAIL_NODE') return;
      const simulation = transition(state.simulation, command);
      if (simulation !== state.simulation) publish({ ...state, simulation });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
