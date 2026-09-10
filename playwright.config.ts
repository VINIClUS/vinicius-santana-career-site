import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  retries: 0,
  use: {
    browserName: 'chromium',
    baseURL: process.env.EXPLORER_BASE_URL || 'http://127.0.0.1:4321',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: process.env.EXPLORER_BASE_URL ? undefined : {
    env: { ASTRO_PREVIEW_BACKGROUND: 'false' },
    command: 'npx astro preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false
  }
});
