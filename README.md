# Vinicius Santana — Career Landing Page

Static career landing page for **Vinicius Santana**, focused on Data Engineering, Software Engineering and platform-adjacent work in public-health and operational systems.

Built with **Astro** and designed for GitHub Pages under:

```txt
dev.vinisantana.com
```

## What this version improves

- Clearer positioning for Data Engineer / Software Engineer roles.
- Stronger hero hierarchy, with role fit and interview availability above the fold.
- More direct CTAs: email, projects, resume, GitHub and LinkedIn.
- Real professional photos exported as AVIF, WebP and JPG with responsive crops.
- Concrete project descriptions linked to public repositories and technical notes.
- SEO, Open Graph and JSON-LD metadata for recruiter sharing.
- Keyboard-accessible navigation, skip link, visible focus states and semantic landmarks.
- Lightweight static build with no backend, no form processor and no tracking scripts.

## Local development

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Build the static site:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The static build is generated in `dist/`.

## Project structure

```txt
.
├── .github/workflows/deploy-site.yml
├── public/
│   ├── assets/
│   │   ├── images/
│   │   └── vinicius-santana-resume.pdf
│   ├── 404.html
│   ├── CNAME
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── site.webmanifest
├── src/
│   ├── components/
│   ├── config/
│   ├── data/content.js
│   ├── layouts/
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Publish to GitHub Pages

1. Push the project to the repository's `main` branch.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main` or run the workflow manually.
5. The workflow builds the Astro site and deploys `dist/` using GitHub Pages.

## Configure the custom domain

The repository includes `public/CNAME`, which Astro copies unchanged into the deployed output.

```txt
dev.vinisantana.com
```

In your DNS provider, create a CNAME record similar to:

```txt
Name: dev
Value: viniclus.github.io
```

Then in GitHub, open **Settings → Pages → Custom domain**, enter `dev.vinisantana.com`, save, wait for DNS verification and enable HTTPS.

To use another subdomain, update:

- `public/CNAME`
- `src/config/siteMetadata.ts` canonical, Open Graph and Twitter image URLs
- `public/robots.txt`
- `public/sitemap.xml`

## Resume

The resume CTA points to:

```txt
public/assets/vinicius-santana-resume.pdf
```

Replace this placeholder with the final resume before publishing broadly. Keep the same filename to avoid changing site links.

## Images

The professional photos are included in optimized formats:

```txt
public/assets/images/vinicius-hero-desktop.avif
public/assets/images/vinicius-hero-desktop.webp
public/assets/images/vinicius-hero-desktop.jpg
public/assets/images/vinicius-portrait-mobile.avif
public/assets/images/vinicius-portrait-mobile.webp
public/assets/images/vinicius-portrait-mobile.jpg
public/assets/images/vinicius-about.avif
public/assets/images/vinicius-about.webp
public/assets/images/vinicius-about.jpg
public/assets/images/vinicius-avatar.avif
public/assets/images/vinicius-avatar.webp
public/assets/images/vinicius-avatar.jpg
public/assets/images/og-image.jpg
public/assets/images/og-image.webp
public/assets/images/og-image.png
```

Recommended replacements, if new photos are added later:

- Hero desktop: horizontal image around 1600 × 900.
- Mobile portrait: vertical image around 900 × 1200.
- About portrait: vertical image around 900 × 1125.
- Open Graph: 1200 × 630.
- Keep AVIF/WebP plus JPG fallback and preserve filenames.

## Content updates

Most text, links, project descriptions, stack groups and CTAs are defined in:

```txt
src/data/content.js
```

Update that file when adding new projects, changing availability, replacing links or refining positioning.

## Quality checklist before publishing

- [ ] `npm run build` completes successfully.
- [ ] Hero communicates role fit in under 10 seconds.
- [ ] CTAs are visible above the fold on mobile and desktop.
- [ ] Resume PDF is final, current and downloadable.
- [ ] Public project links point to repositories or useful technical notes.
- [ ] Keyboard navigation reaches header, CTAs, project links and footer links.
- [ ] Focus states are visible on dark backgrounds.
- [ ] Images do not cause layout shift and have descriptive alt text.
- [ ] Open Graph preview shows the real professional image and correct title.
- [ ] GitHub Pages custom domain and HTTPS are enabled.

## Notes

There is no backend, database, authentication or contact form. Contact actions use direct links: email, LinkedIn, GitHub and resume download.
