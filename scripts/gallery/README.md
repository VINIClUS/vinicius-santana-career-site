# Local asset inspection

Run `rtk npm run gallery`, then open `http://127.0.0.1:4322/`.
This server reads `src/content/scenes/index.ts`, the same typed manifests intended
for later page and renderer integration. It serves inspection HTML dynamically;
neither the gallery nor its scripts are part of Astro's published routes.

Every card contains a server-rendered responsive `<picture>` with dimensions and
alternative text. At widths up to 640 px, it selects the mobile crop. Images do
not depend on JavaScript, WebGL, or model loading. The optional 3D inspection
button imports Three.js and loads its GLB on demand; a failed WebGL context leaves
the poster in place. Drag or scroll to inspect the loaded model.

Run `rtk npm run gallery:verify` for the automated Chromium checks: desktop and
mobile with JavaScript disabled, explicit WebGL failure, and a successful model
load. Screenshots are written to ignored `test-results/gallery/`. Use the gallery
for human checks of composition, visual differentiation, and artistic direction;
the automated checks cannot determine those qualities.

`rtk npm test` verifies manifests, actual WebP dimensions, and every GLB with
`GLTFLoader`. After building, `rtk npm run smoke` additionally verifies that all
referenced assets were copied into `dist` byte-for-byte.
