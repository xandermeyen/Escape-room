/**
 * vite-i18n.ts: voegt aan elke publieke pagina (in elke taal) toe wat over alle talen gaat.
 *
 * - <link rel="alternate" hreflang="..."> voor elke taal, plus x-default
 * - <meta property="og:locale:alternate"> voor de andere talen
 * - de taalknop: een element met data-taalkeuze krijgt links naar de andere versies
 *
 * Pagina's die niet in PAGINAS staan (bv. de games) blijven ongemoeid.
 * Zie docs/adr/001-meertaligheid.md.
 */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import {
  PAGINAS,
  OG_LOCALE,
  SITE_URL,
  STANDAARD_BUITENLAND,
  TAALNAAM,
  TALEN,
  padInTaal,
  vindPagina,
  type Pagina,
  type Taal,
} from '../i18n/config.ts';

export function hreflangTags(pagina: Pagina, huidig: Taal): HtmlTagDescriptor[] {
  const tags: HtmlTagDescriptor[] = TALEN.map(taal => ({
    tag: 'link',
    attrs: { rel: 'alternate', hreflang: taal, href: SITE_URL + padInTaal(pagina.pad, taal) },
    injectTo: 'head',
  }));
  tags.push({
    tag: 'link',
    attrs: {
      rel: 'alternate',
      hreflang: 'x-default',
      href: SITE_URL + padInTaal(pagina.pad, STANDAARD_BUITENLAND),
    },
    injectTo: 'head',
  });
  for (const taal of TALEN) {
    if (taal === huidig) continue;
    tags.push({
      tag: 'meta',
      attrs: { property: 'og:locale:alternate', content: OG_LOCALE[taal] },
      injectTo: 'head',
    });
  }
  return tags;
}

/** Links voor de taalknop: korte code zichtbaar, volledige naam voor schermlezers. */
export function taalkeuzeHtml(pagina: Pagina, huidig: Taal): string {
  return TALEN.map(taal => {
    const huidigAttr = taal === huidig ? ' aria-current="true"' : '';
    return (
      `<a href="${padInTaal(pagina.pad, taal)}" hreflang="${taal}" lang="${taal}" ` +
      `data-taal="${taal}" aria-label="${TAALNAAM[taal]}"${huidigAttr}>${taal.toUpperCase()}</a>`
    );
  }).join('');
}

const TAALKEUZE = /(<[a-z]+\b[^>]*\bdata-taalkeuze(?:="")?[^>]*>)\s*(<\/[a-z]+>)/gi;

export function i18nPlugin(): Plugin {
  return {
    name: 'bureau-x-i18n',
    // Tijdens pnpm dev: vertaalde pagina's opnieuw maken als een bron of vertaling verandert.
    configureServer(server) {
      const root = server.config.root;
      const bronnen = new Set(PAGINAS.map(p => resolve(root, p.bron)));
      const vertalingen = resolve(root, 'i18n/paginas');
      let bezig = false;
      server.watcher.on('change', bestand => {
        const pad = resolve(bestand);
        if (bezig || (!bronnen.has(pad) && !pad.startsWith(vertalingen))) return;
        bezig = true;
        const proces = spawn(
          process.execPath,
          ['--experimental-strip-types', resolve(root, 'scripts/i18n.ts')],
          { cwd: root, stdio: 'inherit' },
        );
        proces.on('exit', () => {
          bezig = false;
        });
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const gevonden = vindPagina(ctx.path);
        if (!gevonden) return html;
        const { pagina, taal } = gevonden;
        // De sleutels zijn enkel voor de generator; de bezoeker heeft ze niet nodig.
        const zonderSleutels = html.replace(/\s+data-i18n(?:-[a-z-]+)?="[^"]*"/g, '');
        const metKnop = zonderSleutels.replace(
          TAALKEUZE,
          (_, open: string, sluit: string) => `${open}${taalkeuzeHtml(pagina, taal)}${sluit}`,
        );
        return { html: metKnop, tags: hreflangTags(pagina, taal) };
      },
    },
  };
}
