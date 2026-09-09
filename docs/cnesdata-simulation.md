# CnesData synthetic simulation API

SO-05 / Issue #9 supplies the pure TypeScript state engine for SO-06 / Issue #10. Import the three functions and their exported types from `src/features/explorer/simulation/cnesdata.ts`. Scenario definitions and the demonstration label live in `src/content/scenarios/cnesdata.ts`.

This is an **illustrative synthetic demonstration** of a narrow raw-object contract, not a representation of the full current CnesData API. All identifiers and content are fictional. It performs no backend calls, authentication, DBC conversion, Parquet generation, persistence, timing, or real health-data processing.

## Consumer example

```ts
import { createInitialState, transition, getTranscript } from './src/features/explorer/simulation/cnesdata.ts';

let state = createInitialState('raw-identical-replay');
state = transition(state, { type: 'STEP' }); // stored
state = transition(state, { type: 'STEP' }); // replayed; still one object
state = transition(state, { type: 'RESET' }); // original empty state
state = transition(state, { type: 'SELECT_SCENARIO', scenarioId: 'raw-content-conflict' });

const transcript = getTranscript('raw-content-conflict');
```

Paths in the example are relative to the repository root; adjust for the importing module.

## State and commands

`createInitialState(scenarioId?: string): SimulationState` defaults to `raw-first-write`. Every valid scenario starts empty with `status: 'ready'` and `nextStepIndex: 0`.

`transition(state: SimulationState, command: Command): SimulationState` accepts these commands:

- `{ type: 'STEP' }` executes exactly one write attempt, appends a result to `history`, and increments `nextStepIndex`. Status becomes `running` if another step remains, or `complete`. Further steps after completion do nothing.
- `{ type: 'RESET' }` returns the selected scenario's initial state, including after completion.
- `{ type: 'SELECT_SCENARIO', scenarioId: string }` selects and resets a scenario, even when selecting the current one.

`scenarioId` is the selected ID. `objects` contains stored `{ key, content }` objects. `history` contains `{ outcome, attempt }` results, where `outcome` is `stored`, `replayed`, or `conflict` and `attempt` contains the attempted key and content. `nextStepIndex` is the zero-based index of the next attempt, equal to the scenario's attempt count after completion.

| Scenario | First STEP | Second STEP |
| --- | --- | --- |
| `raw-first-write` | Store K+A and complete | No change |
| `raw-identical-replay` | Store K+A | Accept K+A without duplication and complete |
| `raw-content-conflict` | Store K+A | Reject K+B, preserve A and complete |

K means `synthetic-key-K`; A and B mean `synthetic-content-A` and `synthetic-content-B`.

Unknown IDs produce an empty `invalid-scenario` state retaining the requested ID. `STEP` and `RESET` leave that state unchanged. Selecting a valid ID recovers normally. Pass states returned by this API back to `transition`; fabricated or externally mutated states are not a supported input contract.

All state and definition fields are readonly in TypeScript. Transitions never mutate previous states or definitions; unchanged arrays may be shared. Consumers must treat snapshots as immutable. No-op transitions may return the same reference. No clock, randomness, network, or environment globals are required.

## Static transcript integration

`getTranscript(scenarioId: string): ScenarioTranscript | null` executes the same scenario through `transition`, returning `scenarioId`, `title`, `label`, `evidenceStatus`, `scope`, `initialState`, and `steps`. Unknown IDs return `null`. Each step has an English `description` derived from its engine `result`, plus the resulting `state`. No second write-rule implementation is used to produce prose.

SO-06 can render this data at build time for the baseline walkthrough and use the same engine for interactive controls. Display the `label` ("Synthetic demonstration"), `evidenceStatus` ("illustrative"), and scope alongside the walkthrough. Snapshot status describes demonstration progress, not service health. UI, HTML, controls, accessibility behavior, and `/explore/` routes are owned by Issue #10.

## Verification

`node --experimental-strip-types --test tests/*.test.mjs` runs the native tests on Node >=22.12. `npm test` also performs the isolated strict TypeScript check. Tests exercise all outcomes, preservation and immutability, reset and selection, invalid IDs, and equivalence between transcript and interactive execution.
