import { defineConfig } from '@playwright/test';

const PORT = 4174;

// A visible window is required: headless Chrome falls back to a software renderer.
export default defineConfig({
  testDir: 'tests/verify',
  testMatch: ['responsiveness.spec.ts'],
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: false,
    deviceScaleFactor: 2,
  },
  webServer: {
    command: `yarn vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
});
