import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end-tests: een volledige run van Kamer 14 met twee spelers in twee
 * tabbladen, tegen de site met een nep-Firebase (zie vite.e2e.config.ts).
 *
 * Lokaal: pnpm exec playwright install chromium (eenmalig), dan pnpm test:e2e.
 * Met een eigen Chromium: PW_CHROMIUM=/pad/naar/chromium pnpm test:e2e.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  webServer: {
    command: 'pnpm exec vite --config vite.e2e.config.ts',
    url: 'http://localhost:5180/experiences/kamer-14/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
