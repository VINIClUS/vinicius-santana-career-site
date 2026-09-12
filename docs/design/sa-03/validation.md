# SA-03 validation record

Scope: issue #32, parent #29. Branch: `feat/sa-03-limnopulse-canonical`.
Base: `8b1a30ef5c057a35e09474103000b9bfe5f81b44` (updated origin/main).
Worktree: `.worktrees/sa-03`; original checkout and untracked files preserved.

## Implementation decisions

Reuse SA-02 ProjectDetail and its System View slot, collection facts, seven component
IDs and existing controller. Use English Observations / Telemetry / Events to match
the site's content. Keep GitHub Pages, dependencies, CNAME and resume unchanged.
Legacy redirects/navigation remain SA-06. No simulation, live telemetry or WebGL
belongs to this project page.

## Public source traceability

Sources inspected on 2026-09-12 at Limnopulse commit
`bd6e579a20017f769c6f041bdfde35cb67b30c93`:

| Claim / component | Public basis |
| --- | --- |
| Local MQTT ingestion writes readings through Telegraf into InfluxDB | [Architecture: delivery status and system view](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/docs/architecture.md) |
| Telemetry API authorizes tenant membership and resource ownership before reads | Same architecture: authentication and tenant authorization |
| Rules guide one-shot evaluation; evaluator queries bounded InfluxDB windows and atomically writes Alert Events / outboxes | Same architecture: Phase 3A and Phase 3B; [evaluator operations](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/docs/alert-evaluator-phase-3b.md) |
| Relay expands outboxes and publishes SQS jobs; evaluator does not publish SQS | Architecture: Phase 3B and Phase 3C-A |
| Email and Telegram have separate queues, workers and delivery contracts | [Telegram operations](https://github.com/VINIClUS/limnopulse/blob/bd6e579a20017f769c6f041bdfde35cb67b30c93/docs/notifications-phase-3c-b.md), durable delivery flow; architecture: Phase 3C-A / Phase 3C-B |
| Cloud resources are documented; production devices and hardened broker remain a boundary | Architecture: delivery status and security boundaries; collection limitations |

The collection remains the source of component names, descriptions, statuses,
narrative and evidence. Presentation only groups existing IDs; project relations
summarize verified responsibilities, not a live deployment or new component registry.
Existing public evidence links are retained, supplemented by architecture and Telegram.

Context7 resolve was attempted for current Playwright documentation but returned
“Monthly quota exceeded.” Official Playwright repository documentation
`docs/src/test-use-options-js.md` was used as fallback for browser contexts;
existing repository conventions govern the test harness.

## Validation progress

- `rtk npm ci`: passed, 267 packages installed, zero reported vulnerabilities.
  Existing install policy blocked esbuild postinstall; build succeeds without a policy change.
- Baseline `rtk npm test`: 33 passed, 1 intentionally skipped built-asset test.
- Baseline build: passed, 13 pages; existing large renderer chunk warning.
- Unit and static regressions failed before product changes: incorrect responsibility
  boundaries and missing canonical telemetry presentation respectively.

Final checks, inspected screenshots and release references are recorded below
as they complete.

## Local verification and visual evidence

- Canonical browser regression failed against baseline on the old explorer title.
- `rtk npm test`: 34 passed, one intentionally skipped built-asset check.
- `rtk npm run build`: passed, 13 pages, existing renderer chunk warning only.
- `rtk npm run smoke`: passed, including canonical equivalence and 13 asset tests.
- `rtk git diff --check`: passed.
- Independent source review: no major issues.
- CNAME, resume, package.json and lockfile compared byte for byte against base.
  Resume SHA-256: `b2cca4eac1313462b8ff44eb0c42a3143e5bd1a3ac02a2d756b1b38bc16b769e`.
  CNAME SHA-256: `50ea872cd8828a877db512188d9ef5789bfef1ebe863d58e345eeb23f983fb7d`.

Inspected screenshots show readable lanes, directional relationships and adjacent
status labels, with stacked mobile layout. Full page captures retain all details
and evidence in normal flow. Routine test captures use Playwright output paths.

- [Desktop full page](limnopulse-1440.png) / [System View crop](system-view-1440.png)
- [Mobile full page](limnopulse-390.png) / [System View crop](system-view-390.png)

- `rtk npm run test:explorer`: all 48 Chromium tests passed (1.4 minutes).
  Six Limnopulse cases cover 1440×900 and 390×844, normal/reduced motion,
  JavaScript disabled, Atlas → project → evidence, keyboard/touch selection,
  native focus, back/forward history, legacy heading anchor and no overflow.
  Project loads requested no GLB/GLTF/KTX2 models and created no canvas.
