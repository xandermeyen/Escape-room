/**
 * speler-b.ts: Speler B van Kamer 14, het dossier van het gastgezin. De
 * gedeelde logica staat in kamer14-speler.ts; hier enkel wat Speler B eigen
 * heeft: de kamerinspectie, de brief op het prikbord en vragen die pas later
 * onder het logboek verschijnen.
 */
import { startSpelerPagina } from './kamer14-speler.ts';
import { initKamerinspectie } from './kamerinspectie.ts';
import { koppelActies } from '../../../shared/js/acties.ts';
import { maakKlikbaar } from '../../../shared/js/toegankelijk.ts';
import { speelEnvelopGeluid } from './audio.ts';

startSpelerPagina({
  rol: 'b',
  dossier: 'Buurtdossier',
  tabs: [{ tab: 'tab-kamer', label: 'Kamerinspectie', na: ['p2', 'p3'] }],
  vragen: {
    'puzzel-2': ['p1'],
    'puzzel-3': ['p1'],
    // P4 (wie ging ze opzoeken) staat in de kamerinspectie: samen met die tab vrij.
    'puzzel-4': ['p2', 'p3'],
    'puzzel-5': ['p4'],
  },
  extra: ({ zorgVoorAudio }) => {
    initKamerinspectie();

    // Prikbord: de envelop omdraaien en de brief lezen
    const kaart = document.getElementById('brief-kaart');
    if (kaart) maakKlikbaar(kaart, 'Envelop omdraaien en de brief lezen');
    koppelActies({
      'draai-om': () => {
        if (!kaart) return;
        zorgVoorAudio();
        speelEnvelopGeluid();
        kaart.classList.toggle('omgedraaid');
      },
    });
  },
});
