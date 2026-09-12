# Systems Atlas and project explorer contracts

Astro renders a Systems Atlas overview and three project routes using the case-study collection. Architecture IDs live in `src/content/case-studies.yaml`; titles, descriptions and evidence statuses are reused from that collection. `src/features/explorer/projects.ts` supplies only project IDs, areas, component IDs and illustrative relationships. Scene nodes reuse those IDs, scoped to their project.

`createExplorerController(projectId)` exposes `getState()`, `dispatch(command)` and `subscribe(listener)`, which returns an unsubscribe function. State holds `projectId`, `selectedComponentId` and the corresponding optional `simulation` (CnesData) or `infrastructureSimulation`. `SELECT_COMPONENT` changes selection independently of simulation. `SELECT_SCENARIO` and `STEP` affect only CnesData; `FAIL_NODE` affects only Infrastructure. `RESET` resets the current project's simulation. LimnoPulse ignores simulation commands. Project switching uses ordinary route navigation and creates a fresh controller with default state, without persistence.

The DOM is a projection of controller state. Component fragments support initial deep links, keyboard navigation and browser history. All detail articles remain in HTML; selection adds a visible label, border and focus. If JavaScript cannot initialize, component links and all three build-time transcripts remain usable, while simulation controls stay disabled. No React, canvas or renderer is involved.

CnesData uses fictional keys/content only. Results are synthetic and illustrative; they do not demonstrate backend calls, authentication, conversion, Parquet generation, latency or the production status of architecture components. Infrastructure relationships are sanitized illustrative references.

## Three project districts

`projectIds` in `src/features/explorer/projects.ts` is the identity source: `['cnesdata', 'limnopulse', 'infrastructure']`. `AtlasDistrictId = ProjectId`; `DistrictId` is a compatibility alias. `districtIds` derives from `projectIds`. The registry owns each project's label, summary and matching `/explore/{id}/` destination. The initial HTML always includes all three selectors, summaries and canonical links.

Public Health appears as secondary domain context with `/#experience`; Observability is a capability with `/#stack`. Their legacy `#district-public-health` and `#district-observability` fragments redirect using fixed `location.replace` destinations outside the controller. Without JavaScript, those fragments target visible secondary content with equivalent links. Neither theme, nor the visual hub, can be selected.

`createObservatoryController()` starts with no selection and accepts `SELECT_DISTRICT`. Invalid IDs are inert; `null` clears selection. Native project fragments support deep links, keyboard navigation and browser history while synchronizing article focus. Unknown fragments clear selection. After initialization ARIA/state attributes own highlighting; CSS `:target` covers the no-JavaScript fallback.

## Progressive 3D Atlas

The desktop layout is a broad triangle; mobile uses a taller triangular arrangement. Both are authored with paired camera/placement metadata. Labels project from those same positions in the poster and renderer. The hub and connections organize the portfolio conceptually and do not claim a deployed integration.

Only `/explore/` loads the renderer. Save-Data or unavailable WebGL 2 retains 2D without downloading React Three Fiber, Three.js or models. A single 15-second deadline starts at activation and includes the dynamic import, all four essential GLBs (hub plus three projects), scene initialization and first valid frame. The poster remains visible until that complete composition renders. Import, model, initialization, timeout or context-loss failures return to 2D. Late completions are ignored; teardown cancels essential downloads and disposes resources.

**View 2D** is available throughout loading. Zoom and reset enable only after readiness. Fallback restores original label positions and preserves selection; it restores selector focus only when the focused canvas/control disappears. Surviving HTML focus remains unchanged. The 2D choice lasts for the visit and is not persisted.

Selecting a project changes its highlight and shared controller state only. The Atlas never requests detailed CnesData or Infrastructure maquettes; their assets remain available for canonical project pages. Canvas selection uses `pushState` without scrolling or moving focus. Native fragment selection and history focus the corresponding article through one `hashchange` listener. Page exit cancels work; a back/forward-cache return reconnects navigation once and stays in 2D.

The orthographic camera switches authored layouts at 700px. Orbit is limited to ±15° horizontally and ±5° vertically, zoom to 0.9–1.2 times the authored view, and pan is disabled. OrbitControls' inline touch action is reset to `pan-y` after connection so vertical touch scrolling remains native; taps still select. Rendering is on demand, DPR is capped at 1.5, and reduced motion uses immediate highlighting without continuous movement.

`assets:generate` validates authored district IDs against `projectIds`, rejects unknown scene requests before generation and removes obsolete district metadata even on partial runs. Regenerate the composition with `npm run assets:generate -- overview`. Historical evidence and project illustrations/detail assets are preserved. See [SA-01 evidence](design/sa-01/README.md) for validation and loading comparison.

## Infrastructure scenario

The pure engine in `simulation/infrastructure.ts` starts with three online nodes, a workload on `node-02`, an available shared layer and an empty timeline. `FAIL_NODE(node-02)` fails only that node, moves the workload to `node-01`, and records failure, transfer and shared-layer availability in that order. Repeating the failure is inert. `RESET` restores the complete initial state; component selection preserves progress.

The panel presents the state in text and responsive posters, with a polite announcement and a static scenario transcript. Controls start disabled and activate only after initialization. There are no timestamps, uptime or recovery metrics, backend calls or operational data. The failure posters are generated from the transitioned state via `simulationId` anchors; the original GLB stays unchanged.

**Explore** is part of the primary navigation. The shared Home, Work, About and
Resume shell remains ordinary HTML and does not load the Observatory renderer
or GLBs. The 3D view is a current progressive enhancement of `/explore/`, not
required for navigation or comprehension: the initial poster/HTML map is
immediately available and is the retained fallback for capability gates,
runtime failures and **View 2D**.
