/**
 * review-kaart.ts: HTML voor de reviews op de homepage (kaarten, marquee en
 * samenvatting). Reviews zijn tekst van spelers, dus alles wat van hen komt
 * gaat door escapeHtml voor het via innerHTML op de pagina komt.
 * Zuivere functies, los getest in tests/review-kaart.test.ts.
 */
import type { Review } from '../shared/js/reviews.ts';

export const ERVARING_LABELS: Record<string, string> = {
  'kamer-14': 'Kamer 14',
  dua: 'D.U.A.',
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sterAantal(rating: number): number {
  return Math.max(1, Math.min(5, Math.round(rating)));
}

// Volle en lege sterren in aparte spans, zodat het verschil ook bij een
// kleine lettergrootte zichtbaar blijft. Schermlezers krijgen een label
// in plaats van "zwarte ster, zwarte ster, witte ster...".
export function sterrenHtml(rating: number): string {
  const n = sterAantal(rating);
  const vol = '<span class="ster">★</span>'.repeat(n);
  const leeg = '<span class="ster leeg">☆</span>'.repeat(5 - n);
  return vol + leeg;
}

// Maand + jaar volstaat: geloofwaardig zonder de nadruk op timing te leggen.
export function datumHtml(tijdstip: number | undefined): string {
  if (!tijdstip) return '';
  const d = new Date(tijdstip);
  if (Number.isNaN(d.getTime())) return '';
  const label = d.toLocaleDateString('nl-BE', { month: 'short', year: 'numeric' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return ` &middot; <time datetime="${iso}">${escapeHtml(label)}</time>`;
}

export function reviewKaart(r: Review): string {
  const naam = r.naam ? escapeHtml(r.naam) : 'Anonieme speler';
  const exp = escapeHtml(ERVARING_LABELS[r.ervaring] ?? r.ervaring);
  const n = sterAantal(r.rating);
  return (
    `<article class="review-card reveal visible">` +
    `<div class="review-quote" aria-hidden="true">&ldquo;</div>` +
    `<div class="review-rating" role="img" aria-label="${n} van 5 sterren">` +
    `${sterrenHtml(r.rating)}<span class="review-score">${n}/5</span></div>` +
    `<blockquote class="review-text"><p>${escapeHtml(r.tekst)}</p></blockquote>` +
    `<footer class="review-meta">` +
    `<span class="review-author">${naam}</span>` +
    `<span class="review-exp">${exp}${datumHtml(r.tijdstip)}</span>` +
    `</footer></article>`
  );
}

// Samenvatting pas vanaf een paar reviews: bij één of twee zegt een
// gemiddelde weinig en trekt het onnodig de aandacht.
export const MIN_VOOR_SAMENVATTING = 3;

export function samenvattingHtml(reviews: Review[]): string {
  const gem = reviews.reduce((som, r) => som + r.rating, 0) / reviews.length;
  const gemTekst = gem.toLocaleString('nl-BE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    `<span class="reviews-gem">${gemTekst}</span>` +
    `<span class="reviews-gem-van">/ 5</span>` +
    `<span class="reviews-aantal">gemiddelde van ${reviews.length} reviews</span>`
  );
}

export function marqueeItem(r: Review): string {
  const naam = r.naam ? escapeHtml(r.naam) : 'Anonieme speler';
  const kort = r.tekst.length > 90 ? r.tekst.slice(0, 88).trim() + '…' : r.tekst;
  const n = sterAantal(r.rating);
  return (
    `<div class="marquee-item"><span class="stars" role="img" aria-label="${n} van 5 sterren">` +
    `${sterrenHtml(r.rating)}</span>` +
    `"${escapeHtml(kort)}" &middot; ${naam}</div>`
  );
}
