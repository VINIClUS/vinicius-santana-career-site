import { projectIds } from './projects.ts';
import type { DistrictId } from '../../content/scenes/types.ts';
export type { AtlasDistrictId, DistrictId } from '../../content/scenes/types.ts';

export const districtIds = projectIds;
export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly kind: 'project';
  readonly label: string;
  readonly description: string;
  readonly area: string;
  readonly stack: readonly string[];
  readonly href: string;
}
export const districtRegistry = {
  cnesdata: { id: 'cnesdata', kind: 'project', label: 'CnesData', description: 'Follow the contracts, ingestion boundaries and processing architecture of a public-health data platform.', area: 'Health-data extraction and platform', stack: ['Go', 'Python'], href: '/explore/cnesdata/' },
  infrastructure: { id: 'infrastructure', kind: 'project', label: 'Infrastructure', description: 'Explore repeatable infrastructure and a synthetic three-node failure and workload-transfer scenario.', area: 'Automation, images and operations', stack: ['Ansible', 'Packer'], href: '/explore/infrastructure/' },
  limnopulse: { id: 'limnopulse', kind: 'project', label: 'LimnoPulse', description: 'Trace environmental telemetry through authorized readings, alert evaluation and notification delivery.', area: 'Telemetry and alerts', stack: ['FastAPI', 'Go'], href: '/explore/limnopulse/' },
  esusdata: { id: 'esusdata', kind: 'project', label: 'Esusdata', description: 'Trace bounded PEC acquisition, a verifiable local extract, and a methodologically gated C1 indicator.', area: 'Local acquisition and primary-care indicators', stack: ['Rust', 'Java'], href: '/explore/esusdata/' },
} as const satisfies Readonly<Record<DistrictId, DistrictDefinition>>;
