/**
 * einde-verloop.ts: wat er gebeurt na "Rapport indienen".
 *
 * - Klopt alles: het rapport wordt ingediend. Daarna volgen de mail van An,
 *   de briefkaart en de epiloog.
 * - Eerste keer fout: An stuurt een waarschuwing en de foute velden worden
 *   aangeduid. Spelers krijgen nog één kans.
 * - Tweede keer fout: An belt de politie. Geen briefkaart (Lena is die avond
 *   al terug), meteen het slotscherm.
 *
 * De pogingen worden per sessie bewaard in sessionStorage, zodat herladen
 * geen extra kans geeft. Lukt opslaan niet, dan telt de teller in het geheugen.
 */
export type RapportStap = 'indienen' | 'waarschuwing' | 'politie';

export const MAX_FOUTE_POGINGEN = 2;

/** Bepaalt de volgende stap op basis van het aantal foute pogingen tot nu toe. */
export function volgendeStap(fouteVoorDeze: number, geldig: boolean): RapportStap {
  if (geldig) return 'indienen';
  return fouteVoorDeze + 1 >= MAX_FOUTE_POGINGEN ? 'politie' : 'waarschuwing';
}

const sleutel = (sessie: string) => `kamer14-foute-rapporten-${sessie}`;
const geheugen = new Map<string, number>();

export function leesFoutePogingen(sessie: string): number {
  try {
    const waarde = Number(sessionStorage.getItem(sleutel(sessie)));
    if (Number.isFinite(waarde) && waarde > 0) return waarde;
  } catch {
    // sessionStorage niet beschikbaar: geheugen gebruiken
  }
  return geheugen.get(sessie) ?? 0;
}

export function bewaarFoutePogingen(sessie: string, aantal: number): void {
  geheugen.set(sessie, aantal);
  try {
    sessionStorage.setItem(sleutel(sessie), String(aantal));
  } catch {
    // niet erg: het geheugen houdt de teller bij zolang de pagina open is
  }
}
