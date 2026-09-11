# SO-11 verification

The screenshots show the five-district Observatory and failed Infrastructure state at 1440px and 390px. They are produced by the Explorer browser tests against the static build.

- `npm ci`: successful, zero reported vulnerabilities.
- `npm test`: 31 passing, one build-only check skipped (covered by smoke).
- `npm run build`: successful; existing project routes preserved.
- `npm run smoke`: static HTML, anchors, sitemap, CNAME, resume and all 11 asset checks passed.
- `npm run test:explorer`: 13 passed, including keyboard, touch, fragments/history, no JavaScript, unavailable WebGL and reduced motion. No 3D assets requested or horizontal overflow in Explorer checks.
- `npm run gallery:verify`: desktop/mobile no-JS posters, unavailable WebGL fallback and optional GLB viewer passed.
- Independent local code review: no actionable findings; 11 focused tests passed.

The Infrastructure screenshot captures node-02 failed, workload on node-01 and three logical timeline events. Reset restores the original poster, three online nodes and empty timeline. These are synthetic states, without operational metrics.

Regenerate only the failure pair with `rtk proxy node --experimental-strip-types scripts/assets/generate.mjs detail-infrastructure-failed`. The original GLBs remain unchanged. PR review and production/deployment evidence are recorded on issue #22.
