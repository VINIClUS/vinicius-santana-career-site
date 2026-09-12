import { projectIds } from './projects.ts';
import type { DistrictId } from '../../content/scenes/types.ts';
export type { AtlasDistrictId, DistrictId } from '../../content/scenes/types.ts';

export const districtIds = projectIds;
export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly kind: 'project';
  readonly label: string;
  readonly description: string;
  readonly href: string;
}
export const districtRegistry = {
  cnesdata: { id: 'cnesdata', kind: 'project', label: 'CnesData', description: 'Follow the contracts, ingestion boundaries and processing architecture of a public-health data platform.', href: '/explore/cnesdata/' },
  infrastructure: { id: 'infrastructure', kind: 'project', label: 'Infrastructure', description: 'Explore repeatable infrastructure and a synthetic three-node failure and workload-transfer scenario.', href: '/explore/infrastructure/' },
  limnopulse: { id: 'limnopulse', kind: 'project', label: 'LimnoPulse', description: 'Trace environmental telemetry through authorized readings, alert evaluation and notification delivery.', href: '/explore/limnopulse/' },
} as const satisfies Readonly<Record<DistrictId, DistrictDefinition>>;
