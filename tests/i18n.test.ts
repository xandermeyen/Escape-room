import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../i18n/paginas/en.ts';
import { PAGINAS, padInTaal, padVoorTaal, vindPagina, type Pagina } from '../i18n/config.ts';
import { en as enTeksten } from '../i18n/teksten/en.ts';
import { nl as nlTeksten } from '../i18n/teksten/nl.ts';
import { maakSitemap, vertaalPagina } from '../scripts/i18n-paginas.ts';
import { leesFaq } from '../scripts/vite-faq-schema.ts';
import { hreflangTags, taalkeuzeHtml } from '../scripts/vite-i18n.ts';
import { huidigeTaal, lokaalPad } from '../shared/js/i18n.ts';
import { suggestieDoel, voorkeurTaal } from '../shared/js/taal-suggestie.ts';

const ROOT = resolve(import.meta.dirname, '..');
const pagina = (id: string): Pagina => PAGINAS.find(p => p.id === id)!;

function bron(body: string, head = '<title data-i18n="t.titel">Titel</title>'): string {
  return `<!doctype html><html lang="nl"><head>${head}<link rel="canonical" href="https://bureau-x.be/dua/"><meta property="og:url" content="https://bureau-x.be/dua/"><meta property="og:locale" content="nl_BE"></head><body>${body}</body></html>`;
}

describe('i18n-config', () => {
  it('vindt pagina en taal uit een pad', () => {
    expect(vindPagina('/')?.pagina.id).toBe('home');
    expect(vindPagina('/en/')?.taal).toBe('en');
    expect(vindPagina('/en/dua/index.html')).toMatchObject({ taal: 'en', pagina: { id: 'dua' } });
    expect(vindPagina('/dua/index.html')).toMatchObject({ taal: 'nl', pagina: { id: 'dua' } });
    expect(vindPagina('/experiences/dua/')).toBeNull();
  });

  it('bouwt paden per taal', () => {
    expect(padInTaal('/dua/', 'en')).toBe('/en/dua/');
    expect(padInTaal('/dua/', 'nl')).toBe('/dua/');
    expect(padVoorTaal('/en/privacy.html', 'nl')).toBe('/privacy.html');
    expect(padVoorTaal('/experiences/dua/', 'en')).toBeNull();
  });
});

describe('vertaalPagina', () => {
  const dua = pagina('dua');

  it('vervangt tekst, attributen en JSON-LD en zet de metadata', () => {
    const html = bron(
      '<p data-i18n="t.p">Hallo <em>daar</em></p><img src="/x.png" alt="Kat" data-i18n-alt="t.alt">',
      '<title data-i18n="t.titel">Titel</title><script type="application/ld+json" data-i18n-json="t.json">{"name":"x"}</script>',
    );
    const r = vertaalPagina(html, dua, 'en', {
      't.titel': 'Title',
      't.p': 'Hello <em>there</em>',
      't.alt': 'Cat',
      't.json': { name: 'y' },
    });
    expect(r.fouten).toEqual([]);
    expect(r.html).toContain('<html lang="en">');
    expect(r.html).toContain('<title>Title</title>');
    expect(r.html).toContain('<p>Hello <em>there</em></p>');
    expect(r.html).toContain('alt="Cat"');
    expect(r.html).toContain('"name": "y"');
    expect(r.html).toContain('<link rel="canonical" href="https://bureau-x.be/en/dua/">');
    expect(r.html).toContain('content="en_GB"');
    expect(r.html).not.toContain('data-i18n');
    expect(Object.keys(r.bron).sort()).toEqual(['t.alt', 't.json', 't.p', 't.titel']);
  });

  it('meldt tekst zonder sleutel en ontbrekende vertalingen', () => {
    const r = vertaalPagina(bron('<p>Vergeten</p><p data-i18n="t.p">Hallo</p>'), dua, 'en', {
      't.titel': 'Title',
    });
    expect(r.fouten.some(f => f.includes('tekst zonder sleutel') && f.includes('Vergeten'))).toBe(
      true,
    );
    expect(r.fouten.some(f => f.includes('"t.p"'))).toBe(true);
  });

  it('meldt een sleutel die twee keer voorkomt (gekopieerd element)', () => {
    const r = vertaalPagina(
      bron('<p data-i18n="t.p">Een</p><p data-i18n="t.p">Twee</p>'),
      dua,
      'en',
      {
        't.titel': 'Title',
        't.p': 'One',
      },
    );
    expect(r.fouten.some(f => f.includes('"t.p" komt twee keer voor'))).toBe(true);
  });

  it('laat merknamen met translate="no" en afkortingen ongemoeid', () => {
    const r = vertaalPagina(
      bron('<span translate="no">Bureau X</span><span>II</span>'),
      dua,
      'en',
      {
        't.titel': 'Title',
      },
    );
    expect(r.fouten).toEqual([]);
  });

  it('zet interne links naar de vertaalde versie, maar respecteert hreflang', () => {
    const r = vertaalPagina(
      bron(
        '<a href="/kamer-14/#boek">a</a><a href="/privacy.html" hreflang="nl">b</a>' +
          '<a href="/experiences/dua/">c</a><a href="#faq">d</a><img src="assets/img/x.png" alt="" translate="no">',
      ),
      dua,
      'en',
      { 't.titel': 'Title' },
    );
    expect(r.html).toContain('href="/en/kamer-14/#boek"');
    expect(r.html).toContain('href="/privacy.html" hreflang="nl"');
    expect(r.html).toContain('href="/experiences/dua/"');
    expect(r.html).toContain('href="#faq"');
    expect(r.html).toContain('src="/dua/assets/img/x.png"');
  });

  it('elke echte pagina is volledig vertaald naar het Engels', () => {
    const gebruikt = new Set<string>();
    for (const p of PAGINAS) {
      const r = vertaalPagina(readFileSync(resolve(ROOT, p.bron), 'utf8'), p, 'en', en);
      expect(r.fouten, p.bron).toEqual([]);
      Object.keys(r.bron).forEach(k => gebruikt.add(k));
    }
    expect(Object.keys(en).filter(k => !gebruikt.has(k))).toEqual([]);
  });

  it('de FAQ van de Engelse pagina levert Engelse vragen voor het schema', () => {
    const r = vertaalPagina(
      readFileSync(resolve(ROOT, 'index.html'), 'utf8'),
      pagina('home'),
      'en',
      en,
    );
    expect(leesFaq(r.html)[0]?.vraag).toBe('Is Bureau X really free?');
    // en de Nederlandse bron, met sleutels op de knoppen, blijft ook werken
    expect(leesFaq(readFileSync(resolve(ROOT, 'index.html'), 'utf8'))[0]?.vraag).toBe(
      'Is Bureau X echt gratis?',
    );
  });
});

describe('sitemap en hreflang', () => {
  it('heeft elke pagina in elke taal met alternatieven, zonder privacy', () => {
    const xml = maakSitemap();
    expect(xml).toContain('<loc>https://bureau-x.be/en/dua/</loc>');
    expect(xml).toContain('hreflang="x-default" href="https://bureau-x.be/en/dua/"');
    expect(xml).not.toContain('privacy');
  });

  it('hreflang-tags bevatten alle talen, de pagina zelf en x-default', () => {
    const tags = hreflangTags(pagina('dua'), 'nl');
    const hrefs = tags
      .filter(t => t.tag === 'link')
      .map(t => `${t.attrs?.['hreflang']} ${t.attrs?.['href']}`);
    expect(hrefs).toEqual([
      'nl https://bureau-x.be/dua/',
      'en https://bureau-x.be/en/dua/',
      'x-default https://bureau-x.be/en/dua/',
    ]);
    expect(
      tags.some(
        t => t.attrs?.['property'] === 'og:locale:alternate' && t.attrs['content'] === 'en_GB',
      ),
    ).toBe(true);
  });

  it('taalknop markeert de huidige taal', () => {
    const html = taalkeuzeHtml(pagina('home'), 'en');
    expect(html).toContain(
      'href="/en/" hreflang="en" lang="en" data-taal="en" aria-label="English" aria-current="true"',
    );
    expect(html).toContain('href="/" hreflang="nl"');
  });
});

describe('runtime', () => {
  it('leest de taal uit <html lang>', () => {
    document.documentElement.lang = 'en';
    expect(huidigeTaal()).toBe('en');
    expect(lokaalPad('/privacy.html#cookies')).toBe('/en/privacy.html#cookies');
    document.documentElement.lang = 'xx';
    expect(huidigeTaal()).toBe('nl');
    document.documentElement.lang = 'nl';
    expect(lokaalPad('/privacy.html#cookies')).toBe('/privacy.html#cookies');
  });

  it('Engelse teksten hebben dezelfde sleutels als de Nederlandse', () => {
    expect(Object.keys(enTeksten).sort()).toEqual(Object.keys(nlTeksten).sort());
    expect(enTeksten.reviewsGemiddelde(4)).toBe('average of 4 reviews');
  });

  it('taalsuggestie enkel bij een andere voorkeurstaal en zonder eerdere keuze', () => {
    document.documentElement.lang = 'nl';
    document.head.innerHTML =
      '<link rel="alternate" hreflang="nl" href="https://bureau-x.be/dua/"><link rel="alternate" hreflang="en" href="https://bureau-x.be/en/dua/">';
    expect(voorkeurTaal(['fr-BE', 'en-US'])).toBe('en');
    expect(suggestieDoel(document, ['en-GB'], null)).toEqual({ taal: 'en', href: '/en/dua/' });
    expect(suggestieDoel(document, ['en-GB'], 'nl')).toBeNull();
    expect(suggestieDoel(document, ['nl-BE'], null)).toBeNull();
    expect(suggestieDoel(document, ['de-DE'], null)).toBeNull();
  });
});

describe('404-pagina', () => {
  it('kiest de taal uit het gezochte pad', async () => {
    const { taalUitPad } = await import('../js/niet-gevonden.ts');
    expect(taalUitPad('/en/bestaat-niet')).toBe('en');
    expect(taalUitPad('/en')).toBe('en');
    expect(taalUitPad('/entree/')).toBe('nl');
    expect(taalUitPad('/dua/oud')).toBe('nl');
  });

  it('zet tekst en links in het Engels, met een verwijzing naar het Nederlands', async () => {
    const html = readFileSync(resolve(ROOT, '404.html'), 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const { toonNietGevonden } = await import('../js/niet-gevonden.ts');
    toonNietGevonden(doc, 'en');
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelector('h1')?.textContent).toBe('This case file does not exist.');
    expect(doc.querySelector('[data-nf-link="dua"]')?.getAttribute('href')).toBe('/en/dua/');
    const regel = doc.querySelector<HTMLElement>('[data-nf="andereTaal"]');
    expect(regel?.lang).toBe('nl');
    expect(regel?.querySelector('a')?.getAttribute('href')).toBe('/');
  });
});
