# Systems Observatory Implementation Plan

> **For agentic workers:** implement one GitHub issue per branch/worktree. Keep tests localized and merge as soon as the issue works and integrates.

**Goal:** Ship the recruiter-first Astro portfolio first, then add the optional Systems Observatory without overengineering a personal static site.

**Architecture:** Astro provides static pages and content. A small TypeScript controller/engine powers the 2D walkthrough. React + React Three Fiber + Three.js exist only in the optional 3D path and load after explicit activation.

**Tech Stack:** Astro, TypeScript, npm, React 19, React Three Fiber 9, Three.js, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-systems-observatory-tech-spec.md`

## Global constraints

- Epic/tracker: #4.
- Preserve the current `public/assets/vinicius-santana-resume.pdf`; PR #3 is already merged into the baseline.
- Preserve `public/CNAME` and current domain behavior.
- No backend, auth, analytics, live project APIs, municipal data, or production infrastructure details.
- No coverage target or heavyweight quality gates.
- Every PR: install/build + focused changed-behavior tests + one relevant smoke path.
- Prefer small PRs; non-blocking polish becomes follow-up work.
- Use one worktree/branch per issue when work is parallelized.

---

## Delivery graph

```text
#5 SO-01 Foundation
  └─> #6 SO-02 Content
       ├─> #7 SO-03 M1 pages ─> #8 SO-04 M1 release
       ├─> #9 SO-05 CnesData engine ─> #10 SO-06 2D explorer
       └─> #11 SO-07 Assets ─────────────┐
                                         └─> #12 SO-08 3D
#8 + #12 ─> #13 SO-09 M2 integration/release
```

M1 should be published after #8 without waiting for #9–#13.

## Shared-file coordination

Only one active lane should own these at a time:

- `package.json` / `package-lock.json`
- `astro.config.*`
- `.github/workflows/*`
- global layout/navigation
- global stylesheet/tokens
- central content schema

If parallel work needs a shared file, the later lane rebases after the owner merges rather than creating duplicated configuration.

---

### Task 1 / Issue #5: Astro foundation

**Branch:** `feat/so-01-astro-foundation`

**Likely files:**
- Replace/update `package.json`, `package-lock.json`
- Create `astro.config.mjs`
- Create `src/layouts/*`, `src/pages/index.astro`, `src/styles/*`
- Preserve `public/CNAME`, `public/assets/vinicius-santana-resume.pdf`

**Steps:**
- [ ] Snapshot current resume hash/path and CNAME.
- [ ] Add Astro + TypeScript baseline and remove Vite-only entry wiring.
- [ ] Build a minimal static home using the existing approved identity/copy as temporary content.
- [ ] Add a small foundation smoke that checks the built home, CNAME, and resume file.
- [ ] Run `npm ci`, focused tests, and `npm run build`.
- [ ] Open PR referencing #5; merge once the static foundation works.

**Do not:** add Three.js/R3F or redesign all content in this issue.

---

### Task 2 / Issue #6: Content model + three case studies

**Branch:** `feat/so-02-case-studies`

**Likely files:**
- `src/content.config.ts` or equivalent Astro content configuration
- `src/content/projects/*`
- `src/content/cases/*`
- project/case components local to this feature

**Steps:**
- [ ] Define the smallest typed model needed for project metadata, contribution/context, capability status, and case-study content.
- [ ] Write/revise CnesData case study against the current documented contract/revision.
- [ ] Write/revise Limnopulse case study without implying unsupported production state.
- [ ] Write Infrastructure & Operations as sanitized professional/lab/reference material.
- [ ] Remove or omit unverified quantitative claims.
- [ ] Add schema/content tests for the three published cases.
- [ ] Build all three routes and open PR referencing #6.

**Do not:** create a generic evidence platform or validation DSL.

---

### Task 3 / Issue #7: Recruiter-first M1 pages

**Branch:** `feat/so-03-editorial-pages`

**Likely files:**
- `src/pages/index.astro`
- `src/pages/work/*`
- `src/pages/about.astro`
- `src/pages/resume.astro`
- `src/pages/privacy.astro`
- shared navigation/footer/components

**Steps:**
- [ ] Implement the final recruiter-first home hierarchy.
- [ ] Build Work index and wire the three case-study routes.
- [ ] Build About, Resume, Privacy, and 404.
- [ ] Restore useful legacy anchors and compatibility destinations for old `#case-*` links.
- [ ] Make mobile navigation and keyboard focus work with simple semantic HTML.
- [ ] Add one compact route/navigation smoke test.
- [ ] Build and open PR referencing #7.

**Do not:** expose `Explore` as a primary CTA yet.

---

### Task 4 / Issue #8: CI, SEO, and M1 release

**Branch:** `feat/so-04-m1-release`

**Likely files:**
- `.github/workflows/deploy-site.yml`
- package scripts
- Astro site config / SEO component
- `README.md`
- small `scripts/smoke-*` helper if useful

**Steps:**
- [ ] Switch workflow install to `npm ci` and chosen supported Node version.
- [ ] Ensure Pages uploads Astro `dist/`.
- [ ] Generate consistent canonical/social metadata, sitemap, robots, and 404.
- [ ] Add a post-build smoke for expected M1 files/routes and resume/CNAME presence.
- [ ] Update README with local development and deploy commands.
- [ ] Run CI-equivalent commands locally where possible.
- [ ] Open PR referencing #8 and publish M1 after merge.

**Release smoke:** home → one case → resume/contact; direct reload of case route.

---

### Task 5 / Issue #9: CnesData walkthrough engine

**Branch:** `feat/so-05-cnesdata-walkthrough`

**Likely files:**
- `src/features/explorer/simulation/*`
- `src/content/scenarios/cnesdata.*`
- focused test file beside/under `tests/`

**Interface:**

```ts
type Command =
  | { type: 'SELECT_SCENARIO'; scenarioId: string }
  | { type: 'STEP' }
  | { type: 'RESET' };

function transition(state: SimulationState, command: Command): SimulationState;
```

**Steps:**
- [ ] Define three synthetic scenario fixtures.
- [ ] Write focused tests for first write, identical replay, conflict, reset, invalid scenario.
- [ ] Implement the minimal deterministic transition function.
- [ ] Generate/read static transcript data from the same fixtures.
- [ ] Run the focused suite and build.
- [ ] Open PR referencing #9.

**Do not:** implement networking, real hashes, DBC/Parquet processing, or backend calls.

---

### Task 6 / Issue #10: 2D Observatory

**Branch:** `feat/so-06-2d-observatory`

**Likely files:**
- `src/pages/explore/*`
- `src/features/explorer/controller/*`
- `src/features/explorer/diagram/*`
- explorer-local styles/components

**Steps:**
- [ ] Add overview and three project explorer routes.
- [ ] Build HTML/SVG component diagrams and panel data.
- [ ] Wire CnesData controls to the #9 engine.
- [ ] Render static transcripts/fallbacks when interaction is unavailable.
- [ ] Keep Limnopulse and Infrastructure as component explorers only.
- [ ] Add focused browser smoke for project selection, one scenario path, reset, and no-WebGL/3D dependency.
- [ ] Open PR referencing #10.

---

### Task 7 / Issue #11: Posters and 3D assets

**Branch:** `feat/so-07-observatory-assets`

**Likely files:**
- `public/assets/posters/*`
- `public/assets/scenes/*`
- `src/content/scenes/*`
- asset source/license note under `docs/`

**Steps:**
- [ ] Create one poster/fallback per project.
- [ ] Define simple scene manifests with stable node IDs matching 2D component IDs.
- [ ] Create simple GLB/procedural assets for the three areas.
- [ ] Remove unnecessary texture/geometry weight manually when obvious.
- [ ] Record license/source for any external asset.
- [ ] Add cheap existence/manifest parse checks.
- [ ] Open PR referencing #11.

**Do not:** add a complex asset pipeline before a real need appears.

---

### Task 8 / Issue #12: Optional 3D renderer

**Branch:** `feat/so-08-3d-renderer`

**Likely files:**
- `src/features/explorer/scene/*`
- `src/features/explorer/launcher/*`
- package dependencies/lockfile if not already introduced

**Steps:**
- [ ] Add compatible React/R3F/Three dependencies.
- [ ] Implement `Enable 3D` as the only entry point that imports renderer code/assets.
- [ ] Bind renderer selection/highlights to the existing explorer/controller state.
- [ ] Preserve state when enabling/disabling the canvas.
- [ ] Handle renderer/model failure by returning to the existing 2D experience.
- [ ] Add focused tests for lazy activation, state handoff, and fallback.
- [ ] Build and open PR referencing #12.

**Do not:** duplicate simulation logic inside React/Three components.

---

### Task 9 / Issue #13: M2 integration and release

**Branch:** `feat/so-09-m2-release`

**Likely files:** shared navigation/styles, small integration fixes only.

**Steps:**
- [ ] Rebase/integrate M2 lanes and resolve shared-style/navigation conflicts.
- [ ] Enable Explore navigation/CTA.
- [ ] Check desktop/mobile presentation and reduced-motion basics.
- [ ] Run existing focused suites and build.
- [ ] Run one production-style smoke: home → case → explore → CnesData scenario → enable 3D → disable/fallback → resume/contact.
- [ ] Fix concrete blockers only; open follow-up issues for optional polish.
- [ ] Deploy and verify production routes.
- [ ] Close #13 and then #4 when #5–#13 are all complete.

---

## PR review policy

For every implementation PR:

1. Verify the issue scope is actually implemented.
2. Run the focused commands named by that issue.
3. Check the diff for accidental sensitive/private content.
4. Resolve functional/integration review findings.
5. Do not expand the PR for unrelated style refactors.
6. Merge and update the epic checkbox/tracker if GitHub does not reflect it automatically.

This plan intentionally optimizes for shipping a maintainable portfolio rather than maximizing test or process rigor.