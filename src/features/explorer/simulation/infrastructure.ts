export const infraNodeIds = ['node-01', 'node-02', 'node-03'] as const;
export type InfraNodeId = typeof infraNodeIds[number];
export type InfraCommand =
  | { readonly type: 'FAIL_NODE'; readonly nodeId: string }
  | { readonly type: 'RESET' };
export interface InfraEvent {
  readonly type: 'node-failed' | 'workload-transferred' | 'shared-layer-available';
  readonly description: string;
}
export interface InfraState {
  readonly nodes: Readonly<Record<InfraNodeId, 'online' | 'failed'>>;
  readonly workloadNodeId: InfraNodeId;
  readonly sharedLayer: 'available';
  readonly timeline: readonly InfraEvent[];
}
export function createInitialInfraState(): InfraState {
  return { nodes: { 'node-01': 'online', 'node-02': 'online', 'node-03': 'online' }, workloadNodeId: 'node-02', sharedLayer: 'available', timeline: [] };
}
/** A deterministic illustrative scenario, independent of clocks, DOM and network. */
export function transitionInfrastructure(state: InfraState, command: InfraCommand): InfraState {
  if (command.type === 'RESET') return createInitialInfraState();
  if (command.type !== 'FAIL_NODE' || command.nodeId !== 'node-02' || state.nodes['node-02'] === 'failed') return state;
  return {
    nodes: { ...state.nodes, 'node-02': 'failed' }, workloadNodeId: 'node-01', sharedLayer: 'available',
    timeline: [
      { type: 'node-failed', description: 'node-02 failed in the synthetic scenario.' },
      { type: 'workload-transferred', description: 'Workload transferred from node-02 to node-01.' },
      { type: 'shared-layer-available', description: 'Shared layer remains available.' },
    ],
  };
}
