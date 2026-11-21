/**
 * versies.ts — speldata per versie van een experience.
 *
 * Een versie is geen veld in de database maar een datum in de code: elke
 * sessie hoort bij de versie die live stond toen ze gespeeld werd. Zo
 * werkt het ook voor sessies van Make.com en voor alle bestaande sessies,
 * zonder database- of rules-wijziging. Nieuwe versie = één regel toevoegen
 * aan de lijst van die experience (alleen bij wijzigingen die de speeltijd
 * of de puzzels echt veranderen, niet bij tekst- of stijlfixes).
 */

export interface Versie {
  /** Korte naam, bv. 'v3'. */
  id: string;
  /** Vanaf wanneer deze versie live stond (ms sinds epoch). */
  vanaf: number;
  /** Wat er veranderde, één regel voor het host-paneel. */
  wat: string;
}

/** Keuze in het host-paneel: één versie-id of 'alle'. */
export type VersieKeuze = string;
export const ALLE_VERSIES = 'alle';

/** Moment waarop een sessie gespeeld werd: timerstart, anders aanmaak. */
export function sessieMoment(data: Record<string, unknown>): number | null {
  if (typeof data.timerGestart === 'number') return data.timerGestart;
  if (typeof data.aangemaakt === 'number') return data.aangemaakt;
  return null;
}

/** Versies van oud naar nieuw (kopie, de bron blijft ongemoeid). */
function gesorteerd(versies: Versie[]): Versie[] {
  return [...versies].sort((a, b) => a.vanaf - b.vanaf);
}

/** De nieuwste versie: de standaard in het host-paneel. */
export function huidigeVersie(versies: Versie[]): Versie | null {
  return gesorteerd(versies).at(-1) ?? null;
}

/**
 * Versie van een sessie. Een sessie zonder tijdstip of van vóór de eerste
 * versie krijgt de oudste versie.
 */
export function versieVan(data: Record<string, unknown>, versies: Versie[]): Versie | null {
  const lijst = gesorteerd(versies);
  const moment = sessieMoment(data);
  if (moment === null) return lijst[0] ?? null;
  let gevonden = lijst[0] ?? null;
  for (const v of lijst) if (moment >= v.vanaf) gevonden = v;
  return gevonden;
}

/** Alleen de sessies van de gekozen versie (of alles bij 'alle'). */
export function filterOpVersie<T extends { data: Record<string, unknown> }>(
  rijen: T[],
  versies: Versie[],
  keuze: VersieKeuze,
): T[] {
  if (keuze === ALLE_VERSIES) return rijen;
  return rijen.filter(r => versieVan(r.data, versies)?.id === keuze);
}
