import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { faqSchemaPlugin } from './scripts/vite-faq-schema.ts';
import { gegenereerdeIngangen } from './scripts/i18n-ingangen.ts';
import { i18nPlugin } from './scripts/vite-i18n.ts';

export default defineConfig({
  // FAQPage-schema wordt gegenereerd uit de zichtbare FAQ (zie scripts/vite-faq-schema.ts).
  // Hreflang en de taalknop komen uit scripts/vite-i18n.ts (zie docs/adr/001-meertaligheid.md).
  plugins: [faqSchemaPlugin(), i18nPlugin()],
  build: {
    rolldownOptions: {
      input: {
        // Hoofdpagina's
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        // Eén 404-pagina voor de hele site (GitHub Pages), in twee talen via js/niet-gevonden.ts
        nietGevonden: resolve(import.meta.dirname, '404.html'),

        // Kamer 14 - infopagina
        kamer14: resolve(import.meta.dirname, 'kamer-14/index.html'),

        // D.U.A. - infopagina
        dua: resolve(import.meta.dirname, 'dua/index.html'),

        // Kamer 14 - game pagina's
        lobby: resolve(import.meta.dirname, 'experiences/kamer-14/index.html'),
        spelerA: resolve(import.meta.dirname, 'experiences/kamer-14/speler-a.html'),
        spelerB: resolve(import.meta.dirname, 'experiences/kamer-14/speler-b.html'),
        einde: resolve(import.meta.dirname, 'experiences/kamer-14/einde.html'),
        tijdVoorbij: resolve(import.meta.dirname, 'experiences/kamer-14/tijd-voorbij.html'),
        hostPanel: resolve(import.meta.dirname, 'experiences/kamer-14/host-panel.html'),

        // D.U.A. - game pagina's
        duaLobby: resolve(import.meta.dirname, 'experiences/dua/index.html'),
        duaSpeler1934: resolve(import.meta.dirname, 'experiences/dua/speler-1934.html'),
        duaSpeler2034: resolve(import.meta.dirname, 'experiences/dua/speler-2034.html'),
        duaEinde: resolve(import.meta.dirname, 'experiences/dua/einde.html'),
        duaTijdVoorbij: resolve(import.meta.dirname, 'experiences/dua/tijd-voorbij.html'),
        duaHostPanel: resolve(import.meta.dirname, 'experiences/dua/host-panel.html'),

        // Andere talen: gegenereerd door scripts/i18n-paginas.ts (pnpm i18n)
        ...gegenereerdeIngangen(import.meta.dirname),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    // pnpm test:coverage: rapport in coverage/ (gitignored), samenvatting in de terminal.
    coverage: {
      provider: 'v8',
      include: [
        'shared/js/**/*.ts',
        'experiences/**/*.ts',
        'js/**/*.ts',
        'i18n/**/*.ts',
        'scripts/**/*.ts',
      ],
      reporter: ['text-summary', 'html'],
    },
  },
});
