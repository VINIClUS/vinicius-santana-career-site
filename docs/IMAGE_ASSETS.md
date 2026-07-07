# Image replacement guide

The four professional photos added in ChatGPT were visible in the conversation, but they were not exposed as downloadable files in the runtime that generated this project. The site therefore ships with neutral placeholder image files using the final production names.

Replace these files before publishing:

- `vinicius-hero-desktop.avif`, `vinicius-hero-desktop.webp` and `vinicius-hero-desktop.jpg` — use the best horizontal/wide professional photo for desktop hero.
- `vinicius-portrait-mobile.avif`, `vinicius-portrait-mobile.webp` and `vinicius-portrait-mobile.jpg` — use the best vertical portrait or close-up for mobile hero.
- `vinicius-about.avif`, `vinicius-about.webp` and `vinicius-about.jpg` — use an alternate portrait for the About section.
- `og-image.png` — create a 1200 x 630 Open Graph image, preferably using one professional portrait and the same visual system.

Recommended exports:

- Hero desktop: 1600 x 1200 or 1600 x 1067, AVIF/WebP quality tuned for a small file size with natural skin tones.
- Mobile portrait/About: 900 x 1200, AVIF/WebP quality tuned for a small file size with natural skin tones.
- Keep the person natural and realistic. Do not alter facial identity.
- Keep the existing filenames so no code changes are necessary.
