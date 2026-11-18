/**
 * i18n-dom.ts: gedeelde regels voor wat in een pagina vertaald moet worden.
 *
 * Gebruikt door scripts/i18n-sleutels.ts (sleutels toevoegen aan de
 * Nederlandse bron) en scripts/i18n-paginas.ts (andere talen genereren).
 *
 * - Tekst: elk element met eigen tekst krijgt `data-i18n="sleutel"`. De
 *   vertaling vervangt de volledige inhoud (innerHTML), inclusief inline
 *   opmaak zoals <em>, <br> en links.
 * - Attributen: `data-i18n-<attribuut>="sleutel"`, bv. data-i18n-alt.
 * - JSON-LD: `data-i18n-json="sleutel"` op het <script>-blok.
 * - `translate="no"`: wordt overgeslagen (merknamen zoals "Bureau X").
 */
import { createHash } from 'node:crypto';

/** Attributen met tekst voor mensen. */
export const VERTAALBARE_ATTRIBUTEN = ['alt', 'aria-label', 'placeholder', 'title'] as const;

/** Meta-tags waarvan `content` vertaald wordt. */
export const VERTAALBARE_META = [
  'description',
  'og:title',
  'og:description',
  'og:image:alt',
  'twitter:title',
  'twitter:description',
];

/** Tekst die in elke taal gelijk blijft: krijgt translate="no" in plaats van een sleutel. */
export const VASTE_TEKST = new Set([
  'Bureau X',
  'Kamer 14',
  'D.U.A.',
  'D. U. A.',
  'FAQ',
  'info@bureau-x.be',
  'OPZ Geel',
]);

const OVERSLAAN = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'CANVAS']);

const LETTER = /\p{L}/u;

export function heeftEigenTekst(el: Element): boolean {
  for (const kind of Array.from(el.childNodes)) {
    if (kind.nodeType === 3 && LETTER.test(kind.textContent ?? '')) return true;
  }
  return false;
}

/** Witruimte samenvoegen, zodat herformatteren geen verschil maakt. */
export function normaliseer(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}

/** Korte vingerafdruk van de Nederlandse brontekst, voor de drift-controle. */
export function bronHash(tekst: string): string {
  return createHash('sha256').update(normaliseer(tekst)).digest('hex').slice(0, 12);
}

/** Korte afkortingen en nummers zoals "II", "D." of "RR" vertaal je niet. */
const AFKORTING = /^[A-Z0-9.\s/-]{1,6}$/;

export function isVast(el: Element): boolean {
  const tekst = normaliseer(el.textContent ?? '');
  return VASTE_TEKST.has(tekst) || AFKORTING.test(tekst);
}

/**
 * Loopt alle elementen af die vertaalbare tekst bevatten, van boven naar onder.
 * Een element met een sleutel (of translate="no") dekt alles eronder.
 */
export function* tekstElementen(root: Element): Generator<Element> {
  for (const el of Array.from(root.children)) {
    if (OVERSLAAN.has(el.tagName.toUpperCase())) continue;
    if (el.getAttribute('translate') === 'no') continue;
    if (el.hasAttribute('data-i18n') || heeftEigenTekst(el)) {
      yield el;
      continue;
    }
    yield* tekstElementen(el);
  }
}

/** Alle elementen met een vertaalbaar attribuut (buiten translate="no"). */
export function* attribuutElementen(root: Element): Generator<{ el: Element; attribuut: string }> {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el.closest('[translate="no"]')) continue;
    if (el.tagName === 'META') {
      const naam = el.getAttribute('name') ?? el.getAttribute('property') ?? '';
      if (VERTAALBARE_META.includes(naam) && el.getAttribute('content')) {
        yield { el, attribuut: 'content' };
      }
      continue;
    }
    for (const attribuut of VERTAALBARE_ATTRIBUTEN) {
      const waarde = el.getAttribute(attribuut);
      if (!waarde || !LETTER.test(waarde) || VASTE_TEKST.has(waarde.trim())) continue;
      yield { el, attribuut };
    }
  }
}

export function jsonLdBlokken(doc: Document): HTMLScriptElement[] {
  return Array.from(doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));
}
