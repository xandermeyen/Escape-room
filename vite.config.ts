import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // Hoofdpagina's
        main:    resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),

        // Kamer 14 - landingspagina
        kamer14: resolve(__dirname, 'kamer-14/index.html'),

        // Kamer 14 - game pagina's
        lobby:      resolve(__dirname, 'experiences/kamer-14/index.html'),
        spelerA:    resolve(__dirname, 'experiences/kamer-14/speler-a.html'),
        spelerB:    resolve(__dirname, 'experiences/kamer-14/speler-b.html'),
        einde:      resolve(__dirname, 'experiences/kamer-14/einde.html'),
        tijdVoorbij: resolve(__dirname, 'experiences/kamer-14/tijd-voorbij.html'),
        hostPanel:  resolve(__dirname, 'experiences/kamer-14/host-panel.html'),
      },
    },
  },
});
