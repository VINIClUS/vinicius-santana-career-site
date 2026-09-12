# SA-07 removal inventory

Baseline: `c686a47` (current main when SA-07 began). References were inspected with repository-wide text searches before deleting each resource. Historical documents are evidence of prior releases, not consumers of shipped assets.

| Resource removed | Remaining baseline references and reason | Result |
| --- | --- | --- |
| `src/components/CaseStudy.astro` | No imports from any route or component. Contains the retired `/work/` article, its scoped styles and its own client initialization. | Removed the unused component; canonical `ProjectDetail.astro` preserves project content and System Views. |
| `src/components/SelectedWorkCard.astro` | No imports from any route or component. Sole component consumer of `workPosters`. | Removed with its scoped styles. Public `/work/*` compatibility routes remain. |
| Generic fallback in `src/pages/explore/[project].astro` | Reachable only for content IDs outside the three approved project IDs; duplicated retired component explorer markup. `EditorialLayout`, `projectDefinitions`, `ProjectId`, `titleFor` and `statusLabel` imports/helpers existed solely for this branch. | Removed branch and exclusive helpers. `getStaticPaths` now rejects missing, unknown or additional project IDs before returning any project routes. |
| `home-globe-{desktop,mobile}.webp` and `work-{cnesdata,limnopulse,infrastructure,public-health}-{desktop,mobile}.webp` | `src/content/scenes/index.ts` illustration manifest; retired card component; `scripts/gallery/server.mjs`; illustration optimizer; historical documentation/inventories. No canonical page consumed them. | Removed 10 files totaling **787,282 bytes** from public/build output. This is deployment payload removed, not a claimed reduction in active page transfer. |
| `homeVisual`, `workPosters`, internal `illustration()` helper | Sole live consumers were retired component, gallery, `allPosters`, and old scene test expectation for public-health artwork. | Removed together; `allPosters` now includes eight responsive pairs (16 images). |
| `scripts/illustrations/optimize.mjs` | Exclusive optimizer of retired AI illustration stems. Historical `docs/design/so-07-asset-kit.md` invocation remains under its supersession notice. | Removed executable; original prompts and provenance remain archived. |
| Work/globe global styles | `.globe-visual`, `.work-grid`, `.project-grid`, `.project-card`, `.project-eyebrow`, `.project-actions`, `.tech-list`, `.proof-list`; no surviving source consumers. Legacy `.case-grid`, `.case-card`, `.case-context`, `.case-outcome` likewise had only stylesheet references. | Removed exclusive rules/selectors in `global.css` and `observatory.css`; retained other selectors from shared rule groups. |
| Retired explorer styles | `.explorer-areas`, `.explorer-columns`, `.relationship-list`, `.explorer-limits` belong only to retired explorer layouts/fallback. | Removed only these selectors from `explorer.css`. |

## Preserved contracts

- Three district GLBs, hub, CnesData/Infrastructure detail GLBs, overview poster and Infrastructure failure poster remain: six models, eight responsive poster pairs.
- `explorer-heading`, `explorer-area`, `area-limnopulse` and `area-infrastructure` are used by the Atlas index, including its interpolated `explorer-area area-${id}` expression. The three area style rules were restored after review caught their live use; only the unused plural `explorer-areas` layout is removed. `explorer-nav` belongs to `ProjectDetail`; component maps, selected markers, component panels, relations, focus, fragments and statuses belong to all three System Views. Their shared CSS remains.
- `client.ts` and `initializeExplorer()` still own selection, history, CnesData simulation and Infrastructure failure/reset. They were not exclusive helpers of the removed fallback.
- `scripts/assets/generate.mjs` and `scripts/assets/scenes.mjs` retain district identity rejection and partial-generation metadata sanitization. The dedicated sanitizer/rejection tests remain.
- Historical prompts, inventory JSON, loading captures and screenshots keep their content/provenance; current guides link to the superseding Atlas contract.
- No changes to dependencies, engines, hosting, public URLs, CNAME or curriculum contents/name.

## Verification

`rtk npm test` passed 43 tests with one build-only asset test skipped. After the final asset-absence contract and CSS cleanup, `rtk npm run build`, `rtk npm run smoke` and `rtk npm run gallery:verify` passed; smoke ran all 13 asset checks, including byte-for-byte publication and exact public/build poster inventories. The gallery verifies the eight explicit card IDs, responsive URLs, successfully decoded images, HTTP 200 WebP responses, no overflow at 1440×1000 and 390×844, no-JavaScript posters, unavailable-WebGL fallback, and opt-in GLB inspection.

[Build inventory](build-inventory.json) lists every retained published poster/model and each removed file size. A search of generated HTML/CSS/JavaScript found no retired poster names, globe/card selectors or retired explorer layout selectors. After restoring the active Atlas area rules, the final build was checked against every removed class name; none occurred in any generated HTML class attribute. Dynamic `area-${id}`, `district-link-${id}`, `status-${status}` classes and the `nav-open` toggle were inspected explicitly and retain their rules. `/explore/` publishes only its index and the three canonical project pages; existing static smoke checks validate four compatibility routes and the eight canonical sitemap URLs.

[Route guard results](route-guard.json) record three real Astro builds in discarded temporary source copies: replacing a canonical ID with an unknown ID, removing Infrastructure, and adding an extra project. Each build exited 1 with the exact project-set guard error; none emitted an additional project page. These are mutation checks of the actual route generation path, not a mirrored predicate test.

Full browser, generation, loading comparison and release/production results are maintained in [validation.md](validation.md).
