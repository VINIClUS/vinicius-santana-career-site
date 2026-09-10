# SO-07 visual asset kit

This kit implements #11 under EPIC #4. The approved lossless [reference](systems-observatory-visual-reference.png) from #23 remains unchanged (SHA-256 `6171a4fc7222a3027846e77ca1d3acfd56aff762e608e762c91e5044e6ac5986`). It controls art direction, never factual metrics or topology.

The kit is deliberately hybrid: generated illustrations for Home and Work; editable procedural Three.js maquettes for the Observatory and details. Page integration belongs to #21, selection/registry/controllers to #22, and the interactive renderer to #12. Adding this kit does not load Three.js on Home or change public routes.

## Sources and provenance

| Asset group | Source | Rights / attribution |
| --- | --- | --- |
| Home globe and four Work illustrations | OpenAI built-in `image_gen.imagegen`; exact prompts in `scripts/illustrations/prompts.json`, approved PNG used only as art-direction reference | AI-generated for this repository; no stock assets, copied logos or third-party models. OpenAI output terms apply; no claim of exclusive copyright or factual representation. |
| Five districts, hub, two details, overview fallbacks | Original editable procedural geometry in `scripts/assets/` | Original project assets; no third-party geometry or textures. Repository licensing applies; no additional stock-asset license. |
| Three.js tooling | Exact development dependency, GLTFExporter / GLTFLoader | MIT, see `node_modules/three/LICENSE`. Tooling is not shipped on Home. |
| Sharp tooling | Exact development dependency | Apache-2.0, see `node_modules/sharp/LICENSE`. Used to resize and encode final WebPs. |
| Approved PNG | Existing user-approved reference from #23 | Preserved byte for byte; not re-encoded or published as a runtime asset. |

All imagery is conceptual. LimnoPulse poles/buoys do not claim a deployed production sensor fleet. Public Health and Observability are domains, not additional projects. Infrastructure depicts a synthetic three-node reference cluster. CnesData planned processing/deployment elements retain their content identifiers and planned metadata; decorative connectors are not production data flows.

## Illustration regeneration

1. Use the built-in imagegen tool once per prompt in `scripts/illustrations/prompts.json`, passing the approved PNG as a **style reference**, not an edit target. Generated originals are nondeterministic; an identical prompt is not a pixel-reproducible source.
2. Inspect each full-size output for subject, navy/slate palette, restrained light, useful mobile framing and absence of text, metrics or UI.
3. Run `rtk proxy node scripts/illustrations/optimize.mjs <stem> <generated-original.png>` from the repository root. Stems: `home-globe`, `work-cnesdata`, `work-limnopulse`, `work-infrastructure`, `work-public-health`.
4. Inspect both resulting WebPs. Only final 1200×800 desktop and 600×600 mobile images are versioned; the large generated originals remain outside the repository. Existing approved reference bytes are never input to this optimizer.

No API key is needed for the built-in generation tool. This kit does not require a CLI image-generation service or credentials at build time.

## Integration boundary

Import the shared `DistrictId` contract from `src/content/scenes/`; `ProjectId` continues to contain exactly `cnesdata`, `limnopulse` and `infrastructure`. Health Systems uses `public-health` in the Work manifest. Do not create a fourth project or route.

Image representations supply local URLs, intrinsic dimensions and alternative descriptions. Render a static `<picture>` with mobile `<source>` and desktop `<img>` before any optional 3D code. Asset alt descriptions explain illustrations; the registry/content owns labels, prose, destinations and states.

Models use Y-up, a base-centred pivot and common illustrative units. Load the independent GLBs lazily; do not fetch detail scenes with Home or all details with the overview. Use metadata in `userData` (glTF `extras`) to identify districts, components and simulation elements. Mesh names are debugging aids, not the contract. Repeated props share geometry/materials within each exported asset; separate GLBs remain self-contained.

The overview composition records district positions and an isometric orthographic camera. Its connectors express conceptual relationships. All runtime interaction and simulation transitions remain outside this kit.

## Procedural regeneration and inspection

Run from the repository root:

```sh
rtk npm ci
rtk proxy npx playwright install chromium
rtk npm run assets:generate
rtk npm run gallery
```

`assets:generate` runs a small local Chromium harness, providing native `FileReader` to `GLTFExporter`. It exports each source model, reloads the GLB with `GLTFLoader`, rejects non-finite transforms, and renders desktop/mobile fallbacks from that reloaded model. There are no runtime external texture/buffer URLs. Use `rtk proxy node scripts/assets/generate.mjs detail-infrastructure` to regenerate one scene. Regeneration writes the committed `src/content/scenes/generated.json`; commit it together with the affected GLB and both posters. Browser/GPU differences may change encoded poster bytes; structural contracts remain testable.

The gallery runs at `http://127.0.0.1:4322/`, bound to loopback. It is served from `scripts/gallery/`, not an Astro/public route, and does not enter the build or sitemap. Each static picture comes from the same typed manifests used by consumers. Optional buttons load individual GLBs for orbit inspection. `rtk npm run gallery:verify` tests all 14 picture pairs without JavaScript in 1440px desktop and 390px mobile, forced WebGL failure, and a real GLB viewer. Screenshots are saved under ignored `test-results/gallery/`.

`rtk npm test` verifies all model files via `GLTFLoader`, finite geometry/transforms/bounds, stable district/component/simulation IDs, exact image dimensions and local paths. `rtk npm run smoke` additionally checks every referenced asset in `dist/` byte for byte, together with the existing routes, anchors, resume, CNAME and sitemap checks.

## Consumption example

```astro
---
import { homeVisual } from '../content/scenes/index';
---
<picture>
  <source media="(max-width: 640px)" srcset={homeVisual.mobile.src}
    width={homeVisual.mobile.width} height={homeVisual.mobile.height} />
  <img src={homeVisual.desktop.src} alt={homeVisual.desktop.alt}
    width={homeVisual.desktop.width} height={homeVisual.desktop.height} />
</picture>
```

The example adds no client script. For decorative use beside equivalent visible content, a consumer can deliberately use empty alt text. `districts`, `hub`, `details`, `workPosters`, `overview`, `sceneAssets` and `allPosters` are the exported visual manifests. Import `DistrictId` as a type. The overview offers separate portrait/desktop compositions; use each variant's positions and camera together. Bounds and anchors are in each standalone model's local coordinates, so apply the same placement/scale transformation as the loaded model. The Infrastructure detail workload initially sits above `node-02`; use `simulationId` values `node-01`, `node-02`, `node-03`, `shared-layer` and `workload` in the future controller.

See [the inventory](so-07-inventory.json) for every final asset's dimensions, bytes and SHA-256. The inventory excludes development screenshots and source originals. Regenerate its measurements whenever a final asset changes.

## Delivery validation (2026-09-10)

The 36 final files total 1,724,994 bytes (about 1.65 MiB): 28 WebPs and eight GLBs. No source image duplicates are published. The largest final asset is the 123,676-byte LimnoPulse desktop Work poster.

Validated with `npm ci`, `npm test` (25 active tests, with the build-only check run separately by smoke), `npm run build`, `npm run smoke` (all 11 asset checks including byte-identical publication), `npm run test:explorer` (four browser tests), and `npm run gallery:verify`. Manual browser inspection covered the desktop gallery, an actual loaded CnesData GLB and the 390px portrait overview. The reference PNG hash remains unchanged; existing routes, compatibility anchors, resume, CNAME and sitemap pass smoke.

Review fixes included avoiding Three.js's reserved `extras.pivot` key, preserving finite transforms after export/reload, serving gallery modules correctly, and aligning the initial workload with node-02. The mobile overview has its own composition to keep the five districts readable; use `overview.layouts.mobile` with its corresponding camera. Procedural models intentionally use simpler editable geometry than the generated Work illustrations; no photoreal runtime renderer is part of this delivery.
