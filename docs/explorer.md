# Systems Atlas and project explorer contracts

Astro renders a Systems Atlas overview and three canonical project routes using the case-study collection. Architecture IDs live in `src/content/case-studies.yaml`; titles, descriptions and evidence statuses are reused from that collection. `src/features/explorer/projects.ts` supplies project IDs, areas, ordered diagram stages, primary component IDs and directed relationships with short labels.

`createExplorerController(projectId)` exposes `getState()`, `dispatch(command)` and `subscribe(listener)`, which returns an unsubscribe function. State holds `projectId`, `selectedComponentId` and the corresponding optional `simulation` (CnesData) or `infrastructureSimulation`. `SELECT_COMPONENT` changes selection independently of simulation. `SELECT_SCENARIO` and `STEP` affect only CnesData; `FAIL_NODE` affects only Infrastructure. `RESET` resets the current project's simulation. LimnoPulse ignores simulation commands. Project switching uses ordinary route navigation and creates a fresh controller with default state, without persistence.

The DOM is a projection of controller state. Each project renders one semantic HTML `SystemView.astro`, with a diagram on the left and details on the right at desktop widths, stacked on mobile. Stages and component cards retain textual statuses; connectors occupy separate wrapping space and use declared relation endpoints. Infrastructure's three parallel inputs converge on Reference topology. CnesData and LimnoPulse retain ordered flow stages and separate support stages. Textual relationship lists include direction and full descriptions.

The primary component is selected without changing the URL; a valid `#component-{id}` fragment takes precedence. Clicks, direct fragments and Back/Forward synchronize selection and focus the detail article. Arrow keys and Home/End traverse only the ordered diagram controls, keeping focus on the destination control while updating history, `aria-current` and details. Selection preserves simulation progress. All detail articles remain in HTML; JavaScript hides unselected details. Without JavaScript every description, status, relationship and build-time transcript remains readable, and simulation controls stay disabled. Canonical project pages load no posters, canvases, GLBs or Three.js; Atlas and Home retain their independent graphics.

CnesData uses fictional keys/content only. Results are synthetic and illustrative; they do not demonstrate backend calls, authentication, conversion, Parquet generation, latency or the production status of architecture components. Infrastructure relationships are sanitized illustrative references.

## Three project districts

`projectIds` in `src/features/explorer/projects.ts` is the identity source: `['cnesdata', 'limnopulse', 'infrastructure']`. `AtlasDistrictId = ProjectId`; `DistrictId` is a compatibility alias. `districtIds` derives from `projectIds`. The case-study collection supplies each panel's title, summary, first four technologies and matching `/explore/{id}/` destination. The initial HTML always includes all three selectors, panels and canonical links.

Public Health and Observability are not Atlas districts. Their former district fragments have no compatibility redirects and behave like any other unknown fragment. The visual hub cannot be selected.

`createObservatoryController()` starts with no selection and accepts `SELECT_DISTRICT` plus `ACTIVATE_DISTRICT`; activating the selected project again clears it. Invalid IDs are inert and `null` clears selection. Project fragments support deep links, keyboard navigation and browser history without modal focus behavior. Selection opens a non-modal panel over the right side of the desktop map or a scrollable bottom sheet capped at 60% of the map on mobile. While the sheet is open, the three project selectors form a touch-accessible strip at its top. The X control, Escape and repeated activation close it by removing the fragment with `replaceState`; choosing a different project uses `pushState`. Unknown fragments clear selection. After initialization ARIA/state attributes own highlighting and expansion state; CSS `:target` covers the no-JavaScript fallback.

## Progressive 3D Atlas

The desktop layout is a broad triangle; mobile uses a taller triangular arrangement. Both are authored with paired camera/placement metadata. Labels project from those same positions in the poster and renderer. The hub and connections organize the portfolio conceptually and do not claim a deployed integration.

Only `/explore/` loads the interactive Atlas renderer. Home has a separate decorative entry described below. Save-Data or unavailable WebGL 2 retains 2D without downloading React Three Fiber, Three.js or models. A single 15-second deadline starts at activation and includes the dynamic import, all four essential GLBs (hub plus three projects), scene initialization and first valid frame. The poster remains visible until that complete composition renders. Import, model, initialization, timeout or context-loss failures return to 2D. Late completions are ignored; teardown cancels essential downloads and disposes resources.

**View 2D** is available throughout loading. Zoom and reset enable only after readiness. Fallback restores original label positions and preserves selection; it restores selector focus only when the focused canvas/control disappears. Surviving HTML focus remains unchanged. The 2D choice lasts for the visit and is not persisted.

Selecting a project changes its highlight and shared controller state without changing the scene geometry. The Atlas never requests detailed CnesData or Infrastructure maquettes; their shared assets remain available for generation and inspection, but canonical project pages do not load them. Canvas, label and fragment selection synchronize through one controller without moving focus into the panel. Page exit cancels work; a back/forward-cache return reconnects navigation once and stays in 2D.

The orthographic camera switches authored layouts at 700px. Orbit is limited to ±15° horizontally and ±5° vertically, zoom to 0.9–1.2 times the authored view, and pan is disabled. OrbitControls' inline touch action is reset to `pan-y` after connection so vertical touch scrolling remains native; taps still select. Rendering is on demand, DPR is capped at 1.5, and reduced motion uses immediate highlighting without continuous movement.

`assets:generate` validates authored district IDs against `projectIds`, rejects unknown scene requests before generation and removes obsolete district metadata even on partial runs. Regenerate the composition with `npm run assets:generate -- overview`. Historical evidence is retained with supersession notices. Retired Home/Work illustrations and their optimizer are removed; the three districts, hub, overview, two detail models and failure posters remain available for generation and inspection. See [SA-01 evidence](design/sa-01/README.md) for validation and loading comparison.

## Infrastructure scenario

The pure engine in `simulation/infrastructure.ts` starts with three online nodes, a workload on `node-02`, an available shared layer and an empty timeline. `FAIL_NODE(node-02)` fails only that node, moves the workload to `node-01`, and records failure, transfer and shared-layer availability in that order. Repeating the failure is inert. `RESET` restores the complete initial state; component selection preserves progress.

The separate Simulation section presents a semantic 2D scheme showing the three nodes, workload assignment and shared layer, with a polite announcement and static scenario transcript. Controls start disabled and activate only after initialization. Failover and reset update the scheme and text from the unchanged state machine. There are no timestamps, uptime or recovery metrics, backend calls or operational data.

**Work** opens the canonical Systems Atlas at `/explore/`. The shared shell is
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

## Canonical project pages

`/explore/cnesdata/`, `/explore/limnopulse/` and `/explore/infrastructure/`
combine the complete case-study narrative with their shared System View.
`ProjectDetail.astro` renders Hero → Context and contribution → System View →
Simulation (where applicable) → Engineering → Results and evidence, using
collection-backed content at build time. The case-study collection remains
the authority for facts.

CnesData uses the shared accessible HTML flow and initializes the explorer
controller once, preserving the synthetic write/replay/conflict API in its
own Simulation section. Infrastructure similarly preserves failover/reset.

The canonical routes expose `#overview`, `#system`, `#engineering`, `#results`,
every `#component-*` fragment, and direct `#evidence` and `#limitations` sections.
CnesData and Infrastructure also expose `#simulation`. CnesData's three
transcripts are built HTML; simulation controls start disabled until the controller is initialized.
Full Parquet-to-Gold processing and Kubernetes deployment remain planned.

The legacy `/work/cnesdata/` route is a small compatibility page; the canonical CnesData
page contains the full narrative and evidence. Limnopulse and Infrastructure
also use their canonical `/explore/` project pages.

SA-06 established **Work → `/explore/`** the single primary work destination. All four
`/work/*` compatibility pages use destination metadata, `noindex`, a static
fallback link and restricted `location.replace`, preserving query and fragment
data, except that the retired `#architecture` fragment migrates to `#system`.
Other fragments pass through unchanged. They are excluded from the sitemap.
