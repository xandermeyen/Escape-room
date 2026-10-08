import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Firebase en de sessiefuncties afschermen: we testen enkel het verloop.
const rapportLuisteraars: ((r: { ingediend?: boolean } | null) => void)[] = [];
const diendRapportIn = vi.fn(() => Promise.resolve());
const sluitSessie = vi.fn(() => Promise.resolve());

vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/session.ts', () => ({
  luisterNaarRapport: (_s: string, cb: (r: { ingediend?: boolean } | null) => void) =>
    rapportLuisteraars.push(cb),
  diendRapportIn: (...args: unknown[]) => diendRapportIn(...(args as [])),
  sluitSessie: (...args: unknown[]) => sluitSessie(...(args as [])),
  haalTijden: () => Promise.resolve({}),
}));
vi.mock('../shared/js/review-form.ts', () => ({ koppelReviewFormulier: () => {} }));
vi.mock('../shared/js/deel.ts', () => ({ koppelDeelKnop: () => {} }));
vi.mock('../shared/js/verdeling.ts', () => ({
  haalDuren: () => Promise.resolve([]),
  percentielSneller: () => null,
  prestatieTekst: () => null,
}));
vi.mock('../experiences/kamer-14/js/audio.ts', () => ({ speelStem: () => {} }));

import {
  volgendeStap,
  leesFoutePogingen,
  bewaarFoutePogingen,
  MAX_FOUTE_POGINGEN,
} from '../experiences/kamer-14/js/einde-verloop.ts';

const html = readFileSync(resolve(__dirname, '../experiences/kamer-14/einde.html'), 'utf8');
const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '').replace(
  /<script[\s\S]*?<\/script>/g,
  '',
);
const tekst = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const actief = () => document.querySelector('.einde-scherm.actief')?.id;
const vul = (velden: Record<string, string>) => {
  for (const [id, waarde] of Object.entries(velden)) {
    (document.getElementById(`r-${id}`) as HTMLInputElement).value = waarde;
  }
};
const klik = (id: string) => document.getElementById(id)!.click();
const JUIST = { bestemming: 'Diest', wie: 'Marie Stas', vervoer: 'bus', tijdstip: '7u35' };
const FOUT = { ...JUIST, bestemming: 'Hasselt' };

// ── Pure logica ───────────────────────────────────────────────────────────────

describe('einde-verloop: volgende stap', () => {
  it('een juist rapport wordt altijd ingediend', () => {
    expect(volgendeStap(0, true)).toBe('indienen');
    expect(volgendeStap(1, true)).toBe('indienen');
  });

  it('eerste keer fout: waarschuwing van An', () => {
    expect(volgendeStap(0, false)).toBe('waarschuwing');
  });

  it('tweede keer fout: politie', () => {
    expect(MAX_FOUTE_POGINGEN).toBe(2);
    expect(volgendeStap(1, false)).toBe('politie');
  });

  it('bewaart de foute pogingen per sessie', () => {
    bewaarFoutePogingen('TEST-1', 1);
    expect(leesFoutePogingen('TEST-1')).toBe(1);
    expect(leesFoutePogingen('TEST-2')).toBe(0);
  });
});

// ── Teksten ───────────────────────────────────────────────────────────────────

describe('einde: teksten', () => {
  it('bevat de mail van An, de epiloog, de waarschuwing en de politietekst', () => {
    expect(tekst).toContain('Marie nam op. Op de achtergrond hoorde ik Lena lachen.');
    expect(tekst).toContain('De politie bel ik niet.');
    expect(tekst).toContain('Woensdag 14 mei 2025, 10u00, kamer 4');
    expect(tekst).toContain('zeven keer €35');
    expect(tekst).toContain('Huidig adres: bekend.');
    expect(tekst).toContain('Klopt het daarna nog niet, dan bel ik de politie.');
    expect(tekst).toContain('Om 19u40 vinden twee agenten Lena');
  });

  it('nieuwe teksten bevatten geen gedachtestreepjes', () => {
    for (const id of ['scherm-mail-an', 'scherm-politie', 'scherm-epiloog', 'an-waarschuwing']) {
      const blok = new DOMParser().parseFromString(body, 'text/html').getElementById(id);
      expect(blok, id).not.toBeNull();
      expect(blok!.textContent).not.toMatch(/[—–]/);
    }
  });

  it('de epiloog sluit aan bij de herinnering in de prullenmand', () => {
    const b = readFileSync(resolve(__dirname, '../experiences/kamer-14/speler-b.html'), 'utf8');
    expect(b).toMatch(/Wo 14 mei · 10u00/);
    expect(b).toMatch(/Kamer 4/);
  });
});

// ── Verloop in de pagina ──────────────────────────────────────────────────────

describe('einde: verloop in de pagina', () => {
  beforeAll(async () => {
    window.history.replaceState({}, '', '/experiences/kamer-14/einde.html?sessie=EIN-001');
    window.scrollTo = () => {};
    Element.prototype.scrollIntoView = () => {};
    document.body.innerHTML = body;
    await import('../experiences/kamer-14/js/einde.ts');
  });

  beforeEach(() => {
    diendRapportIn.mockClear();
    sluitSessie.mockClear();
  });

  it('eerste fout rapport: waarschuwing, geen indiening', async () => {
    vul(FOUT);
    klik('btn-indienen');
    await vi.waitFor(() =>
      expect(document.getElementById('an-waarschuwing')!.classList).toContain('zichtbaar'),
    );
    expect(document.getElementById('r-bestemming')!.classList).toContain('fout');
    expect(diendRapportIn).not.toHaveBeenCalled();
    expect(actief()).toBe('scherm-rapport');
  });

  it('daarna juist: indienen, mail van An, briefkaart, epiloog, slot', async () => {
    vul(JUIST);
    klik('btn-indienen');
    await vi.waitFor(() => expect(diendRapportIn).toHaveBeenCalled());
    expect(document.getElementById('an-waarschuwing')!.classList).not.toContain('zichtbaar');

    rapportLuisteraars.forEach(cb => cb({ ingediend: true }));
    expect(actief()).toBe('scherm-mail-an');
    klik('btn-mail-verder');
    expect(actief()).toBe('scherm-briefkaart');
    klik('btn-sluit-dossier');
    expect(actief()).toBe('scherm-epiloog');
    klik('btn-epiloog-verder');
    expect(actief()).toBe('scherm-slot');
  });
});

describe('einde: twee keer fout', () => {
  it('toont de politie, sluit de sessie en slaat de briefkaart over', async () => {
    vi.resetModules();
    diendRapportIn.mockClear();
    sluitSessie.mockClear();
    rapportLuisteraars.length = 0;
    window.history.replaceState({}, '', '/experiences/kamer-14/einde.html?sessie=EIN-002');
    document.body.innerHTML = body;
    await import('../experiences/kamer-14/js/einde.ts');

    vul(FOUT);
    klik('btn-indienen');
    await vi.waitFor(() =>
      expect(document.getElementById('an-waarschuwing')!.classList).toContain('zichtbaar'),
    );
    vul({ ...FOUT, wie: 'Marie' });
    klik('btn-indienen');
    await vi.waitFor(() => expect(actief()).toBe('scherm-politie'));
    expect(sluitSessie).toHaveBeenCalled();
    expect(diendRapportIn).not.toHaveBeenCalled();

    // Een rapport van de andere speler verandert dit niet meer.
    rapportLuisteraars.forEach(cb => cb({ ingediend: true }));
    expect(actief()).toBe('scherm-politie');

    klik('btn-politie-verder');
    expect(actief()).toBe('scherm-slot');
  });
});

// ── Route-finale ──────────────────────────────────────────────────────────────

describe('route-finale', () => {
  it('routeStand volgt de invoer, niet het juiste antwoord', async () => {
    const { routeStand } = await import('../experiences/kamer-14/js/route-kaart.ts');
    expect(routeStand({ vervoer: '', tijdstip: '', bestemming: '', wie: '' })).toEqual({
      rit: false,
      stad: '?',
      adres: '',
    });
    expect(
      routeStand({ vervoer: 'trein', tijdstip: '9u', bestemming: 'Hasselt', wie: 'Jan' }),
    ).toEqual({
      rit: true,
      stad: 'Hasselt',
      adres: 'bij Jan',
    });
    expect(routeStand({ vervoer: 'bus', tijdstip: '', bestemming: '', wie: '' }).rit).toBe(false);
  });

  it('lange invoer wordt ingekort op de kaart', async () => {
    const { routeStand } = await import('../experiences/kamer-14/js/route-kaart.ts');
    const stand = routeStand({ vervoer: '', tijdstip: '', bestemming: 'x'.repeat(40), wie: '' });
    expect(stand.stad.length).toBeLessThanOrEqual(22);
  });

  it('de kaart verraadt de bestemming niet in de HTML', () => {
    const kaart = new DOMParser().parseFromString(body, 'text/html').getElementById('route-kaart');
    expect(kaart).not.toBeNull();
    expect(kaart!.textContent).not.toMatch(/Diest|Marie|Stas|07:35|bus/i);
  });

  it('alle vier de velden staan in de route, met een label', () => {
    const doc = new DOMParser().parseFromString(body, 'text/html');
    for (const id of ['r-vervoer', 'r-tijdstip', 'r-bestemming', 'r-wie']) {
      expect(doc.querySelector(`.route #${id}`), id).not.toBeNull();
      expect(doc.querySelector(`label[for="${id}"]`), id).not.toBeNull();
    }
  });

  it('de kaart tekent mee tijdens het typen', async () => {
    vi.resetModules();
    window.history.replaceState({}, '', '/experiences/kamer-14/einde.html?sessie=EIN-003');
    document.body.innerHTML = body;
    await import('../experiences/kamer-14/js/einde.ts');
    const typ = (id: string, w: string) => {
      const el = document.getElementById(id) as HTMLInputElement;
      el.value = w;
      el.dispatchEvent(new Event('input'));
    };
    expect(document.getElementById('route-rit')!.classList).not.toContain('getekend');
    typ('r-vervoer', 'bus');
    typ('r-tijdstip', '7u35');
    expect(document.getElementById('route-rit')!.classList).toContain('getekend');
    typ('r-bestemming', 'Diest');
    expect(document.getElementById('route-label-stad')!.textContent).toBe('Diest');
    typ('r-wie', 'Marie Stas');
    expect(document.getElementById('route-label-adres')!.textContent).toBe('bij Marie Stas');
  });
});
