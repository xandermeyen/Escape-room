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

// De puzzel-antwoordhashes van Kamer 14 verhuisden naar
// experiences/kamer-14/js/kamer14-config.ts — dit bestand bevat alleen
// nog logica die voor elke experience geldt.
