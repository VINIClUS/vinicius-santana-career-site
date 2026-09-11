# Explorer and Observatory contracts

Astro renders an Observatory overview and three project routes using the case-study collection. Architecture IDs live in `src/content/case-studies.yaml`; titles, descriptions and evidence statuses are reused from that collection. `src/features/explorer/projects.ts` supplies only project IDs, areas, component IDs and illustrative relationships. Scene nodes reuse those IDs, scoped to their project.

`createExplorerController(projectId)` exposes `getState()`, `dispatch(command)` and `subscribe(listener)`, which returns an unsubscribe function. State holds `projectId`, `selectedComponentId` and the corresponding optional `simulation` (CnesData) or `infrastructureSimulation`. `SELECT_COMPONENT` changes selection independently of simulation. `SELECT_SCENARIO` and `STEP` affect only CnesData; `FAIL_NODE` affects only Infrastructure. `RESET` resets the current project's simulation. LimnoPulse ignores simulation commands. Project switching uses ordinary route navigation and creates a fresh controller with default state, without persistence.

The DOM is a projection of controller state. Component fragments support initial deep links, keyboard navigation and browser history. All detail articles remain in HTML; selection adds a visible label, border and focus. If JavaScript cannot initialize, component links and all three build-time transcripts remain usable, while simulation controls stay disabled. No React, canvas or renderer is involved.

CnesData uses fictional keys/content only. Results are synthetic and illustrative; they do not demonstrate backend calls, authentication, conversion, Parquet generation, latency or the production status of architecture components. Infrastructure relationships are sanitized illustrative references.

## Five districts

`src/features/explorer/districts.ts` owns the labels, descriptions, kinds and destinations for all five `DistrictId` values. `ProjectId` still contains only CnesData, LimnoPulse and Infrastructure. Public Health Systems links to `/#experience`; Observability links to `/#stack`. They are portfolio domains, not additional project routes. Existing scene-manifest exports remain compatible.

`createObservatoryController()` starts with no selection and accepts `SELECT_DISTRICT`. Invalid IDs are inert; `null` clears selection. Native `#district-<id>` navigation supports deep links and browser history, while the client synchronizes selection and article focus. Unrecognized fragments clear selection. Every district article and destination is rendered in the initial HTML; CSS `:target` preserves highlighting without JavaScript.

The overview renders the existing desktop/mobile posters with link positions projected from each crop's scene camera and placements. All five articles and their normal links remain in the page throughout loading and interaction.

## Progressive 3D Observatory (SO-08)

Only `/explore/` loads the scene renderer. The lightweight launcher checks Save-Data and WebGL before importing React Three Fiber and Three.js. The poster stays visible until the six overview GLBs (hub and five districts) have loaded and the first frame has rendered. Import, initialization, model-loading and context-loss failures return to the existing 2D presentation.

The renderer consumes `hub`, `districts`, `overview.layouts` and the five-entry `districtRegistry`. React subscribes to `createObservatoryController()`; the controller remains the source of selection. Canvas selection updates the fragment with `pushState` without scrolling. HTML fragment links retain their native navigation and article focus, including initial deep links and back/forward history.

After controller initialization, state/ARIA attributes govern highlighting; `:target` styling serves only the no-JavaScript fallback. Native fragment navigation synchronizes through one `hashchange` listener so duplicate history notifications cannot steal focus from the next selector.

Selecting CnesData or Infrastructure lazily loads its detail model into that district's footprint, retaining the hub and the other districts. Selecting another district restores the previous overview maquette. Loaded models are reused during the visit; a superseded download cannot overwrite a newer selection or force fallback if it fails. Failed loads leave the cache so selecting that district again can retry the download. A failure of the currently selected detail still returns to 2D. These models illustrate architecture and do not own or run the project simulations.

The orthographic camera uses the paired desktop/mobile manifest at the 700px breakpoint. Orbit is limited to ±15° horizontally and ±5° vertically, zoom to 0.9–1.2 times the initial view, and pan is disabled. HTML controls provide zoom and reset; HTML label positions follow the current camera and viewport. Rendering is on demand with DPR capped at 1.5. There is no continuous camera movement; reduced motion keeps 3D available with immediate highlighting.

After a successful mount, **View 2D** discards the renderer, restores the poster and original label positions, preserves the selected district and focuses its HTML selector (the first selector when none is selected). The choice lasts until leaving or reloading the page and is not stored. Teardown cancels pending downloads, guards late completion, unmounts React and releases controls, listeners and graphic resources.

Automatic fallback also restores selector focus when a focused 3D control disappears. Focus on surviving HTML links or articles stays where the reader put it.

Home and individual project routes do not download the Observatory renderer or GLBs. JavaScript-disabled navigation and both existing synthetic simulations retain their contracts. See [SO-08 evidence](design/so-08/README.md) for browser scenarios and desktop/mobile captures.

## Infrastructure scenario

The pure engine in `simulation/infrastructure.ts` starts with three online nodes, a workload on `node-02`, an available shared layer and an empty timeline. `FAIL_NODE(node-02)` fails only that node, moves the workload to `node-01`, and records failure, transfer and shared-layer availability in that order. Repeating the failure is inert. `RESET` restores the complete initial state; component selection preserves progress.

The panel presents the state in text and responsive posters, with a polite announcement and a static scenario transcript. Controls start disabled and activate only after initialization. There are no timestamps, uptime or recovery metrics, backend calls or operational data. The failure posters are generated from the transitioned state via `simulationId` anchors; the original GLB stays unchanged.

Home/Work, including the **Health Systems** Work card, were delivered by #21. SO-08 delivers #12's 3D renderer; final integration remains in #13. EPIC #4 stays open for that release work.
