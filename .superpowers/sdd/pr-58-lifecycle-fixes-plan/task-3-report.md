# Task 3 Report: Address final review findings

## Status

Complete. Persisted `pagehide` now pauses and preserves the lifecycle player for a refreshed `pageshow`, while non-persisted unload still disposes it. CnesData recipient counts come from the pinned response instead of the in-progress serving candidate. Manual presentation matching compares every supplied command field, including `nodeId`, while retaining the existing `channel`/`kind`/`result` distinctions.

The task 1 callback-identity behavior and task 2 autoplay-announcement behavior remain covered and passing. No scenario fixture, briefing, or design asset changed.

## Exact files changed

- `src/features/explorer/lifecycle/client.ts`
  - Split persisted bfcache handling from real unload disposal.
  - Refreshes presentation state on persisted `pageshow`.
  - Renders CnesData recipient counts from response-derived projection fields.
- `src/features/explorer/lifecycle/cnesdata.ts`
  - Added `responseComparedRows`, `responseDifferentRows`, and `responseSameRows` to the projection.
- `src/features/explorer/lifecycle/presentation.ts`
  - Matches checkpoints against all supplied command fields instead of only `channel`, `kind`, and `result`.
- `tests/browser/lifecycle.spec.ts`
  - Added bfcache usability/real-unload disposal coverage.
  - Added pinned CnesData response recipient coverage.
- `tests/lifecycle-cnesdata.test.mjs`
  - Added preparation-versus-response projection coverage.
- `tests/lifecycle-manual-presentation.test.mjs`
  - Added `FAIL_NODE(node-01)` presentation identity coverage.
- `.superpowers/sdd/pr-58-lifecycle-fixes-plan/task-3-report.md`
  - Recorded this implementation and its evidence.

## RED evidence

Production remained at `16a2acc` while the regression tests were added.

### CnesData response projection

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='projection keeps prepared counts separate' tests/lifecycle-cnesdata.test.mjs

tests 1
pass 0
fail 1
AssertionError: undefined !== 0
```

The preparation projection exposed `3` compared rows, but no response-derived count existed.

### Infrastructure command identity

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='manual infrastructure commands match' tests/lifecycle-manual-presentation.test.mjs

tests 1
pass 0
fail 1
actual:   infra-quorum-recovery-01
expected: infra-quorum-recovery-05
```

`FAIL_NODE(node-01)` incorrectly reused the earlier node-02 checkpoint.

### Browser regressions

```text
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4323 npx playwright test tests/browser/lifecycle.spec.ts --grep 'CnesData recipient renders counts|persisted pagehide keeps'

2 failed
```

- Recipient expected `0 / 0 / 0` from pinned `v-demo-00`, but rendered candidate counts `3 / 1 / 2`.
- After persisted `pagehide`, the stage remained rendered as playing because the player had been permanently disposed without notification.

## GREEN evidence

### Focused unit regressions

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='projection keeps prepared counts separate' tests/lifecycle-cnesdata.test.mjs

tests 1
pass 1
fail 0
```

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='manual infrastructure commands match' tests/lifecycle-manual-presentation.test.mjs

tests 1
pass 1
fail 0
```

### Focused browser regressions

```text
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4323 npx playwright test tests/browser/lifecycle.spec.ts --grep 'CnesData recipient renders counts|persisted pagehide keeps'

2 passed (2.0s)
```

## Verification results

```text
rtk npm run typecheck
exit 0
```

```text
rtk npm run build
exit 0; 12 pages built
```

The existing Vite chunk-size warning was unchanged.

```text
rtk proxy node --experimental-strip-types --test tests/lifecycle-cnesdata.test.mjs tests/lifecycle-manual-presentation.test.mjs tests/lifecycle-presentation.test.mjs

tests 61
pass 61
fail 0
```

```text
rtk npm test

tests 233
pass 232
fail 0
skipped 1
```

```text
rtk proxy env EXPLORER_BASE_URL=http://127.0.0.1:4323 npx playwright test tests/browser/lifecycle.spec.ts

22 passed (30.7s)
```

```text
rtk git diff --check
exit 0
```

## Review and concerns

Manual standards/spec review found no missing requirement or scope creep. The usual code-review subagents were not dispatched because the task explicitly prohibited subagents. Existing tests for callback identities, autoplay silence/final announcement, and `channel`/`kind`/`result` matching all passed.

No implementation blocker remains. The only observed warning is the pre-existing Vite chunk-size warning.
