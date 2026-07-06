# Vinicius Santana — Career Landing Page

Static professional landing page for **Vinicius Santana**, focused on Data Engineering, Software Engineering, backend APIs, public-health systems, automation, PostgreSQL and DevOps-enabled workflows.

Built with **React + Vite**, designed to be deployed as a static site on **GitHub Pages** with the selected custom subdomain:

```txt
dev.vinisantana.com
```

## Overview

This site includes:

- Responsive one-page landing page with hero, impact, about, experience, projects, stack, contact and footer sections.
- SEO metadata, Open Graph/Twitter Card tags and Schema.org `Person` JSON-LD.
- Accessible navigation, visible focus states, semantic landmarks and reduced-motion support.
- GitHub Pages workflow in `.github/workflows/deploy.yml`.
- `robots.txt`, `sitemap.xml`, `404.html`, `CNAME`, favicon and web manifest.
- Image slots for professional photos and an Open Graph image.
- Resume link at `/assets/vinicius-santana-resume.pdf`.

## Local development

Install dependencies:

```bash
npm install
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

## Publish to GitHub Pages

1. Create a GitHub repository, for example `vinicius-santana-career-site`.
2. Push this project to the repository's `main` branch.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions** as the source.
5. Push to `main`. The workflow in `.github/workflows/deploy.yml` will build and deploy the `dist/` folder.
6. After the deployment finishes, open the GitHub Pages URL shown in the workflow summary.

## Configure the custom domain

This project includes both a root-level `CNAME` file and `public/CNAME` so Vite copies the custom domain file into the deployed `dist/` output:

```txt
dev.vinisantana.com
```

In your DNS provider, add the DNS record required by GitHub Pages for the chosen subdomain. A common setup is a `CNAME` record:

```txt
Name: dev
Value: <your-github-username>.github.io
```

Then in GitHub, open **Settings → Pages → Custom domain**, enter `dev.vinisantana.com`, save, and enable HTTPS after DNS verification is complete.

To use another subdomain, update all of these files:

- `CNAME`
- `public/CNAME`
- `index.html` canonical, Open Graph URL and image URL
- `public/robots.txt`
- `public/sitemap.xml`

## Replace the resume

Replace this placeholder file before publishing:

```txt
public/assets/vinicius-santana-resume.pdf
```

Keep the same filename to avoid changing links in the site.

## Replace the images

The professional images added in ChatGPT were visible in the conversation, but they were not exposed as downloadable files in the runtime that generated this project. The site ships with neutral placeholder files using the final production names.

Replace these files before publishing:

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
public/assets/images/og-image.png
```

Recommended exports:

- Hero desktop: wide/horizontal image, around 1600 px wide.
- Mobile portrait: vertical portrait, around 900 x 1200.
- About image: alternate vertical portrait, around 900 x 1200.
- Open Graph image: 1200 x 630.
- Export AVIF/WebP at quality 58-85 depending on the format and keep JPG fallback files.
- Keep the existing filenames so no code changes are required.

## Update project links

Project cards are defined in:

```txt
src/data/content.js
```

Replace placeholder repository/profile links with the final repository URLs, live demos, case studies or technical notes when they are public.

## Final checklist before publishing

- [ ] Replace placeholder portrait images with the final optimized photos.
- [ ] Replace the placeholder resume PDF with the final resume.
- [ ] Confirm all project links point to real repositories, demos or case studies.
- [ ] Update `CNAME`, canonical URL, sitemap and robots if using a different subdomain.
- [ ] Run `npm run build` locally and confirm there are no build errors.
- [ ] Test keyboard navigation and visible focus states.
- [ ] Test mobile layout, especially the hero photo crop and stacked CTAs.
- [ ] Verify Open Graph preview after publishing.
- [ ] Enable HTTPS in GitHub Pages.

## Notes

There is no backend, database, authentication or form processor. Contact actions use direct links such as email, LinkedIn, GitHub and resume download.
# vinicius-santana-career-site
