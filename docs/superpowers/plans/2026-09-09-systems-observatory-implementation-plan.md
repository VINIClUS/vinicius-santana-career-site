# Systems Observatory Implementation Plan

> **For agentic workers:** implement one GitHub issue per branch/worktree. The committed reference image is the primary visual target. Keep tests localized and merge when the issue works and integrates.

**Goal:** Finish the portfolio as the dark, cinematic technical-dashboard and isometric Systems Observatory shown in the approved reference, while preserving truthful content and the current static Astro architecture.

**Architecture:** Astro remains the static shell. Existing case content, simulation engine and 2D explorer stay useful. Home/Work/project pages receive a visual-alignment pass; a reusable isometric asset kit feeds a progressively loaded React Three Fiber/Three.js Observatory. 3D becomes the primary capable-browser Explore view, with immediate HTML/2D fallback.

**Tech Stack:** Astro, TypeScript, npm, React 19, React Three Fiber 9, Three.js, Playwright smoke tests, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-systems-observatory-tech-spec.md`  
**Visual reference:** `docs/design/systems-observatory-visual-reference.jpg`  
**Epic:** #4

## Global constraints

- **Match the reference composition and art direction.** Do not treat the visual system as optional post-release polish.
- The reference image is not a source of factual metrics. Do not copy `5.5k+`, `100M+`, `99.9%`, `100% uptime`, `<2s` or similar placeholders as facts.
- Preserve `/assets/vinicius-santana-resume.pdf`, current CNAME/domain behavior and public routes.
- Keep real municipal/personal data, network topology, credentials and authenticated screenshots out of the public repository/site.
- No backend, auth, CMS, analytics or live project APIs.
- No coverage target or heavyweight quality gates.
- Every PR: focused tests + build + one relevant browser/integration smoke.
- One worktree/branch per issue when parallelized.
- Coordinate `package.json`, lockfile, global styles/layout/nav and scene registry ownership.

---

## Current baseline

Already merged and not to be reimplemented:

- [x] #5 — Astro static foundation
- [x] #6 — typed case-study content
- [x] #7 — core recruiter routes/navigation
- [x] #8 — Pages/SEO/static smoke
- [x] #9 — CnesData synthetic write/replay/conflict engine
- [x] #10 — HTML/2D explorer and project routes

These delivered useful functionality but visually drifted from the approved concept. The remaining plan corrects the presentation without throwing away the working baseline.

## Revised delivery graph

```text
                        ┌─> #21 UI alignment ───────────────┐
completed #10 baseline ─┤                                  │
                        └─> #11 visual asset kit ──┬─> #12 3D ──┐
                                                  └─> #22 infra ─┼─> #13 release
#22 can build state/2D while #11 finishes final scene assets ────┘
```

Run **#21 and #11 in parallel**. #22 may begin its state/HTML panel from current main and consume final assets after #11. #12 should integrate the stable asset kit. #13 is the only final shared-style/release lane.

---

## Task A / Issue #21 — Home, Work and project-detail visual alignment

**Branch:** `feat/so-10-visual-alignment`

**Primary reference panels:** 01, 03, 04, 07, 08.

**Likely files:**
- `src/pages/index.astro`
- `src/pages/work/**`
- flagship case-study page/component files
- global/shared styles and navigation components
- small domain-card/icon components

### Deliverable

Convert the already-working editorial UI into the reference's dark technical-dashboard composition.

### Steps

- [ ] Replace the portrait-dominant Home hero with a two-column dark hero: identity/copy left, large globe/data-network visual slot right.
- [ ] Add the four compact domain pillars: Data Systems, Distributed Infrastructure, Backend Engineering, Public Health.
- [ ] Make `View selected work` and `Explore systems` the two main hero actions; keep Resume in the compact header.
- [ ] Keep the portrait on About rather than deleting a useful asset.
- [ ] Rework `/work/` into an image-led dark card grid with CnesData, LimnoPulse, Infrastructure and Health Systems/public-health work.
- [ ] Rework CnesData detail into the reference pattern: header/chips, anchor-tab row and large visual architecture/simulation panel near the top.
- [ ] Reuse current truthful content and SO-05 controls; do not invent scale metrics.
- [ ] Apply responsive stacked layouts similar to panel 07.
- [ ] Run existing tests/build plus one desktop and one mobile Playwright smoke for Home → Work → CnesData.
- [ ] Open PR referencing #21 and the visual-alignment planning PR.

**Do not:** wait for final 3D assets to implement layout; use stable placeholders/posters from #11 when available.

---

## Task B / Issue #11 — Reference-aligned visual asset kit

**Branch:** `feat/so-07-reference-assets`

**Primary reference panels:** 01–05 and 08.

**Likely files:**
- `public/assets/posters/**`
- `public/assets/scenes/**`
- `src/content/scenes/**`
- `docs/design/**`

### Required asset groups

- [ ] Home globe/data-network visual that can render without the full Three.js Observatory bundle.
- [ ] Four Work-card hero/poster visuals.
- [ ] Central Observatory hub.
- [ ] Five district kits: CnesData, Public Health, Infrastructure, Observability, LimnoPulse.
- [ ] CnesData architecture/pipeline props or poster.
- [ ] Infrastructure 3-node/shared-layer props or poster.
- [ ] Mobile/no-WebGL fallbacks.

### Art direction

Dark navy/near-black, slate surfaces, thin grid/borders, compact white labels, teal/green/blue highlights, isometric maquettes, restrained glow. Prefer architectural-diorama quality over abstract circles/boxes.

### Steps

- [ ] Define stable scene manifest IDs, reusing current explorer component IDs where they map cleanly.
- [ ] Create/provision the smallest visual assets that achieve the reference look.
- [ ] Keep assets local; record source/license for third-party material.
- [ ] Remove obvious unnecessary weight manually.
- [ ] Add cheap manifest/file existence validation.
- [ ] Build and manually inspect one desktop + mobile fallback.
- [ ] Open PR referencing #11.

**Do not:** build an elaborate Blender/asset-processing pipeline before there is a real need.

---

## Task C / Issue #22 — Five-district 2D map + Infrastructure failure simulation

**Branch:** `feat/so-11-infrastructure-simulation`

**Primary reference panels:** 02 and 05.

**Likely files:**
- existing explorer project/diagram data
- `src/features/explorer/simulation/**`
- Infrastructure route/view components
- focused tests

### Observatory-domain update

- [ ] Expand the overview composition to five visual districts around a central hub: Data Platform, Public Health, Infrastructure, Observability, LimnoPulse.
- [ ] Represent Public Health and Observability as portfolio domains/layers, not fabricated standalone products.
- [ ] Keep conceptual connection lines explicitly illustrative.

### Infrastructure simulation model

Use synthetic state only:

```ts
type InfraCommand = { type: 'FAIL_NODE'; nodeId: 'node-02' } | { type: 'RESET' };

type InfraNodeState = 'online' | 'failed';
```

Initial state:

```text
node-01 online
node-02 online + illustrative workload
node-03 online
shared layer available
```

After `FAIL_NODE(node-02)`:

```text
node-02 failed
workload highlighted on one healthy node
logical event list appended
shared layer remains illustrative/available
```

No real timing or uptime values.

### Steps

- [ ] Add focused transition tests for fail + workload move + reset.
- [ ] Implement the minimal deterministic state function.
- [ ] Add the panel UI and event timeline to the Infrastructure view.
- [ ] Connect visual state to #11 assets when available; keep HTML fallback usable beforehand.
- [ ] Add one browser smoke for Simulate failure → state change → Reset.
- [ ] Build and open PR referencing #22.

---

## Task D / Issue #12 — Reference-first 3D Observatory

**Branch:** `feat/so-08-reference-3d-observatory`

**Primary reference panel:** 02, with detail support for 04/05.

**Likely files:**
- `src/features/explorer/scene/**`
- scene launcher/adapter files
- package/lockfile if Three/R3F are introduced here
- explorer-local styles

### Behavior change from the old plan

**Do not require `Enable 3D` by default.** The current Astro/2D view renders immediately, then capable browsers progressively import and mount the 3D Observatory.

### Steps

- [ ] Add/verify compatible R3F + Three.js dependencies.
- [ ] Build the central hub + five-district overview using #11 manifests/assets.
- [ ] Use an orthographic/isometric camera with constrained orbit and modest zoom.
- [ ] Keep project labels/description controls in HTML overlays.
- [ ] Wire district selection to existing explorer/project IDs.
- [ ] Add subtle camera/highlight transitions; no free-roam controls.
- [ ] Load overview assets first; do not download every detail scene immediately.
- [ ] If `Save-Data`, WebGL initialization or asset loading fails, retain/show the current 2D view.
- [ ] Respect reduced-motion by reducing camera travel/continuous animation.
- [ ] Add focused browser smoke: capable mount + district selection + forced 2D fallback + one mobile viewport.
- [ ] Build and open PR referencing #12.

**Do not:** duplicate CnesData or Infrastructure transition logic in Three components.

---

## Task E / Issue #13 — Final integration/release against reference

**Branch:** `feat/so-09-reference-release`

**Depends on:** #21, #11, #22, #12.

### Visual acceptance checklist

- [ ] **Panel 01:** Home has dark recruiter-first split hero, four pillars, two CTAs and globe/network visual.
- [ ] **Panel 02:** Observatory has central hub + five isometric districts and feels like the reference's technical diorama.
- [ ] **Panel 03:** Work is an image-led dark card grid with four portfolio categories.
- [ ] **Panel 04:** CnesData detail has chips, section tabs/anchors and a large architecture/simulation stage.
- [ ] **Panel 05:** Infrastructure has 3-node synthetic failure simulation + event timeline.
- [ ] **Panel 07:** key pages stack coherently on mobile.
- [ ] **Panel 08:** design tokens/lighting/borders/typography are consistent across routes.

### Integration steps

- [ ] Resolve global styles/navigation conflicts from the parallel lanes.
- [ ] Enable `Explore` in the primary navigation and Home CTA.
- [ ] Remove obsolete copy/UI that still frames 3D as a hidden opt-in secondary experience.
- [ ] Verify no concept-placeholder metrics leaked into public content.
- [ ] Run current focused tests/build.
- [ ] Run one concise desktop + mobile flow: Home → Work → CnesData simulation → Explore 3D → Infrastructure failure → 2D fallback → Resume/contact.
- [ ] Deploy through existing GitHub Pages workflow and visually compare the deployed key pages against the committed reference.
- [ ] Fix functional or obvious visual-direction blockers; file minor polish separately.
- [ ] Close #13 and then #4 when #11/#12/#21/#22 are complete and production smoke is good.

---

## Review/merge policy

For each remaining PR:

1. Confirm it solves its issue and moves the result toward the committed visual reference.
2. Run only the focused commands relevant to the changed behavior plus build.
3. Check for private/sensitive content and unsupported metrics.
4. Resolve functional/integration findings.
5. Do not expand scope for speculative abstractions or pixel-level polish.
6. Merge and update #4 tracker.

The purpose of this plan is to recover the intended visual ambition **without throwing away the functional work already delivered and without turning a portfolio into a high-rigor platform project**.