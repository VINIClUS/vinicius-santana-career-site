# Image assets

Professional portrait and sharing assets live in `public/assets/images/`; their AVIF, WebP and JPG variants are referenced by the page markup. Inspect the actual files and active references before replacing any image. Preserve identity, descriptive alt text, declared dimensions and responsive crops. The resume PDF is independent and must not change during image maintenance.

Systems Atlas uses `src/content/scenes/index.ts` and `generated.json` for responsive posters and models. The active kit contains three districts (CnesData, LimnoPulse, Infrastructure), the hub, overview, CnesData/Infrastructure details and the Infrastructure failure poster. HTML/SVG supplies project structure; posters remain usable without JavaScript or WebGL. Optional Home, Atlas and Infrastructure renderers progressively enhance that baseline.

Run `rtk npm run assets:generate` for the full authored kit, or append `-- overview` for partial generation. The generator rejects retired district IDs and normalizes obsolete metadata on partial runs. GPU differences can change raster pixels; inspect changes and avoid committing incidental regeneration.

Run `rtk npm run gallery` for local inspection and `rtk npm run gallery:verify` for responsive images and model fallback checks. See [gallery instructions](../scripts/gallery/README.md).

The Home globe and Work illustrations were retired in SA-07. `scripts/illustrations/prompts.json`, the SO-07 inventory and older screenshots are historical provenance, not regeneration instructions. See [historical evidence](design/README.md) and [SA-07 inventory](design/sa-07/inventory.md).
