import type { DistrictId } from '../../content/scenes/types.ts';
export type { DistrictId } from '../../content/scenes/types.ts';

export const districtIds = ['cnesdata', 'public-health', 'infrastructure', 'observability', 'limnopulse'] as const satisfies readonly DistrictId[];
export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly kind: 'project' | 'domain';
  readonly label: string;
  readonly description: string;
  readonly href: string;
}
export const districtRegistry = {
  cnesdata: { id: 'cnesdata', kind: 'project', label: 'Data Platform / CnesData', description: 'Follow the contracts, ingestion boundaries and processing architecture of a public-health data platform.', href: '/explore/cnesdata/' },
  'public-health': { id: 'public-health', kind: 'domain', label: 'Public Health Systems', description: 'Explore experience connecting public-health services, information systems and the people who use them.', href: '/#experience' },
  infrastructure: { id: 'infrastructure', kind: 'project', label: 'Infrastructure / Proxmox & HA', description: 'Explore repeatable infrastructure and a synthetic three-node failure and workload-transfer scenario.', href: '/explore/infrastructure/' },
  observability: { id: 'observability', kind: 'domain', label: 'Observability / Monitoring & Insights', description: 'Discover the monitoring and diagnostic tools used to understand system behavior and support operations.', href: '/#stack' },
  limnopulse: { id: 'limnopulse', kind: 'project', label: 'LimnoPulse / Environmental Data', description: 'Trace environmental telemetry through authorized readings, alert evaluation and notification delivery.', href: '/explore/limnopulse/' },
} as const satisfies Readonly<Record<DistrictId, DistrictDefinition>>;
