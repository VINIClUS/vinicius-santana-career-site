# Systems Observatory — Tech Spec

**Date:** 2026-09-09  
**Status:** Approved for implementation  
**Epic:** #4  
**Repository:** `VINIClUS/vinicius-santana-career-site`

## 1. Product decision

Redesign the current portfolio into a recruiter-first static site with three flagship engineering case studies and an optional **Systems Observatory** for visual exploration.

The site must remain fast to change and easy to maintain. This is a personal portfolio, not a regulated or high-risk platform; implementation quality should therefore focus on **working behavior, integration, truthful content, and straightforward maintenance** rather than heavyweight verification programs.

The public name of the experience is:

> **Systems Observatory — interactive engineering portfolio**

The Observatory is a didactic representation of engineering systems. It is not a digital twin, production dashboard, benchmark, or live view of municipal infrastructure.

## 2. Goals

1. A recruiter should understand role fit, selected work, resume, and contact from the home page quickly.
2. Engineering readers should be able to open deeper case studies with architecture, decisions, trade-offs, contribution, and limits.
3. Backend/data/infrastructure work should become visually understandable without requiring 3D.
4. 3D should add memorability without becoming a dependency for navigation or content.
5. The codebase should remain small enough that a single maintainer can change copy, projects, scenes, or styling without touching a complex platform.

## 3. Non-goals

Do not add:

- backend services;
- CMS/admin UI;
- authentication;
- analytics/session replay in the initial release;
- live GitHub/project APIs at runtime;
- live infrastructure or municipal data;
- a new hosting provider;
- DNS migration;
- multiple complex simulators;
- a general plugin framework;
- Redux or equivalent global-state framework;
- microservices or a monorepo split;
- exhaustive performance/compliance programs.

## 4. Architecture

### 4.1 Static site

Use **Astro** with static output. Pages and case studies render as HTML at build time.

Use React only for interactive areas that benefit from it. The 3D feature uses React + React Three Fiber + Three.js, loaded only after the user explicitly enables 3D.

Keep GitHub Pages and the existing custom-domain setup.

### 4.2 Content structure

Use a small typed content model for:

- project metadata;
- case-study content;
- contribution/context;
- evidence/status labels;
- scene manifests;
- scenario definitions.

Published content must distinguish between:

- `implemented`;
- `documented`;
- `planned`;
- `historical`;
- `illustrative`.

Do not publish an unverified quantitative claim just to fill visual space. Omit it or use a qualitative statement.

### 4.3 Selected projects

The initial portfolio highlights:

1. **CnesData** — software/data platform and raw-ingestion contract walkthrough.
2. **Limnopulse** — telemetry, rules, incidents, notifications, and device-oriented system design.
3. **Infrastructure & Operations** — sanitized examples of infrastructure automation, reliability, and operational thinking.

Public-health work is professional context and evidence; it is not presented as a fourth standalone product.

## 5. Information architecture

### M1 routes

- `/`
- `/work/`
- `/work/cnesdata/`
- `/work/limnopulse/`
- `/work/infrastructure/`
- `/about/`
- `/resume/`
- `/privacy/`
- `/404.html`

### M2 routes

- `/explore/`
- `/explore/cnesdata/`
- `/explore/limnopulse/`
- `/explore/infrastructure/`

`Explore` should not appear as a primary navigation item until M2 is ready.

## 6. Compatibility contracts

The migration must preserve:

- `public/CNAME` and the currently configured host baseline;
- `/assets/vinicius-santana-resume.pdf`;
- useful home anchors including `#about`, `#experience`, `#projects`, `#stack`, and `#contact`;
- useful destinations for existing `#case-*` fragment links.

The resume already updated through PR #3 is the new baseline. Do not restore an older PDF while migrating the framework.

## 7. Home and case-study UX

### Home

The first screen prioritizes:

- Vinicius Santana;
- Software & Data Engineer positioning;
- one concise positioning sentence;
- selected work;
- resume/contact;
- optional Observatory entry after M2.

Avoid a wall of technology chips or decorative metrics. Technologies should mostly appear where they were used.

### Case studies

Each flagship case should cover, as applicable:

- problem;
- context/constraints;
- personal contribution and collaboration;
- architecture or documented contract;
- decisions/trade-offs;
- failures/tests/reliability considerations;
- results when publishable;
- limitations/current state;
- repository/technical links.

The reader should not need to switch into a special “engineering mode” to access essential information.

## 8. Systems Observatory

The default representation is HTML/SVG/2D.

The overview has three visually distinct areas:

- data platform;
- water telemetry;
- infrastructure.

Selecting an area opens its project view. Component names, descriptions, relations, and status live in HTML or structured data, not exclusively inside a canvas.

### 8.1 3D behavior

3D is a progressive enhancement:

- load only after `Enable 3D`;
- load only the selected scene;
- keep the same project/scenario state when enabling or disabling 3D;
- leave the 2D explorer usable if WebGL, a model, or the renderer fails;
- keep at most one active canvas.

Do not require game controls, free-roam navigation, drag gestures, or hover to discover essential content.

## 9. CnesData walkthrough

The first and only interactive simulation in M2 demonstrates a narrow raw-object contract using synthetic state.

Scenarios:

1. `raw-first-write` — write object A to a new key K; one object exists.
2. `raw-identical-replay` — replay K + A; accepted without duplication.
3. `raw-content-conflict` — attempt K + B; conflict and A remains intact.

The simulation:

- does not call the CnesData backend;
- does not authenticate mTLS;
- does not convert DBC or create Parquet;
- does not use real health data;
- does not show animation duration as measured latency;
- must carry a clear synthetic/demonstration label.

The state engine should be small and deterministic, with commands such as `SELECT_SCENARIO`, `STEP`, and `RESET`.

## 10. Visual direction

Use a technical-atlas / architectural-model aesthetic:

- dark navy background;
- restrained surfaces;
- readable typography;
- thin grid/diagram language;
- teal/green accent;
- simplified isometric models;
- motion only when it explains selection or state changes.

Avoid cyberpunk terminal clichés, world-map scale claims, fake operational dashboards, or a game-like world that delays access to work.

## 11. Assets

Prefer simple author-created or procedurally built assets.

For each project provide:

- a lightweight poster/fallback;
- a scene manifest;
- optional GLB/procedural geometry;
- source/license note when third-party material is used.

Do not include municipal screenshots, real hostnames/IPs, sensitive topology, or real personal-health data.

Optimize obviously oversized assets before adding compression infrastructure. Draco/Meshopt/KTX2 are optional follow-ups only if the real assets need them.

## 12. Deployment

Keep GitHub Pages + GitHub Actions.

The CI/deploy path should be simple:

```text
npm ci
npm run typecheck   # when configured
npm test            # focused suite
npm run build
npm run smoke       # compact built-artifact checks
```

The production artifact should contain static pages, public assets, CNAME, resume, sitemap/robots, and 404.

## 13. Testing policy — lean by design

This project intentionally uses **localized tests**.

Every implementation PR should prove the changed behavior and one relevant integration path. There is no coverage percentage target.

### Required categories when relevant

- **Foundation:** install/build smoke and preservation of resume/CNAME.
- **Content:** schema/content validation for published records.
- **Navigation:** a small route/anchor smoke.
- **Simulation:** unit tests for first write, replay, conflict, reset, invalid scenario.
- **2D explorer:** one browser smoke for project selection and a walkthrough path.
- **3D:** focused tests for explicit lazy activation, state handoff, and failure fallback.
- **Release:** one concise production-style smoke covering home → case → explore → resume/contact.

### Explicitly not required

Unless a concrete defect justifies them, do not block delivery on:

- coverage thresholds;
- soak/load tests;
- property-based testing;
- exhaustive browser/device matrices;
- formal WCAG certification;
- automated Lighthouse/FPS gates;
- repeated 20-cycle GPU lifecycle tests;
- complex bundle-budget infrastructure;
- full visual regression suites.

Accessibility basics still matter: semantic HTML, visible focus, keyboard-usable primary controls, sufficient contrast, useful 2D fallback, and reduced-motion-friendly behavior. Fix concrete regressions when found.

## 14. Merge policy

Small issue-scoped PRs are preferred.

Block merge for:

- broken build or feature behavior;
- broken navigation/resume/public routes;
- integration failure with already merged work;
- 3D making the 2D experience unusable;
- sensitive/private content exposure;
- materially false or misleading claims.

Do not block merge solely for stylistic preferences, speculative abstractions, minor animation polish, or improvements unrelated to the issue. Track those as follow-ups when useful.

## 15. Parallel execution

The epic tracker is #4.

Issues may run in parallel when dependencies permit. Use isolated worktrees/branches for concurrent implementation.

Shared-file ownership must be coordinated for:

- `package.json` / lockfile;
- Astro config;
- global styles/layout;
- CI workflows;
- central content schemas.

Do not stack unrelated feature changes into one branch merely to avoid coordination.

## 16. Issue map

### M1
- #5 — SO-01 foundation/Astro migration
- #6 — SO-02 content model/case studies
- #7 — SO-03 recruiter-first pages/compatibility
- #8 — SO-04 deploy/SEO/M1 smoke

### M2
- #9 — SO-05 CnesData walkthrough engine
- #10 — SO-06 2D explorer/project views
- #11 — SO-07 visual assets/posters/manifests
- #12 — SO-08 optional 3D renderer/lazy launcher
- #13 — SO-09 integration/polish/release

## 17. Definition of done

### M1
The static editorial site is deployed, direct routes work, current resume/CNAME are preserved, and the three case studies communicate the work clearly without misleading claims.

### M2
The Observatory overview and three project views are deployed, the CnesData walkthrough works in 2D, the optional 3D layer can be enabled without replacing baseline content, and the release smoke succeeds.

The project is complete when #5–#13 are closed and the deployed site is verified through #13.