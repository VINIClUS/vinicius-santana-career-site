# Systems Atlas Navigation & Project Experience Implementation Plan

> **For implementation agents:** execute one numbered GitHub issue per branch/worktree, work only on the dependency frontier, and open one pull request per issue. SA-07 alone closes the migration after the deployed release is verified.

**Goal:** Simplify the portfolio into one recruiter-readable path — **Home → Systems Atlas → Project → Evidence** — while preserving its visual ambition, deterministic behavior, evidence, limitations, accessibility, progressive enhancement, and static-hosting constraints.

**Architecture:** Astro continues to produce canonical HTML, navigation, metadata, posters, and fallbacks. A small presentation model selects three distinct System Views. Existing deterministic controllers remain independent of optional rendering. Three.js and React Three Fiber progressively enhance the Atlas, the restricted Home preview, and Infrastructure without owning facts, routes, or simulation transitions.

**Tech stack:** Astro 7, TypeScript, React 19, React Three Fiber 9, Three.js 0.183, Node.js/npm, Playwright, and GitHub Pages.

**Normative spec:** [`docs/superpowers/specs/2026-09-11-systems-atlas-navigation-project-experience-spec-v2.md`](../specs/2026-09-11-systems-atlas-navigation-project-experience-spec-v2.md)<br>
**Execution baseline:** `main` at `d91d468` (SO-09 / PR #28)<br>
**Historical inspection baseline:** `568eef3de554d5da270a0304843f93cbc7838abf` (SO-08 / PR #27)<br>
**EPIC:** [#29](https://github.com/VINIClUS/vinicius-santana-career-site/issues/29)

## Delivery graph

```text
#30 SA-01 ─────────────────→ #34 SA-05 ─┐
#31 SA-02 ──→ #32 SA-03 ────────────────┼→ #35 SA-06 → #36 SA-07
           └→ #33 SA-04 ────────────────┘
```

The initial frontier is SA-01 and SA-02. SA-03 and SA-04 may proceed independently after the shared shell lands. SA-06 waits for both remaining projects and Home. SA-07 is the only cleanup and release-closing lane.

## Fixed interfaces and decisions

Keep one source of routable project identity:

```ts
export const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'] as const;
export type ProjectId = (typeof projectIds)[number];
export type AtlasDistrictId = ProjectId;
export type DistrictId = AtlasDistrictId;

type AtlasDistrict = {
  id: ProjectId;
  label: string;
  description: string;
  href: `/explore/${ProjectId}/`;
};
```

`DistrictId` is a compatibility alias, not permission to restore domain/capability locations. Public Health uses separate optional context metadata. Observability stays lightweight capability metadata. Neither enters Atlas selection or creates a project route.

Use limited presentation metadata rather than a generic page builder:

```ts
type ProjectPresentation = {
  id: ProjectId;
  visualMode: 'data-flow' | 'telemetry' | 'cluster';
  systemHeading: string;
  simulation?: 'cnesdata-write' | 'infrastructure-failover';
};
```

- CnesData: HTML/SVG data flow, detailed maquette reused as poster, existing write/replay/conflict controller.
- LimnoPulse: HTML/SVG telemetry/observations/events view, with no invented simulation.
- Infrastructure: poster-first, progressively enhanced 3D cluster view subscribing to the existing controller used by HTML controls.
- Home: Atlas-derived poster with an optional preview-only renderer; no selection, project details, simulations, or direct project navigation.
- Atlas: semantic HTML discovery plus progressively enhanced three-district renderer; no detailed project maquettes.

Do not add dependencies, a rendering engine, backend, CMS, SPA router, duplicate project-fact registry, broad visual-regression platform, or new hosting infrastructure.

## Global constraints

- Preserve truthful `implemented`, `documented`, `planned`, `historical`, `illustrative`, and synthetic-state distinctions.
- Keep Public Health in professional/project context without making it a fourth project; keep Observability as a capability.
- Do not publish credentials, private hostnames/IPs, patient/professional records, private topology, authenticated screenshots, fabricated metrics, or live-telemetry implications.
- Preserve CNAME behavior and `/assets/vinicius-santana-resume.pdf`; SA-06 and SA-07 verify the resume byte-for-byte.
- Build-time HTML always exposes navigation, summaries, evidence, and limitations. Graphics or JavaScript may enhance but never gate them.
- Preserve demand rendering, bounded DPR, cancellation, stale-completion guards, cache eviction, disposal, first-real-frame readiness, selection/history, keyboard access, and `View 2D` where applicable.
- Replace obsolete expectations with the new contract; retain lifecycle, truthfulness, deterministic-state, accessibility, fallback, and integration coverage.

## Shared pull-request gate

For every implementation issue:

1. Create a branch/worktree from current `origin/main`; change only that issue's vertical slice.
2. Update focused tests with the implementation. Generate assets only when the issue owns their source inputs.
3. Run `npm ci`, `npm test`, `npm run build`, `npm run smoke`, `npm run test:explorer`, issue-specific checks, and `git diff --check`.
4. Inspect relevant desktop/mobile and restricted/failure paths. Record actual runs; never infer browser or performance results from source.
5. Open a PR referencing its issue without closing blocked successors or the EPIC.
6. Resolve material findings, repeat affected validation, and merge only with green checks for the reviewed head.
7. Add concise implementation and verification evidence to the issue/EPIC so the next frontier is unambiguous.

---

## SA-01 / Issue #30 — Recompose Systems Atlas around three project districts

**Suggested branch:** `feat/sa-01-three-project-atlas`

### Outcome

Ship a complete Atlas in which registry, semantic controls, poster, assets, desktop/mobile composition, renderer, controller, history, and fallback agree on exactly CnesData, LimnoPulse, and Infrastructure.

### Implementation sequence

1. Lock focused tests to the independent expected ID set and matching canonical destinations.
2. Narrow registry/types to projects. Keep `DistrictId` only as an alias and move Public Health/Observability outside the controller.
3. Recompose desktop/mobile layouts around three distinct silhouettes. The optional hub stays visual-only; connections stay illustrative.
4. Remove detailed CnesData/Infrastructure maquettes from Atlas selection/loading, retaining them for canonical pages.
5. Update generator inputs, manifest, posters, validation, selectors, summaries, labels, and fallback together.
6. Retain progressive WebGL 2 loading, demand frames, constrained controls, DPR cap, first-frame handoff, cancellation, teardown, context-loss fallback, and stale-completion safety.
7. Preserve selection, focus, fragments, history/back-forward, keyboard, touch scrolling, and `View 2D` across capable/fallback paths.
8. Resolve old Public Health/Observability fragments to `/#experience` and `/#stack` outside district selection.

### Acceptance and evidence

- No active registry, selector, scene identity, or fallback exposes more or fewer than three projects.
- Every project is reachable without WebGL and every destination matches its ID.
- Screenshots prove a genuine desktop/mobile three-district composition.
- Browser evidence covers keyboard, history, `View 2D`, unavailable WebGL, and failed/blocked assets.
- Asset generation/validation and the shared gate pass.

---

## SA-02 / Issue #31 — Establish the canonical project shell and consolidate CnesData

**Suggested branch:** `feat/sa-02-canonical-project-shell`

### Outcome

Establish the reusable build-time project narrative and prove it with CnesData: one canonical page containing contribution, architecture/behavior, decisions, outcomes, evidence, limitations, and deterministic synthetic scenarios.

### Implementation sequence

1. Add schema/shell tests for context, contribution, System View, decisions, results, evidence, limitations, and visible status.
2. Introduce the smallest shared Astro shell/presentation metadata. Continue reading facts and evidence from authoritative case content.
3. Recompose CnesData around its public-health data contract, ingestion, reconciliation, and evidence narrative.
4. Create an accessible HTML/SVG data-flow System View and reuse the detailed maquette as its poster; do not require WebGL.
5. Integrate raw-first-write, identical replay, content-conflict, scenario switching, reset, and transcripts without duplicating transitions.
6. Remove the link to a second internal CnesData representation only after equivalent canonical narrative/evidence exists.
7. Verify no-JavaScript output retains explanation, static transcript, evidence, limitations, and navigation.

### Acceptance and evidence

- The shell is not a page-builder, plugin registry, or second project-fact source.
- All CnesData scenarios remain deterministic, immutable, truthful, and explicitly synthetic.
- Desktop/mobile evidence covers scanning and scenarios; no-JavaScript evidence covers the static explanation.
- Existing schema/controller tests and the shared gate pass.

---

## SA-03 / Issue #32 — Consolidate LimnoPulse into its canonical project experience

**Suggested branch:** `feat/sa-03-limnopulse-canonical`

**Blocked by:** #31.

### Outcome

Ship LimnoPulse through the canonical shell with a project-specific HTML/SVG view of verified observations, telemetry, and events, without fabricating live behavior or adding technology for symmetry.

### Implementation sequence

1. Add focused shell/System View tests against approved LimnoPulse facts, evidence, statuses, and limitations.
2. Populate the shell from authoritative content and distinguish the environmental/telemetry problem in opening copy and contribution.
3. Build an accessible HTML/SVG telemetry view whose components/states are supported by documentation and evidence.
4. Preserve normal linked evidence and place limitations/status near modeled or planned claims.
5. Remove any alternate internal representation after confirming canonical equivalence.
6. Do not add WebGL or a simulation without a future approved, documented behavior.

### Acceptance and evidence

- Build-time HTML tells the complete story and remains useful without JavaScript.
- No invented measurements, live telemetry, unsupported states, or copied generic architecture appears.
- Desktop/mobile, JavaScript-disabled checks, and the shared gate pass.

---

## SA-04 / Issue #33 — Consolidate Infrastructure with a controller-backed 3D System View

**Suggested branch:** `feat/sa-04-infrastructure-system-view`

**Blocked by:** #31.

### Outcome

Ship Infrastructure through the canonical shell with its detailed maquette as immediate poster and an optional 3D view that projects the same controller state as accessible HTML controls.

### Implementation sequence

1. Extend shell tests for Infrastructure narrative, poster, controls, static transcript, evidence, and limitations.
2. Move/reuse the detailed maquette from Atlas as the project poster/fallback.
3. Keep one `ExplorerController` as owner of failure, workload transfer, history, progress, and reset; HTML and renderer subscribe to it.
4. Factor the smallest renderer entry consuming controller state. Do not copy reducers into Three components or widen Home/Atlas responsibility.
5. Initialize the controller independently of rendering. Keep poster until a real frame and HTML controls throughout.
6. Preserve progress/focus across delayed loading, `View 2D`, context loss, failure, teardown/remount, and late completion.
7. Retain deterministic synthetic failure/reset semantics; presentation duration is not failover evidence.
8. Remove any alternate internal representation only after canonical equivalence exists.

### Acceptance and evidence

- Failure moves only the documented workload, reset restores initial state, and renderer output matches controller state.
- Switching or losing rendering never restarts simulation or removes evidence/navigation.
- Browser evidence covers desktop/mobile, failure/reset, mid-scenario mode change, forced failure, keyboard, and no JavaScript.
- Projection/controller tests and the shared gate pass.

---

## SA-05 / Issue #34 — Replace Home globe and duplicate work index with the Atlas preview

**Suggested branch:** `feat/sa-05-home-atlas-preview`

**Blocked by:** #30.

### Outcome

Make Home introduce one portfolio destination through an Atlas poster and one `Explore my work` CTA, with a preview-scoped enhancement that never becomes another index.

### Implementation sequence

1. Test one intended work CTA to `/explore/`, poster presence, globe/grid removal, meaningful HTML, and preserved fragments.
2. Replace globe and Selected Work with a responsive Atlas poster in the hero/work-introduction region.
3. Preserve `#projects`, `#about`, `#experience`, `#stack`, `#contact`, and documented `#case-*` compatibility without hidden cards.
4. Create a small Home boundary reusing immutable composition/resources without Atlas selection, toolbar, summaries, details, or simulations.
5. Activate only after page load, viewport visibility, and an idle opportunity. Use one 15-second deadline after activation; do not retry.
6. Keep the poster through loading/failure and replace it only after a real frame. Abort or ignore late work after timeout/teardown.
7. Render on demand, suspend offscreen/hidden work, preserve scrolling, respect reduced motion, and release resources.
8. Record same-profile before/after JavaScript/model transfer, poster behavior, first usable HTML/frame, stalls, and idle rendering.

### Acceptance and evidence

- Exactly one primary work-discovery action exists; visual labels are not selectors or direct project navigation.
- Home requests no selected-detail model or project simulation.
- Eligible, offscreen, held/failed, timeout, reduced-motion, touch-scroll, and handoff checks pass on desktop/mobile.
- The loading record and shared gate pass.

---

## SA-06 / Issue #35 — Canonicalize Work navigation, legacy routes and metadata

**Suggested branch:** `feat/sa-06-canonical-navigation`

**Blocked by:** #32, #33, and #34.

### Outcome

After destination experiences exist, remove competing Work/Explore concepts and turn four `/work/*` routes into safe compatibility pages.

```text
/work/                 → /explore/
/work/cnesdata/        → /explore/cnesdata/
/work/limnopulse/      → /explore/limnopulse/
/work/infrastructure/  → /explore/infrastructure/
```

### Implementation sequence

1. Add route tests for all explicit mappings before replacing duplicate content.
2. Point the single primary `Work` item and project back links to `/explore/`; remove a competing Explore index label.
3. Replace each route with destination canonical, suitable `noindex`, normal fallback link, and restricted `location.replace`.
4. Preserve supported query/fragment data without accepting a user-controlled destination. Map `#architecture` to System View or retain the alias.
5. Remove `/work/*` from sitemap and update canonical/structured metadata/internal links. Do not claim unsupported HTTP 301/308 behavior.
6. Confirm canonical projects contain no alternate internal case-study links.
7. Hash CNAME and resume before/after and preserve both exactly.

### Acceptance and evidence

- JavaScript and no-JavaScript visitors reach the destination; Back does not bounce through compatibility.
- Canonicals, sitemap, and links agree on `/explore/*`.
- Browser checks cover redirect, fallback, query/fragments, `#architecture`, and Back.
- Byte-preservation evidence and the shared gate pass.

---

## SA-07 / Issue #36 — Remove superseded surfaces, verify the release and close the migration

**Suggested branch:** `feat/sa-07-atlas-release`

**Blocked by:** #35.

### Outcome

Remove only proven dead surfaces, align current docs with the delivered Atlas, execute release verification, validate production, and close the migration with evidence.

### Implementation sequence

1. Search source, manifests, generator inputs, styles, tests, docs, and output before deleting old district/globe/Work/detail artifacts.
2. Remove only unreferenced resources and update generation sources so obsolete entries do not reappear. Retain useful historical evidence.
3. Update README and active explorer docs for Systems Atlas, three projects, canonical routes, rendering, controllers, loading, and fallback.
4. Keep supersession notes on older normative docs rather than rewriting historical delivery records.
5. Audit output for unsupported metrics, sensitive data/topology, live-system implications, dead links, and alternate case-study links.
6. From a clean checkout run the full gate plus asset generation/validation and dead-reference searches.
7. Capture desktop/mobile evidence for Home, Atlas, projects, CnesData scenarios, Infrastructure failure/reset, keyboard/history, reduced motion, no JavaScript, `View 2D`, and failure.
8. Record loading observations. Verify deployed Home, Atlas, projects, compatibility routes, sitemap, CNAME, and resume after Pages completes.
9. Attach evidence to #36/#29. Close completed SA issues and then the EPIC only after production verification.

### Acceptance and evidence

- No deleted resource has an active reference and no generator recreates the superseded contract.
- Current documentation and deployed behavior agree.
- Clean-checkout validation, focused evidence, deployment checks, and preserved hashes are recorded.
- #29 remains open until all seven sub-issues and deployed verification complete.

## Planning PR review and merge gate

This plan/spec publication is documentation only and does not close any SA issue.

1. Commit only the approved spec v2, this plan, and the two minimal supersession notices.
2. Open `docs: plan Systems Atlas simplification` against `main`, referencing #29 without closing it.
3. Run `git diff --check`. Let CI execute `npm ci`, tests, build, smoke, and Playwright.
4. With CI green, comment `@codex review` plus the full current HEAD SHA.
5. Validate each finding technically. Fix spec/plan consistency, security, accessibility, testability, or scope errors; synchronize issues if delivery changes.
6. After corrections, validate, push a new commit, and request a fresh review for the new SHA.
7. Squash merge only when Codex explicitly reports no major issues for the exact current HEAD and every check for that SHA is green, using `gh pr merge --squash --match-head-commit <reviewed-sha>`.
8. Confirm the merge on `main`. Leave #29 and #30–#36 open for future implementation, one PR per issue.
