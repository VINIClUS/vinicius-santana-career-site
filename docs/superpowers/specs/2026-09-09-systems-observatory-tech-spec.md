# Systems Observatory — Tech Spec

**Date:** 2026-09-09  
**Revision:** 2026-09-10 — visual-direction alignment  
**Status:** Approved for implementation  
**Epic:** #4  
**Repository:** `VINIClUS/vinicius-santana-career-site`

## 1. Product decision

Build the portfolio as a **dark, visual, systems-oriented engineering showcase**. The approved concept image is now the primary reference for composition, density, visual hierarchy and art direction:

![Approved Systems Observatory visual reference](../../design/systems-observatory-visual-reference.png)

The previous implementation direction over-indexed on a conventional editorial portfolio and treated 3D as an optional secondary feature. This revision corrects that drift.

The target experience is the one expressed by the reference:

- recruiter-first dark home with a large technical/globe visual;
- image-led Work overview;
- dense but readable project-detail dashboards;
- a prominent isometric Systems Observatory;
- small, purposeful simulations embedded in project views;
- responsive mobile versions of the same hierarchy.

The image is **normative for visual direction, not factual content**. Text, project state, metrics, system topology and performance numbers shown inside the concept are placeholders unless independently supported by the portfolio's approved content.

Public name:

> **Systems Observatory — interactive engineering portfolio**

The Observatory is a didactic representation of engineering systems, not a live production dashboard or digital twin.

## 2. Delivery principles

1. **Visual identity is part of the product**, not post-release polish.
2. A recruiter should understand role, domains and selected work from the first screen.
3. Engineering readers should be able to move from visual overview to architecture, simulation, decisions and evidence.
4. On capable devices, `/explore/` should naturally become the 3D Observatory without requiring a separate opt-in click.
5. HTML/2D remains available immediately and is the fallback for WebGL failure, reduced-data cases and accessibility.
6. The codebase stays small and static; no backend is introduced for visual ambition.
7. Tests stay localized: working behavior + integration smoke, not process-heavy certification.

## 3. Reference panels and required correspondence

| Reference panel | Implementation target |
|---|---|
| **01 — Home / Recruiter First** | Dark hero, identity on left, four domain pillars, two main CTAs, large globe/data-network visual on right |
| **02 — Systems Observatory / Interactive 3D** | Central systems hub with five isometric districts, compact labels, constrained orbit/zoom, click/tap project selection |
| **03 — Work / Projects Overview** | Dark image-led card grid with CnesData, LimnoPulse, Infrastructure and Health Systems/public-health work |
| **04 — Project Detail / CnesData** | Project header, chips, anchor/tab row, large visual architecture/simulation panel, engineering/results sections |
| **05 — Infrastructure Simulation** | Three generic nodes, shared layer, failure action, state change and synthetic event timeline |
| **06 — Other Pages** | About/Resume receive the same visual system during final integration in #13; future Writing/Lab pages are not created empty only to match the mockup |
| **07 — Mobile Views** | Stacked versions of Home, Observatory and project detail preserving the same information hierarchy |
| **08 — Design System** | Near-black/navy, slate surfaces, thin grid/borders, compact typography, teal/green/blue technical highlights, isometric visuals |

A page does not need to be pixel-identical. It should be immediately recognizable as the same design language and composition family.

## 4. Non-goals

Do not add:

- backend services, CMS/admin UI or authentication;
- live GitHub/project/infrastructure APIs at runtime;
- municipal production data or screenshots;
- a new hosting provider or DNS migration;
- free-roam/game controls;
- a generic visualization/plugin framework;
- Redux unless a concrete need appears;
- exhaustive performance/compliance programs;
- unsupported metrics merely because the reference contains number blocks.

## 5. Architecture

### 5.1 Static shell

Keep **Astro static output**, npm and GitHub Pages. Pages, copy, metadata and fallback diagrams render at build time.

React is used only where interaction benefits from it. React Three Fiber + Three.js belong to the Explore/scene feature path, not the home bundle.

### 5.2 Progressive visual loading

The Home may use a lightweight raster/SVG/canvas globe/data-network visual, but it must not require the full Observatory renderer.

For `/explore/`:

1. Astro renders the route, text, labels, fallback poster/diagram and project controls immediately.
2. On a capable browser, the 3D renderer imports asynchronously and replaces/enhances the visual stage automatically.
3. No explicit `Enable 3D` click is required by default.
4. `Save-Data`, renderer/WebGL failure or a deliberate `View 2D` choice may keep the route in 2D.
5. 3D failure must not remove navigation, project descriptions or simulations.

Do not preload all project scenes on first visit.

### 5.3 Content and state

Keep the existing typed case-study content and stable explorer component IDs. Project state labels may distinguish `implemented`, `documented`, `planned`, `historical` and `illustrative`.

Simulation state remains deterministic and synthetic. Renderers consume state; they do not own business rules.

## 6. Information architecture

### Core routes

- `/`
- `/work/`
- `/work/cnesdata/`
- `/work/limnopulse/`
- `/work/infrastructure/`
- `/about/`
- `/resume/`
- `/privacy/`
- `/explore/`
- `/explore/cnesdata/`
- `/explore/limnopulse/`
- `/explore/infrastructure/`
- `/404.html`

`Writing` may appear in the compact navigation only when a real `/writing/` page has useful content. Do not create an empty route just to copy the mockup.

Preserve current CNAME behavior and `/assets/vinicius-santana-resume.pdf`.

The following legacy fragment contracts must continue to resolve to meaningful content after the visual rewrite:

- Home: `#about`, `#experience`, `#projects`, `#stack`, `#contact`;
- case destinations: `#case-cnesdata`, `#case-aquafarm`, `#case-esus-pec-bootstrap`, `#case-infra-ansible`, `#case-packer-proxmox-templates`.

## 7. Home — target composition

The current portrait-dominant editorial hero should be replaced by the reference composition.

### Left column

- small eyebrow/status line;
- **Vinicius Santana** as the dominant heading;
- **Software & Data Engineer** immediately below;
- concise line such as `I build reliable systems where software, data and infrastructure meet.`;
- four icon/pillar items:
  - Data Systems;
  - Distributed Infrastructure;
  - Backend Engineering;
  - Public Health;
- two primary actions:
  - `View selected work`;
  - `Explore systems`.

Resume stays clearly available in the header. Contact remains easy to find further down and/or in navigation/footer.

### Right column

Use a large globe/data-network visual inspired by the reference. It is a design metaphor for connected systems and geographic context, **not evidence of global traffic, deployments or customers**. Do not add map coordinates or scale claims unless they have a deliberate editorial purpose.

The professional portrait can remain on About; it should not be the main visual of Home.

## 8. Work overview

The Work page should be **image-led**, not an article index.

Desktop target: four cards in a compact grid with strong poster imagery, short summaries, small domain tags and clear actions.

Cards:

1. **CnesData** — healthcare/data platform;
2. **LimnoPulse** — environmental/water telemetry;
3. **Infrastructure** — Proxmox/HA/automation work;
4. **Health Systems** — public-health software/data work and professional context; its action is `View experience` and links to `/#experience`.

**Health Systems** is the Work-card label. **Public Health Systems** is the Observatory-district label. Both represent the canonical `public-health` domain; neither creates a fourth project or route.

## 9. Project-detail pattern

Use the reference CnesData screen as the shared shell for all three flagship project pages: CnesData, LimnoPulse and Infrastructure. CnesData remains the primary visual reference, but the shared header/chips, section navigation, visual-stage placement and responsive behavior apply to all three routes.

### Header

- back-to-work link;
- project name + concise subtitle;
- small domain/status chips;
- repository/technical link where public.

### Section navigation

Use anchor navigation or lightweight progressive enhancement with labels such as:

`Overview · Architecture · Simulation · Engineering · Results`

Do not build a complex SPA tab router. Essential content should remain addressable/readable as normal page sections.

### Main visual panel

The project page should have one large visual architecture/simulation stage near the top, similar to the reference. It may combine isometric assets, SVG/HTML labels and animated data-flow/state highlights.

For CnesData, visual stages may show municipal/source inputs, edge/ingestion, central coordination/storage, processor/Gold/dashboard/rules **only when each element's current/documented/planned status is represented truthfully**. Do not turn the concept's full pipeline into a false production claim.

Existing SO-05 raw write/replay/conflict scenarios remain available and should be presented inside this visual language.

## 10. Systems Observatory

The Observatory is a major portfolio surface, not a hidden enhancement.

### Overview composition

Use a central luminous systems hub and five visually distinct isometric districts:

1. **Data Platform / CnesData**
2. **Public Health Systems**
3. **Infrastructure / Proxmox & HA**
4. **Observability / Monitoring & Insights**
5. **LimnoPulse / Environmental Data**

Public Health and Observability are domains/layers across the work; they do not need standalone product repositories.

Districts should resemble compact architectural maquettes/technical dioramas: baseplates, buildings/racks/environmental elements, subtle grid and controlled luminous connections. Avoid reducing the scene to circles and generic boxes.

Conceptual connection lines may show relationships, but must not be presented as real live traffic.

### Interaction

- constrained isometric camera;
- modest zoom controls;
- click/tap district selection;
- subtle camera transition/highlight;
- HTML labels and project explanation;
- normal links to detailed work;
- explicit `View 2D` fallback.

No keyboard/game movement, avatar, vehicle or free camera is required.

### District registry contract

The five districts share one typed registry across assets, HTML/2D and 3D:

```ts
type ProjectId = 'cnesdata' | 'limnopulse' | 'infrastructure';
type DistrictId = ProjectId | 'public-health' | 'observability';

type District = {
  id: DistrictId;
  kind: 'project' | 'domain';
  href: string;
};
```

| District label | `id` | `kind` | `href` |
|---|---|---|---|
| Data Platform / CnesData | `cnesdata` | `project` | `/explore/cnesdata/` |
| Public Health Systems | `public-health` | `domain` | `/#experience` |
| Infrastructure / Proxmox & HA | `infrastructure` | `project` | `/explore/infrastructure/` |
| Observability / Monitoring & Insights | `observability` | `domain` | `/#stack` |
| LimnoPulse / Environmental Data | `limnopulse` | `project` | `/explore/limnopulse/` |

All five district IDs are selectable and receive the same selected/highlighted state. Selection exposes the district label, description and normal `href` link in the HTML panel. `ProjectId` remains limited to the three existing projects; domain districts must not fabricate project records, routes or case studies.

## 11. Simulations

### 11.1 CnesData

Keep the existing synthetic raw-contract walkthrough:

- first write;
- identical replay;
- content conflict preserving the original object.

No backend calls, real health data or measured latency.

### 11.2 Infrastructure

M2 now also includes the compact visual simulation shown in the reference.

Synthetic reference topology:

- Node 01 — online;
- Node 02 — online → failed;
- Node 03 — online;
- shared storage/service layer;
- one illustrative workload/service assignment.

`Simulate node failure` deterministically marks one node failed, moves/highlights the illustrative workload on a healthy node and appends a short logical event timeline. Reset restores the initial state.

Do **not** copy decorative timestamps, `<2s`, `100% uptime` or any recovery metric from the reference. Animation steps are presentation timing, not benchmark results.

## 12. Visual system

The reference establishes the art direction:

- background: near-black/deep navy;
- panels: dark slate with subtle elevation;
- text: white/off-white with muted blue-gray secondary text;
- accents: teal/green for healthy/active, blue/cyan for data/selection, red only for explicit failure states;
- fine 1px borders and technical grids;
- compact sans-serif UI typography; monospaced text only for technical labels/events;
- medium-radius cards/controls;
- isometric imagery with soft directional light and restrained glow;
- generous negative space around the main visual stage, but higher information density inside technical panels.

Avoid neon cyberpunk, terminal/hacker motifs, generic SaaS gradients, cartoon low-poly styling and bright marketing-card aesthetics.

## 13. Asset kit

Issue #11 owns the visual kit and asset manifests keyed by the five-value `DistrictId` contract:

- home globe/data-network visual;
- four Work card posters;
- five Observatory district kits + central hub;
- CnesData architecture props/poster;
- Infrastructure cluster props/poster;
- mobile/fallback representations;
- scene manifests and source/license notes.

Original/procedural assets are preferred. Optimize obvious excess manually before introducing specialized compression infrastructure.

## 14. Responsive behavior

Desktop prioritizes the visual stage; mobile preserves the same hierarchy in stacked panels.

Mobile reference intent:

- compact `VS` header + menu;
- hero copy first, visual second;
- Observatory visual/poster followed by project selector/action;
- project detail keeps architecture/simulation panel near the top;
- no essential content requires hover, pinch or landscape orientation.

The 3D renderer may use a lighter camera/preset or remain in 2D if device/browser constraints make the scene poor.

## 15. Truthfulness and safety

The reference image contains visual placeholder metrics. Specifically, do not publish `5.5k+ municipalities`, `100M+ records`, `99.9% data reliability`, `100% uptime`, `<2s failover` or similar values unless a later content change provides a publishable basis.

Do not expose:

- patient/professional records;
- real municipal hostnames, IPs or network diagrams;
- authenticated screenshots;
- credentials/secrets;
- simulated events presented as production telemetry.

## 16. Testing policy — deliberately lean

Every implementation PR must run the repository/CI baseline:

```text
npm ci
npm test
npm run build
npm run smoke
npm run test:explorer
```

Run issue-specific focused tests in addition to, not instead of, this baseline.

Required when relevant:

- route/build smoke;
- focused simulation state tests;
- one desktop and one mobile browser pass for visual changes;
- 3D mount/selection/fallback smoke;
- resume/public-route preservation.

Not required as release gates unless a concrete problem justifies them:

- coverage percentage;
- load/soak tests;
- formal WCAG certification;
- large browser/device matrix;
- Lighthouse/FPS threshold;
- pixel-perfect visual regression;
- repeated GPU lifecycle soak.

A visual-direction PR is blocked when the result is functionally broken or obviously no longer resembles the approved reference, not because of minor pixel differences.

## 17. Work map

Completed foundation work remains valid:

- #5 — Astro foundation
- #6 — case-study content model
- #7 — recruiter-first routes
- #8 — deploy/SEO/smoke
- #9 — CnesData synthetic engine
- #10 — existing 2D explorer

Reference-alignment work:

- #21 — re-align Home, Work and project-detail UI
- #11 — create reference-aligned posters/isometric scene kit
- #22 — five-district mapping + synthetic Infrastructure simulation
- #12 — primary 3D Observatory renderer with progressive loading
- #13 — integrate/polish/release against the reference

Recommended dependency flow:

```text
#21 UI alignment ─────────────────────────────┐
#11 visual assets ──> #22 visual integration ─┐
completed #10 ──────> #22 registry + state/HTML/2D ──> #12 3D ──> #13 release
                         (registry/state work can start before #11)
```

#21, #11 and #22 registry/state/HTML work can proceed in parallel. Only #22's final visual integration depends on #11 assets. #12 depends on the merged #22 district registry and consumes the #11 asset kit through that integration. #13 waits for all four lanes and owns the panel-06 About/Resume alignment.

## 18. Definition of done

The visual-alignment revision is complete when:

- Home corresponds clearly to reference panel 01;
- Work corresponds clearly to panel 03;
- CnesData detail corresponds clearly to panel 04 and the same shell is applied to LimnoPulse and Infrastructure;
- Observatory corresponds clearly to panel 02 with central hub + five districts;
- Infrastructure includes the panel-05-style synthetic failure simulation;
- mobile preserves panel-07 hierarchy;
- all factual content remains truthful and sanitized;
- About and Resume receive panel 06's shared visual treatment in #13;
- current resume, routes and all named legacy anchors remain intact;
- the full repository/CI command sequence plus issue-specific tests pass and GitHub Pages publishes successfully.

Minor visual polish can continue later. The release should not be delayed for exhaustive process or certification work.
