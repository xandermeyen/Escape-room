import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Firebase en de sessiefuncties afschermen: we testen enkel het verloop.
type Rapport = { ingediend?: boolean; inhoud?: { conclusie?: string } } | null;
const rapportLuisteraars: ((r: Rapport) => void)[] = [];
const diendRapportIn = vi.fn(() => Promise.resolve());
const sluitSessie = vi.fn(() => Promise.resolve());

vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/session.ts', () => ({
  luisterNaarRapport: (_s: string, cb: (r: Rapport) => void) => rapportLuisteraars.push(cb),
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
vi.mock('../experiences/kamer-14/js/audio.ts', () => ({
  speelStem: () => ({ addEventListener: () => {}, pause: () => {} }),
  hervatAudio: () => {},
}));

import {
  volgendeStap,
  leesFoutePogingen,
  bewaarFoutePogingen,
  MAX_FOUTE_POGINGEN,
} from '../experiences/kamer-14/js/einde-verloop.ts';
import { EINDES, KEUZES, isKeuze } from '../experiences/kamer-14/js/eindes.ts';

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
const kies = (keuze: string) =>
  (document.querySelector(`input[name="keuze"][value="${keuze}"]`) as HTMLInputElement).click();
const JUIST = {
  bestemming: 'Grote Markt, Diest',
  wie: 'haar dochter Noor',
  vervoer: 'bus',
  tijdstip: '17u51',
};
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

describe('einde: keuzes en eindes', () => {
  it('elke keuze in het formulier heeft een eigen einde, plus vermist', () => {
    const waarden = [...body.matchAll(/name="keuze" value="([a-z]+)"/g)].map(m => m[1]);
    expect(waarden).toEqual([...KEUZES]);
    expect(Object.keys(EINDES).sort()).toEqual([...KEUZES, 'vermist'].sort());
    expect(isKeuze('morgen')).toBe(true);
    expect(isKeuze('politie')).toBe(false);
  });

  it('elk einde heeft een titel, tekst en minstens één opname', () => {
    for (const einde of Object.values(EINDES)) {
      expect(einde.titel).toBeTruthy();
      expect(einde.alineas.length).toBeGreaterThanOrEqual(2);
      expect(einde.audio.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('teksten zonder gedachtestreepjes', () => {
    expect(tekst).not.toMatch(/[—–]/);
  });

  it('de waarschuwing van An dreigt met een vermissing', () => {
    expect(tekst).toContain('dan meld ik haar als vermist');
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

  it('zonder keuze: niets ingediend en geen foute poging', async () => {
    vul(JUIST);
    klik('btn-indienen');
    await vi.waitFor(() =>
      expect(document.getElementById('fout-keuze')!.classList).toContain('zichtbaar'),
    );
    expect(diendRapportIn).not.toHaveBeenCalled();
    expect(leesFoutePogingen('EIN-001')).toBe(0);
  });

  it('eerste fout rapport: waarschuwing, geen indiening', async () => {
    vul(FOUT);
    kies('morgen');
    klik('btn-indienen');
    await vi.waitFor(() =>
      expect(document.getElementById('an-waarschuwing')!.classList).toContain('zichtbaar'),
    );
    expect(document.getElementById('r-bestemming')!.classList).toContain('fout');
    expect(diendRapportIn).not.toHaveBeenCalled();
    expect(actief()).toBe('scherm-rapport');
  });

  it('daarna juist: indienen met de keuze, het gekozen einde, dan het slot', async () => {
    vul(JUIST);
    kies('niets');
    klik('btn-indienen');
    await vi.waitFor(() => expect(diendRapportIn).toHaveBeenCalled());
    expect(diendRapportIn.mock.calls[0]).toEqual([
      'EIN-001',
      expect.objectContaining({ conclusie: 'niets', bestemming: JUIST.bestemming }),
    ]);

    rapportLuisteraars.forEach(cb => cb({ ingediend: true, inhoud: { conclusie: 'niets' } }));
    expect(actief()).toBe('scherm-einde');
    expect(document.getElementById('einde-titel')!.textContent).toBe(EINDES.niets.titel);
    klik('btn-einde-verder');
    expect(actief()).toBe('scherm-slot');
  });
});

describe('einde: twee keer fout', () => {
  it('toont "vermist", sluit de sessie en dient niets in', async () => {
    vi.resetModules();
    diendRapportIn.mockClear();
    sluitSessie.mockClear();
    rapportLuisteraars.length = 0;
    window.history.replaceState({}, '', '/experiences/kamer-14/einde.html?sessie=EIN-002');
    document.body.innerHTML = body;
    await import('../experiences/kamer-14/js/einde.ts');

    vul(FOUT);
    kies('alles');
    klik('btn-indienen');
    await vi.waitFor(() =>
      expect(document.getElementById('an-waarschuwing')!.classList).toContain('zichtbaar'),
    );
    vul({ ...FOUT, wie: 'Marie' });
    klik('btn-indienen');
    await vi.waitFor(() => expect(actief()).toBe('scherm-einde'));
    expect(document.getElementById('einde-titel')!.textContent).toBe(EINDES.vermist.titel);
    expect(sluitSessie).toHaveBeenCalled();
    expect(diendRapportIn).not.toHaveBeenCalled();

    // Een rapport van de andere speler verandert dit niet meer.
    rapportLuisteraars.forEach(cb => cb({ ingediend: true, inhoud: { conclusie: 'alles' } }));
    expect(document.getElementById('einde-titel')!.textContent).toBe(EINDES.vermist.titel);
  });
});
