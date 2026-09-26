export const projectIds = ['cnesdata', 'limnopulse', 'infrastructure', 'esusdata'] as const;
export type ProjectId = (typeof projectIds)[number];
export interface ProjectRelation { readonly from: string; readonly to: string; readonly label: string; readonly shortLabel: string; }
export interface ProjectDiagramStage { readonly id: string; readonly label: string; readonly kind: 'flow' | 'support'; readonly componentIds: readonly string[]; }
export interface ProjectDefinition {
  readonly area: string;
  readonly componentIds: readonly string[];
  readonly primaryComponentId: string;
  readonly diagram: { readonly stages: readonly ProjectDiagramStage[]; };
  readonly relations: readonly ProjectRelation[];
}

export const projectDefinitions: Readonly<Record<ProjectId, ProjectDefinition>> = {
  cnesdata: {
    area: 'Data platform',
    componentIds: ['canonical-contracts', 'edge-agent', 'central-api', 'tenant-isolation', 'web-dashboard', 'parquet-to-gold', 'kubernetes'],
    primaryComponentId: 'central-api',
    diagram: {
      stages: [
        { id: 'contracts-edge', label: 'Contracts & edge', kind: 'flow', componentIds: ['canonical-contracts', 'edge-agent'] },
        { id: 'platform-core', label: 'Platform core', kind: 'flow', componentIds: ['central-api', 'tenant-isolation'] },
        { id: 'interfaces-processing', label: 'Interfaces & processing', kind: 'flow', componentIds: ['web-dashboard', 'parquet-to-gold'] },
        { id: 'target-runtime', label: 'Target runtime', kind: 'support', componentIds: ['kubernetes'] }
      ]
    },
    relations: [
      { from: 'canonical-contracts', to: 'edge-agent', label: 'Defines extraction payloads', shortLabel: 'Extraction payloads' },
      { from: 'canonical-contracts', to: 'central-api', label: 'Defines API contracts', shortLabel: 'API contracts' },
      { from: 'edge-agent', to: 'central-api', label: 'Registers extraction manifests', shortLabel: 'Registers manifests' },
      { from: 'central-api', to: 'tenant-isolation', label: 'Carries tenant context', shortLabel: 'Tenant context' },
      { from: 'web-dashboard', to: 'central-api', label: 'Uses typed API contracts', shortLabel: 'Typed API' },
      { from: 'central-api', to: 'parquet-to-gold', label: 'Creates planned processing work', shortLabel: 'Delivery work' },
      { from: 'kubernetes', to: 'central-api', label: 'Represents the planned deployment shape', shortLabel: 'Configuration' }
    ]
  },
  limnopulse: {
    area: 'Water telemetry',
    componentIds: ['telemetry-api', 'alert-rules', 'evaluator', 'notifications', 'mqtt-ingestion', 'cloud-infrastructure', 'production-device-layer'],
    primaryComponentId: 'evaluator',
    diagram: {
      stages: [
        { id: 'sources', label: 'Sources', kind: 'flow', componentIds: ['production-device-layer', 'mqtt-ingestion'] },
        { id: 'authorized-access', label: 'Authorized access', kind: 'flow', componentIds: ['telemetry-api'] },
        { id: 'evaluation', label: 'Evaluation', kind: 'flow', componentIds: ['alert-rules', 'evaluator'] },
        { id: 'delivery', label: 'Delivery', kind: 'flow', componentIds: ['notifications'] },
        { id: 'cloud-infrastructure', label: 'Cloud infrastructure', kind: 'support', componentIds: ['cloud-infrastructure'] }
      ]
    },
    relations: [
      { from: 'mqtt-ingestion', to: 'telemetry-api', label: 'Makes local readings available through InfluxDB for authorized API queries', shortLabel: 'Authorized telemetry' },
      { from: 'alert-rules', to: 'evaluator', label: 'Defines versioned rules for one-shot evaluation', shortLabel: 'Versioned rules' },
      { from: 'evaluator', to: 'mqtt-ingestion', label: 'Queries reading windows in InfluxDB populated by the local ingestion scaffold', shortLabel: 'Reading windows' },
      { from: 'evaluator', to: 'alert-rules', label: 'Persists durable alert events and outboxes in DynamoDB', shortLabel: 'Durable events' },
      { from: 'alert-rules', to: 'notifications', label: 'An outbox relay publishes per-channel notification work to SQS', shortLabel: 'Delivery work' },
      { from: 'cloud-infrastructure', to: 'evaluator', label: 'Documents managed resources and external scheduling prerequisites', shortLabel: 'Configuration' },
      { from: 'production-device-layer', to: 'mqtt-ingestion', label: 'Marks a planned production boundary beyond the local scaffold', shortLabel: 'Production boundary' }
    ]
  },
  infrastructure: {
    area: 'Infrastructure',
    componentIds: ['ansible-contracts', 'image-builds', 'operations-automation', 'reference-topology'],
    primaryComponentId: 'reference-topology',
    diagram: {
      stages: [
        { id: 'ansible-contracts', label: 'Ansible contracts', kind: 'flow', componentIds: ['ansible-contracts'] },
        { id: 'image-builds', label: 'Image builds', kind: 'flow', componentIds: ['image-builds'] },
        { id: 'operations-automation', label: 'Operations automation', kind: 'flow', componentIds: ['operations-automation'] },
        { id: 'reference-topology', label: 'Reference topology', kind: 'flow', componentIds: ['reference-topology'] }
      ]
    },
    relations: [
      { from: 'image-builds', to: 'reference-topology', label: 'Provides repeatable base images', shortLabel: 'Base images' },
      { from: 'ansible-contracts', to: 'reference-topology', label: 'Configures target systems', shortLabel: 'Configuration' },
      { from: 'operations-automation', to: 'reference-topology', label: 'Operates target systems', shortLabel: 'Operations' }
    ]
  },
  esusdata: {
    area: 'Primary care observatory',
    componentIds: ['pec-source', 'execution-plane', 'verified-extract', 'local-coordination', 'c1-rule', 'results', 'authorized-dashboard'],
    primaryComponentId: 'local-coordination',
    diagram: { stages: [
      { id: 'source', label: 'Read-only source', kind: 'flow', componentIds: ['pec-source'] },
      { id: 'acquisition', label: 'Bounded acquisition', kind: 'flow', componentIds: ['execution-plane', 'verified-extract'] },
      { id: 'local-core', label: 'Local computation', kind: 'flow', componentIds: ['local-coordination', 'c1-rule'] },
      { id: 'publication', label: 'Conditional publication', kind: 'flow', componentIds: ['results', 'authorized-dashboard'] }
    ] },
    relations: [
      { from: 'pec-source', to: 'execution-plane', label: 'Provides read-only source rows within a budget', shortLabel: 'Bounded source rows' },
      { from: 'execution-plane', to: 'verified-extract', label: 'Writes and hashes a local extract', shortLabel: 'Verified extract' },
      { from: 'verified-extract', to: 'local-coordination', label: 'Supplies a checked data file and manifest', shortLabel: 'Data file and manifest' },
      { from: 'local-coordination', to: 'c1-rule', label: 'Invokes the versioned indicator rule', shortLabel: 'Versioned calculation' },
      { from: 'c1-rule', to: 'results', label: 'Stages a result subject to methodological gates', shortLabel: 'Gated result' },
      { from: 'results', to: 'authorized-dashboard', label: 'Serves published evidence under a municipal grant', shortLabel: 'Authorized evidence' }
    ]
  }
};
