/**
 * demo.ts — demomodus om het spel alleen te tonen (aan een docent of
 * werkgever).
 *
 * - Per experience één vaste demo-sessiecode, die het host-paneel met één
 *   knop terugzet naar het begin.
 * - Op de spelerpagina's een knop om tussen de rollen te wisselen, zodat één
 *   persoon beide kanten kan tonen. De lobby claimt in demomodus geen rollen.
 * - Demo-sessies tellen niet mee: geen speldata (ook afgedwongen in de
 *   rules), niet in de statistieken of de verdeling, en reviews worden niet
 *   bewaard.
 */

export const DEMO_CODES = {
  'kamer-14': 'DEMO-K14',
  dua: 'DEMO-DUA',
} as const;

/** Is dit een demo-sessie? Herkenbaar aan de code, zonder databaseverzoek. */
export function isDemoCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && code.startsWith('DEMO-');
}

export interface RolLink {
  label: string;
  href: string;
}

/**
 * Toont bovenaan een smalle balk "Demomodus" met knoppen naar de andere
 * rollen. `voorNavigatie` schakelt bv. de navigatie-guard uit.
 */
export function toonRolWissel(
  huidig: string,
  andere: RolLink[],
  voorNavigatie?: () => void,
): HTMLElement {
  document.getElementById('demo-balk')?.remove();
  const balk = document.createElement('nav');
  balk.id = 'demo-balk';
  balk.className = 'demo-balk';
  balk.setAttribute('aria-label', 'Demomodus: wissel van rol');

  const label = document.createElement('span');
  label.className = 'demo-label';
  label.textContent = `Demomodus · ${huidig}`;
  balk.appendChild(label);

  for (const rol of andere) {
    const a = document.createElement('a');
    a.className = 'demo-wissel';
    a.href = rol.href;
    a.textContent = `Wissel naar ${rol.label}`;
    a.addEventListener('click', () => voorNavigatie?.());
    balk.appendChild(a);
  }
  document.body.prepend(balk);
  return balk;
}

/** Stijl voor de demobalk (één keer in de pagina gezet). */
export const DEMO_CSS = `
  .demo-balk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px;
    justify-content: center; padding: 6px 12px; background: #6b4e00; color: #fff;
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px; }
  .demo-label { font-weight: 600; letter-spacing: 0.03em; }
  .demo-wissel { color: #fff; background: rgba(0,0,0,0.25); padding: 8px 12px;
    border-radius: 4px; text-decoration: none; min-height: 36px; display: inline-flex;
    align-items: center; }
  .demo-wissel:hover, .demo-wissel:focus-visible { background: rgba(0,0,0,0.45); }
`;

/** Zet de demobalk-stijl één keer in de pagina. */
export function laadDemoStijl(): void {
  if (document.getElementById('demo-stijl')) return;
  const stijl = document.createElement('style');
  stijl.id = 'demo-stijl';
  stijl.textContent = DEMO_CSS;
  document.head.appendChild(stijl);
}

/**
 * Zet een rolwissel op een spelerpagina als de sessie een demo is.
 * Geeft true terug als de demomodus actief is.
 */
export function koppelDemoModus(
  sessie: string,
  huidig: string,
  andere: RolLink[],
  voorNavigatie?: () => void,
): boolean {
  if (!isDemoCode(sessie)) return false;
  laadDemoStijl();
  toonRolWissel(huidig, andere, voorNavigatie);
  return true;
}
