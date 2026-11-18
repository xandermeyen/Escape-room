import { defineConfig, devices } from '@playwright/test';

/**
 * Opmaaktests tegen de productiebuild (pnpm test:opmaak).
 *
 * De gewone e2e-tests draaien tegen de Vite-devserver. Sommige fouten bestaan
 * alleen na `vite build`, bijvoorbeeld wanneer CSS-bestanden in een andere
 * volgorde gebundeld worden. Daarom bouwt deze config de site eerst (met de
 * nep-Firebase uit vite.e2e.config.ts) en test hij tegen `vite preview`.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: 'opmaak.spec.ts',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5181',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: process.env['PW_CHROMIUM'] ? { executablePath: process.env['PW_CHROMIUM'] } : {},
  },
  webServer: {
    command:
      'pnpm i18n && pnpm exec vite build --config vite.e2e.config.ts --outDir dist-e2e --emptyOutDir --logLevel warn && pnpm exec vite preview --config vite.e2e.config.ts --outDir dist-e2e --port 5181 --strictPort',
    url: 'http://localhost:5181/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
