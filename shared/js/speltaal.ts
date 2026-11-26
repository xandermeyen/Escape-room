/**
 * speltaal.ts: in welke taal een sessie gespeeld wordt, en de teksten van een game.
 *
 * Zie docs/adr/001-meertaligheid.md (optie G1): de gamepagina's bestaan één
 * keer en worden in de browser vertaald. De taal komt uit de sessie
 * (sessions/<code>/taal, gezet door Make of de host), zodat alle spelers van
 * een sessie dezelfde taal zien, wat hun browser ook zegt.
 *
 * - Een sessie zonder veld `taal` is van voor de meertaligheid: Nederlands.
 * - Kon de sessie niet gelezen worden, dan geldt ?taal= in de URL als hint.
 * - Frans bestaat nog niet voor de games en valt terug op Nederlands.
 *
 * Dit bestand gebruikt Firebase niet; het lezen gebeurt in session.ts
 * (haalSessieTaal), zodat de logica hier zonder mocks te testen is.
 */

export const SPELTALEN = ['nl', 'en'] as const;
export type Speltaal = (typeof SPELTALEN)[number];

export const STANDAARD_SPELTAAL: Speltaal = 'nl';

export function isSpeltaal(waarde: unknown): waarde is Speltaal {
  return typeof waarde === 'string' && (SPELTALEN as readonly string[]).includes(waarde);
}

export interface SpeltaalBron {
  /** Werd de sessie gelezen? Zo nee, dan telt alleen de hint. */
  gelezen: boolean;
  /** Waarde van sessions/<code>/taal (undefined of null als het veld ontbreekt). */
  sessieTaal?: unknown;
  /** ?taal= uit de URL. */
  hint?: string | null;
}

export function kiesSpeltaal({ gelezen, sessieTaal, hint }: SpeltaalBron): Speltaal {
  if (gelezen) return isSpeltaal(sessieTaal) ? sessieTaal : STANDAARD_SPELTAAL;
  return isSpeltaal(hint) ? hint : STANDAARD_SPELTAAL;
}

/**
 * In welke talen elke experience speelbaar is. De eerste is de standaard.
 * D.U.A. is sinds ADR-001 fase 3 ook Engels; Kamer 14 nog niet.
 */
export const SPELTALEN_PER_EXPERIENCE: Readonly<Record<string, readonly Speltaal[]>> = {
  'kamer-14': ['nl'],
  dua: ['nl', 'en'],
};

/**
 * Speltaal voor een nieuwe boeking: die van de pagina als de experience in
 * die taal bestaat, anders de standaard van de experience. Wie op /en/kamer-14/
 * boekt, krijgt dus een Nederlandse sessie (de pagina meldt dat ook).
 */
export function speltaalVoorBoeking(experience: string, paginaTaal: string): Speltaal {
  const talen = SPELTALEN_PER_EXPERIENCE[experience] ?? [STANDAARD_SPELTAAL];
  return talen.find(t => t === paginaTaal) ?? talen[0] ?? STANDAARD_SPELTAAL;
}

/** ?taal= uit de URL, of null. */
export function taalHintUitUrl(zoek: string = window.location.search): string | null {
  return new URLSearchParams(zoek).get('taal');
}

/**
 * Zet <html lang> op de speltaal. Code die de taal uit het document leest
 * (zoals dua-stemmen.ts) volgt dan vanzelf, en schermlezers lezen de juiste taal voor.
 */
export function zetDocumentTaal(taal: Speltaal, doc: Document = document): void {
  doc.documentElement.lang = taal;
}

// ── Teksten ──────────────────────────────────────────────

/** Een woordenboek: sleutel naar tekst. `{naam}` is een plek voor een waarde. */
export type Woordenboek = Readonly<Record<string, string>>;

/** Het Nederlandse woordenboek is de bron; elke andere taal heeft precies dezelfde sleutels. */
export type Vertaling<W extends Woordenboek> = { readonly [K in keyof W]: string };

export type Waarden = Readonly<Record<string, string | number>>;

export interface Vertaler<W extends Woordenboek> {
  readonly taal: Speltaal;
  t(sleutel: keyof W & string, waarden?: Waarden): string;
}

/**
 * Vult `{naam}` in met waarden.naam. Een plek zonder waarde blijft staan,
 * zodat een vergeten waarde opvalt in plaats van stil te verdwijnen.
 */
export function vulIn(tekst: string, waarden: Waarden = {}): string {
  return tekst.replace(/\{(\w+)\}/g, (plek, naam: string) =>
    Object.hasOwn(waarden, naam) ? String(waarden[naam]) : plek,
  );
}

export function maakVertaler<W extends Woordenboek>(
  taal: Speltaal,
  woordenboek: Vertaling<W>,
): Vertaler<W> {
  return {
    taal,
    t: (sleutel, waarden) => vulIn(woordenboek[sleutel], waarden),
  };
}

/**
 * Laadt alleen het woordenboek van de gevraagde taal (dynamische import per
 * taal, dus een Nederlandse speler downloadt het Engels niet).
 *
 *   const vertaler = await laadVertaler(taal, {
 *     nl: () => import('./teksten/nl.ts').then(m => m.nl),
 *     en: () => import('./teksten/en.ts').then(m => m.en),
 *   });
 */
export async function laadVertaler<W extends Woordenboek>(
  taal: Speltaal,
  laders: { readonly [T in Speltaal]: () => Promise<Vertaling<W>> },
): Promise<Vertaler<W>> {
  return maakVertaler<W>(taal, await laders[taal]());
}
