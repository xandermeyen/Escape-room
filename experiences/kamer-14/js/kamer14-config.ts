/**
 * kamer14-config.ts — Kamer 14-specifieke spelconfiguratie.
 * Verhaalteksten en antwoordhashes horen bij deze experience, niet in de
 * gedeelde modules.
 */
import type { TimerWaarschuwing } from '../../../shared/js/timer.ts';

// ── Puzzel-antwoorden (SHA-256 gehasht) ───────────────────
// Plain-text antwoorden staan niet in de broncode.
// Gebruik de console-snippet in utils.ts om hashes te genereren.
export const KAMER14_ANTWOORD_HASHES: Record<string, string[]> = {
  p1: [
    '6d95368648b569fb1fe2adced89be071011bb3f9f82abf498daf495cc213116e',
    '5443975707db4d27536283ba2581340e52064790e20a31b12f45fcc421618e4d',
  ],
  p2: [
    '0ba7ea9cf252f255e39e41ea00307fe7995436e190d08bc4adf70da603d609e9',
  ],
  p3: [
    '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3',
    'fb33ab7105db46d8a43042ad35f9c42eb4f1eb4cb7ae1cf4b1490c4cb2a5d585',
    '4b40153ffce0d94e69b84b4969edfed019723fe545ecae2cfb4c719aee52c274',
    'e4522c2a2595d6fa20e90e1fe1265ae20d0dc0f9b35a88d5579bfc0cdef6b6ff',
  ],
  p4: [
    '91ada21b3f9f3b21939e6a7c3154c4f7cf002db220306095cb48010c84f4efaa',
    'c6d17a3613b9914e68707fcfac8410f097643bc5840681bb533030d73cbb18f8',
  ],
  p5: [
    '89f2a5f508866dcf1498b9e2059f33663672ddfc2a553f97bd17373545a43f82',
    '27d40a0e226fb1e8e4ab8ebac2cb17f8de544c733db677ce556d0c9144a1c82d',
  ],
};

// ── Timer-waarschuwingen in de verhaalwereld van Kamer 14 ─
export const KAMER14_TIMER_WAARSCHUWINGEN: TimerWaarschuwing[] = [
  {
    minuten: 30,
    titel: 'Melding — halftime',
    tekst: 'Het kantoor van An Vermeersch sluit om 17u00. U heeft nog 30 minuten om uw rapport in te dienen.',
    urgent: false,
  },
  {
    minuten: 10,
    titel: '⚠ Dringend — nog 10 minuten',
    tekst: 'Het intern dossier van Lena Bogaert wordt automatisch gesloten als er geen rapport is ingediend.',
    urgent: true,
  },
];
