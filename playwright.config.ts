import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
  },
  webServer: {
    command: `yarn vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'simulated-camera',
      testIgnore: ['**/keyboard.spec.ts'],
      use: {
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
      },
    },
    {
      name: 'no-camera',
      testMatch: ['**/keyboard.spec.ts'],
      use: {
        launchOptions: { args: ['--deny-permission-prompts'] },
      },
    },
  ],
});
