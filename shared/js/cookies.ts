/**
 * cookies.ts — cookiebanner + Google Analytics 4 met Consent Mode v2.
 *
 * Wettelijk kader (België/EU): analytische cookies pas na actieve
 * toestemming. Daarom:
 *  - Zonder keuze, of na "Weigeren", wordt gtag.js NIET geladen. Er gaat dan
 *    geen enkel verzoek naar Google (Consent Mode "basic").
 *  - Na "Accepteren" laden we gtag.js met consent: analytics toegestaan,
 *    alles rond advertenties geweigerd, Google-signalen uit.
 *  - De keuze wordt 6 maanden onthouden en kan altijd gewijzigd worden via
 *    een link met [data-cookie-instellingen] (bv. in de footer).
 *  - Intrekken verwijdert de _ga-cookies meteen.
 *
 * Alleen in productie-builds wordt GA effectief geladen (zelfde aanpak als
 * Sentry), zodat lokaal testen geen data vervuilt. De banner werkt overal.
 */

export const GA_METINGS_ID = 'G-RRJSFZZB05';

const OPSLAG_SLEUTEL = 'bureaux-cookiekeuze';
/** Verhoog als de inhoud van de vraag verandert: iedereen krijgt de banner dan opnieuw. */
const KEUZE_VERSIE = 1;
export const KEUZE_GELDIG_MS = 182 * 24 * 60 * 60 * 1000; // ± 6 maanden

export interface CookieKeuze {
  analytics: boolean;
  tijdstip: number;
  versie: number;
}

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    openCookieInstellingen?: () => void;
  }
}

// ── Keuze bewaren / lezen ─────────────────────────────────

export function leesKeuze(nu: number = Date.now()): CookieKeuze | null {
  try {
    const ruw = localStorage.getItem(OPSLAG_SLEUTEL);
    if (!ruw) return null;
    const keuze = JSON.parse(ruw) as Partial<CookieKeuze>;
    if (
      typeof keuze.analytics !== 'boolean' ||
      typeof keuze.tijdstip !== 'number' ||
      keuze.versie !== KEUZE_VERSIE ||
      nu - keuze.tijdstip > KEUZE_GELDIG_MS
    ) {
      return null;
    }
    return keuze as CookieKeuze;
  } catch {
    return null;
  }
}

function bewaarKeuze(analytics: boolean): void {
  const keuze: CookieKeuze = { analytics, tijdstip: Date.now(), versie: KEUZE_VERSIE };
  try {
    localStorage.setItem(OPSLAG_SLEUTEL, JSON.stringify(keuze));
  } catch {
    // Opslag geblokkeerd (privémodus): keuze geldt dan alleen voor deze pagina.
  }
}

// ── Google Analytics ──────────────────────────────────────

let gaGeladen = false;

function zorgVoorGtag(): Gtag {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // gtag verwacht het arguments-object zelf, geen array.
      // eslint-disable-next-line prefer-rest-params
      (window.dataLayer ??= []).push(arguments);
    };
  }
  return window.gtag;
}

/** Laadt GA4. Wordt enkel aangeroepen na toestemming. */
export function laadAnalytics(): void {
  if (gaGeladen) {
    zorgVoorGtag()('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  gaGeladen = true;

  const gtag = zorgVoorGtag();
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  gtag('js', new Date());
  gtag('config', GA_METINGS_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  if (!import.meta.env.PROD) return; // lokaal: niets naar Google sturen

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_METINGS_ID}`;
  document.head.appendChild(script);
}

/** Trekt toestemming in: consent op denied en _ga-cookies weg. */
export function stopAnalytics(): void {
  if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  verwijderGaCookies();
}

function verwijderGaCookies(): void {
  const namen = document.cookie
    .split(';')
    .map(c => c.split('=')[0]?.trim() ?? '')
    .filter(n => n === '_ga' || n.startsWith('_ga_') || n === '_gid');
  const host = location.hostname;
  const domeinen = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`];
  for (const naam of namen) {
    for (const domein of domeinen) {
      document.cookie =
        `${naam}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/` +
        (domein ? `; domain=${domein}` : '');
    }
  }
}

// ── Banner ────────────────────────────────────────────────

const STIJL = `
.cookie-banner{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:10000;max-width:560px;margin:0 auto;
  background:#14120e;color:#e8dfcc;border:1px solid #5a4a24;box-shadow:0 8px 32px rgba(0,0,0,.55);
  padding:1.25rem 1.4rem;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:.9rem;line-height:1.55}
.cookie-banner h2{font-size:1rem;margin:0 0 .4rem;color:#c9a84c;font-weight:600;letter-spacing:.02em}
.cookie-banner p{margin:0 0 1rem}
.cookie-banner a{color:#c9a84c;text-decoration:underline}
.cookie-banner .cookie-knoppen{display:flex;gap:.6rem;flex-wrap:wrap}
.cookie-banner button{flex:1 1 140px;padding:.65rem 1rem;font:inherit;font-weight:600;cursor:pointer;
  border:1px solid #c9a84c;background:transparent;color:#c9a84c}
.cookie-banner button:hover,.cookie-banner button:focus-visible{background:#c9a84c;color:#14120e;outline:none}
`;

function voegStijlToe(): void {
  if (document.getElementById('cookie-banner-stijl')) return;
  const stijl = document.createElement('style');
  stijl.id = 'cookie-banner-stijl';
  stijl.textContent = STIJL;
  document.head.appendChild(stijl);
}

function sluitBanner(): void {
  document.getElementById('cookie-banner')?.remove();
}

/** Verwerkt een keuze: bewaren, GA laden of stoppen, banner sluiten. */
export function maakKeuze(analytics: boolean): void {
  const vorige = leesKeuze();
  bewaarKeuze(analytics);
  if (analytics) laadAnalytics();
  else if (vorige?.analytics || gaGeladen) stopAnalytics();
  sluitBanner();
}

export function toonBanner(): void {
  if (document.getElementById('cookie-banner')) return;
  voegStijlToe();

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-labelledby', 'cookie-banner-titel');

  const titel = document.createElement('h2');
  titel.id = 'cookie-banner-titel';
  titel.textContent = 'Mogen we meten hoe je de site gebruikt?';

  const tekst = document.createElement('p');
  tekst.append(
    'We willen met Google Analytics zien welke pagina’s bezocht worden en hoe mensen bij ons terechtkomen. ' +
      'Dat helpt ons de escape rooms en de site beter te maken. Zonder jouw toestemming plaatsen we geen analytische cookies. Meer info in ons ',
  );
  const link = document.createElement('a');
  link.href = '/privacy.html#cookies';
  link.textContent = 'privacybeleid';
  tekst.append(link, '.');

  const knoppen = document.createElement('div');
  knoppen.className = 'cookie-knoppen';
  const weiger = document.createElement('button');
  weiger.type = 'button';
  weiger.id = 'cookie-weigeren';
  weiger.textContent = 'Weigeren';
  weiger.addEventListener('click', () => maakKeuze(false));
  const accepteer = document.createElement('button');
  accepteer.type = 'button';
  accepteer.id = 'cookie-accepteren';
  accepteer.textContent = 'Accepteren';
  accepteer.addEventListener('click', () => maakKeuze(true));
  knoppen.append(weiger, accepteer);

  banner.append(titel, tekst, knoppen);
  document.body.appendChild(banner);
}

// ── Init ──────────────────────────────────────────────────

export function initCookies(): void {
  window.openCookieInstellingen = toonBanner;
  document.querySelectorAll<HTMLElement>('[data-cookie-instellingen]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      toonBanner();
    });
  });

  const keuze = leesKeuze();
  if (!keuze) toonBanner();
  else if (keuze.analytics) laadAnalytics();
}

/** Alleen voor tests: interne status terugzetten. */
export function _resetVoorTests(): void {
  gaGeladen = false;
}
