import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end-tests tegen de site met een nep-Firebase (zie e2e/config/vite.e2e.config.ts):
 * volledige runs van Kamer 14 en D.U.A. met meerdere spelers in eigen
 * tabbladen, de lobby per spelersaantal, en het boekingsformulier met een
 * nagebootste Make-webhook.
 *
 * Lokaal: pnpm exec playwright install chromium (eenmalig), dan pnpm test:e2e.
 * Met een eigen Chromium: PW_CHROMIUM=/pad/naar/chromium pnpm test:e2e.
 */
export default defineConfig({
  testDir: 'e2e',
  // Opmaaktests draaien tegen de productiebuild: zie e2e/config/playwright.opmaak.config.ts.
  testIgnore: 'opmaak.spec.ts',
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
    command: 'pnpm i18n && pnpm exec vite --config e2e/config/vite.e2e.config.ts',
    // Ook als een andere config (e2e/config/) deze webServer overneemt: altijd vanuit de root.
    cwd: import.meta.dirname,
    url: 'http://localhost:5180/experiences/kamer-14/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
});
