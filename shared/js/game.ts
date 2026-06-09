/**
 * game.ts - Gedeelde spel-logica voor de spelerpagina's (speler-a / speler-b)
 * Bevat de stukken die identiek waren in beide bestanden.
 */

// ── Voortgangsbalk bijwerken ──────────────────────────────
export function updateVoortgang(p: Record<string, boolean>): void {
  const stappen  = ['vp1','vp2','vp3','vp4','vp5'];
  const voltooid = [p['p1'], p['p2'], p['p3'], p['p4'], p['p5']];
  const aantalKlaar = voltooid.filter(Boolean).length;

  stappen.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'vp-stap';
    if (voltooid[i])            el.classList.add('vp-klaar');
    else if (i === aantalKlaar) el.classList.add('vp-bezig');
    else                        el.classList.add('vp-open');
  });
}

// ── Voltooide puzzel verbergen ────────────────────────────
export function markeerVoltooid(id: string): void {
  const blok = document.getElementById(id);
  if (!blok) return;
  blok.classList.add('verborgen');
}

// ── Browsernavigatie blokkeren ────────────────────────────
// Voorkomt dat spelers per ongeluk de game verlaten via
// terugknop, muisknop of meerdere stappen terug.
// Geeft een functie terug die de bescherming uitschakelt
// (aanroepen zodra de speler bewust naar einde.html gaat).
export function installeerNavigatieGuard(): () => void {
  let beschermd = true;

  history.pushState({ scherm: 'game' }, '');
  window.addEventListener('popstate', () => {
    if (beschermd) history.pushState({ scherm: 'game' }, '');
  });
  window.addEventListener('beforeunload', (e: BeforeUnloadEvent) => {
    if (beschermd) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  return () => { beschermd = false; };
}

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
