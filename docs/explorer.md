# 2D explorer contract

Astro renders an Observatory overview and three project routes using the case-study collection. Architecture IDs live in `src/content/case-studies.yaml`; titles, descriptions and evidence statuses are reused from that collection. `src/features/explorer/projects.ts` supplies only project IDs, areas, component IDs and illustrative relationships. Scene nodes reuse those IDs, scoped to their project.

`createExplorerController(projectId)` exposes `getState()`, `dispatch(command)` and `subscribe(listener)`, which returns an unsubscribe function. State holds `projectId`, `selectedComponentId` and the corresponding optional `simulation` (CnesData) or `infrastructureSimulation`. `SELECT_COMPONENT` changes selection independently of simulation. `SELECT_SCENARIO` and `STEP` affect only CnesData; `FAIL_NODE` affects only Infrastructure. `RESET` resets the current project's simulation. LimnoPulse ignores simulation commands. Project switching uses ordinary route navigation and creates a fresh controller with default state, without persistence.

The DOM is a projection of controller state. Component fragments support initial deep links, keyboard navigation and browser history. All detail articles remain in HTML; selection adds a visible label, border and focus. If JavaScript cannot initialize, component links and all three build-time transcripts remain usable, while simulation controls stay disabled. No React, canvas or renderer is involved.

CnesData uses fictional keys/content only. Results are synthetic and illustrative; they do not demonstrate backend calls, authentication, conversion, Parquet generation, latency or the production status of architecture components. Infrastructure relationships are sanitized illustrative references.

## Five districts

`src/features/explorer/districts.ts` owns the labels, descriptions, kinds and destinations for all five `DistrictId` values. `ProjectId` still contains only CnesData, LimnoPulse and Infrastructure. Public Health Systems links to `/#experience`; Observability links to `/#stack`. They are portfolio domains, not additional project routes. Existing scene-manifest exports remain compatible.

`createObservatoryController()` starts with no selection and accepts `SELECT_DISTRICT`. Invalid IDs are inert; `null` clears selection. Native `#district-<id>` navigation supports deep links and browser history, while the client synchronizes selection and article focus. Unrecognized fragments clear selection. Every district article and destination is rendered in the initial HTML; CSS `:target` preserves highlighting without JavaScript.

The overview uses the existing desktop/mobile posters with link positions projected from each crop's scene camera and placements. No GLB is requested by the 2D Explorer. These registry and controller contracts are ready for #12's future renderer.

## Infrastructure scenario

The pure engine in `simulation/infrastructure.ts` starts with three online nodes, a workload on `node-02`, an available shared layer and an empty timeline. `FAIL_NODE(node-02)` fails only that node, moves the workload to `node-01`, and records failure, transfer and shared-layer availability in that order. Repeating the failure is inert. `RESET` restores the complete initial state; component selection preserves progress.

The panel presents the state in text and responsive posters, with a polite announcement and a static scenario transcript. Controls start disabled and activate only after initialization. There are no timestamps, uptime or recovery metrics, backend calls or operational data. The failure posters are generated from the transitioned state via `simulationId` anchors; the original GLB stays unchanged.

Scope remains split: Home/Work, including the **Health Systems** Work card, belong to #21; the 3D renderer belongs to #12; final integration belongs to #13. Delivering this Explorer does not complete those tasks or close EPIC #4.
