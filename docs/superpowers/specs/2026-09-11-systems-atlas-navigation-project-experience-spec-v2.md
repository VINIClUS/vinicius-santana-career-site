# Systems Atlas — Navigation & Project Experience Simplification

**Date:** 2026-09-11<br>
**Revision:** 2 — repository-grounded WebGL / Three.js policy<br>
**Status:** Approved for implementation; not yet released<br>
**Repository:** `VINIClUS/vinicius-santana-career-site`<br>
**Historical inspection baseline:** `main` at `568eef3de554d5da270a0304843f93cbc7838abf` (SO-08 / PR #27) [R1]<br>
**Execution baseline:** `main` at `d91d468` (SO-09 / PR #28)
**Scope:** Home, information architecture, Systems Atlas, canonical project pages, progressive visual rendering, and legacy `/work/*` compatibility.

**Supersedes:** the supplied 2026-09-11 simplification proposal where it restricts Home or project rendering technologies; the older requirements for separate Work/Explore experiences, two competing Home work CTAs, a generic globe, and five equally selectable districts. Conflicting requirements in the 2026-09-09 Observatory spec and its implementation plan must be marked superseded when this proposal is adopted. Historical delivery records need not be rewritten.

**Preserves:** `Home → Atlas → Project → Evidence`, three actual flagship systems, recruiter-readable static content, evidence and limitations, Public Health as domain context, Observability as a capability, static hosting, and localized tests.

> **3D is a first-class visual language, not a prerequisite for understanding or navigating the portfolio.**
>
> WebGL / Three.js / React Three Fiber are explicitly supported on Home, the Atlas, and appropriate project System Views. HTML owns content and navigation; deterministic controllers own behavior; renderers present that state.

This revision is based on source-code and repository-metadata inspection. It does not report a new production build, browser performance benchmark, or completed implementation. Appendix A records the relevant baseline and Appendix C the sources.

---

# 1. Product decision

Simplify the portfolio around one primary navigation model:

> **Home → Systems Atlas → Project → Evidence**

`/explore/` is the canonical flagship-work hub, publicly branded **Systems Atlas**. Visitors must not choose between Selected Work, Explore Systems, a case study, and a separate project explorer to inspect the same work.

The four layers are:

1. **Home:** identity, positioning, experience, and the portfolio’s visual language.
2. **Atlas:** discovery of three substantial engineered systems.
3. **Project:** narrative, contribution, architecture, behavior, decisions, and outcomes.
4. **Evidence:** public sources that support the claims.

The objective is to make technical depth easier to enter, not to remove it. A visually ambitious Atlas and simpler navigation are compatible goals.

# 2. Core product principles

1. One canonical flagship-work index and one canonical internal page per project.
2. Home introduces; Atlas organizes; project pages explain.
3. Projects, domains, and capabilities have different semantic and navigational roles.
4. Visual identity is part of the product, not an afterthought.
5. Interaction should explain systems or provide restrained visual identity; it must not obscure content.
6. Projects differ through architecture and behavior, not just copy inside an identical viewer.
7. Technical depth, evidence, and discovery remain accessible without WebGL or animation.
8. Existing status distinctions, limitations, and truthful contribution claims survive consolidation.
9. Reuse the existing Three.js / React Three Fiber foundation; do not rewrite the renderer solely to avoid a technology already in use.
10. Performance constraints govern loading and behavior, not blanket bans on canvas, React, GLB, or WebGL.

# 3. Goals

## 3.1 Primary goals

Remove duplication between `/work/*` and `/explore/*`; consolidate the hero into one work CTA; replace the globe with the actual Atlas composition; retain three flagship systems; preserve Public Health and Observability in their appropriate roles; preserve evidence and useful legacy links; keep the site static and recruiter-first.

Permit a progressively enhanced 3D Home preview, keep the interactive Atlas as the primary enhanced discovery surface, and allow project-specific 2D or 3D System Views according to explanatory value.

## 3.2 Success criteria

The first screen communicates who Vinicius is, his software/data/infrastructure positioning, and where to inspect his work. Any flagship project is reachable through Home → Atlas → Project without a Work intermediary.

Each project page supports both a recruiter scanning contribution and outcomes and an engineer inspecting architecture and behavior. Essential navigation never waits for a model, graphics context, shader, or animation.

# 4. Non-goals

This revision does not introduce a backend, CMS, authentication, live infrastructure/GitHub APIs, production telemetry, a hosting migration, a generic visualization framework, or a generalized taxonomy subsystem.

It does not create Public Health or Observability projects for visual symmetry, fabricate topology or metrics, turn Home into an application-sized explorer, add game/free-roam navigation, or require all projects to use 3D.

A WebGPU migration, physics engine, XR experience, and post-processing stack are not required by this revision. Their absence is not an acceptance failure. Future additions need a concrete product reason rather than inclusion merely because Three.js supports them.

**A lightweight, progressively loaded Three.js / React Three Fiber Home preview is explicitly within scope.** Home being static does not mean its visual layer must remain a raster image.

# 5. Information architecture

Canonical public routes:

```text
/
├── /explore/
│   ├── /explore/cnesdata/
│   ├── /explore/limnopulse/
│   └── /explore/infrastructure/
├── /about/
├── /resume/
├── /privacy/
└── /404.html
```

`/explore/` is the only canonical flagship-work index. Normal document navigation remains the default; renderer reuse does not require a SPA router, persistent cross-route canvas, or transition framework.

Preserve the existing custom-domain configuration and `/assets/vinicius-santana-resume.pdf` filename and content unless separately authorized.

# 6. Legacy `/work/` routes

Compatibility mapping:

```text
/work/                    → /explore/
/work/cnesdata/            → /explore/cnesdata/
/work/limnopulse/          → /explore/limnopulse/
/work/infrastructure/      → /explore/infrastructure/
```

These routes must not retain complete duplicate pages. Under the current static deployment, use destination canonical metadata, suitable `noindex`, a client/meta redirect, and a normal destination link. Do not claim these are HTTP 301/308 responses unless the hosting layer actually emits them.

Preserve meaningful query strings and fragments where applicable. Map old `#architecture` links to the chosen System View anchor, or retain an alias on that section. Prefer `location.replace` for client redirects so Back does not bounce through compatibility pages. Restrict destinations to the explicit route map; do not introduce a user-controlled redirect target.

Use real HTTP permanent redirects only when the hosting configuration supports them. Do not migrate hosting for this change.

# 7. Public naming

Public name: **Systems Atlas**.

Optional descriptor: **Interactive map of selected engineering systems.**

Remove Systems Observatory from current visitor-facing headings, metadata, navigation, and alternatives. Existing internal filenames such as `observatory-client.ts`, `observatory.css`, and `mountObservatoryScene` may remain. Do not combine this revision with broad naming churn.

Historical documents may retain their original titles with a supersession note.

# 8. Home responsibility

Home answers: who Vinicius is, what he engineers, why that work matters, and where to explore it.

Recommended content:

```text
Hero with Atlas preview
Experience
About
Capabilities / stack
Contact
```

The Atlas preview belongs to the hero/work-introduction region, not a second independently repeated visual section. Section order after the hero may change for readability.

The visual may be sophisticated. Home must nevertheless remain usable as a normal page before and without visual enhancement.

# 9. Replace the globe with the Systems Atlas

Retire the generic globe/data-network hero. Replace it with the actual three-system Atlas composition, using the same district identities, silhouettes, materials, and connection language as `/explore/`.

Target:

```text
Identity and positioning       Systems Atlas preview
Explore my work →              CnesData / Infrastructure / LimnoPulse
```

The preview should say “these are the systems this engineer builds,” not imply global traffic, customers, or deployed infrastructure.

A responsive poster is the immediate visual baseline. A reduced-interaction 3D scene may enhance it automatically when the loading policy allows.

# 10. Home Atlas Preview

## 10.1 Supported implementation

Preferred direction: a responsive poster derived from the Atlas, progressively enhanced with the existing Three.js / React Three Fiber stack on suitable browsers.

A polished poster/SVG-only presentation remains valid for constrained conditions. It is not necessary to implement a separate 2D canvas renderer in addition to the existing graphics stack.

“Reduced preview” means **reduced responsibility and workload**, not necessarily a second set of lower-polygon assets. Existing overview GLBs may be reused if measured results are acceptable. Do not manufacture duplicate model variants solely to satisfy a technology policy.

## 10.2 Allowed behavior

Allow fixed/isometric rendering, restrained lighting, focus/hover accents, and short nonessential reveal or parallax effects when motion preferences permit. No effect may be required to identify the work or activate the hero CTA.

Home has no district-selection state, project-detail panels, simulations, orbit/zoom controls, or direct per-project navigation. Project names may label the visual but are not a second selector. The work CTA owns discovery navigation.

A small pause/static-view control is permitted when needed; it is a display control, not another work CTA.

## 10.3 Loading and readiness

Render the hero, CTA, poster, and reserved visual dimensions in initial HTML. The Home launcher may be small initial JavaScript; the graphics runtime and model fetches must wait until the preview is visible, the page has completed its initial load, and an idle opportunity is available. A fallback for browsers without idle scheduling may run after page load, subject to the same visibility and capability conditions.

Do not eagerly preload the 3D runtime, GLBs, detail models, or simulations on Home. A runtime entry shared with the Atlas is acceptable only if Home does not execute Atlas-only behavior or fetch its additional assets.

Keep the poster visible until the first successful render of the intended composition. Rendering failure, blocked downloads, or a bounded startup timeout must retain the poster and normal page behavior. Use one startup deadline rather than an automatic retry loop; an initial 15-second deadline after activation is acceptable and may be tuned with evidence.

## 10.4 Resource use

Default to on-demand rendering. Short motion may temporarily request frames; when it settles, rendering stops. Suspend nonessential work when offscreen or when the document is hidden. Release resources on teardown and guard late async completions.

The preview must not import the current full Observatory entry unchanged: that implementation requires the Atlas controller, selectors, toolbar, and detail-loading behavior. Reuse small scene/resource helpers instead, or parameterize a genuinely small common core.

# 11. Home CTA

Replace both `View selected work` and `Explore systems` with:

```text
Explore my work → /explore/
```

There is exactly one primary work-discovery action in the hero. Resume remains in the header; contact remains easy to reach. Do not make the entire preview a second set of project links.

Tests should count the intended work CTA, not all buttons or every anchor in the hero; display controls and accessibility links have different responsibilities.

# 12. Home must not contain a second project index

Do not recreate a Selected Work grid, three-project card row, or separate project list below the Atlas preview. Project names associated with the preview are acceptable for comprehension; a second project catalog is not.

Allowing 3D on Home does not authorize turning it into `/explore/` embedded above the fold.

# 13. Legacy Home fragments

Attach `/#projects` to the Atlas/work-introduction region. Preserve `#about`, `#experience`, `#stack`, and `#contact` on meaningful content.

The inspected Home also defines these project aliases [R3]:

```text
#case-cnesdata               → /explore/cnesdata/
#case-aquafarm               → /explore/limnopulse/
#case-esus-pec-bootstrap     → /explore/infrastructure/
#case-infra-ansible          → /explore/infrastructure/
#case-packer-proxmox-templates → /explore/infrastructure/
```

Use a small compatibility mapping and/or meaningful anchor destinations without restoring the old project grid. Without JavaScript, old Home project fragments may resolve to the work-introduction region and its normal Atlas link rather than an empty or hidden target.

# 14. Systems Atlas composition

Exactly three primary districts exist: **CnesData**, **Infrastructure**, and **LimnoPulse**.

A triangle, asymmetric cluster, radial arrangement, or another deliberate three-system composition is valid. Recompose desktop and mobile scenes; do not merely hide two entries in the five-district arrangement.

An optional central hub is a visual organizing element, not another system or a claim of real technical integration.

# 15. What qualifies as a district

A district is a substantial engineered system with a distinct technical boundary, canonical page, architecture, contribution narrative, decisions, and supporting evidence.

A skill, industry, stack item, or desire for geometric symmetry is insufficient. Future districts require substance, not empty scenery.

# 16. Public Health

Public Health stays prominent as professional/domain context. It is not a fourth project or Atlas district.

```text
Public Health = domain and professional context
Public Health ≠ standalone Atlas destination
```

This revision must not weaken the public-health differentiation already present in Home, experience, and relevant project narratives.

# 17. Public Health placement

Primary placement: Home positioning, Experience, About, Resume, and relevant project context.

An optional, clearly secondary domain-context block after the Atlas may link to `/#experience`. It must not occupy a district baseplate, participate in district selection, share project-selection styling, or introduce `/explore/public-health/`.

An old `#district-public-health` fragment may be handled by a compatibility mapping to `/#experience`; it must not restore an active district ID.

# 18. Observability

Observability is removed as a standalone Atlas destination and retained as a cross-cutting engineering capability.

```text
Observability = capability
Observability ≠ project or district
```

No `/explore/observability/` or `/observability/` route is added.

# 19. Observability representation

Represent Observability through relevant architecture components, reliability sections, monitoring concepts, project evidence, stack/capability labels, and illustrative state indicators.

It may appear alongside Reliability, Automation, Data Quality, Testing, and Recovery. Do not keep a fake selectable district that merely points to `/#stack`.

An old `#district-observability` fragment may map to `/#stack` outside district selection.

# 20. Atlas visual layers

Status markers, connection states, subtle event pulses, and reliability symbols are permitted as visual grammar. WebGL, shaders, or material effects may implement them when the result remains legible and economical.

A visual effect is not evidence of live data. Mark illustrative states clearly and avoid unsupported traffic counts, latency, geography, production status, or operational timestamps.

Low-cost materials and ordinary geometry are the default. Effects are not banned by technology name, but expensive dynamic shadows, bloom chains, or continuous particle fields require a demonstrated benefit and a simpler fallback. No effect may become necessary for navigation or comprehension.

# 21. Revised content and rendering model

Use the existing canonical project ID source rather than introducing a competing registry:

```ts
export const projectIds = ['cnesdata', 'limnopulse', 'infrastructure'] as const;
export type ProjectId = (typeof projectIds)[number];
export type AtlasDistrictId = ProjectId;
// Existing internal imports can retain this compatibility alias.
export type DistrictId = AtlasDistrictId;

type AtlasDistrict = {
  id: ProjectId;
  label: string;
  description: string;
  href: `/explore/${ProjectId}/`;
};
```

Every registry entry must link to its own project; validate that relationship. Public Health may use separate, optional domain-context metadata. Capabilities stay lightweight metadata unless a real UI requires more structure.

Keep case-study copy, component IDs, evidence, and documented/planned status in their existing authoritative content sources. Presentation manifests must not become another editable copy of project facts.

Rendering technology is not a content classification. `canvas`, `3d`, and `webgl` do not become route categories, project types, or new navigation destinations.

# 22. `/explore/` responsibility

The Atlas answers: **what substantial systems has Vinicius engineered?**

Recommended hierarchy:

```text
Systems Atlas + short introduction
Atlas visual with semantic HTML selectors
Concise system summary and canonical project action
Optional separate Public Health context
```

The Atlas visual, HTML controls, and summaries are one index rendered through complementary interfaces. They are not separate catalogs. Do not add a conventional project-card grid underneath.

All three names, useful short descriptions, and canonical project links must be available without WebGL. A single selected-summary panel may enhance the presentation, but must not make unselected projects undiscoverable or hide their only canonical links.

# 23. Full Atlas interaction and technology

## 23.1 Existing stack

Continue with Three.js and React Three Fiber. The inspected code already uses `WebGLRenderer`, R3F `createRoot`, an external selection controller, `OrbitControls`, and demand rendering [R2, R5]. Do not migrate to a second engine or rewrite this as vanilla Three.js solely for dependency minimalism.

The current Three.js WebGL renderer targets **WebGL 2**, not a WebGL 1 fallback. Capability detection must match the renderer actually used [T2].

The current explicit launcher/mount pattern is valid. Astro framework hydration directives are an option for a future focused refactor, not a requirement to replace working loading code [T3].

## 23.2 Interaction

On eligible browsers, enhance automatically without requiring an `Enable 3D` click. Provide constrained isometric orbit/zoom, click/tap selection, focus/highlight, HTML labels, concise information, and normal canonical links.

The current limits—approximately ±15° horizontal, ±5° vertical, and 0.9–1.2× zoom—are a useful starting preset, not immutable values. Pan and free-roam remain outside this experience. Do not let canvas gestures trap normal page scrolling, especially on touch devices.

Only the three project IDs participate in selection. Native fragments and browser history remain coherent. Canvas selection and HTML selection update the same controller, without competing React-only state or unexpected focus jumps.

## 23.3 Selected-detail enhancement

The current Atlas lazily swaps in a CnesData or Infrastructure detail maquette after selection [R5, R9]. This is allowed, not mandatory, in the revised Atlas when it improves selected-system recognition.

A **selected-detail maquette** is not a full project explorer or simulation. Do not mount component inspectors, long case-study content, or simulation engines inside the Atlas. Keep the project page as the place for depth.

Do not preload all detail models. Preserve cancellation/stale-result guards and cache reuse. Failure of an optional selected-detail asset should retain the overview maquette, selected state, summary, and project link; it need not tear down an otherwise working Atlas. A failure of the core scene still returns to the normal 2D experience.

# 24. Atlas fallback and lifecycle

The baseline is initial HTML plus the responsive poster/diagram. Its three project identities and destinations match the enhanced scene.

Preserve the existing `fallback → loading → ready` presentation contract unless a small change is necessary. The poster remains visible during loading and until a first successful frame; there is no full-page loader or layout jump.

Use these policies:

- No JavaScript: HTML discovery, canonical links, content, and static explanatory material work.
- Unavailable WebGL 2, explicit `Save-Data`, or blocked runtime: remain in 2D without repeatedly attempting startup.
- Unknown device hints: absence of optional browser APIs is not a failure; attempt conservatively with error handling.
- Import, core model, initialization, timeout, or context-loss failure: restore/retain 2D and HTML state.
- `View 2D`: preserve current selection and move focus only when its focused control disappears; do not remount automatically during that document visit.
- Navigation/teardown: abort pending fetches, ignore late parsing completions, unsubscribe observers/listeners, and dispose owned graphics resources once.
- Back-forward cache return: restore functional HTML navigation without duplicate listeners; retaining the current 2D-return behavior is acceptable.

A manual retry can be added only as a small display action. Persistent preference storage and a retry manager are not required.

# 25. Canonical project experience

Each flagship project has one canonical internal page:

```text
/explore/cnesdata/
/explore/limnopulse/
/explore/infrastructure/
```

Combine the strongest narrative and interactive elements from the current case study and explorer. Render the narrative shell at build time; enhance only the System View or simulation presentation that benefits from JavaScript/graphics.

Using WebGL on a project page does not make that page a canvas application or require the Atlas renderer to run there.

# 26. What must survive from the case studies

Preserve problem, context, personal contribution, decisions, reliability considerations, outcomes, limitations, useful technologies, public evidence, and implementation/documentation/planned/historical status.

These remain first-class page content, not text available only after clicking a model. Removing duplicate pages must not remove qualifications, reduce narrative depth, or inflate ownership or results.

# 27. What must survive from the explorers

Retain useful component relationships, component selection, technical boundaries, synthetic system behavior, and explanatory status visualization.

Use the existing deterministic controllers and simulation engines as sources of truth. HTML, SVG, and Three.js consume the same state. Switching visual modes or losing a graphics context must not reset a simulation or change its result.

Scene transitions may animate a state change, but their duration, framerate, and shader execution must not determine domain outcomes. Do not implement an independent “3D simulation engine” for behavior already defined by the pure controllers.

# 28. Project-page questions

Every canonical page should answer:

1. What problem does it address, and what is the system?
2. What did Vinicius personally contribute?
3. How does it work, and which engineering decisions matter?
4. What behavior or failure modes are worth demonstrating?
5. What outcomes and evidence exist?
6. What remains limited, illustrative, documented, or planned?

Recruiters must not need another page for context/contribution. Engineers must not need an alternative internal case-study page for architecture and behavior.

# 29. Project-page hierarchy

Recommended order:

```text
Project hero
Context & contribution
System View
Engineering decisions
Behavior / simulation, where meaningful
Results
Evidence & limitations
```

The System View may be a visually dominant panel, but essential context and contribution precede its deep interaction.

Section anchors may use `Overview · System · Engineering · Simulation · Results · Evidence`. Render only meaningful sections and preserve important older anchors through aliases/mappings. Use document sections, not a SPA tab router that hides the page’s substance behind hydration.

# 30. One primary System View

Do not repeat the same architecture as cards, a component explorer, and another diagram.

Choose one primary System View per project. It may use HTML/SVG, a poster, or progressively enhanced Three.js, exposing component purpose, status, relationships, and data/event direction.

A 2D/3D display switch presents the **same explanation**, not two independent content inventories. Supporting prose discusses boundaries, trade-offs, contribution, and planned work rather than repeating every visual label.

Place relevant behavior inside or adjacent to that view when it avoids duplication. Do not mount a separate canvas for every section or component.

# 31. Project differentiation

Share typography, page shell, evidence patterns, statuses, accessible controls, and responsive conventions. Do not force all three projects into the same dominant interaction or rendering technology.

Suggested directions, not technology mandates:

| Project | Primary explanatory experience | Rendering options |
|---|---|---|
| CnesData | Contracts, data flow, replay/conflict behavior | HTML/SVG, isometric 3D, or a hybrid |
| LimnoPulse | Documented observation/telemetry/event relationships | HTML/SVG, environmental maquette, or a hybrid |
| Infrastructure | Topology, workload placement, synthetic failure/recovery | 3D is especially suitable; keep a textual/2D equivalent |

A 3D System View is justified by clearer explanation or coherent spatial identity. It is not required merely because the Atlas uses Three.js.

# 32. CnesData experience

Primary metaphor: **data flow, contracts, and reconciliation**.

Represent only stages consistent with existing documented status. An illustrative sequence may follow sources → ingestion boundary → raw/immutable contract → processing → curated data → consumers/reconciliation; this is not permission to relabel planned stages as implemented.

Preserve first-write, identical-replay, conflicting-replay, and original-object-preservation scenarios. Reinforce idempotency, contracts, and integrity without implying real backend requests or measured throughput.

HTML/SVG is a valid first choice for directional flow; a 3D or hybrid view is equally permitted when labels, direction, and status stay clear. The renderer must use the existing scenario/controller results, including the exact conflict outcome, rather than invent behavior to fit an animation.

# 33. LimnoPulse experience

Primary metaphor: **telemetry, environmental observations, and events**.

Derive the visual from verified project content. Sources, ingestion, processing/rules, state/events, and consumers are potential explanatory categories, not a pre-approved deployed topology.

An environmental 3D maquette may communicate domain context without claiming an installed sensor fleet, geographical deployment, real-time count, or unsupported alerting behavior. Clearly distinguish illustrative objects from verified system components.

Do not invent a new simulation for symmetry. Add one only when meaningful documented behavior exists and its scope has been established. A strong visual explanation without a simulation is complete.

# 34. Infrastructure experience

Primary metaphor: **topology, availability, and recovery**.

The existing synthetic node-failure scenario is a suitable centerpiece. Reuse its generic nodes, shared layer, workload assignment, deterministic failure/transfer sequence, reset behavior, and textual event explanation [R9].

A project-specific 3D view may highlight the failed node and animate the workload move. It must remain a sanitized illustrative topology, not a production twin. Animation timing is not measured recovery time; do not turn presentation duration into a performance claim.

Retain a 2D/text state projection and static scenario transcript. WebGL failure must not disable an otherwise working HTML simulation controller.

# 35. Project-specific presentation metadata

Use a shared detail shell with limited project-specific metadata, for example:

```ts
type ProjectPresentation = {
  id: ProjectId;
  visualMode: 'data-flow' | 'telemetry' | 'cluster';
  systemHeading: string;
  simulation?: 'cnesdata-write' | 'infrastructure-failover';
};
```

The view implementation may choose 2D, 3D, or hybrid rendering. Do not introduce a generic page-builder, plugin registry, or renderer abstraction for hypothetical future projects.

Home preview configuration must not include a simulation or a district-detail selection controller. Atlas and project controllers retain their different responsibilities.

# 36. Component and module direction

Preserve the current Astro architecture, case-study collection, controller contracts, and resource-management work. Existing locations include [R3–R9, R13]:

```text
src/pages/index.astro
src/pages/explore/index.astro
src/features/explorer/observatory-client.ts
src/features/explorer/scene/renderer.tsx
src/features/explorer/scene/resources.ts
src/content/scenes/index.ts
src/content/scenes/generated.json
scripts/assets/generate.mjs
```

A focused evolution may introduce `HomeAtlasPreview`, a small preview launcher, a shared `ProjectDetail` shell, and project-specific System Views. Names and folders are implementation choices, not a mandate to move all existing code.

Keep boundaries clear:

```text
Build-time content / lightweight metadata
       ├── Astro HTML, canonical links, poster
       └── Small optional enhancement launcher
                    └── Dynamic renderer entry
                              └── Three.js / R3F + required assets

Deterministic controller → HTML state + optional visual projection
```

Sharing palette, authored composition, resource helpers, and overview geometry is encouraged. Sharing a mutable WebGL context between routes, keeping offscreen canvases mounted, or importing every project view through a common barrel is not required.

Review client-facing imports: a lightweight launcher must not accidentally pull the graphics runtime through shared modules. Conversely, a data-only scene manifest import does not itself prove a model download. Validate emitted chunks and actual requests, not filenames alone.

# 37. Navigation

Use familiar labels:

```text
Work    About    Resume    Contact
```

`Work` points to `/explore/`. Do not expose separate primary Work and Explore concepts. Atlas branding belongs inside the work experience.

Project back links return to `/explore/`. No canonical project page links to another internal “full case study” of itself.

# 38. Home after revision

```text
Hero
├── Identity and positioning
├── Domain pillars
├── Explore my work → /explore/
└── Atlas preview: poster → eligible 3D enhancement

Experience: public-health and operational engineering
About
Capabilities / stack
Contact
```

Do not add a second project index. Do not make the Home preview a district selector or architecture inspector.

# 39. Home domain pillars

The existing pillars may remain: Data Systems, Distributed Infrastructure, Backend Engineering, and Public Health.

They explain professional positioning, not Atlas geography. There is no required one-to-one relationship between four Home pillars and three project districts.

# 40. Atlas assets and provenance

Retire the generic Home globe. Derive the new Home poster and Atlas fallback from a shared authored three-system composition, consistent camera/material language, and current asset-generation path.

Desktop/mobile posters may use different crops or layouts. Home and Atlas may use separate poster files when framing genuinely differs; identical output should be reused rather than duplicated by convention.

Reuse overview GLBs across Home and Atlas when economical. Add lower-detail variants, compressed textures, instancing, or mesh compression only where measurement identifies a useful reduction. A second asset pipeline or new decoder dependency is not an acceptance requirement.

Keep asset sources, licenses/provenance, component IDs, anchors, and status metadata valid. Original/procedural assets remain appropriate.

Remove unused Public Health/Observability district assets only after checking live references. A historical reference image or useful domain illustration is not automatically an active district and need not be deleted. Update generated manifests and generation inputs so the next asset run does not recreate removed districts; the current generator retains previously generated metadata unless explicitly cleaned [R13].

# 41. Atlas visual redesign

Recompose all three districts with larger, legible silhouettes, deliberate negative space, useful labels, and clearer differences between data, infrastructure, and environmental systems.

Retain the established dark, technical, isometric visual language described in the older design spec [R15]. The navigation simplification does not authorize replacing the Atlas with generic cards or generic circles. Conversely, the old reference’s five locations and globe are no longer normative.

Quality does not mean maximizing effects. Ordinary lighting, well-authored materials, proportion, and composition may provide the desired result without a post-processing stack.

# 42. Central hub

A central hub may organize the composition but must not have a project route, selectable project state, or a claim of being a deployed service connecting the three systems.

Any connecting lines are conceptual portfolio relationships unless explicitly supported by project evidence. A central glow or pulse is a presentation device, not live traffic.

# 43. Mobile

Home order: copy → primary CTA → preview → normal content. Atlas order: heading → Atlas/fallback → HTML controls and concise summaries → optional domain context.

Do not categorically disable 3D because the viewport is narrow. Use conservative settings and the shared eligibility/fallback policy. Equally, do not require mobile devices to render 3D to reach a project.

No essential action may require hover, landscape orientation, small-geometry precision, gesture discovery, or pinch-to-zoom. Keep ordinary page scrolling available. Reserve visual space before loading and use a mobile composition that keeps labels and silhouettes readable.

# 44. Accessibility and motion

Semantic HTML owns project discovery and technical descriptions. The visual must not be the only source of project names, links, state, errors, or simulation outcomes.

Provide keyboard-operable controls, visible focus, useful alternative text, adequate text readability, no information conveyed by color alone, and a normal 2D presentation. Avoid duplicate interactive accessibility trees for decorative meshes and their equivalent HTML controls.

Assistive technology encounters three distinct project identities, not five. This is a semantic requirement, not a demand that the entire page contain exactly three anchor elements.

`prefers-reduced-motion` does **not** automatically prohibit WebGL. Preserve static 3D and immediate user-triggered highlights if viable, but disable automatic camera motion, parallax, animated zoom/focus travel, and nonessential pulses. A 2D choice remains available.

No perpetual decorative motion is required. Prefer short, event-driven effects. Any ongoing nonessential animation must have an accessible pause/static-view control and stop when hidden/offscreen. Mode switches must preserve selection, simulation progress, and focus on surviving HTML elements.

# 45. Performance and loading policy

## 45.1 The actual requirement

**Home must not require the full Atlas application or eagerly load its graphics workload. Home may dynamically load a restricted 3D preview.**

This replaces the previous blanket “Home must not import the full Atlas renderer” interpretation. Module names and a canvas element are not performance measurements; the relevant boundaries are initial dependency graphs, network requests, main-thread work, graphics workload, and usable HTML.

## 45.2 Route behavior

| Surface | Initial usable baseline | Permitted enhancement | Assets not loaded eagerly |
|---|---|---|---|
| Home | Hero, one work CTA, responsive Atlas poster | Deferred, visible, reduced-interaction 3D preview | Selected-detail models and project simulations |
| Atlas | Three projects, selectors, summaries, links, poster | Automatic progressive 3D | All project details/simulations at startup |
| Project | Narrative, System View fallback, evidence, transcript | Project-specific interactive 2D/3D view | Other projects’ models/simulations |
| Compatibility route | Destination link and redirect metadata | Small redirect script | Any 3D scene |

An HTML simulation controller may initialize independently of a deferred 3D presentation. It must not be blocked by the graphics import.

## 45.3 Rendering defaults

Retain demand rendering and a DPR cap of 1.5 as the starting configuration, matching the existing renderer [R5]. Lower quality when appropriate; raise it only when measurements justify the change. No universal polygon, FPS, or bundle-size threshold is claimed to have been established by this review.

Use one active visual canvas per page by default. Share immutable assets/material resources when safe, but keep ownership and disposal explicit. Reuse the current fetch cancellation, model cache, stale-selection protection, and cleanup work [R6].

Prefer on-demand rendering when the scene is at rest; React Three Fiber supports this through its demand frame loop and explicit invalidation [T1]. Animation that continuously invalidates is not idle rendering merely because the mode is named `demand`.

## 45.4 Evidence before optimization

Record a lightweight before/after comparison on the same browser and device/throttling profile: transferred JavaScript and models, poster loading, first usable HTML, first successful 3D frame, noticeable interaction stalls, and whether rendering stops at rest.

Report raw asset size separately from compressed transfer size, JavaScript parse/evaluation, model decoding, draw calls, and GPU memory. Small GLBs alone do not prove a fast page; deferring JavaScript does not eliminate its later cost.

No new telemetry service, Lighthouse gate, runtime benchmark framework, or exhaustive device matrix is required. When a decorative enhancement visibly harms normal reading/navigation, keep the poster path or simplify the enhancement rather than expanding infrastructure.

# 46. SEO and canonicalization

Canonical flagship pages are the three `/explore/{project}/` routes. Update canonical tags, sitemap, internal links, relevant structured metadata, compatibility pages, tests, and current documentation together.

Exclude compatibility `/work/*` pages from the canonical sitemap. Do not maintain contradictory self-canonicals on pages that redirect to Explore. Keep project summaries, contribution, and evidence in build-time HTML.

Remove links from canonical pages to a second internal version of the same case study. Rendering technology must not alter canonical URLs or create query-parameter route variants for SEO.

# 47. Copy differentiation

CnesData should open with its specific public-health data/contracts/ingestion/reconciliation problem. LimnoPulse should emphasize verified environmental observations/telemetry/events. Infrastructure should emphasize operations, automation, availability, and recovery.

Do not force these into one generic engineering sentence. Technology lists support the narrative; they are not the primary distinction.

Use the project’s current approved content and status labels. A visually richer scene is not a reason to invent new functionality or outcomes.

# 48. Evidence hierarchy

Maintain an accessible progression:

```text
Claim → system explanation → engineering decision → outcome → evidence
```

Repositories, architecture documents, implementation artifacts, and other public evidence remain normal links in the page. Do not hide evidence only inside component popovers, canvas tooltips, animated steps, or a selected-object inspector.

For modeled or planned behavior, the relevant limitations must be adjacent to the claim or easy to find in the same normal page flow.

# 49. Truthfulness

Preserve `implemented`, `documented`, `planned`, `historical`, and `illustrative` distinctions where relevant.

The Atlas is a portfolio visualization—not a digital twin, live dashboard, production network diagram, or source of real health records/traffic. Simulation transcripts and transitions remain explicitly synthetic.

Do not expose credentials, real private hostnames/IPs, patient/professional records, private topology, or authenticated screenshots. Do not add uptime, throughput, latency, municipality/device counts, or failover benchmarks without a publishable basis.

Improved graphics do not change the evidentiary status of the work.

# 50. Testing philosophy

Keep tests focused on behavior and integration. Retain the current baseline:

```text
npm ci
npm test
npm run build
npm run smoke
npm run test:explorer
```

The inspected package defines these commands, along with asset generation and scene typechecking [R2]. Build precedes smoke because smoke reads `dist/`.

For changed assets, run the relevant asset generation and existing validation path. Do not regenerate unrelated historical imagery or add a broad visual-regression platform.

Update outdated expectations rather than deleting protections wholesale. Keep tests for stable IDs, truthfulness, deterministic simulations, cancellation, focus, history, real frame readiness, and fallback.

# 51. Home tests

Validate the single primary `Explore my work` action and `/explore/` destination; Atlas poster presence; globe removal; preserved Home fragments; no separate Selected Work grid; and meaningful HTML when JavaScript is disabled.

Replace old assertions that ban any canvas, any GLB reference, or every React island. Retain protection against reviving the old application-sized Home mount or loading all routes eagerly.

For the optional preview, verify that graphics are deferred until eligibility, hero/CTA/poster remain usable during a held or failed asset request, the poster is replaced only after a real frame, and no selected-detail models or project simulations are fetched by the preview.

Check a normal eligible path plus a restricted/failure path. Renderer presence in the repository or build output is not itself a failure; premature downloads or broken navigation are.

# 52. Atlas tests

The expected district identity set is independently asserted as:

```ts
['cnesdata', 'limnopulse', 'infrastructure']
```

Check matching registry/scene/fallback identities, correct canonical destinations, keyboard discovery without mesh clicks, coherent fragments/history, and semantically separate optional Public Health context.

Update the old six-model expectation to the authored three-district composition plus an optional hub; do not hard-code an obsolete asset count into unrelated tests. Preserve meaningful validation that the required composition actually renders, not just that a canvas exists.

Keep selected-detail loading tests only if that enhancement remains. Verify stale completions cannot override selection, optional-detail failure retains the overview, and core scene failure/`View 2D` preserves navigation and focus.

# 53. Project-page tests

For each canonical project, check the built route, title/summary, context, contribution, System View, decisions, results, evidence, and visible limitations. There must be no link to an alternate internal case-study representation.

Preserve the CnesData replay/conflict and Infrastructure failure/reset behavior tests. Where a 3D presentation is introduced, verify it projects the same controller result and that changing visual mode or losing WebGL does not reset progress or break HTML controls.

No-JavaScript pages retain explanatory diagrams/posters and build-time transcripts. A simulation that requires JavaScript is not expected to run without it, but its explanation and evidence must still be readable.

LimnoPulse has no mandatory simulation test unless a meaningful simulation is explicitly added.

# 54. Legacy-route tests

Verify all four `/work/*` compatibility routes lead to their intended canonical destinations, preserve meaningful supported fragments, and include a normal fallback link. They no longer need complete case-study HTML.

Check changed canonical metadata and sitemap membership. Preserve the resume path and byte-preservation checks unless a separate resume update is authorized.

Older domain fragments must not re-enter the district registry or create new project pages.

# 55. Browser checks

Use the existing browser suite rather than replacing it. Inspect Home desktop/mobile, Atlas desktop and mobile/fallback, at least one canonical project in both layouts, CnesData’s synthetic walkthrough, and Infrastructure’s failure scenario.

Cover JavaScript-disabled discovery, unavailable WebGL, a blocked/failed model, reduced motion, keyboard selection, `View 2D`, and back/forward navigation through focused shared cases. Do not multiply every failure test across every route without a distinct risk.

For a new Home preview, confirm its idle/offscreen behavior and touch scrolling. Distinguish test code present in the repository from tests actually run for a change; do not report performance or passing checks without execution evidence.

# 56. Migration sequence

## Phase 1 — information model and baseline

Reduce the district registry/types to three projects; separate optional Public Health context; remove Observability from location semantics; identify conflicting legacy tests/docs; and record the current asset/loading baseline.

## Phase 2 — Atlas recomposition

Recompose desktop/mobile layouts; update generation inputs, manifests, posters, and scene placement; preserve the current renderer’s useful lifecycle and selection behavior. Decide whether selected-detail maquettes still improve the simplified Atlas.

## Phase 3 — Home

Replace the globe with the Atlas poster; merge CTAs; remove the separate grid; preserve fragments. Add a restricted 3D preview through a small loader/core boundary, without importing Atlas selection and project behavior into Home. Compare the result with its static baseline.

## Phase 4 — canonical project pages

For each project, preserve narrative and evidence before removing duplication. Combine the useful explorer/controller behavior into one project page and one primary System View. Add project-specific rendering only where justified; preserve the existing synthetic engines.

Do not delete the old case-study content before equivalent canonical content exists.

## Phase 5 — routing and metadata

Point Work to `/explore/`; convert `/work/*` into compatibility pages; update project back links, canonicals, sitemap, and supported fragments. Preserve CNAME and resume behavior.

## Phase 6 — cleanup and verification

Remove truly dead assets/code/styles, including generator entries that would resurrect obsolete districts. Update current docs and add supersession notes to older normative requirements. Adapt the existing tests, run the baseline, and record focused desktop/mobile and loading checks.

No engine migration, generic framework, hosting change, or process-heavy test infrastructure belongs in this migration.

# 57. Acceptance criteria

## Home

One primary work CTA targets `/explore/`; the globe is replaced by an Atlas preview; no duplicate project catalog exists; normal content/links work without enhancement. Progressive Three.js/R3F is explicitly permitted and, when used, has preview-only responsibilities and deferred loading.

## Navigation and Atlas

Work and Explore are not competing navigation concepts. The Atlas has exactly three distinct selectable project identities: CnesData, LimnoPulse, Infrastructure. Its 3D view is a first-class enhanced presentation, and HTML remains an equally functional route to every project.

## Public Health and Observability

Public Health remains prominent in professional context, not a district. Observability remains a capability, not a destination. Neither reappears as a selectable location, including through compatibility logic.

## Projects

Each project has one canonical page containing narrative, contribution, system explanation, decisions, results, evidence, and limitations. Experiences differ meaningfully. Relevant simulations retain their deterministic behavior and explicitly synthetic status.

2D, 3D, and hybrid System Views are allowed. No project must use 3D merely for symmetry.

## Compatibility and resilience

Legacy Work links and important Home fragments resolve meaningfully. The resume path and domain configuration remain stable. No WebGL failure, mode change, or delayed asset blocks project discovery or removes evidence.

Reduced motion does not require banning WebGL; it requires removing nonessential motion. Keyboard and touch navigation remain practical.

## Delivery quality

The implementation reuses the current stack and does not create unnecessary parallel renderers/model sets. Updated behavior tests replace technology bans. Build/test execution and any claimed performance results are recorded, not inferred from source inspection.

# 58. Final product model

```text
VINICIUS SANTANA — Software & Data Engineer
           │
           │ Home: identity + Atlas poster / progressive 3D preview
           │ Explore my work
           ▼
     SYSTEMS ATLAS /explore/
     HTML discovery + progressive Three.js / R3F
           │
     ┌─────┼─────────────────────┐
     ▼     ▼                     ▼
 CnesData  LimnoPulse       Infrastructure
           │
 Each canonical page:
 Context → Contribution → System View → Engineering
         → Behavior where meaningful → Results → Evidence / Limitations

 Public Health: professional/domain context
 Observability · Reliability · Automation · Data Quality: capabilities

 Build-time HTML owns content and links.
 Deterministic controllers own behavior.
 Optional renderers project that state.
```

The three project branches are peers; the diagram does not imply runtime integration or a central production service.

# 59. Governing rules

> **Projects are places to explore. Domains explain where the work exists. Capabilities explain how the systems are engineered.**

> **WebGL / Three.js may be the primary visual representation, including on Home. It must not become a prerequisite for navigation, content, evidence, or deterministic behavior.**

Keep the overall path:

> **Home → Atlas → Project → Evidence**

The revision removes unnecessary navigation and duplicate representations—not visual ambition.

---

# Appendix A — Repository-grounded findings

## A.1 This is an evolution of an existing 3D implementation

At the inspected commit, `package.json` declares React/R3F and Three.js, including React Three Fiber `9.7.0`, React `19.2.8`, Three.js `0.183.2`, and Astro `7.3.2` [R2]. These are the inspected repository declarations, not a recommendation to upgrade to the latest version.

`observatory-client.ts` checks `Save-Data` and WebGL 2 before dynamically importing the renderer. It already restores HTML/2D behavior on failure and handles navigation lifecycle [R4]. `renderer.tsx` implements R3F demand rendering, constrained camera controls, a DPR cap of 1.5, first-frame readiness, context-loss fallback, and selected-detail loading [R5]. `resources.ts` handles aborted fetches, late parse results, caching, and graphics cleanup [R6].

**Decision:** reuse these foundations. A new renderer written from scratch is not necessary to permit 3D on Home or a project page.

## A.2 The present Home is intentionally static, not inherently incompatible with enhancement

`src/pages/index.astro` renders a `ResponsivePoster`, two work CTAs, and a separate Selected Work grid [R3]. The shared scene manifest exposes a globe illustration [R7].

**Decision:** replace those specific product/UI choices. Preserve the initial HTML and responsive poster strategy; permit a deferred visual layer instead of importing the Atlas page wholesale.

## A.3 Existing model files do not justify mandatory duplicate “lightweight” assets

The inspected repository reports these raw file sizes [R14]:

| Existing asset | Raw bytes |
|---|---:|
| `district-cnesdata.glb` | 56,888 |
| `district-infrastructure.glb` | 42,936 |
| `district-limnopulse.glb` | 58,816 |
| `hub.glb` | 34,004 |
| **Three districts + hub** | **192,644 bytes ≈ 188.1 KiB** |

The current five-district overview plus hub totals 315,768 raw bytes, before selected-detail assets. Recomposition can change these values. Neither total includes JavaScript, posters, decoding, GPU memory, or runtime rendering cost.

**Decision:** reuse suitable overview assets first. Create reduced variants only when measurements show their value. “Detail” in a filename is not itself proof of excessive weight.

## A.4 Old tests encode superseded product decisions

`tests/static-build.smoke.mjs` currently expects two hero actions, the globe, a separate work catalog, and no Home canvas/React islands [R10]. Scene tests expect five districts, eight scene assets, and fixed poster counts [R11]. The 3D browser suite asserts six initial overview models and tests genuine draws, idle behavior, selection, and fallback [R12].

**Decision:** replace obsolete counts/technology bans while retaining the useful behavior and lifecycle tests. Do not delete the 3D test suite to make the redesign pass.

## A.5 Documentation must change with code

The older normative spec assigns R3F/Three.js to Explore, defines the globe and five equally selectable districts, and keeps Work separate [R15]. `docs/explorer.md` describes those current implementation contracts [R9]. The README retains an earlier 2D-only description [R16].

**Decision:** mark superseded requirements explicitly and update the active documentation. Otherwise, future implementation agents may restore the old restrictions or obsolete geometry to satisfy stale instructions.

# Appendix B — Focused implementation impact map

| Area | Existing files / locations | Intended change |
|---|---|---|
| Home | `src/pages/index.astro` | One CTA, Atlas preview, remove duplicate grid, preserve anchors |
| Atlas route | `src/pages/explore/index.astro` | Three-system labels/content and matching HTML navigation |
| District model | `src/features/explorer/districts.ts`, project ID source, scene types | Project-only districts; no duplicate facts/taxonomy |
| Loader | `src/features/explorer/observatory-client.ts` | Preserve fallback/history; factor only the preview-specific loading boundary needed |
| Renderer | `src/features/explorer/scene/renderer.tsx` | Three-system composition; restricted preview reuse; selected-detail policy |
| Resources | `src/features/explorer/scene/resources.ts` | Reuse cancellation, cache, and disposal protections |
| Assets | `src/content/scenes/index.ts`, `generated.json`, `scripts/assets/` | Consistent posters/layouts; remove obsolete generation entries |
| Project pages | `src/pages/explore/`, current case-study/explorer components and controllers | One narrative shell and meaningful System View per project |
| Compatibility | `src/pages/work/`, shared navigation and metadata configuration | Redirect surfaces, canonicals, sitemap, fragment compatibility |
| Tests | `tests/static-build.smoke.mjs`, `tests/scene-assets.test.mjs`, `tests/browser/` | Behavioral assertions in place of blanket rendering bans |
| Current docs | `README.md`, `docs/explorer.md`, superseded spec/plan | Accurate route/rendering policy and supersession notes |

This map is intentionally not a per-file rewrite mandate. Use the smallest coherent changes, keep the existing default dependency versions unless a concrete issue requires a change, and do not mix unrelated refactors into the migration.

# Appendix C — Sources and inspection limits

All repository findings below refer to `568eef3de554d5da270a0304843f93cbc7838abf` unless otherwise noted. Links are provided for traceability; normative requirements above are design decisions, not claims that the revision has shipped.

[R1]: https://github.com/VINIClUS/vinicius-santana-career-site/commit/568eef3de554d5da270a0304843f93cbc7838abf
[R2]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/package.json
[R3]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/pages/index.astro
[R4]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/features/explorer/observatory-client.ts
[R5]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/features/explorer/scene/renderer.tsx
[R6]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/features/explorer/scene/resources.ts
[R7]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/content/scenes/index.ts
[R8]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/src/pages/explore/index.astro
[R9]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/docs/explorer.md
[R10]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/tests/static-build.smoke.mjs
[R11]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/tests/scene-assets.test.mjs
[R12]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/tests/browser/observatory-3d.spec.ts
[R13]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/scripts/assets/generate.mjs
[R14]: https://github.com/VINIClUS/vinicius-santana-career-site/tree/568eef3de554d5da270a0304843f93cbc7838abf/public/assets/scenes
[R15]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/docs/superpowers/specs/2026-09-09-systems-observatory-tech-spec.md
[R16]: https://github.com/VINIClUS/vinicius-santana-career-site/blob/568eef3de554d5da270a0304843f93cbc7838abf/README.md
[T1]: https://r3f.docs.pmnd.rs/advanced/scaling-performance
[T2]: https://threejs.org/docs/pages/WebGLRenderer.html
[T3]: https://docs.astro.build/en/reference/directives-reference/

Technical references: [R3F on-demand rendering][T1], [Three.js WebGLRenderer and WebGL 2][T2], and [Astro hydration directives][T3].

**Inspection limits:** source files, documentation, repository asset metadata, and selected browser-test code were inspected through GitHub. No implementation changes were pushed. No new `npm ci`, build, test-suite execution, deployed-page visual inspection, or performance benchmark is asserted by this document.
