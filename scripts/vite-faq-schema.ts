/**
 * vite-faq-schema.ts: maakt het FAQPage-schema (JSON-LD) uit de zichtbare FAQ.
 *
 * Elke pagina met een `.faq-item`-lijst krijgt bij dev en build automatisch een
 * <script type="application/ld+json"> met exact dezelfde vragen en antwoorden.
 * Zo kunnen schema en zichtbare tekst nooit meer uit elkaar lopen (Google eist
 * dat ze overeenkomen). Schrijf dus geen FAQPage-blok meer met de hand: de
 * plugin weigert de build als het er toch een vindt.
 */
import type { Plugin } from 'vite';

export interface FaqItem {
  vraag: string;
  antwoord: string;
}

const ENTITEITEN: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  rarr: '→',
  hellip: '…',
};

/** Tags weg (inline zonder spatie, <br> wordt een spatie), entiteiten omzetten, witruimte samenvoegen. */
export function naarPlatteTekst(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, naam: string) => ENTITEITEN[naam.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Haalt alle vraag/antwoord-paren uit de `.faq-item`'s van een pagina. */
export function leesFaq(html: string): FaqItem[] {
  const items: FaqItem[] = [];
  const patroon =
    /<button class="faq-q">([\s\S]*?)<span class="faq-arrow">[\s\S]*?<div class="faq-a">([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(patroon)) {
    const vraag = naarPlatteTekst(m[1] ?? '');
    const antwoord = naarPlatteTekst(m[2] ?? '');
    if (vraag && antwoord) items.push({ vraag, antwoord });
  }
  return items;
}

export function faqSchema(items: FaqItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(i => ({
      '@type': 'Question',
      name: i.vraag,
      acceptedAnswer: { '@type': 'Answer', text: i.antwoord },
    })),
  };
  // `<` escapen zodat tekst nooit een </script> kan vormen.
  return JSON.stringify(schema, null, 2).replace(/</g, '\\u003c');
}

export function faqSchemaPlugin(): Plugin {
  return {
    name: 'bureau-x-faq-schema',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const items = leesFaq(html);
        if (items.length === 0) return html;
        if (/"@type":\s*"FAQPage"/.test(html)) {
          throw new Error(
            `${ctx.path}: bevat al een FAQPage-schema. Verwijder het; de plugin maakt het uit de zichtbare FAQ.`,
          );
        }
        return [
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: faqSchema(items),
            injectTo: 'head',
          },
        ];
      },
    },
  };
}
