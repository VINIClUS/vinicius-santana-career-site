import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://dev.vinisantana.com',
  trailingSlash: 'always',
  integrations: [react()]
});
