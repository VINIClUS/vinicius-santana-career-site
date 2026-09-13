import limno from './data/limnopulse-end-to-end.json' with { type: 'json' };
import exhaustion from './data/infra-exhaustion-recovery.json' with { type: 'json' };
import quorum from './data/infra-quorum-recovery.json' with { type: 'json' };
import scaling from './data/infra-provision-scale.json' with { type: 'json' };
import cnesdata from './data/cnesdata-end-to-end.json' with { type: 'json' };
import type { Scenario } from './types.ts';
export const scenarios: Scenario[] = [limno, exhaustion, quorum, scaling, cnesdata];
