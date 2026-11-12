import '../shared/js/sentry.ts';
import type { Review } from '../shared/js/reviews.ts';
import {
  ERVARING_LABELS,
  MIN_VOOR_SAMENVATTING,
  marqueeItem,
  reviewKaart,
  samenvattingHtml,
} from './review-kaart.ts';
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

// ── ECHTE REVIEWS LADEN ────────────────────────────────────────
// Reviews komen uit Firebase en worden enkel getoond als ze
// goedgekeurd zijn. Zolang er geen zijn, blijven de sectie en de
// marquee verborgen (geen verzonnen reviews).
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
