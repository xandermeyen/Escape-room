/**
 * dua-start.ts: bovenaan elke D.U.A.-startmodule, met await, vóór er iets getoond
 * wordt. Bepaalt de speltaal, vertaalt de HTML (shared/js/spelvertaling.ts) en
 * laadt de teksten voor TypeScript (dua-tekst.ts).
 */
import { startSpeltaal } from '../../../shared/js/spelvertaling.ts';
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
