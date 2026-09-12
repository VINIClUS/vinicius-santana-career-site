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

Only `/explore/` loads the interactive Atlas renderer. Home has a separate decorative entry described below. Save-Data or unavailable WebGL 2 retains 2D without downloading React Three Fiber, Three.js or models. A single 15-second deadline starts at activation and includes the dynamic import, all four essential GLBs (hub plus three projects), scene initialization and first valid frame. The poster remains visible until that complete composition renders. Import, model, initialization, timeout or context-loss failures return to 2D. Late completions are ignored; teardown cancels essential downloads and disposes resources.

**View 2D** is available throughout loading. Zoom and reset enable only after readiness. Fallback restores original label positions and preserves selection; it restores selector focus only when the focused canvas/control disappears. Surviving HTML focus remains unchanged. The 2D choice lasts for the visit and is not persisted.

Selecting a project changes its highlight and shared controller state only. The Atlas never requests detailed CnesData or Infrastructure maquettes; their assets remain available for canonical project pages. Canvas selection uses `pushState` without scrolling or moving focus. Native fragment selection and history focus the corresponding article through one `hashchange` listener. Page exit cancels work; a back/forward-cache return reconnects navigation once and stays in 2D.

The orthographic camera switches authored layouts at 700px. Orbit is limited to ±15° horizontally and ±5° vertically, zoom to 0.9–1.2 times the authored view, and pan is disabled. OrbitControls' inline touch action is reset to `pan-y` after connection so vertical touch scrolling remains native; taps still select. Rendering is on demand, DPR is capped at 1.5, and reduced motion uses immediate highlighting without continuous movement.

`assets:generate` validates authored district IDs against `projectIds`, rejects unknown scene requests before generation and removes obsolete district metadata even on partial runs. Regenerate the composition with `npm run assets:generate -- overview`. Historical evidence and project illustrations/detail assets are preserved. See [SA-01 evidence](design/sa-01/README.md) for validation and loading comparison.

## Infrastructure scenario

The pure engine in `simulation/infrastructure.ts` starts with three online nodes, a workload on `node-02`, an available shared layer and an empty timeline. `FAIL_NODE(node-02)` fails only that node, moves the workload to `node-01`, and records failure, transfer and shared-layer availability in that order. Repeating the failure is inert. `RESET` restores the complete initial state; component selection preserves progress.

The panel presents the state in text and responsive posters, with a polite announcement and a static scenario transcript. Controls start disabled and activate only after initialization. There are no timestamps, uptime or recovery metrics, backend calls or operational data. The failure posters are generated from the transitioned state via `simulationId` anchors; the original GLB stays unchanged.

**Explore** remains in the primary navigation until SA-06. The shared shell is
ordinary HTML; graphics are route-specific progressive enhancements.

## Home preview (SA-05)

Home contains one **Explore my work** action to `/explore/`, with no separate
project catalog. The immediate approved overview poster reserves 3:2 on desktop
and 4:5 below 780px. Picture selection, preview CSS and the fixed camera share
that breakpoint. The three names and conceptual-map description remain HTML.

`home-preview-client.ts` has no executable React, Three.js or model imports.
It requires page load, real viewport intersection, a visible document and an
idle callback, rechecking eligibility when that callback runs. Without idle
scheduling it uses a 200ms timer after load under the same gates. Save-Data,
unavailable WebGL or unobservable visibility retains the poster. There is one
attempt per document and one 15-second deadline from activation, including
import, all models, initialization and the first successful complete draw.
Import completion and first-frame readiness also check elapsed monotonic time,
so a busy main thread cannot hide the poster after delaying the timeout callback.
JavaScript module imports cannot be canceled by the browser API; late imports
are ignored. Model fetches are aborted and late parses are disposed.

`scene/preview.ts` shares only composition, cameras and resource ownership with
the Atlas renderer. It has no selection, controls, project details, simulations
or event capture. Draws occur only while visible and dirty, with DPR capped at
1.5; the fixed camera also applies with reduced motion. The poster hides only
after a valid draw of all four models and returns on failure/context loss.
Page exit cancels scheduling and disposes owned resources. A history-cache
return retains the poster without restarting graphics.

`#projects` targets the introduction beside the CTA. The five historical
`#case-*` fragments use fixed `location.replace` destinations: CnesData,
Aquafarm → LimnoPulse, and all three infrastructure aliases → Infrastructure.
Without JavaScript those anchors land in the same visible work introduction;
`#about`, `#experience`, `#stack` and `#contact` retain their content.
See [SA-05 validation](design/sa-05/validation.md) for measurements and checks.

## Canonical CnesData project (SA-02)

`/explore/cnesdata/` now combines the complete case-study narrative and the
existing explorer behavior. `ProjectDetail.astro` renders collection-backed
context, contribution, engineering, results, public evidence and limitations
at build time, with `system-view` and `simulation` slots. Presentation metadata
contains only the project ID, visual mode, System View heading and optional
simulation choice; the case-study collection remains the authority for facts.

CnesData uses an accessible HTML data flow and the existing detailed maquette
as a responsive static poster inside its System View. Component statuses and
directed relationships remain readable without graphics or JavaScript. The
page does not request GLBs or initialize a renderer. Its route initializes the
existing explorer controller once, retaining native component fragments,
keyboard focus, history, and the unchanged synthetic write/replay/conflict API.

The canonical route retains `#overview`, `#architecture`, `#engineering`,
`#simulation`, `#results`, and every `#component-*` fragment, and adds direct
`#evidence` and `#limitations` sections. All three transcripts are built HTML;
simulation controls start disabled until the controller is initialized.
Full Parquet-to-Gold processing and Kubernetes deployment remain planned.

The legacy `/work/cnesdata/` page remains until SA-06; the canonical CnesData
page no longer points readers to that duplicate. Other projects, Home and
Atlas routing/rendering changes belong to their separate migration issues.
