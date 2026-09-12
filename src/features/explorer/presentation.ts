import type { ProjectId } from './projects.ts';

/** Presentation choices only. Project facts and evidence belong to caseStudies. */
export interface ProjectPresentation {
  id: ProjectId;
  visualMode: 'data-flow' | 'telemetry' | 'cluster';
  systemHeading: string;
  simulation?: 'cnesdata-write' | 'infrastructure-failover';
}

export const cnesdataPresentation = {
  id: 'cnesdata',
  visualMode: 'data-flow',
  systemHeading: 'System View',
  simulation: 'cnesdata-write',
} as const satisfies ProjectPresentation;
