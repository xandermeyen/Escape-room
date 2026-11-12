import { defineConfig } from 'vite';
import { resolve } from 'path';
import { faqSchemaPlugin } from './scripts/vite-faq-schema.ts';

export default defineConfig({
  // FAQPage-schema wordt gegenereerd uit de zichtbare FAQ (zie scripts/vite-faq-schema.ts)
  plugins: [faqSchemaPlugin()],
  build: {
    rolldownOptions: {
      input: {
        // Hoofdpagina's
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),

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
      },
      output: {
        codeSplitting: {
          // Bootstrap-JS (CommonJS) in een eigen chunk. Anders zet Rolldown zijn
          // hulpcode in het privacy-chunk, en dan laadt de homepage via reviews
          // ook de Bootstrap-CSS van de privacypagina, die .btn overschrijft.
          groups: [{ name: 'bootstrap-js', test: /node_modules\/bootstrap\/dist\/js\// }],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
