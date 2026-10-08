/**
 * game.ts - Gedeelde spel-logica voor de spelerpagina's (speler-a / speler-b)
 * Bevat de stukken die identiek waren in beide bestanden.
 */

// ── Voortgangsbalk bijwerken ──────────────────────────────
export function updateVoortgang(p: Record<string, boolean>): void {
  // Zoveel stappen als er vp-elementen op de pagina staan (vp1, vp2, ...).
  const stappen: HTMLElement[] = [];
  for (let n = 1; document.getElementById(`vp${n}`); n++) {
    stappen.push(document.getElementById(`vp${n}`) as HTMLElement);
  }
  const voltooid = stappen.map((_, i) => !!p[`p${i + 1}`]);
  const aantalKlaar = voltooid.filter(Boolean).length;

  stappen.forEach((el, i) => {
    el.className = 'vp-stap';
    if (voltooid[i]) el.classList.add('vp-klaar');
    else if (i === aantalKlaar) el.classList.add('vp-bezig');
    else el.classList.add('vp-open');
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

  return () => {
    beschermd = false;
  };
}

// De puzzel-antwoordhashes van Kamer 14 verhuisden naar
// experiences/kamer-14/js/kamer14-config.ts — dit bestand bevat alleen
// nog logica die voor elke experience geldt.
