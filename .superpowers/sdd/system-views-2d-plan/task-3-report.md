# Task 3 — Legacy compatibility, navigation, and responsive browser behavior

## Outcome

Legacy `/work/` compatibility routes remain static, noindex documents with canonical `/explore/` destinations, fallback links, `location.replace`, preserved opaque query data, and a narrowly scoped fragment migration: only `#architecture` now becomes `#system`.

The canonical project pages have browser coverage for click selection, detail-panel updates, keyboard/history behavior, no-JavaScript content, and a 360px viewport. Their sitemap exclusion and lack of internal `/work/*` links remain verified from built output.

## RED evidence

1. Added resolver assertions that require `#architecture` to resolve to `#system`, including a query string containing duplicate values and encoded data.
2. Ran `rtk test node --experimental-strip-types --test tests/legacy-routes.test.mjs` before implementation. It failed for all four routes with actual destinations ending in `#architecture` and expected destinations ending in `#system`.
3. Updated the real Playwright compatibility redirect/history expectations and ran `rtk npm run build && rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4321 npm run test:explorer -- compatibility.spec.ts` before the implementation was served. The redirect and Back/Forward tests failed for the same actual `#architecture` versus expected `#system` mismatch.

## GREEN evidence

1. Implemented the exact-hash normalization in `resolveLegacyDestination`; all other fragments are passed through untouched.
2. Focused unit command passed: `rtk test node --experimental-strip-types --test tests/legacy-routes.test.mjs`.
3. Focused browser compatibility command passed: `rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4326 npm run test:explorer -- compatibility.spec.ts` (5 passed).
4. Added 360px browser coverage for click selection/detail panel visibility and no-JavaScript components, relationship lists, status qualifiers, transcripts, and horizontal-overflow checks. `rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4326 npm run test:explorer -- explorer.spec.ts` passed (9 passed).
5. Updated built-artifact smoke expectations from the retired `#architecture` section to `#system`, and from retired diagram artwork/SVG shapes to the semantic shared System View contract. `rtk npm run smoke` passed.

## Files changed

- `src/features/navigation/legacy-routes.ts` — maps only the exact legacy `#architecture` hash to `#system`.
- `tests/legacy-routes.test.mjs` — unit coverage for the normalized hash and all opaque data that must remain untouched.
- `tests/browser/compatibility.spec.ts` — real redirect and Back/Forward behavior for normalized legacy fragments.
- `tests/browser/explorer.spec.ts` — 360px click/detail and no-JavaScript readability coverage.
- `tests/static-build.smoke.mjs` — built canonical section, System View, relationship, sitemap, and semantic-document expectations.

## Full verification

Fresh required commands completed successfully:

- `rtk npm test` — 50 passed, 1 intentionally skipped.
- `rtk npm run build` — completed; Astro emitted the existing chunk-size warning only.
- `rtk npm run smoke` — static build/sitemap/compatibility checks and 13 asset checks passed.
- `rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4326 npm run test:explorer` — 82 passed; `test-results/.last-run.json` reports `status: passed` and no failed tests.

## Visual review

Reviewed generated CnesData, Limnopulse, and Infrastructure screenshots at 1440px and 390px. System diagrams, the initial detail panel, relationship lists, and implemented/planned/illustrative qualifiers are readable. At mobile width, the diagram stages and details stack cleanly without horizontal clipping. The 360px Playwright checks additionally confirm no horizontal overflow with and without JavaScript.

## Self-review

- `rtk git diff --check` returned no whitespace errors.
- Rechecked the resolver mutation boundary: routes are still allowlisted with `Object.hasOwn`; only an exact `#architecture` is mapped, with search text and every other fragment preserved.
- Rechecked generated internal navigation with a source search for `/work` hrefs; none remain.
- No concerns found in the scoped change. The existing Astro chunk-size warning is unchanged and unrelated to this task.

## Fix round 1 — direct component-fragment initialization

### Coverage added

`tests/browser/explorer.spec.ts` now directly opens and reloads a non-primary component fragment for every project:

- CnesData: `#component-edge-agent`
- Limnopulse: `#component-mqtt-ingestion`
- Infrastructure: `#component-image-builds`

Each route is exercised at 1440×900, 390×844, and 360×844. Both the initial navigation and reload assert the preserved URL, enhanced System View, target link `aria-current="true"`, selected detail state, and visible target detail.

### Mutation check (RED)

The first focused run passed because hash initialization already existed. To prove the new assertions are behavior-sensitive, `componentIdFromHash` was temporarily mutated to always return the project primary component, the site was rebuilt, and the tests were run against an isolated static server that served the fresh `dist` output.

`rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4327 npm run test:explorer -- explorer.spec.ts -g "direct component fragments"` then failed at all three viewport sizes. In each case, the direct `#component-edge-agent` page had no `aria-current` on the matching link, rather than the required `true` value. This confirms the test catches removal of direct-fragment selection behavior.

### Restored GREEN evidence

Restored the original production hash resolver exactly; no production change is included in this round. After rebuilding the fresh output, the isolated-server focused command passed all 3 viewport cases. `rtk npm test` then passed with 50 tests, 0 failures, and 1 intentional skip.

### Fix-round self-review

- `rtk git diff --check` returned no whitespace errors.
- The only implementation diff is browser coverage; `SystemView.astro` matches its pre-mutation source.
- Concern: the existing Astro chunk-size warning remained during the temporary/rebuilt runs; it is unrelated to this coverage-only fix.
