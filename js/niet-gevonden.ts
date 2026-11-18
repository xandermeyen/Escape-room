/**
 * niet-gevonden.ts: de 404-pagina in de taal van het gezochte adres.
 *
 * GitHub Pages toont voor elk onbestaand adres dezelfde 404.html. Begint het
 * pad met /en/, dan zetten we de pagina hier in het Engels, met links naar de
 * Engelse pagina's. De onderste regel verwijst naar de andere taal.
 */
import { BRONTAAL, TALEN, padInTaal, type Taal } from '../i18n/config.ts';
import { teksten } from '../shared/js/i18n.ts';

/** Taal uit het gezochte pad: "/en/iets" is Engels, de rest Nederlands. */
export function taalUitPad(pad: string): Taal {
  const eerste = pad.split('/')[1] ?? '';
  return TALEN.find(t => t !== BRONTAAL && t === eerste) ?? BRONTAAL;
}

const LINKS: Record<string, string> = { home: '/', kamer14: '/kamer-14/', dua: '/dua/' };

/** Zet de teksten en links van de 404-pagina in de gevraagde taal. */
export function toonNietGevonden(doc: Document, taal: Taal): void {
  const t = teksten(taal);
  doc.documentElement.lang = taal;
  doc.title = t.nfTitelPagina;
  const zet = (sleutel: string, tekst: string) => {
    const el = doc.querySelector(`[data-nf="${sleutel}"]`);
    if (el) el.textContent = tekst;
  };
  zet('stempel', t.nfStempel);
  zet('label', t.nfLabel);
  zet('titel', t.nfTitel);
  zet('tekst', t.nfTekst);
  zet('home', t.nfHome);
  doc.querySelectorAll<HTMLAnchorElement>('[data-nf-link]').forEach(a => {
    const pad = LINKS[a.dataset['nfLink'] ?? ''];
    if (pad) a.href = padInTaal(pad, taal);
  });

  // Onderaan: een verwijzing naar de andere taal, in die taal.
  const andere = taal === BRONTAAL ? 'en' : BRONTAAL;
  const regel = doc.querySelector<HTMLElement>('[data-nf="andereTaal"]');
  if (regel) {
    const ta = teksten(andere);
    const link = doc.createElement('a');
    link.href = padInTaal('/', andere);
    link.textContent = ta.nfAndereTaalLink;
    regel.lang = andere;
    regel.replaceChildren(`${ta.nfAndereTaal} `, link, '.');
  }
}

toonNietGevonden(document, taalUitPad(location.pathname));
