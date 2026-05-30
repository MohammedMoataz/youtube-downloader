import { defineConfig, devices } from '@playwright/test';

// E2E + a11y run against the built static preview server with the mock extraction service.
export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
  },
  projects: [
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'a11y', testMatch: /a11y\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  // Start the mock extraction service AND the static preview server for tests.
  // `npm test` runs `build` first, so the preview serves a fresh dist that points
  // PUBLIC_DOWNLOADER_API at the mock (set in .env).
  webServer: [
    {
      command: 'npm run mock-api',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run preview',
      url: 'http://localhost:4321',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
