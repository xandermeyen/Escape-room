/**
 * i18n-paginas.ts: genereert de publieke pagina's in elke doeltaal (zie docs/adr/001-meertaligheid.md).
 *
 *   pnpm i18n              pagina's genereren (draait ook bij dev, build en lint:html)
 *   pnpm i18n:controle     zelfde, maar faalt ook bij verouderde vertalingen (CI)
 *   pnpm i18n:bevestig <sleutel...>   na het bijwerken van die vertalingen: de huidige
 *                                     Nederlandse tekst als bron vastleggen (zonder sleutels: alles)
 *
 * Werkwijze: de Nederlandse HTML is de bron. Elk stuk tekst heeft een sleutel
 * (data-i18n, data-i18n-<attribuut>, data-i18n-json). Voor elke taal in
 * DOELTALEN wordt de pagina ingelezen, worden de sleutels vervangen door
 * i18n/paginas/<taal>.ts, en wordt het resultaat weggeschreven naar
 * <taal>/<bron>. Die mappen staan in .gitignore.
 *
 * De build faalt bij tekst zonder sleutel, een ontbrekende of overbodige
 * vertaling. Verandert de Nederlandse tekst van een sleutel, dan staat de
 * vertaling als verouderd gemeld (vergeleken met i18n/paginas/<taal>.bron.json).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  BRONTAAL,
  DOELTALEN,
  OG_LOCALE,
  PAGINAS,
  SITE_URL,
  STANDAARD_BUITENLAND,
  TALEN,
  bestandInTaal,
  padInTaal,
  vindPagina,
  type Doeltaal,
  type Pagina,
} from '../i18n/config.ts';
import { attribuutElementen, bronHash, isVast, normaliseer, tekstElementen } from './i18n-dom.ts';

export type Vertaling = string | Record<string, unknown>;
export type PaginaWoordenboek = Record<string, Vertaling>;

export interface Resultaat {
  html: string;
  fouten: string[];
  /** Per gebruikte sleutel: vingerafdruk van de Nederlandse brontekst. */
  bron: Record<string, string>;
}

const ROOT = resolve(import.meta.dirname, '..');

function kort(tekst: string): string {
  const t = normaliseer(tekst);
  return t.length > 60 ? `${t.slice(0, 57)}...` : t;
}

/** Interne links en relatieve paden juist zetten voor een pagina in een andere taal. */
function herschrijfLinks(doc: Document, pagina: Pagina, taal: Doeltaal): void {
  const basis = new URL(pagina.pad, SITE_URL);
  for (const el of Array.from(doc.querySelectorAll('[href], [src]'))) {
    for (const attr of ['href', 'src']) {
      const waarde = el.getAttribute(attr);
      if (!waarde || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(waarde)) continue;
      if (el.tagName === 'LINK' && /canonical|alternate/.test(el.getAttribute('rel') ?? ''))
        continue;
      const url = new URL(waarde, basis);
      let pad = url.pathname;
      // Een link met hreflang wijst bewust naar een bepaalde taal (bv. "Nederlandse versie").
      if (attr === 'href' && el.tagName === 'A' && !el.hasAttribute('hreflang')) {
        const doel = vindPagina(pad);
        if (doel?.taal === BRONTAAL) pad = padInTaal(doel.pagina.pad, taal);
      }
      el.setAttribute(attr, pad + url.search + url.hash);
    }
  }
}

function zetMeta(doc: Document, pagina: Pagina, taal: Doeltaal): void {
  const url = SITE_URL + padInTaal(pagina.pad, taal);
  doc.documentElement.lang = taal;
  doc.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
  doc.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
  doc.querySelector('meta[property="og:locale"]')?.setAttribute('content', OG_LOCALE[taal]);
}

/** Vertaalt één Nederlandse pagina naar één doeltaal. */
export function vertaalPagina(
  bronHtml: string,
  pagina: Pagina,
  taal: Doeltaal,
  woordenboek: PaginaWoordenboek,
): Resultaat {
  const doc = new JSDOM(bronHtml).window.document;
  const fouten: string[] = [];
  const bron: Record<string, string> = {};

  // 1. Tekst zonder sleutel?
  const gesleuteld = new Set<Element>();
  for (const el of tekstElementen(doc.documentElement)) {
    if (el.hasAttribute('data-i18n')) gesleuteld.add(el);
    else if (!isVast(el)) {
      fouten.push(
        `${pagina.bron}: tekst zonder sleutel in <${el.tagName.toLowerCase()}>: "${kort(el.textContent ?? '')}". Draai pnpm i18n:sleutels.`,
      );
    }
  }
  for (const { el, attribuut } of attribuutElementen(doc.documentElement)) {
    let ouder = el.parentElement;
    let binnen = false;
    for (; ouder; ouder = ouder.parentElement) if (gesleuteld.has(ouder)) binnen = true;
    if (!binnen && !el.hasAttribute(`data-i18n-${attribuut}`)) {
      fouten.push(
        `${pagina.bron}: ${attribuut}="${kort(el.getAttribute(attribuut) ?? '')}" zonder sleutel. Draai pnpm i18n:sleutels.`,
      );
    }
  }

  const haal = (sleutel: string): Vertaling | undefined => {
    const waarde = woordenboek[sleutel];
    if (waarde === undefined) fouten.push(`${taal}: vertaling ontbreekt voor "${sleutel}"`);
    return waarde;
  };

  // 2. Vervangen. Van binnen naar buiten is niet nodig: een sleutel dekt alles eronder.
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of el.getAttributeNames()) {
      if (!attr.startsWith('data-i18n')) continue;
      const sleutel = el.getAttribute(attr) ?? '';
      el.removeAttribute(attr);
      if (sleutel in bron) {
        fouten.push(
          `${pagina.bron}: sleutel "${sleutel}" komt twee keer voor. Verwijder het attribuut van de kopie en draai pnpm i18n:sleutels.`,
        );
      }
      if (attr === 'data-i18n') {
        bron[sleutel] = bronHash(el.innerHTML);
        const waarde = haal(sleutel);
        // Build-time, en de vertaling komt uit onze eigen repo (geen gebruikersinvoer).
        // eslint-disable-next-line no-unsanitized/property
        if (typeof waarde === 'string') el.innerHTML = waarde;
        else if (waarde !== undefined) fouten.push(`${taal}: "${sleutel}" moet tekst zijn`);
      } else if (attr === 'data-i18n-json') {
        bron[sleutel] = bronHash(el.textContent ?? '');
        const waarde = haal(sleutel);
        if (waarde !== undefined && typeof waarde === 'object') {
          el.textContent = `\n${JSON.stringify(waarde, null, 2).replace(/</g, '\\u003c')}\n`;
        } else if (waarde !== undefined)
          fouten.push(`${taal}: "${sleutel}" moet een JSON-object zijn`);
      } else {
        const doelAttr = attr.slice('data-i18n-'.length);
        bron[sleutel] = bronHash(el.getAttribute(doelAttr) ?? '');
        const waarde = haal(sleutel);
        if (typeof waarde === 'string') el.setAttribute(doelAttr, waarde);
        else if (waarde !== undefined) fouten.push(`${taal}: "${sleutel}" moet tekst zijn`);
      }
    }
  }

  zetMeta(doc, pagina, taal);
  herschrijfLinks(doc, pagina, taal);

  return { html: `<!doctype html>\n${doc.documentElement.outerHTML}\n`, fouten, bron };
}

/** Sitemap met alle talen en hreflang-alternatieven. */
export function maakSitemap(): string {
  const regels = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Gegenereerd door scripts/i18n-paginas.ts. Niet met de hand aanpassen. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const pagina of PAGINAS.filter(p => p.sitemap)) {
    const alternatieven = [
      ...TALEN.map(
        t =>
          `    <xhtml:link rel="alternate" hreflang="${t}" href="${SITE_URL}${padInTaal(pagina.pad, t)}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${padInTaal(pagina.pad, STANDAARD_BUITENLAND)}"/>`,
    ];
    for (const taal of TALEN) {
      regels.push(
        '  <url>',
        `    <loc>${SITE_URL}${padInTaal(pagina.pad, taal)}</loc>`,
        ...alternatieven,
        '  </url>',
      );
    }
  }
  regels.push('</urlset>', '');
  return regels.join('\n');
}

async function laadWoordenboek(taal: Doeltaal): Promise<PaginaWoordenboek> {
  const pad = resolve(ROOT, 'i18n/paginas', `${taal}.ts`);
  // Vast pad binnen de repo, opgebouwd uit DOELTALEN.
  // eslint-disable-next-line no-unsanitized/method
  const module = (await import(pathToFileURL(pad).href)) as { default: PaginaWoordenboek };
  return module.default;
}

function bronPad(taal: Doeltaal): string {
  return resolve(ROOT, 'i18n/paginas', `${taal}.bron.json`);
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const controle = argv.includes('--controle');
  const bevestig = argv.includes('--bevestig');
  const teBevestigen = argv.filter(a => !a.startsWith('--'));
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];

  for (const taal of DOELTALEN) {
    const woordenboek = await laadWoordenboek(taal);
    const gebruikt: Record<string, string> = {};
    // Opnieuw beginnen, zodat er geen pagina's blijven staan die niet meer bestaan.
    rmSync(resolve(ROOT, taal), { recursive: true, force: true });
    for (const pagina of PAGINAS) {
      const bronHtml = readFileSync(resolve(ROOT, pagina.bron), 'utf8');
      const r = vertaalPagina(bronHtml, pagina, taal, woordenboek);
      fouten.push(...r.fouten);
      Object.assign(gebruikt, r.bron);
      const doel = resolve(ROOT, bestandInTaal(pagina.bron, taal));
      mkdirSync(dirname(doel), { recursive: true });
      writeFileSync(doel, r.html);
    }
    for (const sleutel of Object.keys(woordenboek)) {
      if (!(sleutel in gebruikt))
        fouten.push(`${taal}: vertaling "${sleutel}" wordt nergens gebruikt`);
    }

    const vastgelegd: Record<string, string> = existsSync(bronPad(taal))
      ? (JSON.parse(readFileSync(bronPad(taal), 'utf8')) as Record<string, string>)
      : {};

    if (bevestig) {
      // Zonder sleutels: alles bevestigen. Met sleutels: enkel die.
      const onbekend = teBevestigen.filter(k => !(k in gebruikt));
      if (onbekend.length) {
        fouten.push(`${taal}: onbekende sleutels om te bevestigen: ${onbekend.join(', ')}`);
      }
      const sleutels = teBevestigen.length
        ? teBevestigen.filter(k => k in gebruikt)
        : Object.keys(gebruikt);
      const nieuw: Record<string, string> = {};
      for (const [k, hash] of Object.entries(vastgelegd)) if (k in gebruikt) nieuw[k] = hash;
      const gewijzigd = sleutels.filter(k => nieuw[k] !== gebruikt[k]);
      for (const k of sleutels) nieuw[k] = gebruikt[k] ?? '';
      const gesorteerd = Object.fromEntries(
        Object.entries(nieuw).sort(([a], [b]) => a.localeCompare(b)),
      );
      writeFileSync(bronPad(taal), `${JSON.stringify(gesorteerd, null, 2)}\n`);
      for (const k of gewijzigd) console.log(`bevestigd: ${taal} "${k}"`);
      console.log(`${taal}: ${gewijzigd.length} vertalingen bevestigd.`);
      continue;
    }
    for (const [sleutel, hash] of Object.entries(gebruikt)) {
      if (vastgelegd[sleutel] === undefined)
        waarschuwingen.push(`${taal}: "${sleutel}" is nieuw, nog niet bevestigd`);
      else if (vastgelegd[sleutel] !== hash)
        waarschuwingen.push(`${taal}: "${sleutel}" is verouderd, de Nederlandse tekst veranderde`);
    }
  }

  writeFileSync(resolve(ROOT, 'public/sitemap.xml'), maakSitemap());

  for (const w of waarschuwingen) console.warn(`let op: ${w}`);
  if (waarschuwingen.length) {
    console.warn('Werk de vertalingen bij en draai daarna pnpm i18n:bevestig <sleutel...>.');
  }
  if (fouten.length) {
    for (const f of fouten) console.error(`fout: ${f}`);
    process.exit(1);
  }
  if (controle && waarschuwingen.length) process.exit(1);
  console.log(
    `i18n: ${DOELTALEN.length * PAGINAS.length} pagina's gegenereerd (${DOELTALEN.join(', ')}).`,
  );
}
