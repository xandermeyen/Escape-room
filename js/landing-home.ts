import '../shared/js/sentry.ts';
import type { Review } from '../shared/js/reviews.ts';
import { initLanding } from './landing.ts';

// ── Navigatie, menu, reveal en FAQ (zie landing.ts) ────────────
initLanding({ getrapt: '.usp-grid, .steps-grid, .reviews-grid, .exp-grid' });

// ── Deeltjes achter de hero: pas na het laden, niet blokkerend ──
const heroCanvas = document.getElementById('hero-canvas');
if (heroCanvas instanceof HTMLCanvasElement) {
  const start = () =>
    void import('./hero-deeltjes.ts')
      .then(m => m.startHeroDeeltjes(heroCanvas))
      .catch((err: unknown) => console.error('Deeltjes laden mislukt:', err));
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}

// ── ECHTE REVIEWS LADEN ────────────────────────────────────────
// Reviews komen uit Firebase en worden enkel getoond als ze
// goedgekeurd zijn. Zolang er geen zijn, blijven de sectie en de
// marquee verborgen (geen verzonnen reviews).
const ERVARING_LABELS: Record<string, string> = {
  'kamer-14': 'Kamer 14',
  dua: 'D.U.A.',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sterAantal(rating: number): number {
  return Math.max(1, Math.min(5, Math.round(rating)));
}

// Volle en lege sterren in aparte spans, zodat het verschil ook bij een
// kleine lettergrootte zichtbaar blijft. Schermlezers krijgen een label
// in plaats van "zwarte ster, zwarte ster, witte ster...".
function sterrenHtml(rating: number): string {
  const n = sterAantal(rating);
  const vol = '<span class="ster">★</span>'.repeat(n);
  const leeg = '<span class="ster leeg">☆</span>'.repeat(5 - n);
  return vol + leeg;
}

// Maand + jaar volstaat: geloofwaardig zonder de nadruk op timing te leggen.
function datumHtml(tijdstip: number | undefined): string {
  if (!tijdstip) return '';
  const d = new Date(tijdstip);
  if (Number.isNaN(d.getTime())) return '';
  const label = d.toLocaleDateString('nl-BE', { month: 'short', year: 'numeric' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return ` &middot; <time datetime="${iso}">${escapeHtml(label)}</time>`;
}

function reviewKaart(r: Review): string {
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
const MIN_VOOR_SAMENVATTING = 3;

function samenvattingHtml(reviews: Review[]): string {
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

function marqueeItem(r: Review): string {
  const naam = r.naam ? escapeHtml(r.naam) : 'Anonieme speler';
  const kort = r.tekst.length > 90 ? r.tekst.slice(0, 88).trim() + '…' : r.tekst;
  const n = sterAantal(r.rating);
  return (
    `<div class="marquee-item"><span class="stars" role="img" aria-label="${n} van 5 sterren">` +
    `${sterrenHtml(r.rating)}</span>` +
    `"${escapeHtml(kort)}" &middot; ${naam}</div>`
  );
}

// ── RICH RESULTS: review-sterren voor Google ───────────────────
// Injecteert per experience een Product-schema met AggregateRating,
// berekend uit de echte goedgekeurde reviews. Google rendert JavaScript,
// dus client-side JSON-LD telt mee voor rich results.
const EXPERIENCE_URLS: Record<string, string> = {
  'kamer-14': 'https://bureau-x.be/kamer-14/',
  dua: 'https://bureau-x.be/dua/',
};

function injecteerRatingSchema(reviews: Review[]): void {
  for (const [ervaring, url] of Object.entries(EXPERIENCE_URLS)) {
    const subset = reviews.filter(r => r.ervaring === ervaring);
    if (subset.length === 0) continue;
    const gemiddelde = subset.reduce((som, r) => som + r.rating, 0) / subset.length;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: ERVARING_LABELS[ervaring] ?? ervaring,
      url,
      brand: { '@type': 'Brand', name: 'Bureau X' },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: Math.round(gemiddelde * 10) / 10,
        reviewCount: subset.length,
        bestRating: 5,
        worstRating: 1,
      },
    };

    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.textContent = JSON.stringify(schema);
    document.head.appendChild(el);
  }
}

async function laadReviews(): Promise<void> {
  const sectie = document.getElementById('reviews');
  const grid = document.getElementById('reviews-grid');
  if (!sectie || !grid) return;

  const marqueeWrap = document.getElementById('marquee-wrap');
  const marqueeTrack = document.getElementById('marquee-track');

  let reviews: Review[];
  try {
    // Ruim ophalen: de eerste 6 worden getoond, maar het gemiddelde voor
    // de rich results telt over alle goedgekeurde reviews.
    // Dynamisch geladen: valt Firebase uit, dan blijven menu, reveal en
    // deeltjes gewoon werken (vroeger brak een Firebase-fout de hele pagina).
    const { leesGoedgekeurdeReviews } = await import('../shared/js/reviews.ts');
    reviews = await leesGoedgekeurdeReviews(100);
  } catch (err) {
    console.error('Reviews laden mislukt:', err);
    return; // sectie en marquee blijven verborgen
  }

  if (reviews.length === 0) return;

  injecteerRatingSchema(reviews);

  // Veilig: reviewKaart/marqueeItem halen alle spelerteksten door escapeHtml.
  // eslint-disable-next-line no-unsanitized/property
  grid.innerHTML = reviews.slice(0, 6).map(reviewKaart).join('');
  sectie.style.display = '';
  const navReviews = document.getElementById('navReviews');
  if (navReviews) navReviews.style.display = '';

  const samenvatting = document.getElementById('reviews-summary');
  if (samenvatting && reviews.length >= MIN_VOOR_SAMENVATTING) {
    // eslint-disable-next-line no-unsanitized/property
    samenvatting.innerHTML = samenvattingHtml(reviews);
    samenvatting.hidden = false;
  }

  if (marqueeWrap && marqueeTrack) {
    // Twee keer dezelfde set voor een naadloze lus.
    const items = reviews.slice(0, 12).map(marqueeItem).join('');
    // eslint-disable-next-line no-unsanitized/property
    marqueeTrack.innerHTML = items + items;
    marqueeWrap.style.display = '';
  }
}

laadReviews();

// ── EASTER EGG ─────────────────────────────────────────────────
console.log(
  '%cBUREAU X · INTERN ARCHIEF',
  'font-family: monospace; font-size: 14px; letter-spacing: 2px; color: #c8a96e;',
  '\n\nJe zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.' +
    '\nHet archief reageert op haar naam. Typ die maar eens.',
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

    const sluit = () => {
      el.remove();
      document.removeEventListener('keydown', onEsc);
    };
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') sluit();
    };

    el.addEventListener('click', sluit);
    document.addEventListener('keydown', onEsc);
    document.body.appendChild(el);
  }
});
