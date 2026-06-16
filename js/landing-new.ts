import '../shared/js/sentry.ts';
import { leesGoedgekeurdeReviews, type Review } from '../shared/js/reviews.ts';

// ── ECHTE REVIEWS LADEN ────────────────────────────────────────
// Reviews komen uit Firebase en worden enkel getoond als ze
// goedgekeurd zijn. Zolang er geen zijn, blijven de sectie en de
// marquee verborgen (geen verzonnen reviews).
const ERVARING_LABELS: Record<string, string> = {
  'kamer-14': 'Kamer 14',
  'dua': 'D.U.A.',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sterrenHtml(rating: number): string {
  const n = Math.max(1, Math.min(5, Math.round(rating)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function reviewKaart(r: Review): string {
  const naam = r.naam ? escapeHtml(r.naam) : 'Anonieme speler';
  const exp = escapeHtml(ERVARING_LABELS[r.ervaring] ?? r.ervaring);
  return `<div class="review-card reveal visible">`
    + `<div class="review-quote">&ldquo;</div>`
    + `<div class="review-stars">${sterrenHtml(r.rating)}</div>`
    + `<p class="review-text">${escapeHtml(r.tekst)}</p>`
    + `<div class="review-author">${naam}</div>`
    + `<div class="review-exp">${exp}</div></div>`;
}

function marqueeItem(r: Review): string {
  const naam = r.naam ? escapeHtml(r.naam) : 'Anonieme speler';
  const kort = r.tekst.length > 90 ? r.tekst.slice(0, 88).trim() + '…' : r.tekst;
  return `<div class="marquee-item"><span class="stars">${sterrenHtml(r.rating)}</span>`
    + `"${escapeHtml(kort)}" &middot; ${naam}</div>`;
}

async function laadReviews(): Promise<void> {
  const sectie = document.getElementById('reviews');
  const grid = document.getElementById('reviews-grid');
  if (!sectie || !grid) return;

  const marqueeWrap = document.getElementById('marquee-wrap');
  const marqueeTrack = document.getElementById('marquee-track');

  let reviews: Review[];
  try {
    reviews = await leesGoedgekeurdeReviews(12);
  } catch (err) {
    console.error('Reviews laden mislukt:', err);
    return; // sectie en marquee blijven verborgen
  }

  if (reviews.length === 0) return;

  // Veilig: reviewKaart/marqueeItem halen alle spelerteksten door escapeHtml.
  // eslint-disable-next-line no-unsanitized/property
  grid.innerHTML = reviews.slice(0, 6).map(reviewKaart).join('');
  sectie.style.display = '';

  if (marqueeWrap && marqueeTrack) {
    // Twee keer dezelfde set voor een naadloze lus.
    const items = reviews.map(marqueeItem).join('');
    // eslint-disable-next-line no-unsanitized/property
    marqueeTrack.innerHTML = items + items;
    marqueeWrap.style.display = '';
  }
}

laadReviews();

// ── EASTER EGG ─────────────────────────────────────────────────
console.log(
  '%cBUREAU X — INTERN ARCHIEF',
  'font-family: monospace; font-size: 14px; letter-spacing: 2px; color: #c8a96e;',
  '\n\nJe zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.' +
  '\nHet archief reageert op haar naam. Typ die maar eens.'
);

let buf = '';
const SECRET = 'lena';

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
  if (e.key.length !== 1) return;

  buf = (buf + e.key.toLowerCase()).slice(-SECRET.length);

  if (buf === SECRET) {
    buf = '';
    if (document.querySelector('.easter-overlay')) return;

    const el = document.createElement('div');
    el.className = 'easter-overlay';
    el.innerHTML = `
      <div class="easter-kaart">
        <p class="easter-stempel">Vermist</p>
        <p class="easter-label">Archiefstuk B-X/14 · niet voor publicatie</p>
        <h2>Gezocht: Lena Bogaert</h2>
        <p>Laatst gezien op een dinsdagochtend in mei, Geel.</p>
        <p>Bed opgemaakt. Jas weg. Geen briefje.</p>
        <p>Wie iets weet, opent dossier 14. Wie niets weet ook.</p>
        <p class="easter-sluiten">Klik om dit archiefstuk terug te leggen.</p>
      </div>`;

    const sluit = () => { el.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') sluit(); };

    el.addEventListener('click', sluit);
    document.addEventListener('keydown', onEsc);
    document.body.appendChild(el);
  }
});
