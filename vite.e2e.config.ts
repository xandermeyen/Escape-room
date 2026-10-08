/**
 * Vite-config voor de end-to-end-tests (pnpm test:e2e).
 *
 * Zelfde site, maar Firebase is vervangen door een nep-versie in
 * e2e/fake-firebase/ die alles in localStorage bewaart. Zo spelen twee
 * tabbladen (Speler A en B) samen een volledige run, zonder netwerk en
 * zonder echte database. De database-rules zelf test pnpm test:rules.
 */
import { defineConfig, mergeConfig } from 'vite';
import { resolve } from 'path';
import basis from './vite.config.ts';

export default mergeConfig(
  basis,
  defineConfig({
    resolve: {
      alias: [
        {
          find: /^firebase\/(app|auth|database|app-check)$/,
          replacement: resolve(import.meta.dirname, 'e2e/fake-firebase/$1.ts'),
        },
      ],
    },
    server: { port: 5180, strictPort: true },
  }),
);
