import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://dev.vinisantana.com',
  trailingSlash: 'always',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !['/404.html', '/404/'].includes(new URL(page).pathname)
    })
  ]
});
