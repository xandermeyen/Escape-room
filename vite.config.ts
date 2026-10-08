import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // three.js (deeltjes op de homepage) is één lazy chunk van ~530 kB, pas na
    // het laden van de pagina. De rest blijft ruim onder deze grens.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
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
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
