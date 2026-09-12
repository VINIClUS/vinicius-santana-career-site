# Task 1 report — integrated System Views

## Result

Replaced the CnesData, Limnopulse, and Infrastructure System Views with static integrated graphs and shared component cards. The implementation preserves existing fragment selection/focus behavior and leaves the content schema, status enum, and `ProjectRelation` data unchanged.

## Files changed

- `src/features/explorer/CnesDataSystemView.astro`
- `src/features/explorer/LimnopulseSystemView.astro`
- `src/features/explorer/InfrastructureSystemView.astro`
- `src/features/explorer/Infrastructure.astro`
- `src/features/explorer/SystemViewCards.astro` (new shared static card renderer)
- `src/features/explorer/system-view.ts` (new status-neutral connector-label helper)
- `tests/static-build.smoke.mjs`
- `tests/browser/integrated-system-view.spec.ts` (new)
- `tests/browser/limnopulse.spec.ts`

## Design decisions

- Each view uses a `3fr / 2fr` graph/cards desktop grid and a single-column mobile breakpoint.
- Graph nodes are the only links inside each System View. Each preserves `data-component-link` and its existing fragment target.
- `SystemViewCards` emits exactly one focusable static detail card per architecture component. It derives `Receives from` and `Sends to` blocks directly from unchanged `ProjectRelation` data; cards intentionally contain no links or status labels.
- Every relation is represented as a labeled, decorative-SVG graph connector with `data-relation-from` and `data-relation-to` hooks.
- CnesData places Central API in the hub position and keeps its responsive architecture poster beneath the graph.
- Limnopulse retains Observations, Telemetry, and Events bands, bounded by its operational boundary nodes.
- Infrastructure converges its three sources on Reference topology and removes only the specified simulation eyebrow; the simulation behavior and transcript are untouched.
- Connector display wording removes status language while the source relations themselves remain unchanged.

## TDD evidence

RED command:

```sh
rtk npm run build && rtk npm run smoke
```

Expected RED observed: the smoke test failed with `AssertionError` because the built CnesData route did not yet contain `Receives from`. This was the new static contract before production markup existed.

GREEN commands and results:

```sh
rtk npm run build && rtk npm run smoke
rtk npm run test
rtk git diff --check
```

All passed. The final `npm run test` result was 49 passing, 1 skipped; smoke completed all static, explorer, canonical-content, and compatibility checks.

## Browser verification

All run against the current worktree preview on port 4324:

```sh
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/integrated-system-view.spec.ts
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/explorer.spec.ts
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/limnopulse.spec.ts
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/infrastructure.spec.ts tests/browser/infrastructure-3d.spec.ts
```

Results: 4/4 integrated-view variants, 6/6 CnesData/navigation/transcript tests, 6/6 Limnopulse tests, and 14/14 Infrastructure 2D/3D/failover/transcript tests passed. These cover desktop/mobile, JavaScript/no-JavaScript, fragment focus/selection, no horizontal overflow, poster, simulation, 2D/3D, and transcript regressions.

## Self-review

- Verified one node link and one static card per component in all three built routes.
- Verified all project relations remain represented by labeled connectors.
- Verified selected-card highlighting, `aria-current`, hash navigation, `id`, `data-component-detail`, and `tabindex` contracts through static and browser tests.
- Confirmed no unrelated dirty asset, scene, or Observatory files were staged.
- `git diff --check` passed.

## Commit

Implementation commit: `16c7e96267799d1aa1bb18d2b38e160abdfc1840` (`feat: integrate project system view graphs`).

## Concerns

None. The build retains the repository's pre-existing Vite chunk-size warning; it is unrelated to this task.

## Fix round 1/5 — node-anchored connectors

### Changed files

- `src/features/explorer/SystemGraphConnectors.astro` (new shared SVG-path connector renderer)
- `src/features/explorer/CnesDataSystemView.astro`
- `src/features/explorer/LimnopulseSystemView.astro`
- `src/features/explorer/InfrastructureSystemView.astro`
- `tests/static-build.smoke.mjs`
- `tests/browser/integrated-system-view.spec.ts`

### RED evidence

After strengthening the static and browser contracts, the following commands failed as intended against the detached-list implementation:

```sh
rtk npm run build && rtk npm run smoke
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/integrated-system-view.spec.ts
```

The smoke test reported that `cnesdata:canonical-contracts` was not an addressable graph endpoint. The browser test reported zero connectors matching `data-connector-from="canonical-contracts"` and `data-connector-to="edge-agent"`. Both failures directly identified the missing endpoint-bound connector behavior.

### GREEN verification

```sh
rtk npm run build && rtk npm run smoke
rtk npm run test
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/integrated-system-view.spec.ts
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4324 npx playwright test tests/browser/limnopulse.spec.ts
rtk git diff --check
```

Results: build and smoke passed; `npm run test` passed 49 tests with 1 skipped; all 4 integrated-view desktop/mobile and JS/no-JS variants passed; all 6 Limnopulse variants passed; whitespace validation passed.

### Self-review

- Every graph node now has an addressable `graph-node-*` ID and `data-graph-node` identifier.
- Each unchanged `ProjectRelation` produces a labeled SVG path with explicit `data-connector-from` and `data-connector-to` references; connector paths are rendered in the same positioned graph stage as their nodes.
- Browser coverage verifies every relation, its unique from/to connector, its rendered path, and that path start/end coordinates land inside its declared source/target node rectangles. A detached list cannot satisfy this contract.
- CnesData's Central API is now a visual connection hub; Limnopulse's band and boundary nodes are joined by the relevant relation paths; Infrastructure's sources visibly converge on Reference topology.
