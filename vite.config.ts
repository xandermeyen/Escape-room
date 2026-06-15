import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Hoofdpagina's
        main:    resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),

        // Kamer 14 - infopagina
        kamer14: resolve(__dirname, 'kamer-14/index.html'),

        // D.U.A. - infopagina
        dua: resolve(__dirname, 'dua/index.html'),

        // Kamer 14 - game pagina's
        lobby:       resolve(__dirname, 'experiences/kamer-14/index.html'),
        spelerA:     resolve(__dirname, 'experiences/kamer-14/speler-a.html'),
        spelerB:     resolve(__dirname, 'experiences/kamer-14/speler-b.html'),
        einde:       resolve(__dirname, 'experiences/kamer-14/einde.html'),
        tijdVoorbij: resolve(__dirname, 'experiences/kamer-14/tijd-voorbij.html'),
        hostPanel:   resolve(__dirname, 'experiences/kamer-14/host-panel.html'),

        // D.U.A. - game pagina's
        duaLobby:       resolve(__dirname, 'experiences/dua/index.html'),
        duaSpeler1934:  resolve(__dirname, 'experiences/dua/speler-1934.html'),
        duaSpeler2034:  resolve(__dirname, 'experiences/dua/speler-2034.html'),
        duaEinde:       resolve(__dirname, 'experiences/dua/einde.html'),
        duaTijdVoorbij: resolve(__dirname, 'experiences/dua/tijd-voorbij.html'),
        duaHostPanel:   resolve(__dirname, 'experiences/dua/host-panel.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
