# SA-01 loading and composition evidence

This directory records cold-cache, same-profile evidence for the `/explore/` scene. The baseline is the immutable static build at `/tmp/sa-01-baseline-dist`, created from commit `d164ca1bf63be51c04472b6fba7bd2746e11bb72` before the SA-01 changes.

Run the baseline capture from the worktree root:

```sh
node docs/design/sa-01/capture-loading-evidence.mjs /tmp/sa-01-baseline-dist baseline 4330
```

After building the candidate into `dist/`, run the same capture with a different port:

```sh
node docs/design/sa-01/capture-loading-evidence.mjs dist after 4331
```

Each viewport gets an initial full-page screenshot, a screenshot after selecting CnesData, screenshots at the zoom-in and zoom-out limits, and machine-readable metrics. Every viewport uses a fresh Chromium context with the cache disabled through CDP. `encodedBytes` is CDP's transferred byte count, including response headers; it is suitable for relative comparisons between these captures and differs slightly from the asset's file size.

The timing fields are local wall-clock time until Playwright's network-idle condition. They are environment-sensitive and are included only to compare runs made in this container, on the same local server and Chromium profile. They are not representative page-load targets or claims about production performance. The metrics record the WebGL vendor and renderer reported by each page; this container may render through SwiftShader rather than a hardware GPU.

## Baseline observation

At both 1440×900 and 390×900, the initial scene fetched six GLBs totaling 316,722 encoded bytes. Selecting CnesData fetched one additional detail GLB totaling 59,095 encoded bytes. The initial screenshots show the five-district composition; the detail screenshots preserve the selected-state composition for comparison with the candidate.

## Candidate comparison

The candidate fetched four initial GLBs totaling 193,280 encoded bytes at both viewports: 2 fewer requests and 123,442 fewer encoded bytes (39.0%) than baseline. Selecting CnesData made no additional model request, compared with one 59,095-byte detail-model request in baseline. Across initial load plus that selection, the measured model transfer fell from 375,817 to 193,280 encoded bytes (48.6%).

The full-page screenshots retain the requested browser viewport in their names; their PNG heights expand to the rendered document height (desktop 1440×1893, mobile 390×2378). The final candidate composition is clear at both viewport sizes. The metrics include projected DOM rectangles and pairwise separation for every project label and the hub caption. No label rectangles overlap in any measured state. Desktop minimum separations are 65px initially, 82px at maximum zoom-in and 56px at maximum zoom-out. Mobile minimum separations are 15px initially, 23px at maximum zoom-in and 12px at maximum zoom-out. The hub cube and its caption remain visible and distinct from the CnesData label in all three mobile captures. At maximum zoom-in, scene geometry approaches the stage edges while all project labels remain readable.

## Verification

Final local validation on 2026-09-12:

| Check | Result |
| --- | --- |
| `rtk npm ci` | Installed locked dependencies; no manifest/lock changes |
| `rtk npm test` | Typechecks passed; 33 tests passed, one build-only check skipped |
| `rtk npm run assets:generate -- overview` | Desktop/mobile posters and metadata regenerated |
| `rtk npm run build` | 13 static pages built |
| `rtk npm run smoke` | Static route checks and all 13 asset checks passed, including byte-identical output |
| `rtk npm run test:explorer` | All 40 browser tests passed |
| `rtk git diff --check` | Passed |

Browser regressions cover all three canonical links, keyboard and tap selection, native/canvas focus and history, unknown and retired fragments, hub non-selection, no-JavaScript content and secondary destinations, unavailable WebGL, Save-Data, reduced motion, demand rendering, first-frame readiness, blocked import/invalid model/initialization/context failure, the shared 15-second deadline, View 2D during loading, canceled essential downloads, late completion, pagehide/persisted-pageshow navigation, responsive camera/zoom/reset and vertical touch scrolling started inside the initialized canvas. Existing project walkthrough and Infrastructure simulation suites also pass.

Independent local source review found no remaining actionable standards or SA-01 specification issues. The PR records the required exact-HEAD Codex review and CI; release confirmation is recorded in issue #30 after deployment. The usual large-renderer-chunk build advisory remains; the renderer is still loaded progressively only on the Atlas.
