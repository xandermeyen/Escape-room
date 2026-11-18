import { defineConfig } from '@playwright/test';
import basis from './playwright.config.ts';

/**
 * Screenshots voor de README en promotiebeelden: pnpm screenshots.
 * Zelfde nep-Firebase en dev-server als de e2e-tests (zie e2e/screenshots.ts).
 */
export default defineConfig({
  ...basis,
  testMatch: 'screenshots.ts',
  retries: 0,
  reporter: 'list',
});
