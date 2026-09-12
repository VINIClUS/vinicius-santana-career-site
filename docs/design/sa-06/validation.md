# SA-06 validation

Base: `52e7386654fe2cf44a9d3f4beadbe78c123d1728` (origin/main).
Branch: `feat/sa-06-canonical-navigation`; isolated worktree `.worktrees/sa-06`.
Date: 2026-09-12. Local Node 24.18.0; repository CI uses Node 22.

## Scope and contracts

Work opens `/explore/` and is active on the Atlas and all three projects.
About, Resume and 404 discovery links use the same canonical destination.
Exactly four static compatibility pages are generated from an explicit frozen
map, independent of the content collection:

| Legacy route | Canonical route |
| --- | --- |
| `/work/` | `/explore/` |
| `/work/cnesdata/` | `/explore/cnesdata/` |
| `/work/limnopulse/` | `/explore/limnopulse/` |
| `/work/infrastructure/` | `/explore/infrastructure/` |

Each has destination canonical/og:url, BaseLayout noIndex, an accessible static
link and one small redirect module using `location.replace`. No narrative,
catalog, poster, island or graphics loader remains in those documents.
Query strings and fragments are appended unchanged; `next`, `url` and `redirect`
never choose the destination. All three System Views retain `#architecture`.
Without JavaScript the static link opens the canonical page. These static
compatibility documents are not hosting-layer HTTP 301/308 responses.

The sitemap contains exactly `/`, `/about/`, `/resume/`, `/privacy/`, `/explore/`
and the three canonical project routes, excluding `/work/*` and 404. Static
contracts reject published links to alternate Work pages. Narrative, evidence,
limitations and simulation checks now target canonical projects; content and
controllers are unchanged. Unused components/assets remain for SA-07.

## Executed checks

- `rtk npm ci`: passed, 267 packages, zero audit vulnerabilities. Local npm
  reported the esbuild postinstall blocked by its existing allowScripts policy;
  build and all subsequent checks use the successfully installed dependencies.
- Baseline `rtk npm test`: 37 passed, one built-assets check intentionally skipped.
- Red phase: the new resolver test initially failed because the module did not
  exist. The adapted static smoke then failed because the old sitemap still
  contained twelve routes instead of eight.
- `rtk npm test`: type checks and 43 tests passed; one built-assets test is
  intentionally deferred to smoke. Six new tests cover the independent map,
  repeated/encoded query values, external URL parameters, fragments and unknown
  paths (including object prototype names).
- `rtk npm run build`: passed, 13 HTML pages. Existing optional graphics chunk
  warning above 500 kB remains; this change adds no graphics to compatibility.
- `rtk npm run smoke`: static contracts and all 13 built-asset tests passed.
- `rtk npm run test:explorer`: 88/88 browser tests passed in 2.2 minutes.
  New coverage checks all four JS redirects, all four no-JS fallback links,
  Back/Forward for each route, raw query/fragment data, and Work navigation on
  all canonical work pages at 1440×900 and 390×844.
- After strengthening the existing release journey to visit all three canonical
  projects by keyboard and check loaded images/overflow, the two affected
  release tests passed again: 2/2 in 15.7 seconds. The initial focused
  compatibility/release/visual suite also passed 11/11.
- `rtk git diff --check`: passed.

Navigation screenshots: [desktop](navigation-desktop-1440x900.png) and
[mobile menu](navigation-mobile-390x844.png).

## Review

Independent local spec review found no SA-06 violations. Code-quality review
found no correctness or redirect-security issue; its only low-priority
suggestion was to share the expected route maps across tests.

Ruling: keep independent expected mappings in unit, static and browser contracts,
as explicitly requested by the plan. Importing the production map everywhere
would let an unintended destination change update both behavior and its oracle.
The tradeoff is updating each fixed four-route expectation if the approved scope
changes. No production mapping is duplicated.

## Byte preservation

Compared each source and generated file directly against the base commit bytes,
then calculated SHA-256. All four comparisons passed.

| Files | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/CNAME`, `dist/CNAME` | 20 | `50ea872cd8828a877db512188d9ef5789bfef1ebe863d58e345eeb23f983fb7d` |
| `public/assets/vinicius-santana-resume.pdf`, `dist/assets/vinicius-santana-resume.pdf` | 470921 | `b2cca4eac1313462b8ff44eb0c42a3143e5bd1a3ac02a2d756b1b38bc16b769e` |

`package.json`, `package-lock.json` and `.github/workflows/deploy-site.yml` are
also byte-identical to the base. Existing local files in the original checkout
were preserved.

## Documentation sources

Context7 resolve-library-id for Astro returned “Monthly quota exceeded”. The
fallback consulted the official [Astro static routing guide](https://docs.astro.build/en/guides/routing/)
and [sitemap integration guide](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
for explicit getStaticPaths generation and sitemap filtering.

## Release tracking

Issue #35 and EPIC #29 remain open until the final reviewed HEAD passes CI,
squash merge, Pages deployment and published-domain verification. Release links
and production results will be attached to the issue after deployment so the
reviewed implementation does not need a metadata-only revision after approval.
