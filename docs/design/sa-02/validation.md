# SA-02 validation record

Scope: issue #31, parent #29. Branch: `feat/sa-02-canonical-project-shell`.

## Plan and decisions

- Preserve collection facts while combining the case narrative and explorer.
- Reuse the existing deterministic controller and transcripts without API changes.
- Keep the detailed maquette as a static responsive poster in the System View.
- Preserve the root checkout and its untracked files; use `.worktrees/sa-02`.
- Keep GitHub Pages deployment and the unrelated routes under their own issues.

Content and behavior share component IDs; the System View retains the controller's
existing data selectors. The simulation slot remains inside the single explorer
root. Static equivalence assertions cover every collection fact before removal of
the duplicate link. No conflict was found between these interfaces and the plan.

## Evidence collected

- Clean baseline: `rtk npm ci`, `rtk npm test` (31 passed, 1 asset-build check skipped),
  and `rtk npm run build` passed before implementation.
- Regression check: extended smoke test failed against the baseline because
  canonical CnesData still linked to `/work/cnesdata/`.
- Public CnesData architecture documentation checked on 2026-09-12:
  <https://github.com/VINIClUS/CnesData/blob/main/docs/architecture.md>.
  It explicitly identifies incomplete Parquet-to-Gold wiring and planned Kubernetes.
- Astro documentation consulted through Context7 (`/withastro/docs`): typed
  collection props and static named slots.

## Final local validation

- `rtk npm test`: 31 passed, 1 intentionally skipped built-asset check.
- `rtk npm run build`: passed (13 static pages). The existing large renderer
  chunk warning remains; CnesData does not request that renderer.
- `rtk npm run smoke`: passed, including 11 asset tests and byte preservation
  of CNAME and the resume PDF; all canonical collection content is present.
- `rtk npm run test:explorer`: 42 passed (1.6 minutes).
- `rtk git diff --check`: passed.
- Focused tests exercised first write, identical replay, conflict rejection,
  reset and scenario change, comparing every result to the static transcript.
- Browser checks covered 1440×900 and 390×844, keyboard selection, focus,
  back/forward fragments, section links, loaded poster, and no horizontal overflow.
- JavaScript-disabled canonical content retains narrative, component details,
  evidence, limitations and all three transcripts; controls stay disabled.
- Unavailable WebGL retains touch selection and simulation; no model requests.

Screenshots were generated and visually inspected:

- [Desktop 1440×900](cnesdata-1440.png)
- [Mobile 390×844](cnesdata-390.png)

The long static page retains readable sections and a single System View with
its detailed poster. Section links provide direct access to simulation/results.

## Review follow-up

Independent source review identified the former `#architecture-title` fragment
as a compatibility gap. The System View heading now retains that ID. A smoke
assertion failed before the fix and passed after rebuilding. No controller or
simulation behavior changed. Remote review, CI and deployment are tracked in
the pull request and issue #31.

