# SO-08 — progressive 3D Observatory

Implements Issue #12 on the SO-11 baseline (`0e1d996`), under EPIC #4. The [approved reference](../systems-observatory-visual-reference.png), especially panel 02, and the [SO-07 asset kit](../so-07-asset-kit.md) supply the composition and art direction. The three project routes and their synthetic simulations keep their existing contracts.

The Observatory renders the hub and all five district GLBs automatically on capable browsers. CnesData and Infrastructure details replace only the selected district's maquette, fitted to its footprint. Labels and destination links stay in HTML. A poster is visible until the six overview models and first rendered frame are ready; **View 2D** restores the poster, label positions, selection and keyboard focus.

## Visual evidence

Captured with Chromium at 1440×900 and 390×844. The images are full-page captures; the viewport sizes determine the desktop/portrait camera and layout.

- [Desktop overview](observatory-1440.png)
- [Mobile overview](observatory-390.png)

Inspection against panel 02: the central luminous hub, five distinct architectural maquettes, isometric camera, navy/slate materials, thin grid and restrained highlights preserve the reference's visual direction. The portrait composition uses SO-07's mobile placements, keeping all five HTML selectors readable. The runtime uses SO-07's simpler editable geometry, as established in that asset delivery. Broader shared-shell/About/Resume integration remains in #13.

## Browser acceptance

`tests/browser/observatory-3d.spec.ts` adds sixteen scenarios using real Chromium WebGL:

| Contract | Evidence |
| --- | --- |
| Automatic enhancement | Exactly six overview requests; actual WebGL draw calls before ready; no continuous drawing while idle |
| Immediate HTML/2D | Hold the final overview model; poster and native article focus remain usable |
| One selection source | Click each of the five maquettes, check fragment/HTML selection and unchanged scroll position; back/forward selection |
| Lazy details | No initial detail requests; delayed CnesData finishes after Infrastructure without changing the visible scene; revisit reuses each download |
| Explicit 2D | Abort a pending detail; restore original label styles and selected-link focus; retain history; reload permits 3D again |
| Capability gates | Save-Data and missing WebGL download neither renderer nor models |
| Automatic fallback | Failed module import, failed renderer initialization, malformed overview GLB, failed detail fetch and real `WEBGL_lose_context` |
| Page exit | Leave during a delayed renderer import; no late model downloads or canvas on Home; return navigation remains usable |
| Camera | Desktop/mobile zoom limits 0.9–1.2, independently projected orbit limits of ±15°/±5°, reset, breakpoint resize and touch selection |
| Reduced motion | Stable canvas between idle frames; 3D selection stays available |
| Home isolation | No Observatory renderer or GLB requests on Home |

Existing browser tests retain five-district keyboard/fragment/focus navigation, disabled-JavaScript destinations, forced 2D layouts and the CnesData/Infrastructure scenarios. Static smoke verifies public routes, compatibility anchors, resume PDF, CNAME, metadata, sitemap and byte-identical published assets.

## Validation record

Run from the SO-08 worktree on 2026-09-11, in the required order:

- `rtk npm ci` — installed successfully; audit reports no vulnerabilities.
- `rtk npm test` — 31 passed; the single build-only asset check is deliberately deferred to smoke.
- `rtk npm run build` — all 13 pages generated.
- `rtk npm run smoke` — static contracts and all 11 asset checks passed.
- `rtk npm run test:explorer` — all 33 browser tests passed (16 new, 17 existing).

Vite reports its size warning for the dynamically imported renderer (about 778 kB raw / 204 kB gzip). That payload is requested only on capable `/explore/` visits; the Home and project pages retain their existing bundles. DPR is capped at 1.5 and frames render on demand. No new hosting, analytics, backend or live system data is introduced.

Review, CI, merge and published verification links are recorded on the SO-08 PR and Issue #12. EPIC #4 remains open for #13.
