import { describe, it, expect, beforeEach } from 'vitest';
import {
  initCookies,
  leesKeuze,
  maakKeuze,
  KEUZE_GELDIG_MS,
  GA_METINGS_ID,
  _resetVoorTests,
} from '../shared/js/cookies.ts';

// In tests is import.meta.env.PROD false: gtag.js wordt dus nooit echt
// geladen, maar de dataLayer en de consent-oproepen kunnen we wel nakijken.

function banner() {
  return document.getElementById('cookie-banner');
}

function klik(id: string) {
  (document.getElementById(id) as HTMLButtonElement).click();
}

/** Zoekt een gtag-oproep in de dataLayer (die bevat arguments-objecten). */
function gtagOproepen(): unknown[][] {
  return (window.dataLayer ?? []).map(a => Array.from(a as ArrayLike<unknown>));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<footer><a href="#" data-cookie-instellingen>Cookie-instellingen</a></footer>';
  document.head.innerHTML = '';
  delete window.dataLayer;
  delete window.gtag;
  _resetVoorTests();
});

describe('cookiebanner', () => {
  it('toont de banner bij een eerste bezoek en laadt dan nog niets', () => {
    initCookies();
    expect(banner()).not.toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('heeft even duidelijke knoppen om te weigeren en te accepteren', () => {
    initCookies();
    expect(document.getElementById('cookie-weigeren')?.textContent).toBe('Weigeren');
    expect(document.getElementById('cookie-accepteren')?.textContent).toBe('Accepteren');
    expect(banner()?.querySelector('a[href*="privacy"]')).not.toBeNull();
  });

  it('weigeren: banner weg, keuze bewaard, geen Google Analytics', () => {
    initCookies();
    klik('cookie-weigeren');
    expect(banner()).toBeNull();
    expect(leesKeuze()?.analytics).toBe(false);
    expect(window.dataLayer).toBeUndefined();
  });

  it('accepteren: banner weg en GA geconfigureerd zonder advertentiesignalen', () => {
    initCookies();
    klik('cookie-accepteren');
    expect(banner()).toBeNull();
    expect(leesKeuze()?.analytics).toBe(true);

    const oproepen = gtagOproepen();
    const consent = oproepen.find(o => o[0] === 'consent' && o[1] === 'default');
    expect(consent?.[2]).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    const config = oproepen.find(o => o[0] === 'config');
    expect(config?.[1]).toBe(GA_METINGS_ID);
    expect(config?.[2]).toMatchObject({ allow_google_signals: false });
  });

  it('toont de banner niet opnieuw als er al een keuze is', () => {
    maakKeuze(false);
    document.body.innerHTML = '';
    initCookies();
    expect(banner()).toBeNull();
  });

  it('laadt GA meteen bij een volgend bezoek na eerdere toestemming', () => {
    maakKeuze(true);
    delete window.dataLayer;
    delete window.gtag;
    _resetVoorTests();
    initCookies();
    expect(gtagOproepen().some(o => o[0] === 'config')).toBe(true);
  });

  it('vraagt opnieuw na 6 maanden', () => {
    localStorage.setItem(
      'bureaux-cookiekeuze',
      JSON.stringify({ analytics: true, tijdstip: Date.now() - KEUZE_GELDIG_MS - 1000, versie: 1 }),
    );
    expect(leesKeuze()).toBeNull();
    initCookies();
    expect(banner()).not.toBeNull();
  });

  it('de link Cookie-instellingen opent de banner opnieuw', () => {
    maakKeuze(true);
    initCookies();
    expect(banner()).toBeNull();
    (document.querySelector('[data-cookie-instellingen]') as HTMLElement).click();
    expect(banner()).not.toBeNull();
  });

  it('toestemming intrekken zet analytics_storage op denied en wist _ga-cookies', () => {
    maakKeuze(true);
    document.cookie = '_ga=GA1.1.123; path=/';
    document.cookie = '_ga_RRJSFZZB05=GS1.1.456; path=/';
    maakKeuze(false);
    const updates = gtagOproepen().filter(o => o[0] === 'consent' && o[1] === 'update');
    expect(updates.at(-1)?.[2]).toMatchObject({ analytics_storage: 'denied' });
    expect(document.cookie).not.toContain('_ga');
  });

  it('negeert een kapotte opgeslagen keuze', () => {
    localStorage.setItem('bureaux-cookiekeuze', '{kapot');
    expect(leesKeuze()).toBeNull();
  });
});
