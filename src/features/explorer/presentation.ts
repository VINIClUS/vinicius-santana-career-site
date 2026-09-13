import type { ProjectId } from './projects.ts';

/** Presentation choices only. Project facts and evidence belong to caseStudies. */
export interface ProjectPresentation {
  id: ProjectId;
  visualMode: 'data-flow' | 'telemetry' | 'cluster';
  systemHeading: string;
}

export const cnesdataPresentation = {
  id: 'cnesdata',
  visualMode: 'data-flow',
  systemHeading: 'System View',
} as const satisfies ProjectPresentation;

export const infrastructurePresentation = {
  id: 'infrastructure', visualMode: 'cluster', systemHeading: 'System View',
} as const satisfies ProjectPresentation;

export const limnopulsePresentation = {
  id: 'limnopulse',
  visualMode: 'telemetry',
  systemHeading: 'System View',
} as const satisfies ProjectPresentation;
