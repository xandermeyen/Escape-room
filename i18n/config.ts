/**
 * i18n/config.ts: welke talen en publieke pagina's er zijn (zie docs/adr/001-meertaligheid.md).
 *
 * Nederlands is de bron en staat op de root. Elke andere taal wordt door
 * scripts/i18n-paginas.ts gegenereerd onder /<taal>/, uit de Nederlandse HTML
 * en het woordenboek in i18n/paginas/<taal>.ts.
 *
 * Zonder Node-afhankelijkheden: ook de browser gebruikt dit bestand.
 */
export const SITE_URL = 'https://bureau-x.be';

/** De bron. */
export const BRONTAAL = 'nl';

/** Talen die gegenereerd worden. Frans komt erbij zodra i18n/paginas/fr.ts bestaat. */
export const DOELTALEN = ['en'] as const;

export type Doeltaal = (typeof DOELTALEN)[number];
export type Taal = typeof BRONTAAL | Doeltaal;

export const TALEN: readonly Taal[] = [BRONTAAL, ...DOELTALEN];

/** Taal voor wie geen van onze talen spreekt (hreflang x-default). */
export const STANDAARD_BUITENLAND: Taal = 'en';

export const OG_LOCALE: Record<Taal, string> = { nl: 'nl_BE', en: 'en_GB' };

/** Voor datums en getallen (toLocaleDateString enz.). */
export const LOCALE: Record<Taal, string> = { nl: 'nl-BE', en: 'en-GB' };

export const TAALNAAM: Record<Taal, string> = { nl: 'Nederlands', en: 'English' };

export interface Pagina {
  /** Korte naam, ook het voorvoegsel van de sleutels. */
  id: string;
  /** Bronbestand, relatief aan de projectmap. */
  bron: string;
  /** Pad op de site, zonder taal. */
  pad: string;
  /** In de sitemap? (de privacypagina staat op noindex) */
  sitemap: boolean;
}

export const PAGINAS: readonly Pagina[] = [
  { id: 'home', bron: 'index.html', pad: '/', sitemap: true },
  { id: 'kamer14', bron: 'kamer-14/index.html', pad: '/kamer-14/', sitemap: true },
  { id: 'dua', bron: 'dua/index.html', pad: '/dua/', sitemap: true },
  { id: 'privacy', bron: 'privacy.html', pad: '/privacy.html', sitemap: false },
];

/** Pad van een pagina in een taal: "/dua/" wordt "/en/dua/". */
export function padInTaal(pad: string, taal: Taal): string {
  return taal === BRONTAAL ? pad : `/${taal}${pad}`;
}

/** Bestand van een gegenereerde pagina: "dua/index.html" wordt "en/dua/index.html". */
export function bestandInTaal(bron: string, taal: Taal): string {
  return taal === BRONTAAL ? bron : `${taal}/${bron}`;
}

/** Zoekt pagina en taal bij een pad zoals de browser of Vite het geeft. */
export function vindPagina(pad: string): { pagina: Pagina; taal: Taal } | null {
  let p = pad.split(/[?#]/)[0] ?? '/';
  p = p.replace(/index\.html$/, '');
  let taal: Taal = BRONTAAL;
  for (const t of DOELTALEN) {
    if (p === `/${t}` || p.startsWith(`/${t}/`)) {
      taal = t;
      p = p.slice(t.length + 1) || '/';
      break;
    }
  }
  const pagina = PAGINAS.find(x => x.pad === p);
  return pagina ? { pagina, taal } : null;
}

/** Pad van de huidige pagina in een andere taal, of null als die pagina daar niet bestaat. */
export function padVoorTaal(huidigPad: string, taal: Taal): string | null {
  const gevonden = vindPagina(huidigPad);
  return gevonden ? padInTaal(gevonden.pagina.pad, taal) : null;
}
