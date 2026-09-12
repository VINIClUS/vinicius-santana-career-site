import type { ProjectId } from './projects.ts';

/** Presentation choices only. Project facts and evidence belong to caseStudies. */
export interface ProjectPresentation {
  id: ProjectId;
  visualMode: 'data-flow' | 'telemetry' | 'cluster';
  systemHeading: string;
  simulationPlacement?: 'system-view' | 'after-engineering';
  simulation?: 'cnesdata-write' | 'infrastructure-failover';
}

export const cnesdataPresentation = {
  id: 'cnesdata',
  visualMode: 'data-flow',
  systemHeading: 'System View',
  simulation: 'cnesdata-write',
} as const satisfies ProjectPresentation;

export const infrastructurePresentation = {
  id: 'infrastructure', visualMode: 'cluster', systemHeading: 'System View',
  simulation: 'infrastructure-failover', simulationPlacement: 'system-view',
} as const satisfies ProjectPresentation;

export const limnopulsePresentation = {
  id: 'limnopulse',
  visualMode: 'telemetry',
  systemHeading: 'System View',
} as const satisfies ProjectPresentation;
