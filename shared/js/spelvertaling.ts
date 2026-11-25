/**
 * spelvertaling.ts: vertaalt een gamepagina in de browser (ADR-001, optie G1).
 *
 * De gamepagina's bestaan één keer, in het Nederlands, met data-i18n-sleutels
 * (zie SPELPAGINAS in i18n/config.ts). Bij het laden:
 *
 * 1. bepaalt startSpeltaal() de speltaal van de sessie (speltaal.ts, session.ts).
 *    Per sessie onthouden in sessionStorage, zodat de volgende pagina niet op
 *    Firebase wacht.
 * 2. Is die niet Nederlands, dan laadt het enkel dat woordenboek en vult
 *    vertaalDocument() de teksten in.
 * 3. Daarna verdwijnt de klasse `i18n-wacht` van <html>, die de pagina tot dan
 *    verbergt. Zonder JavaScript of bij een fout toont dua.css de pagina na
 *    twee seconden toch (in het Nederlands).
 *
 * De vertalingen komen uit onze eigen repo, maar worden toch nooit als ruwe HTML
 * ingevoegd: veiligeInhoud() laat enkel eenvoudige opmaak en veilige links door.
 */
import type { PaginaWoordenboek } from '../../scripts/i18n-paginas.ts';
import { lokaalPad } from './i18n.ts';
import { bepaalSpeltaal } from './session.ts';
import {
  STANDAARD_SPELTAAL,
  isSpeltaal,
  kiesSpeltaal,
  taalHintUitUrl,
  zetDocumentTaal,
  type Speltaal,
} from './speltaal.ts';

export type Spel = 'dua';

/** Woordenboek per spel en taal, elk een eigen bestand dat pas geladen wordt als het nodig is. */
const WOORDENBOEKEN: Record<Spel, Partial<Record<Speltaal, () => Promise<PaginaWoordenboek>>>> = {
  dua: { en: () => import('../../i18n/spel/dua.en.ts').then(m => m.default) },
};

/** Toegelaten opmaak in een vertaling, met de attributen die mogen blijven. */
const TOEGELATEN: Readonly<Record<string, readonly string[]>> = {
  B: [],
  STRONG: [],
  EM: [],
  I: ['class', 'id'],
  BR: [],
  SPAN: ['class', 'id'],
  DIV: ['class'],
  SMALL: [],
  A: ['href', 'target', 'rel'],
};

const VEILIGE_LINK = /^(https:\/\/|\/(?!\/)|#|mailto:)/i;

function kopieer(bron: Node, doel: Document): Node | null {
  if (bron.nodeType === Node.TEXT_NODE) return doel.createTextNode(bron.textContent ?? '');
  if (bron.nodeType !== Node.ELEMENT_NODE) return null;
  const el = bron as Element;
  const toegelaten = TOEGELATEN[el.tagName];
  if (!toegelaten) return doel.createTextNode(el.textContent ?? '');
  const nieuw = doel.createElement(el.tagName.toLowerCase());
  for (const naam of toegelaten) {
    const waarde = el.getAttribute(naam);
    if (waarde === null) continue;
    if (naam === 'href' && !VEILIGE_LINK.test(waarde.trim())) continue;
    nieuw.setAttribute(naam, waarde);
  }
  for (const kind of Array.from(el.childNodes)) {
    const k = kopieer(kind, doel);
    if (k) nieuw.appendChild(k);
  }
  return nieuw;
}

/** Zet een vertaling om in DOM-knopen: tekst en toegelaten opmaak, de rest als platte tekst. */
export function veiligeInhoud(html: string, doel: Document = document): DocumentFragment {
  const ontleed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const fragment = doel.createDocumentFragment();
  for (const kind of Array.from(ontleed.body.childNodes)) {
    const k = kopieer(kind, doel);
    if (k) fragment.appendChild(k);
  }
  return fragment;
}

/**
 * Vervangt elke data-i18n-sleutel door de vertaling. Een ontbrekende vertaling
 * laat de Nederlandse tekst staan (de build-controle vangt dat normaal al op).
 * Geeft de sleutels terug die ontbraken.
 */
export function vertaalDocument(
  woordenboek: PaginaWoordenboek,
  root: Document = document,
): string[] {
  const ontbrekend: string[] = [];
  for (const el of Array.from(root.querySelectorAll('*'))) {
    for (const attr of el.getAttributeNames()) {
      if (!attr.startsWith('data-i18n')) continue;
      const sleutel = el.getAttribute(attr) ?? '';
      const waarde = woordenboek[sleutel];
      if (typeof waarde !== 'string') {
        ontbrekend.push(sleutel);
        continue;
      }
      if (attr === 'data-i18n') el.replaceChildren(veiligeInhoud(waarde, root));
      else if (attr !== 'data-i18n-json') el.setAttribute(attr.slice('data-i18n-'.length), waarde);
    }
  }
  return ontbrekend;
}

const CACHE = 'speltaal:';
const WACHT_MS = 2500;

function uitCache(sessie: string): Speltaal | null {
  try {
    const waarde = sessionStorage.getItem(CACHE + sessie);
    return isSpeltaal(waarde) ? waarde : null;
  } catch {
    return null;
  }
}

function inCache(sessie: string, taal: Speltaal): void {
  try {
    sessionStorage.setItem(CACHE + sessie, taal);
  } catch {
    /* privémodus of opslag vol: dan vraagt de volgende pagina het opnieuw */
  }
}

/** Speltaal van een sessie: eerst de cache, anders Firebase (met een tijdslimiet). */
export async function zoekSpeltaal(
  sessie: string | null,
  hint: string | null = taalHintUitUrl(),
): Promise<Speltaal> {
  if (!sessie) return kiesSpeltaal({ gelezen: false, hint });
  const gekend = uitCache(sessie);
  if (gekend) return gekend;
  const opHint = kiesSpeltaal({ gelezen: false, hint });
  const taal = await Promise.race([
    bepaalSpeltaal(sessie, hint),
    new Promise<null>(klaar => setTimeout(() => klaar(null), WACHT_MS)),
  ]);
  if (!taal) return opHint; // te traag: niet onthouden, de volgende pagina probeert opnieuw
  inCache(sessie, taal);
  return taal;
}

/**
 * Zet <html lang> en vult de vertaling in. Van Nederlands naar een andere taal
 * kan altijd; terug naar Nederlands vraagt een herlaad (de bron is de HTML zelf).
 */
export async function pasTaalToe(spel: Spel, taal: Speltaal): Promise<void> {
  zetDocumentTaal(taal);
  const lader = WOORDENBOEKEN[spel][taal];
  if (!lader) return;
  const ontbrekend = vertaalDocument(await lader());
  if (ontbrekend.length) console.warn(`Vertaling ontbreekt (${taal}):`, ontbrekend);
  verwijsNaarTaal(taal);
}

/** Links naar de publieke site ("/", "/dua/#boek") wijzen naar die pagina in de speltaal. */
export function verwijsNaarTaal(taal: Speltaal, root: ParentNode = document): void {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach(a => {
    const href = a.getAttribute('href') ?? '';
    if (!href.startsWith('//')) a.setAttribute('href', lokaalPad(href, taal));
  });
}

/**
 * Bepaalt de speltaal, vertaalt de pagina indien nodig en toont ze.
 * Roep dit bovenaan de startmodule van een gamepagina aan, met await, vóór
 * er tekst getoond of gelezen wordt.
 */
export async function startSpeltaal(
  spel: Spel,
  sessie: string | null = new URLSearchParams(window.location.search).get('sessie'),
): Promise<Speltaal> {
  let taal: Speltaal;
  try {
    taal = await zoekSpeltaal(sessie);
    await pasTaalToe(spel, taal);
  } catch (err) {
    console.error('Vertalen mislukt, de pagina blijft Nederlands:', err);
    taal = STANDAARD_SPELTAAL;
    zetDocumentTaal(taal);
  } finally {
    document.documentElement.classList.remove('i18n-wacht');
  }
  return taal;
}
