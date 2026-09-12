# SA-05 home preview validation

## Performance method

The before build is an immutable `git archive` of `origin/main` at
`b36822c5fc3baeb33e78a3972b03454847929e24`, built in `/tmp/sa05-baseline`.
The after build is the SA-05 worktree preview. Measurements use
[`scripts/measure-home.mjs`](../../../scripts/measure-home.mjs) and Playwright's bundled Chromium
153.0.8010.12.

Each value below is the median of three cold-cache page visits. Every visit uses a new browser context,
disables and clears the Chromium cache through CDP, and applies the same 10 Mbps download, 1 Mbps upload,
40 ms latency, and 4x CPU slowdown profile. The viewports are 1440 x 900 and 390 x 844. On mobile, the
script scrolls `[data-home-preview]` (falling back to the legacy globe) into view immediately after
`DOMContentLoaded`.

Resource sizes come from Resource Timing: `transferSize` includes response headers and
`encodedBodySize` is the response body in its transferred encoding (it may equal the raw file size when the
preview server does not compress that asset). JavaScript includes script-initiated `.js` resources,
models include `.glb`, `.gltf`, and `.bin`, and posters include resources served from `/posters/` or with
`poster` in the path. This measures bytes actually transferred during the visit rather than raw source or
build artifact sizes.

The first GL draw is the first observed WebGL `draw*` call. Preview readiness is separately recorded when
`data-preview-state="ready"` first appears. Long tasks come from the browser's `longtask` Performance
Observer. Idle draws are draw calls during a two-second window that begins after both a minimum three-second
post-`load` settle and preview readiness. A dash means no GL draw or readiness state was observed. DCL and
FCP are browser milestones used as proxies for usable HTML; the DCL snapshot also verifies that the hero and
primary CTA exist and have non-zero dimensions.

## Median results

| Viewport | Build | DCL (ms) | FCP (ms) | JS transfer / body | Model transfer / body | Poster transfer / body | First GL draw / ready (ms) | Long tasks, count / total / max (ms) | Total / idle GL draws |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1440 x 900 | Before | 315.3 | 452 | 0 / 0 | 0 / 0 | 397,324 / 396,124 | — / — | 1 / 201 / 201 | 0 / 0 |
| 1440 x 900 | After | 342.1 | 348 | 157,067 / 155,267 | 193,844 / 192,644 | 34,956 / 34,656 | 1,024.1 / 1,116.3 | 4 / 628 / 308 | 1,454 / 0 |
| 390 x 844 | Before | 286.7 | 320 | 0 / 0 | 0 / 0 | 168,624 / 167,724 | — / — | 1 / 176 / 176 | 0 / 0 |
| 390 x 844 | After | 311.2 | 308 | 157,067 / 155,267 | 193,844 / 192,644 | 29,598 / 29,298 | 932.4 / 1,027.2 | 3 / 554 / 309 | 1,454 / 0 |

All byte values are decimal bytes. In all 12 visits, the DCL snapshot found a visible hero and CTA. Poster
observations were complete and non-zero: before/after desktop natural dimensions were 1200 x 800 and rendered
618.1 x 412.1; before mobile was 600 x 600 rendered at 362 x 362; after mobile was 720 x 900 rendered at
362 x 452.5. Median observed poster load times were 341.5/315.0 ms on desktop and 309.6/296.3 ms on mobile
(before/after).

The individual runs, resource URLs, poster evidence, readiness state, and long-task entries are retained in
[`before.json`](./before.json) and [`after.json`](./after.json).

## Raw build artifact sizes

These file sizes are separate from the transferred-byte figures above.

| Artifact | Raw bytes |
| --- | ---: |
| `hub.glb` | 34,004 |
| `district-cnesdata.glb` | 56,888 |
| `district-limnopulse.glb` | 58,816 |
| `district-infrastructure.glb` | 42,936 |
| Four home-preview models, total | 192,644 |
| Home launcher entry chunk | 2,617 |
| Preview client chunk | 1,669 |
| Supporting fetched JavaScript chunks | 605,677 |
| All fetched JavaScript chunks, total | 609,963 |

## Reproduction

With the desired build served by Astro Preview, run:

```sh
rtk node scripts/measure-home.mjs http://127.0.0.1:4326/ /tmp/sa05-after.json
```

Set `MEASURE_RUNS` to change the number of visits; the documented result uses the default of three per
viewport. Do not run before and after measurements concurrently, because CPU throttling does not isolate
the two browser processes from host contention.

## Interpretation and limits

The static baseline fetched no external JavaScript or GLBs. The eligible preview adds about 157 KB of
JavaScript transfer and 194 KB of model transfer, while replacing the larger globe and catalog posters.
The mobile enhanced visit transfers more total bytes than before; this is a measured cost of optional 3D.
All six enhanced runs stopped drawing during the measured idle window. Initial parsing and rendering still
produce long tasks under the 4x CPU profile; the longest per-run task is recorded in the raw evidence.
The deferred launcher keeps those costs after initial load and uses the poster for restricted/failure paths.
Three samples per viewport characterize this local build, not a production performance guarantee.

## Visual evidence

The desktop captures use 1440 x 900; mobile uses 390 x 844, scrolled to the preview and its CTA.
The poster captures hold the hub request; the enhanced captures follow completion of all four models.
The three districts keep their authored positions through the handoff. The 3D grid is part of the shared
Atlas renderer. Keyboard navigation and touch behavior are covered separately by the browser tests.

| Viewport | Held model / poster | Complete preview |
| --- | --- | --- |
| Desktop | [Poster](desktop-poster.png) | [3D](desktop-preview.png) |
| Mobile | [Poster](mobile-poster.png) | [3D](mobile-preview.png) |
