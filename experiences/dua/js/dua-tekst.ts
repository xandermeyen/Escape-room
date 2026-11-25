/**
 * dua-tekst.ts: de teksten van D.U.A. in de taal van de sessie.
 *
 * startDua() (dua-start.ts) zet de taal; daarna geeft tekst() overal synchroon
 * de juiste woorden. Nederlands zit altijd in de bundel; Engels wordt pas
 * geladen als het nodig is. Dit bestand gebruikt Firebase niet, zodat modules
 * die het importeren zonder mocks te testen zijn.
 */
import {
  STANDAARD_SPELTAAL,
  vulIn,
  type Speltaal,
  type Waarden,
} from '../../../shared/js/speltaal.ts';
import { nl, type DuaTeksten } from './teksten/nl.ts';

let huidig: DuaTeksten = nl;
let taal: Speltaal = STANDAARD_SPELTAAL;

/** De teksten in de speltaal (Nederlands tot startDua() klaar is). */
export function tekst(): DuaTeksten {
  return huidig;
}

/** De speltaal van deze pagina. */
export function duaTaal(): Speltaal {
  return taal;
}

/** Een tekst met `{plekken}` ingevuld. */
export function vul(sjabloon: string, waarden: Waarden): string {
  return vulIn(sjabloon, waarden);
}

/** Laadt de teksten voor een taal. Apart van startDua(), voor tests. */
export async function zetDuaTaal(nieuw: Speltaal): Promise<void> {
  huidig = nieuw === 'en' ? (await import('./teksten/en.ts')).en : nl;
  taal = nieuw;
}
