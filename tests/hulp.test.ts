import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openPuzzels,
  PogingTeller,
  kiesInactiefMelding,
  toonHintTip,
  bouwHulpKnop,
  initHulp,
  HINTTIP_TEKST,
  INACTIEF_NA_MS,
} from '../shared/js/hulp.ts';
import {
  kamer14VrijgaveMelding,
  KAMER14_INACTIEF,
  KAMER14_HULP_HTML,
} from '../experiences/kamer-14/js/kamer14-hulp.ts';
import { KAMER14_VRIJGAVE } from '../experiences/kamer-14/js/kamer14-config.ts';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('openPuzzels', () => {
  it('geeft de vrije, nog niet opgeloste puzzels', () => {
    expect(openPuzzels({}, KAMER14_VRIJGAVE)).toEqual(['p1']);
    expect(openPuzzels({ p1: true }, KAMER14_VRIJGAVE)).toEqual(['p2', 'p3']);
    expect(openPuzzels({ p1: true, p2: true }, KAMER14_VRIJGAVE)).toEqual(['p3']);
    expect(openPuzzels({ p1: true, p2: true, p3: true }, KAMER14_VRIJGAVE)).toEqual(['p4']);
  });
});

describe('hint-tip na twee pogingen', () => {
  it('pas bij de tweede foute of bijna-poging, en maar één keer', () => {
    const t = new PogingTeller();
    expect(t.tel('p1', 'fout')).toBe(false);
    expect(t.tel('p1', 'bijna')).toBe(true);
    expect(t.tel('p1', 'fout')).toBe(false);
  });

  it('telt per puzzel en negeert juiste antwoorden', () => {
    const t = new PogingTeller();
    expect(t.tel('p1', 'fout')).toBe(false);
    expect(t.tel('p2', 'fout')).toBe(false);
    expect(t.tel('p2', 'juist')).toBe(false);
  });

  it('laat de hintknop oplichten zonder de hints te openen', () => {
    document.body.innerHTML = `
      <div id="hint-p1" class="hint-blok">
        <button class="hint-knop">Hint aanvragen</button>
        <div class="hint-stap verborgen">1</div>
      </div>`;
    toonHintTip('hint-p1');
    toonHintTip('hint-p1');
    const blok = document.getElementById('hint-p1')!;
    expect(blok.classList.contains('hint-tip-actief')).toBe(true);
    expect(blok.querySelectorAll('.hint-tip')).toHaveLength(1);
    expect(blok.textContent).toContain(HINTTIP_TEKST);
    expect(blok.querySelector('.hint-stap')!.classList.contains('verborgen')).toBe(true);
  });
});

describe('verhaalmelding bij inactiviteit', () => {
  it('kiest de eerste open puzzel die nog geen melding kreeg', () => {
    const m = { p2: { titel: 'x', tekst: '2' }, p3: { titel: 'x', tekst: '3' } };
    expect(kiesInactiefMelding(['p2', 'p3'], m, new Set())?.puzzel).toBe('p2');
    expect(kiesInactiefMelding(['p2', 'p3'], m, new Set(['p2']))?.puzzel).toBe('p3');
    expect(kiesInactiefMelding(['p2', 'p3'], m, new Set(['p2', 'p3']))).toBeNull();
  });

  it('elke puzzel heeft een melding voor beide spelers', () => {
    for (const rol of ['a', 'b'] as const) {
      expect(Object.keys(KAMER14_INACTIEF[rol]).sort()).toEqual([
        'p1',
        'p2',
        'p3',
        'p4',
        'p5',
        'p6',
      ]);
    }
  });
});

describe('initHulp', () => {
  let klok = 0;
  const nu = () => klok;

  beforeEach(() => {
    vi.useFakeTimers();
    klok = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const cfg = () => ({
    hintBlokVoor: (p: string) => `hint-${p}`,
    vrijgave: KAMER14_VRIJGAVE,
    inactiefMeldingen: KAMER14_INACTIEF.a,
    vrijgaveMelding: (o: Record<string, boolean>, n: Record<string, boolean>) =>
      kamer14VrijgaveMelding('a', o, n),
    hulpHtml: KAMER14_HULP_HTML,
  });

  it('toont na 8 minuten zonder activiteit een verhaalmelding', () => {
    const hulp = initHulp(cfg(), nu);
    hulp.status({ p1: false });
    klok = INACTIEF_NA_MS - 1000;
    vi.advanceTimersByTime(15_000);
    expect(document.getElementById('hulp-melding')).toBeNull();
    klok = INACTIEF_NA_MS + 1000;
    vi.advanceTimersByTime(15_000);
    expect(document.getElementById('hulp-melding')?.textContent).toContain('rooster');
    hulp.stop();
  });

  it('een poging stelt de melding uit', () => {
    const hulp = initHulp(cfg(), nu);
    hulp.status({});
    klok = INACTIEF_NA_MS - 1000;
    hulp.poging('p1', 'fout');
    klok = INACTIEF_NA_MS + 1000;
    vi.advanceTimersByTime(15_000);
    expect(document.getElementById('hulp-melding')).toBeNull();
    hulp.stop();
  });

  it('meldt na een opgeloste puzzel wat er vrijkwam, niet bij het laden', () => {
    const hulp = initHulp(cfg(), nu);
    hulp.status({ p1: true });
    expect(document.getElementById('hulp-melding')).toBeNull();
    hulp.status({ p1: true, p2: true, p3: true });
    expect(document.getElementById('hulp-melding')?.textContent).toContain('Intakefiche');
    hulp.stop();
  });

  it('bouwt een hulpknop met uitleg en contactlink', () => {
    const hulp = initHulp(cfg(), nu);
    const knop = document.getElementById('hulp-knop')!;
    expect(knop.textContent).toBe('Hulp nodig?');
    knop.click();
    const dialoog = document.getElementById('hulp-dialoog')!;
    expect(dialoog.hasAttribute('open')).toBe(true);
    expect(dialoog.innerHTML).toContain('mailto:info@bureau-x.be');
    hulp.stop();
  });
});

describe('bouwHulpKnop', () => {
  it('sluit-knop sluit het venster en geeft de focus terug', () => {
    const dialoog = bouwHulpKnop('<h2 id="hulp-titel">Hulp</h2>');
    document.getElementById('hulp-knop')!.click();
    (dialoog.querySelector('.hulp-sluit') as HTMLButtonElement).click();
    expect(dialoog.hasAttribute('open')).toBe(false);
  });
});

describe('kamer14VrijgaveMelding', () => {
  it('na P1 weet elke speler wat er nieuw is', () => {
    expect(kamer14VrijgaveMelding('a', {}, { p1: true })?.tekst).toContain('Atelier');
    expect(kamer14VrijgaveMelding('b', {}, { p1: true })?.tekst).toContain('Kas & Bonnen');
  });

  it('na P2 zonder P3: wat nog ontbreekt', () => {
    expect(kamer14VrijgaveMelding('b', { p1: true }, { p1: true, p2: true })?.tekst).toContain(
      'P3',
    );
  });

  it('na P2 en P3: intakefiche en kamerinspectie', () => {
    const oud = { p1: true, p2: true };
    const nieuw = { p1: true, p2: true, p3: true };
    expect(kamer14VrijgaveMelding('a', oud, nieuw)?.tekst).toContain('Intakefiche');
    expect(kamer14VrijgaveMelding('b', oud, nieuw)?.tekst).toContain('Kamerinspectie');
  });

  it('na P4, P5 en P6', () => {
    expect(kamer14VrijgaveMelding('a', {}, { p4: true })?.tekst).toContain('Bijlage D');
    expect(kamer14VrijgaveMelding('b', {}, { p5: true })?.tekst).toContain('Bladzijde');
    expect(kamer14VrijgaveMelding('a', {}, { p5: true })?.tekst).toContain('Speler B');
    expect(kamer14VrijgaveMelding('b', { p5: true }, { p5: true, p6: true })?.tekst).toContain(
      'rapport',
    );
  });

  it('niets nieuw: geen melding', () => {
    expect(kamer14VrijgaveMelding('a', { p1: true }, { p1: true })).toBeNull();
  });
});
