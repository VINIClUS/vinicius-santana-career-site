# 2D explorer contract

Astro renders four static routes using the case-study collection. Architecture IDs live in `src/content/case-studies.yaml`; titles, descriptions and evidence statuses are reused from that collection. `src/features/explorer/projects.ts` supplies only project IDs, areas, component IDs and illustrative relationships. SO-07 scene nodes should reuse those IDs, scoped to their project.

`createExplorerController(projectId)` exposes `getState()`, `dispatch(command)` and `subscribe(listener)`, which returns an unsubscribe function. State holds `projectId`, `selectedComponentId` and optional CnesData simulation state. `SELECT_COMPONENT` changes selection independently of simulation. `SELECT_SCENARIO`, `STEP` and `RESET` delegate to the SO-05 engine; projects without a simulation ignore them. Project switching uses ordinary route navigation and creates a fresh controller with default state, without persistence.

The DOM is a projection of controller state. Component fragments support initial deep links, keyboard navigation and browser history. All detail articles remain in HTML; selection adds a visible label, border and focus. If JavaScript cannot initialize, component links and all three build-time transcripts remain usable, while simulation controls stay disabled. No React, canvas or renderer is involved.

CnesData uses fictional keys/content only. Results are synthetic and illustrative; they do not demonstrate backend calls, authentication, conversion, Parquet generation, latency or the production status of architecture components. Infrastructure relationships are sanitized illustrative references.
