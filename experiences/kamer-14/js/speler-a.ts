/**
 * speler-a.ts: Speler A van Kamer 14, het OPZ-dossier. De gedeelde logica
 * staat in kamer14-speler.ts; hier enkel wat Speler A eigen heeft.
 */
import { startSpelerPagina } from './kamer14-speler.ts';

startSpelerPagina({
  rol: 'a',
  dossier: 'Intern dossier',
  tabs: [
    { tab: 'tab-atelier', label: 'Atelier', na: ['p1'] },
    { tab: 'tab-intakefiche', label: 'Intakefiche', na: ['p2', 'p3'] },
    { tab: 'tab-bijlage', label: 'Bijlage D', na: ['p4'] },
  ],
});
