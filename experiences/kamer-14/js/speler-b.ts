/**
 * speler-b.ts: Speler B van Kamer 14, in de kamer van Lena bij het gastgezin.
 * Alle logica zit in kamer14-speler.ts; hier enkel de voicemail op de oude
 * gsm, die alleen Speler B heeft.
 */
import { startSpelerPagina } from './kamer14-speler.ts';
import { initVoicemail } from './voicemail.ts';

startSpelerPagina({
  rol: 'b',
  extra: ({ zorgVoorAudio }) => initVoicemail(zorgVoorAudio),
});
