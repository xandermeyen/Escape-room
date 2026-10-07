/**
 * verdeling.ts — onderzoekstijden van afgeronde sessies, om op het
 * eindscherm "sneller dan X% van de groepen" te tonen.
 *
 * Spelers mogen niet alle sessies lezen (rules). Daarom zet het host-paneel
 * bij het laden een geanonimiseerde lijst met tijden klaar in
 * verdeling/<ervaring>: enkel getallen, geen sessiecodes. Alleen een
 * beheerder kan die lijst schrijven, dus spelers kunnen ze niet vervalsen.
 */
import { db } from './firebase-config.ts';
import { ref, get, set, serverTimestamp } from 'firebase/database';

/** Pas vanaf zoveel afgeronde sessies tonen we een percentage. */
export const MIN_SESSIES_VOOR_PERCENTIEL = 10;

/** Onderzoekstijd van een afgeronde sessie in ms, of null. */
export function onderzoekstijd(data: Record<string, unknown>): number | null {
  const start = data.timerGestart;
  const rapport = data.rapport as { ingediend?: boolean; tijdstip?: unknown } | undefined;
  if (typeof start !== 'number' || !rapport?.ingediend || typeof rapport.tijdstip !== 'number') {
    return null;
  }
  const duur = rapport.tijdstip - start;
  // Onzinnige waarden (klokfouten, testsessies van dagen) weglaten.
  return duur > 0 && duur <= 2 * 60 * 60 * 1000 ? duur : null;
}

/**
 * Aandeel (0-100, afgerond) van de groepen die trager waren dan `duurMs`.
 * Null als er te weinig vergelijkingsmateriaal is.
 */
export function percentielSneller(
  duurMs: number,
  duren: number[],
  min = MIN_SESSIES_VOOR_PERCENTIEL,
): number | null {
  if (duren.length < min) return null;
  const trager = duren.filter(d => d > duurMs).length;
  return Math.round((trager / duren.length) * 100);
}

/** Tekst voor het eindscherm. Positief, en eerlijk als het percentage laag is. */
export function prestatieTekst(percentiel: number | null): string | null {
  if (percentiel === null) return null;
  if (percentiel >= 50) return `Sneller dan ${percentiel}% van de groepen.`;
  return 'Jullie haalden het einde binnen het uur. Dat lukt niet elke groep.';
}

/** Leest de tijden die het host-paneel klaarzette (lege lijst bij een fout). */
export async function haalDuren(ervaring: string): Promise<number[]> {
  try {
    const snap = await get(ref(db, `verdeling/${ervaring}/duren`));
    const waarde = snap.val() as Record<string, unknown> | unknown[] | null;
    if (!waarde) return [];
    return Object.values(waarde).filter((d): d is number => typeof d === 'number');
  } catch {
    return [];
  }
}

/**
 * Host: zet de tijden van alle afgeronde sessies klaar voor de spelers.
 * Faalt stil (het host-paneel werkt ook zonder).
 */
export async function werkVerdelingBij(
  ervaring: string,
  sessies: Record<string, unknown>[],
): Promise<void> {
  const duren = sessies
    .map(onderzoekstijd)
    .filter((d): d is number => d !== null)
    .map(d => Math.round(d / 1000) * 1000)
    .sort((a, b) => a - b);
  try {
    await set(ref(db, `verdeling/${ervaring}`), { duren, bijgewerkt: serverTimestamp() });
  } catch (err) {
    console.warn('Verdeling bijwerken mislukt:', err);
  }
}
