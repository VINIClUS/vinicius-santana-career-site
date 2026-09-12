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
      filter: (page) => {
        const { pathname } = new URL(page);
        return !['/404.html', '/404/'].includes(pathname) && !pathname.startsWith('/work/');
      }
    })
  ]
});
