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

## Release gate

Clean-checkout checks, screenshots and full/partial generation are recorded below. Release links are recorded on the task and EPIC after production verification. This document does not claim production release before the reviewed commit is merged and deployed. Issues #36 and #29 remain open until that evidence is attached.

## Loading observations

Reused `scripts/measure-home.mjs` against separate builds of the baseline and cleanup, sequentially without other browser/test workloads. Chromium 153.0.8010.12; cold cache each run; 10 Mbps down / 1 Mbps up, 40 ms latency, CPU ×4. Three runs per viewport. Mobile scrolls the preview into view before activation. Raw [before](before.json) and [after](after.json) retain request sizes, image readiness, long tasks and draw timing. Values below are medians in milliseconds unless labeled bytes.

| Viewport | Build | HTML at DCL | Poster response end | Complete preview | JS transferred (bytes) | Models transferred (bytes) | Long-task total | Idle draws (all runs) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| desktop | before | 441.7 | 152.9 | 1259 | 157814 | 193844 | 848 | 0, 0, 0 |
| desktop | after | 332.9 | 133.7 | 1153.8 | 157563 | 193844 | 624 | 0, 0, 0 |
| mobile | before | 344.4 | 135.6 | 1205.7 | 157814 | 193844 | 781 | 0, 0, 0 |
| mobile | after | 328.4 | 130.5 | 1052.4 | 157563 | 193844 | 580 | 0, 0, 0 |

All twelve runs exposed visible hero/CTA HTML at DOMContentLoaded, loaded the responsive poster and reached a complete preview. Retired posters were already unrequested by Home: their removal reduces published storage, not Home image transfer. Models and runtime are preserved; timing differences in these three-run samples are observations, not a causal speedup claim. These are local site-presentation measurements, not latency, throughput or recovery claims for any depicted system.

## Review corrections

The initial standards review identified three removed selectors still used by dynamic Atlas district classes (`explorer-area`, `area-limnopulse`, `area-infrastructure`). They were restored before final validation. The unreferenced plural grid selector and retired generic layout selectors remain removed. This preserves the existing card borders, backgrounds and selection appearance. Final evidence is captured after the correction.

## Clean checkout and content audit

Detached checkout of `73b90f1` started with an empty `git status --porcelain`. `rtk npm ci`, `rtk npm test`, `rtk npm run build`, `rtk npm run smoke`, and `rtk git diff --check` all exited 0. Unit/contract results: 43 passed, one build-only skip; smoke: 13 asset checks passed. [Raw command results](clean-checks.json). `rtk npm run test:explorer` passed **88/88 in 2.9 minutes**; `rtk npm run gallery:verify` passed all responsive/no-JavaScript/WebGL/GLB checks. The full required clean-checkout gate passed.

Source and built-content audit found one canonical narrative per project; normal work links target `/explore/*`, compatibility documents have no duplicated graphics or project body. Home identifies the map as conceptual, not live. CnesData distinguishes implemented contracts from planned processing/deployment and denies production rollout/scale claims. LimnoPulse distinguishes its local scaffold and documented cloud resources from an unverified production fleet. Infrastructure describes a sanitized synthetic scenario, with no runtime inventory or recovery/uptime metric. Public evidence URLs and factual content were preserved; this cleanup introduces no new performance or operational claims. Automated metadata/link/private-identifier checks complement this source review; they do not prove every conceivable factual or privacy property.

Screenshots were inspected for Home desktop and Atlas mobile after restoration: district-colored cards, three-project composition, navigation and content remain visible without horizontal clipping. Responsive image readiness, all canonical/compatibility links and eight sitemap URLs are checked in the capture report. The local Astro preview returns 404 for `/CNAME`; local verification compares `dist/CNAME` byte-for-byte to the baseline and records that distinction. Production verification requires a served 200 response.

## Browser evidence coverage

[Local capture report](local/report.json) records all eight canonical and four compatibility pages, sitemap, 61 internal links/fragments, preserved hashes and 30 desktop/mobile screenshots. Normal captures require actual graphics readiness; CnesData/LimnoPulse remain static System Views. Additional screenshots cover all three CnesData outcomes, Infrastructure failure/reset in 2D, and all five work surfaces without JavaScript under reduced motion at 1440×900 and 390×844.

The existing browser suites cover keyboard selection/history, CnesData scenario switching/reset, Infrastructure failure/reset, View 2D, reduced motion, no JavaScript/WebGL, blocked/delayed imports and models, one startup deadline, context loss, cancellation, late completion, focus preservation, and idle rendering. Dedicated older Infrastructure interaction suites use 390×900; release journeys and the new captures additionally use 390×844. These are focused tests, not a claim that every scenario was run in every possible browser/viewport combination.

Visual inspection also covered Home mobile, Atlas desktop/mobile, LimnoPulse desktop and Infrastructure no-JavaScript mobile. Fixed-header overlap in initial simulation screenshot crops was corrected by capturing from the top of the full page; this changed only the evidence script.

[Preserved-file hashes](preserved.json) confirm byte identity of CNAME, resume, package manifests, Astro/Pages configuration, illustration prompts and the historical SO-07 inventory against the baseline.

The code/assets/tests verified in `73b90f1` remain unchanged in subsequent evidence-only commits. Final PR CI validates the complete HEAD again. Local two-axis review found no remaining standards or implementation-spec defects after the CSS restoration; release evidence gaps are completed in the following sections.

## Generation validation

[Generation results](generation.json), reproduced with [generation-check.py](generation-check.py) from a detached disposable checkout of `73b90f1`: full `rtk npm run assets:generate` and partial `rtk npm run assets:generate -- hub` both exited 0. Before the partial run, obsolete public-health/observability district entries, Home/Work metadata and stale overview placements were deliberately injected. Normalization removed them; the manifest retained exactly eight supported identities, 16 posters and six GLBs. CnesData/Infrastructure detail and failure metadata survived partial generation unchanged. No retired asset reappeared.

Generated raster changes remain only in the disposable checkout. No new pixels, GLBs or generated metadata were copied into the release branch. The deliberate ten-poster deletion is the only public asset change.

## Release tracking

Implementation and local evidence are complete. The PR will reference #36/#29 without automatic closure. Exact-HEAD Codex review and green CI are required before squash merge; production verification follows the Pages deploy. Immutable PR/review/CI/deploy/merge links and production evidence are recorded on #36 and #29 after release, avoiding a post-review modification of the released tree.
