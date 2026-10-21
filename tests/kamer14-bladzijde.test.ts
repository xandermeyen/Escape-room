import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  STROKEN,
  strokenVan,
  volgordeKlopt,
  beginVolgorde,
  verschuif,
  initBladzijde,
  toonVolledigeBladzijde,
} from '../experiences/kamer-14/js/bladzijde.ts';
import {
  KAMER14_PUZZELS,
  KAMER14_VRIJGAVE,
  KAMER14_LAATSTE,
} from '../experiences/kamer-14/js/kamer14-config.ts';
import { KAMER14_HINTS } from '../experiences/kamer-14/js/hints.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');

/** De goedgekeurde tekst van de bladzijde, zonder regeleinden. */
const GOEDGEKEURD = [
  '6 mei',
  'Vandaag word je tien. Tien jaar geleden lag ik in kamer 14 en hield ik je vast tot de verpleegster zei dat ik moest slapen. Ik heb niet geslapen.',
  'Marie schrijft dat je soms nog naar mij vraagt. Katrijn zegt dat het niet mag, en dat ze me toch naar de bus brengt. Ik weet niet wat ik tegen je ga zeggen. Misschien niets. Misschien kijk ik alleen.',
  'Het geld voor de fiets heb ik bij elkaar. Hij is groen, jouw kleur, toen toch.',
  'Om vijf over vijf neem ik de bus terug. Dat beloof ik An, al weet ze het nog niet.',
  'Lena',
].join(' ');

describe('P6: de tekst van de bladzijde', () => {
  it('de zes stroken samen geven precies de goedgekeurde tekst', () => {
    const samen = STROKEN.flatMap(s => s.regels).join(' ');
    expect(samen).toBe(GOEDGEKEURD);
  });

  it('geen gedachtestreepjes', () => {
    expect(STROKEN.flatMap(s => s.regels).join(' ')).not.toMatch(/[—–]/);
  });

  it('elke strook van Speler B begint midden in een zin van Speler A', () => {
    for (const strook of strokenVan('b')) {
      expect(strook.regels[0]?.[0]).toMatch(/[a-z]/);
    }
  });

  it('zinnen lopen over de scheuren: elke strook behalve de laatste eindigt zonder punt', () => {
    STROKEN.slice(0, -1).forEach(s => expect(s.regels.at(-1)).not.toMatch(/[.!?]$/));
  });
});

describe('P6: volgorde', () => {
  it('A heeft de stroken 1, 3 en 5, B de stroken 2, 4 en 6', () => {
    expect(strokenVan('a').map(s => s.id)).toEqual([
      STROKEN[0]!.id,
      STROKEN[2]!.id,
      STROKEN[4]!.id,
    ]);
    expect(strokenVan('b').map(s => s.id)).toEqual([
      STROKEN[1]!.id,
      STROKEN[3]!.id,
      STROKEN[5]!.id,
    ]);
  });

  it('de beginvolgorde is nooit al juist', () => {
    for (const rol of ['a', 'b'] as const) {
      expect(volgordeKlopt(rol, beginVolgorde(rol))).toBe(false);
      expect(
        volgordeKlopt(
          rol,
          strokenVan(rol).map(s => s.id),
        ),
      ).toBe(true);
    }
  });

  it('verschuif blijft binnen de lijst', () => {
    expect(verschuif(['x', 'y', 'z'], 0, -1)).toEqual(['x', 'y', 'z']);
    expect(verschuif(['x', 'y', 'z'], 0, 1)).toEqual(['y', 'x', 'z']);
    expect(verschuif(['x', 'y', 'z'], 2, 1)).toEqual(['x', 'y', 'z']);
  });

  it('P6 komt na P5 en is de laatste puzzel', () => {
    expect(KAMER14_PUZZELS).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(KAMER14_VRIJGAVE['p6']).toEqual(['p5']);
    expect(KAMER14_LAATSTE).toBe('p6');
  });
});

describe('P6: hints verwijzen naar echte strookranden', () => {
  const begin = (regel: string) => regel.split(' ').slice(0, 3).join(' ');

  it('de laatste hint van A noemt het begin van stroken van A in de juiste volgorde', () => {
    const hint = KAMER14_HINTS.a['p6']!.at(-1)!;
    const a = strokenVan('a');
    expect(a[1]!.regels[0]).toMatch(/^naar mij vraagt/);
    expect(hint).toContain('naar mij vraagt');
    expect(hint).toContain('fiets heb ik bij elkaar');
    expect(a[0]!.regels[0]).toBe('6 mei');
  });

  it('de laatste hint van B noemt het begin van de stroken van B in de juiste volgorde', () => {
    const hint = KAMER14_HINTS.b['p6']!.at(-1)!;
    const delen = strokenVan('b').map(s => begin(s.regels[0]!).toLowerCase());
    expect(delen.map(d => hint.toLowerCase().indexOf(d.split(' ').slice(0, 2).join(' ')))).toEqual(
      [...delen.map(d => hint.toLowerCase().indexOf(d.split(' ').slice(0, 2).join(' ')))].sort(
        (x, y) => x - y,
      ),
    );
  });

  it("beide spelerpagina's hebben een close-up met de stroken", () => {
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      const html = lees(bestand);
      expect(html).toContain('id="cu-stroken"');
      expect(html).toContain('id="stroken-lijst"');
      expect(html).toContain('id="btn-p6"');
      expect(html).toContain('id="bladzijde-volledig"');
    }
  });
});

describe('P6: in de pagina', () => {
  let bijJuist: ReturnType<typeof vi.fn<() => void>>;
  let bijFout: ReturnType<typeof vi.fn<() => void>>;

  const start = (rol: 'a' | 'b') => {
    document.body.innerHTML = `
      <ol id="lijst"></ol><button id="knop">Bevestig</button><div id="feedback"></div>
      <div id="volledig" hidden></div>`;
    bijJuist = vi.fn<() => void>();
    bijFout = vi.fn<() => void>();
    initBladzijde({
      rol,
      lijst: document.getElementById('lijst')!,
      knop: document.getElementById('knop') as HTMLButtonElement,
      feedback: document.getElementById('feedback')!,
      bijJuist,
      bijFout,
    });
  };
  const volgorde = () =>
    [...document.querySelectorAll<HTMLElement>('#lijst .strook')].map(li => li.dataset['strook']);
  const knopVan = (index: number, label: string) =>
    document
      .querySelectorAll('#lijst .strook')
      [index]!.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('toont drie stroken in de beginvolgorde', () => {
    start('a');
    expect(volgorde()).toEqual(beginVolgorde('a'));
  });

  it('foute volgorde bevestigen: melding en bijFout', () => {
    start('a');
    document.getElementById('knop')!.click();
    expect(bijFout).toHaveBeenCalledTimes(1);
    expect(bijJuist).not.toHaveBeenCalled();
    expect(document.getElementById('feedback')!.textContent).toContain('Speler B');
  });

  it('met de knoppen in de juiste volgorde leggen en bevestigen', () => {
    start('a');
    // beginvolgorde A: [3, 1, 2] → strook 3 twee keer omlaag
    knopVan(0, 'Strook omlaag').click();
    knopVan(1, 'Strook omlaag').click();
    expect(volgorde()).toEqual(strokenVan('a').map(s => s.id));
    document.getElementById('knop')!.click();
    expect(bijJuist).toHaveBeenCalledTimes(1);
    expect((document.getElementById('knop') as HTMLButtonElement).disabled).toBe(true);
  });

  it('de bovenste strook kan niet hoger, de onderste niet lager', () => {
    start('b');
    expect(knopVan(0, 'Strook omhoog').disabled).toBe(true);
    expect(knopVan(2, 'Strook omlaag').disabled).toBe(true);
  });

  it('na de oplossing staat de hele bladzijde in beeld, één keer', () => {
    start('b');
    const doel = document.getElementById('volledig')!;
    toonVolledigeBladzijde(doel);
    toonVolledigeBladzijde(doel);
    expect(doel.hidden).toBe(false);
    expect(doel.children).toHaveLength(6);
    expect(doel.textContent).toContain('Om vijf over vijf');
  });
});
