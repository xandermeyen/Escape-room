/**
 * lobby-ui.ts — kleine, experience-onafhankelijke lobby-helpers.
 * De rolset, navigatie naar de spelerpagina's en (bij D.U.A.) initDua blijven
 * per experience, omdat die wezenlijk verschillen.
 */

/** Wisselt het actieve .scherm naar `id` en scrollt naar boven. */
export function activeerScherm(id: string): void {
  document.querySelectorAll('.scherm').forEach((s) => s.classList.remove('actief'));
  document.getElementById(id)?.classList.add('actief');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Houdt de speler op het rolscherm bij gebruik van de browserterugknop. */
export function bewaakRolScherm(): void {
  window.addEventListener('popstate', () => {
    if (document.querySelector('.scherm.actief')?.id === 'scherm-rol') {
      history.pushState({ scherm: 'rol' }, '');
    }
  });
}

/** Koppelt het sessiecode-invoerveld: fout wissen bij typen, Enter = valideren. */
export function koppelCodeInvoer(valideer: () => void): void {
  const input = document.getElementById('sessieCodeInput') as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener('input', () => {
    input.classList.remove('invoer-fout');
    document.querySelector('#scherm-code .code-fout')?.classList.add('verborgen');
  });
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') valideer();
  });
}
