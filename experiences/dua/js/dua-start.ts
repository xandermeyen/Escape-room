/**
 * dua-start.ts: bovenaan elke D.U.A.-startmodule, met await, vóór er iets getoond
 * wordt. Bepaalt de speltaal, vertaalt de HTML (shared/js/spelvertaling.ts) en
 * laadt de teksten voor TypeScript (dua-tekst.ts).
 */
import { pasTaalToe, startSpeltaal, zoekSpeltaal } from '../../../shared/js/spelvertaling.ts';
import type { Speltaal } from '../../../shared/js/speltaal.ts';
import { duaTaal, zetDuaTaal } from './dua-tekst.ts';

export async function startDua(): Promise<Speltaal> {
  const gekozen = await startSpeltaal('dua');
  try {
    await zetDuaTaal(gekozen);
  } catch (err) {
    console.error('Teksten laden mislukt, de game blijft Nederlands:', err);
    await zetDuaTaal('nl');
  }
  return duaTaal();
}

/**
 * Lobby: de sessiecode werd net ingevoerd. Is die sessie Engels terwijl de lobby
 * nog Nederlands is (geen ?taal=en in de link), dan vertaalt de lobby nu mee.
 * Geeft true als de taal wisselde.
 */
export async function volgSessieTaal(code: string): Promise<boolean> {
  const taal = await zoekSpeltaal(code, null);
  if (taal === duaTaal() || taal === 'nl') return false;
  try {
    await pasTaalToe('dua', taal);
    await zetDuaTaal(taal);
    return true;
  } catch (err) {
    console.error('Lobby vertalen mislukt:', err);
    return false;
  }
}
