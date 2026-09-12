export const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'] as const;
export type ProjectId = (typeof projectIds)[number];
export interface ProjectRelation { readonly from: string; readonly to: string; readonly label: string; }
export interface ProjectDefinition { readonly area: string; readonly componentIds: readonly string[]; readonly relations: readonly ProjectRelation[]; }

export const projectDefinitions: Readonly<Record<ProjectId, ProjectDefinition>> = {
  cnesdata: {
    area: 'Data platform',
    componentIds: ['canonical-contracts', 'edge-agent', 'central-api', 'tenant-isolation', 'web-dashboard', 'parquet-to-gold', 'kubernetes'],
    relations: [
      { from: 'canonical-contracts', to: 'edge-agent', label: 'Defines extraction payloads' },
      { from: 'canonical-contracts', to: 'central-api', label: 'Defines API contracts' },
      { from: 'edge-agent', to: 'central-api', label: 'Registers extraction manifests' },
      { from: 'central-api', to: 'tenant-isolation', label: 'Carries tenant context' },
      { from: 'web-dashboard', to: 'central-api', label: 'Uses typed API contracts' },
      { from: 'central-api', to: 'parquet-to-gold', label: 'Creates planned processing work' },
      { from: 'kubernetes', to: 'central-api', label: 'Represents the planned deployment shape' }
    ]
  },
  limnopulse: {
    area: 'Water telemetry',
    componentIds: ['telemetry-api', 'alert-rules', 'evaluator', 'notifications', 'mqtt-ingestion', 'cloud-infrastructure', 'production-device-layer'],
    relations: [
      { from: 'mqtt-ingestion', to: 'telemetry-api', label: 'Makes local readings available through InfluxDB for authorized API queries' },
      { from: 'alert-rules', to: 'evaluator', label: 'Defines versioned rules for one-shot evaluation' },
      { from: 'evaluator', to: 'mqtt-ingestion', label: 'Queries reading windows in InfluxDB populated by the local ingestion scaffold' },
      { from: 'evaluator', to: 'alert-rules', label: 'Persists durable alert events and outboxes in DynamoDB' },
      { from: 'alert-rules', to: 'notifications', label: 'An outbox relay publishes per-channel notification work to SQS' },
      { from: 'cloud-infrastructure', to: 'evaluator', label: 'Documents managed resources and external scheduling prerequisites' },
      { from: 'production-device-layer', to: 'mqtt-ingestion', label: 'Marks a planned production boundary beyond the local scaffold' }
    ]
  },
  infrastructure: {
    area: 'Infrastructure',
    componentIds: ['ansible-contracts', 'image-builds', 'operations-automation', 'reference-topology'],
    relations: [
      { from: 'image-builds', to: 'reference-topology', label: 'Provides repeatable base images' },
      { from: 'ansible-contracts', to: 'reference-topology', label: 'Configures target systems' },
      { from: 'operations-automation', to: 'reference-topology', label: 'Operates target systems' }
    ]
  }
};
