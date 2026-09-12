# SA-07 — migration cleanup validation

Base: `c686a4714b7b1c21c0d8a21a98932ed7d3d7604c` (SA-06). Task #36, EPIC #29; normative source: [approved specification](../../superpowers/specs/2026-09-11-systems-atlas-navigation-project-experience-spec-v2.md).

Work is isolated in `feat/sa-07-atlas-release`. The original checkout and its untracked files are preserved. No dependency, engine, hosting, domain or resume changes are intended. [Removal inventory](inventory.md) records active-reference evidence and retained historical provenance.

## Execution ledger

- Baseline `npm ci`: 267 packages, zero reported vulnerabilities. npm reported esbuild's install script blocked; build succeeded with the installed package.
- Baseline `npm test`: 43 passed, one built-output asset check deferred to smoke.
- Baseline build: 13 static pages, eight canonical sitemap URLs; existing large-chunk warning.
- Baseline loading: six cold-cache Chromium runs captured in [before.json](before.json), three per viewport, 1440×900 and 390×844.
- Implementation: retired components, generic route branch, exclusive styles and ten Home/Work posters removed; manifest/gallery reduced to active eight poster pairs and six models. Build paths validate collection IDs against `projectIds` before generating any route.
- Historical prompts, inventories and screenshots retain their content/provenance, with adjacent supersession notices; active documentation describes Work → Atlas and controller-owned state.

## Verification pending

Final clean-checkout checks, generation runs, screenshots and release links are recorded below as they complete. This document does not claim production release before the reviewed commit is merged and deployed. Issues #36 and #29 remain open until that evidence is attached.

## Loading observations

Reused `scripts/measure-home.mjs` against separate builds of the baseline and cleanup, sequentially without other browser/test workloads. Chromium 153.0.8010.12; cold cache each run; 10 Mbps down / 1 Mbps up, 40 ms latency, CPU ×4. Three runs per viewport. Mobile scrolls the preview into view before activation. Raw [before](before.json) and [after](after.json) retain request sizes, image readiness, long tasks and draw timing. Values below are medians in milliseconds unless labeled bytes.

| Viewport | Build | HTML at DCL | Poster response end | Complete preview | JS transferred (bytes) | Models transferred (bytes) | Long-task total | Idle draws (all runs) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| desktop | before | 441.7 | 152.9 | 1259 | 157814 | 193844 | 848 | 0, 0, 0 |
| desktop | after | 486.6 | 160.7 | 1249 | 157563 | 193844 | 887 | 0, 0, 0 |
| mobile | before | 344.4 | 135.6 | 1205.7 | 157814 | 193844 | 781 | 0, 0, 0 |
| mobile | after | 358.8 | 145 | 1394.8 | 157563 | 193844 | 729 | 0, 0, 0 |

All twelve runs exposed visible hero/CTA HTML at DOMContentLoaded, loaded the responsive poster and reached a complete preview. Retired posters were already unrequested by Home: their removal reduces published storage, not Home image transfer. Models and runtime are preserved; timing differences in these three-run samples are observations, not a causal speedup claim. These are local site-presentation measurements, not latency, throughput or recovery claims for any depicted system.

## Review corrections

The initial standards review identified three removed selectors still used by dynamic Atlas district classes (`explorer-area`, `area-limnopulse`, `area-infrastructure`). They were restored before final validation. The unreferenced plural grid selector and retired generic layout selectors remain removed. This preserves the existing card borders, backgrounds and selection appearance. Final evidence is captured after the correction.
