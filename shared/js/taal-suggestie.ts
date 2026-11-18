/**
 * taal-suggestie.ts: taalknop onthouden en een wegklikbare suggestie tonen.
 *
 * - Klik op een link met data-taal (de taalknop): die taal wordt onthouden.
 * - Spreekt de browser een andere taal die we hebben, en koos de bezoeker nog
 *   niets, dan verschijnt bovenaan een klein balkje met een link naar die
 *   versie. Wegklikken onthoudt de huidige taal.
 * - Er wordt nooit automatisch doorgestuurd (zie docs/adr/001-meertaligheid.md).
 * - z-index onder de navigatie (200): een open gsm-menu ligt erover.
 */
import { huidigeTaal, isTaal, teksten, type Taal } from './i18n.ts';

export const TAAL_OPSLAG = 'bureaux-taal';

function leesKeuze(): Taal | null {
  try {
    const waarde = localStorage.getItem(TAAL_OPSLAG);
    return waarde && isTaal(waarde) ? waarde : null;
  } catch {
    return null;
  }
}

function bewaarKeuze(taal: Taal): void {
  try {
    localStorage.setItem(TAAL_OPSLAG, taal);
  } catch {
    /* privémodus of opslag geblokkeerd: dan vragen we het gewoon opnieuw */
  }
}

/** Eerste browsertaal die we aanbieden, of null. */
export function voorkeurTaal(talen: readonly string[] = navigator.languages ?? []): Taal | null {
  for (const t of talen) {
    const kort = t.slice(0, 2).toLowerCase();
    if (isTaal(kort)) return kort;
  }
  return null;
}

/** Bepaalt of en naar welke versie we een suggestie tonen. */
export function suggestieDoel(
  doc: Document,
  talen: readonly string[],
  keuze: Taal | null,
): { taal: Taal; href: string } | null {
  if (keuze) return null;
  const voorkeur = voorkeurTaal(talen);
  if (!voorkeur || voorkeur === huidigeTaal(doc)) return null;
  const link = doc.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${voorkeur}"]`);
  if (!link) return null;
  const url = new URL(link.href);
  return { taal: voorkeur, href: url.pathname + url.search };
}

const STIJL = `
.taal-suggestie{position:fixed;top:72px;right:1rem;z-index:190;max-width:340px;display:flex;gap:.75rem;
  align-items:center;background:#14120e;color:#e8dfcc;border:1px solid #5a4a24;box-shadow:0 8px 24px rgba(0,0,0,.5);
  padding:.7rem .9rem;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:.85rem;line-height:1.4}
.taal-suggestie a{color:#c9a84c;font-weight:600}
.taal-suggestie button{background:none;border:0;color:#e8dfcc;font-size:1.1rem;cursor:pointer;padding:0 .2rem;line-height:1}
.taal-suggestie button:hover,.taal-suggestie button:focus-visible{color:#c9a84c}
`;

function toonSuggestie(doel: { taal: Taal; href: string }, huidig: Taal): void {
  const t = teksten(doel.taal);
  const stijl = document.createElement('style');
  stijl.textContent = STIJL;
  document.head.appendChild(stijl);

  const balk = document.createElement('div');
  balk.className = 'taal-suggestie';
  balk.setAttribute('role', 'region');
  balk.setAttribute('aria-label', t.taalSuggestie);
  balk.lang = doel.taal;

  const tekst = document.createElement('span');
  tekst.append(`${t.taalSuggestie} `);
  const link = document.createElement('a');
  link.href = doel.href;
  link.hreflang = doel.taal;
  link.textContent = t.taalSuggestieLink;
  link.addEventListener('click', () => bewaarKeuze(doel.taal));
  tekst.append(link);

  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.setAttribute('aria-label', t.taalSuggestieSluiten);
  sluit.textContent = '×';
  sluit.addEventListener('click', () => {
    bewaarKeuze(huidig);
    balk.remove();
  });

  balk.append(tekst, sluit);
  document.body.appendChild(balk);
}

export function initTaal(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-taal]').forEach(a => {
    a.addEventListener('click', () => {
      const taal = a.dataset['taal'] ?? '';
      if (isTaal(taal)) bewaarKeuze(taal);
    });
  });
  const doel = suggestieDoel(document, navigator.languages ?? [], leesKeuze());
  if (doel) toonSuggestie(doel, huidigeTaal());
}
