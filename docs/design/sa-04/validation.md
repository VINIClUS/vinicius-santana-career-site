# SA-04 validation

Base: `8b1a30ef5c057a35e09474103000b9bfe5f81b44`. Scope: Issue #33 only.

## Delivered contracts

Infrastructure uses the canonical ProjectDetail shell and unchanged collection facts/evidence. `cluster` places `infrastructure-failover` inside System View; CnesData retains its default placement. Legacy component, architecture-title, infra-title, details-title and limits-title anchors remain. The alternate internal case-study link is absent.

HTML initializes one ExplorerController before dynamic graphics. Renderer subscription only projects the current InfraState. Workload positions are absolute; original materials and positions restore on reset/disposal; failure materials are reused. The scenario remains exactly node-02 failure, transfer of one workload to node-01, shared layer available, three synthetic events.

The first valid frame reads the latest controller snapshot. One 15-second deadline includes import and asset loading. Each visit has an epoch and abortable model cache; timeout, View 2D, graphics/context failure and pagehide dispose graphics without resetting the controller. Explicit View 3D retries. Frames only run after state/size/visibility changes; document/section hiding suspends drawing. All visual updates are immediate, including reduced motion. Without JS, static narrative, poster, initial state and complete transcript remain; simulation controls are disabled.

## Verification

- Baseline: npm ci, npm test (33 passed, one build-only check skipped).
- Focused graphics tests: repeated initial/failure/reset/new failure, immutable snapshots, healthy material identity, original material restoration, idempotent disposal, invalid semantic model, aborted late GLTF parsing.
- Static smoke: all collection narrative, component descriptions/statuses, evidence, metadata and unique anchors; no alternate Infrastructure case-study link; unchanged CNAME/PDF; Atlas still never loads project detail models.
- Browser tests: 1440/390 failure/reset, keyboard/focus, 2D↔3D, latest-state first-frame image equality, delayed import/model single deadline, cancellation, invalid assets, real WebGL context loss, Save-Data, no WebGL, no JS, reduced motion, overflow, demand frames and persisted lifecycle events.
- Initial full browser run: 39 passed, three obsolete navigation expectations failed. Those assertions now follow the canonical shell; final rerun: all 52 passed.

## Loading comparison

Final candidate including the integrated SA-03 changes versus the original `8b1a30e` base. Same local Python static server, Chromium, cold browser context/cache disabled, DPR 1, reduced motion, viewport 1440×900 / 390×900, 40 ms latency, 1,250,000 bytes/s down and 625,000 bytes/s up. One sample per viewport/build; these are diagnostic resource measurements, not performance claims or production recovery metrics. Transfer bytes include resource response overhead and exclude the HTML document. Raw output and routine screenshots live under `test-results/sa-04/`.

| Viewport | Base initial resources | SA-04 initial resources | Additional graphics after visibility |
| --- | ---: | ---: | ---: |
| 1440 | 67,505 B | 78,062 B | 624,450 B |
| 390 | 58,841 B | 69,398 B | 624,450 B |

Both viewports request zero graphical JS/model resources before visibility. Activation requests the Infrastructure renderer (4,142 B), shared Three/GLTF resource chunk (597,896 B), and only `detail-infrastructure.glb` (22,412 B). No other project model downloads. The shared Three chunk still produces the existing build size warning; it is behind dynamic import. No dependency was added.

## Visual inspection

Inspected 1440 and 390 full-page 3D failure screenshots from `tests/browser/infrastructure-3d.spec.ts`: narrative/evidence legible, node-02 red, workload above node-01, healthy nodes unchanged, responsive stacking and no horizontal overflow. Routine captures remain in `test-results/`, not committed binary artifacts. The 390 px no-JavaScript screenshot was also inspected: initial poster/state, disabled controls, complete transcript, narrative and evidence remain available.

## Official sources consulted (2026-09-12)

Context7 `resolve-library-id` was attempted for Three.js and returned “Monthly quota exceeded.” The current unversioned manual URLs returned 404; consulted official source pinned to the installed Three revision instead:

- [Three.js r183: rendering on demand](https://github.com/mrdoob/three.js/blob/r183/manual/en/rendering-on-demand.html): invalidate/request one frame per change; avoid a continuous loop.
- [Three.js r183: disposing objects](https://github.com/mrdoob/three.js/blob/r183/manual/en/how-to-dispose-of-objects.html): geometry/material/texture ownership, shared resource deduplication, ImageBitmap.close, explicit renderer disposal.
- [React: useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore): stable external snapshot/subscription and unsubscribe semantics. This implementation uses direct Three plus the existing controller subscription, so it does not require a React bridge or another store.

## Actual bfcache check

Chromium 153 full headless browser, launched with Playwright's `--disable-back-forward-cache` default removed. Navigated from failed Infrastructure to `/about/` and back using `waitUntil: 'commit'` (a cached page does not emit another load event). Observed `{ persisted: true, state: 'Workload: node-01', canvas: 0 }`; explicit View 3D restored the scene with `Workload: node-01`. This supplements the deterministic persisted-event regression test.

Browser binaries were isolated under `/tmp/sa04-browsers` after the Playwright CDN download timed out; the same official Chrome-for-Testing revision was downloaded from Google's storage endpoint. Validation commands use `PLAYWRIGHT_BROWSERS_PATH=/tmp/sa04-browsers`; this is an environment-only setting and adds no repository dependency.

## Final ordered validation

1. `rtk npm ci`: passed; 0 vulnerabilities.
2. `rtk npm test`: passed; 36 tests passed, one build-only test intentionally skipped.
3. `rtk npm run build`: passed (existing dynamically loaded Three chunk size warning).
4. `rtk npm run smoke`: passed, including all 13 asset checks and content-equivalence assertions.
5. `rtk npm run test:explorer`: all 52 tests passed, including 10 new Infrastructure 3D tests.
6. `rtk git diff --check`: passed.

Independent local spec and integration reviews found no major issues. PR/CI/review/deploy links and reviewed/merged SHAs are recorded in the Issue #33 release comment after publication verification.

## Concurrent SA-03 integration

While the initial PR review was running, `main` advanced to `b36822c` (SA-03 / #40). The initial review confirmed no major issues for `b340a292032e293734b0a9d253e3df8a01b732a1`, but merge was correctly held because the branch had conflicts. The update preserves both canonical project branches, both presentation definitions, both content-equivalence suites, and the absence of alternate links for both projects. No Infrastructure controller/renderer logic changed. Full ordered validation and a new exact-HEAD review are required after this integration; the initial approval is not reused.

Post-integration ordered rerun completed successfully: npm ci; npm test (37 passed, one build-only skip); build; smoke (13 asset checks plus all three canonical content suites); test:explorer (58 passed); git diff --check. Repeated loading capture under the same profile; table above reflects the final integrated candidate. Viewport initial/failure captures are `test-results/sa-04/sa04-{initial,failed}-{1440,390}.png`.
