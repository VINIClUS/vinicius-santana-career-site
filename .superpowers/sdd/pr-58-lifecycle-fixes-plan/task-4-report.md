# Task 4 Report: Harden scaling callback identities

## Status

Complete. Scaling operations that can mutate an existing worker or replica generation now require generation maps in the reducer command type and reject missing maps at runtime. `normalizeScalingCommand` keeps accepting guided scenario commands with omitted identities, captures the current generation maps, and preserves explicit metadata so obsolete callbacks remain stale. The reproduced identity-less delayed `WORKERS_BOOTED` callback can no longer advance a replacement worker.

No scenario fixture, briefing, or design asset changed.

## Files changed

- `src/features/explorer/lifecycle/scaling.ts`
  - Split loose normalizer input commands from strict reducer commands.
  - Requires `workerGenerations` for identity-bearing scaling operations and `replicaGenerations` when an existing replica is targeted.
  - Rejects missing required metadata with `STALE_OPERATION` before transition validation.
  - Retains checks for explicit request IDs, generation aliases, and generation maps.
- `src/features/explorer/lifecycle/engine.ts`
  - Types the guided adapter input against `normalizeScalingCommand` rather than the strict reducer boundary.
- `tests/lifecycle-infrastructure.test.mjs`
  - Added the replacement-worker regression.
  - Routed successful focused test operations through the same normalizer used by guided scenarios.
  - Kept direct reducer coverage for identity omission and explicit obsolete identities.
- `.superpowers/sdd/pr-58-lifecycle-fixes-plan/task-4-report.md`
  - Records implementation and verification evidence.

## RED/GREEN TDD evidence

### RED

The regression first constructed `worker-02` under request `old`, timed it out, reserved the same ID under request `replacement`, and advanced the replacement to `provisioning`. It then delivered a direct identity-less `WORKERS_BOOTED` callback.

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='identity-less delayed boot' tests/lifecycle-infrastructure.test.mjs

tests 1
pass 0
fail 1

AssertionError: expected rejection 'STALE_OPERATION', received undefined
```

This reproduced the review finding against production code at `f35536a`: the identity-less callback advanced the replacement because all identity comparisons were conditional.

### GREEN

After hardening the reducer boundary:

```text
rtk proxy node --experimental-strip-types --test --test-name-pattern='identity-less delayed boot' tests/lifecycle-infrastructure.test.mjs

tests 1
pass 1
fail 0
```

The callback returns `STALE_OPERATION`, and the reducer returns the unchanged replacement state.

## Verification

Focused lifecycle suite and type boundary:

```text
rtk proxy node --experimental-strip-types --test tests/lifecycle-infrastructure.test.mjs

tests 25
pass 25
fail 0
```

```text
rtk npm run typecheck

exit 0
ok
```

Full repository suite:

```text
rtk npm test

tests 234
pass 233
fail 0
skipped 1
```

Whitespace validation:

```text
rtk git diff --check

exit 0
```

## Review and concerns

Manual standards and task-brief review found no missing requirement, unrelated refactor, or fixture/design change. The normalizer remains the compatibility boundary for identity-less guided commands, while direct reducer callers are strict at both compile time and runtime. Explicit obsolete request IDs and generation metadata remain rejected.

The code-review skill's usual subagent dispatch was intentionally not used because the task explicitly prohibited subagents. No blocker or implementation concern remains.
