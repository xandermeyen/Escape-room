/**
 * i18n-sleutels.ts: geeft nieuwe Nederlandse tekst in de publieke pagina's een sleutel.
 *
 *   pnpm i18n:sleutels           sleutels toevoegen en bestanden aanpassen
 *   pnpm i18n:sleutels --droog   enkel tonen wat er zou veranderen
 *
 * Bestaande sleutels blijven ongemoeid. Nieuwe sleutels hebben de vorm
 * <pagina>.<sectie>.<klasse>, met -2, -3 ... bij dubbels. Merknamen uit
 * VASTE_TEKST krijgen translate="no". De attributen worden rechtstreeks in de
 * brontekst ingevoegd, zodat de opmaak van het bestand behouden blijft.
 * Draai daarna Prettier en vul de vertalingen aan in i18n/paginas/<taal>.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { PAGINAS } from '../i18n/config.ts';
import { attribuutElementen, isVast, jsonLdBlokken, tekstElementen } from './i18n-dom.ts';

const ROOT = resolve(import.meta.dirname, '..');
const droog = process.argv.includes('--droog');

function sectieVan(el: Element): string {
  if (el.closest('head')) return 'head';
  const blok = el.parentElement?.closest('[id], section, nav, footer, header, main, form');
  if (!blok) return 'body';
  const naam = blok.id || blok.classList[0] || blok.tagName.toLowerCase();
  return naam.replace(/[^a-zA-Z0-9]+/g, '-');
}

function beschrijving(el: Element): string {
  const klasse = el.classList[0];
  return (klasse ?? el.tagName.toLowerCase()).replace(/[^a-zA-Z0-9]+/g, '-');
}

/** Waar een attribuut in de start-tag ingevoegd moet worden (net voor > of />). */
function invoegPlek(bron: string, eindeStartTag: number): number {
  let i = eindeStartTag - 1; // positie van '>'
  if (bron[i - 1] === '/') i -= 1;
  while (i > 0 && /\s/.test(bron[i - 1] ?? '')) i -= 1;
  return i;
}

let totaal = 0;
for (const pagina of PAGINAS) {
  const pad = resolve(ROOT, pagina.bron);
  const bron = readFileSync(pad, 'utf8');
  const dom = new JSDOM(bron, { includeNodeLocations: true });
  const doc = dom.window.document;

  const gebruikt = new Set(
    Array.from(doc.querySelectorAll('*')).flatMap(el =>
      el
        .getAttributeNames()
        .filter(a => a.startsWith('data-i18n'))
        .map(a => el.getAttribute(a) ?? ''),
    ),
  );
  const nieuweSleutel = (basis: string): string => {
    let sleutel = basis;
    for (let n = 2; gebruikt.has(sleutel); n++) sleutel = `${basis}-${n}`;
    gebruikt.add(sleutel);
    return sleutel;
  };

  const invoegingen: { plek: number; tekst: string }[] = [];
  const voegToe = (el: Element, tekst: string) => {
    // parse5-locatie van een element: heeft een startTag (de jsdom-types kennen die niet).
    const loc = dom.nodeLocation(el) as { startTag?: { endOffset: number } } | null;
    if (!loc?.startTag) throw new Error(`${pagina.bron}: geen bronpositie voor <${el.tagName}>`);
    invoegingen.push({ plek: invoegPlek(bron, loc.startTag.endOffset), tekst });
  };

  const gesleuteld = new Set<Element>();
  for (const el of tekstElementen(doc.documentElement)) {
    if (el.hasAttribute('data-i18n')) {
      gesleuteld.add(el);
      continue;
    }
    if (isVast(el)) {
      voegToe(el, ' translate="no"');
      continue;
    }
    const sleutel = nieuweSleutel(`${pagina.id}.${sectieVan(el)}.${beschrijving(el)}`);
    voegToe(el, ` data-i18n="${sleutel}"`);
    gesleuteld.add(el);
  }

  for (const { el, attribuut } of attribuutElementen(doc.documentElement)) {
    // Binnen een vertaald element zit het attribuut al in de vertaalde inhoud.
    let ouder = el.parentElement;
    let binnen = false;
    while (ouder) {
      if (gesleuteld.has(ouder)) binnen = true;
      ouder = ouder.parentElement;
    }
    if (binnen || el.hasAttribute(`data-i18n-${attribuut}`)) continue;
    const naam = el.getAttribute('name') ?? el.getAttribute('property');
    const deel =
      el.tagName === 'META' ? (naam ?? 'meta').replace(/[^a-zA-Z0-9]+/g, '-') : beschrijving(el);
    const sleutel = nieuweSleutel(`${pagina.id}.${sectieVan(el)}.${deel}@${attribuut}`);
    voegToe(el, ` data-i18n-${attribuut}="${sleutel}"`);
  }

  jsonLdBlokken(doc).forEach(script => {
    if (script.hasAttribute('data-i18n-json')) return;
    let type = 'schema';
    try {
      const t = (JSON.parse(script.textContent ?? '{}') as { '@type'?: string | string[] })[
        '@type'
      ];
      type = ([] as string[]).concat(t ?? type).join('-');
    } catch {
      /* ongeldige JSON: de generator meldt het */
    }
    const sleutel = nieuweSleutel(`${pagina.id}.jsonld.${type.toLowerCase()}`);
    voegToe(script, ` data-i18n-json="${sleutel}"`);
  });

  if (invoegingen.length === 0) {
    console.log(`${pagina.bron}: niets nieuws`);
    continue;
  }
  totaal += invoegingen.length;
  invoegingen.sort((a, b) => b.plek - a.plek);
  let uit = bron;
  for (const { plek, tekst } of invoegingen) uit = uit.slice(0, plek) + tekst + uit.slice(plek);
  console.log(`${pagina.bron}: ${invoegingen.length} toegevoegd`);
  if (droog) {
    for (const { tekst } of [...invoegingen].reverse()) console.log(`  ${tekst.trim()}`);
  } else {
    writeFileSync(pad, uit);
  }
}
console.log(droog ? `Droog: ${totaal} wijzigingen.` : `${totaal} wijzigingen. Draai nu Prettier.`);
