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

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');

/** De goedgekeurde tekst van de bladzijde, zonder regeleinden. */
const GOEDGEKEURD = [
  'Maandag 5 mei',
  'Morgen ga ik. Ik heb het aan niemand gezegd en dat blijft zo tot ik in de bus zit.',
  'Marie en ik zaten vroeger elke zomer bij haar oma in Diest, boven de bloemenwinkel. Vanaf de trap zag je de toren van de kerk. Die heb ik nu getekend, zonder te kijken.',
  'Toen ik ziek werd, heb ik haar niet meer teruggebeld. Niet één keer. Ik schaamde me. Daarna wist ik niet meer waar ze woonde.',
  'Op dinsdag zat ik in de bibliotheek. Eerst haar naam, dan oude adressen, dan de bloemenwinkel. Die bestaat nog. Ik heb een brief gestuurd en ze schreef terug.',
  'Op donderdag ging ik naar Geel Markt. Welke bus, hoe laat, hoe lang, hoeveel. Ik heb alles twee keer opgeschreven.',
  'Ik heb geld opzij gelegd, het geld voor Katrijn. Dat is niet eerlijk, ik weet het. Het is voor als het misloopt. Ik geef het terug, tot de laatste euro.',
  'An zou meegaan als ik het vroeg. Ze zou het goed bedoelen. Maar dan is het een begeleid bezoek en geen vriendin die langskomt.',
  'Dit wil ik één keer alleen doen.',
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
    expect(KAMER14_PUZZELS).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
    expect(KAMER14_VRIJGAVE['p6']).toEqual(['p5']);
    expect(KAMER14_LAATSTE).toBe('p6');
  });
});

describe('P6: hints verwijzen naar echte strookranden', () => {
  it('de laatste hint van A noemt hoe stroken van B eindigen', () => {
    const a = lees('speler-a.html');
    const eindesB = strokenVan('b').map(s => s.regels.at(-1)!.split(' ').at(-1));
    expect(eindesB).toContain('Ik');
    expect(a).toContain('eindigt op "Ik"');
    expect(strokenVan('b')[1]!.regels.at(-1)).toMatch(/het geld voor$/);
    expect(a).toContain('"het geld voor"');
  });

  it('de laatste hint van B noemt hoe stroken van A eindigen', () => {
    const b = lees('speler-b.html');
    const eindesA = strokenVan('a').map(s => s.regels.at(-1)!);
    expect(eindesA[0]).toMatch(/boven de$/);
    expect(eindesA[1]).toMatch(/Ik heb een brief$/);
    expect(eindesA[2]).toMatch(/Maar dan is het een$/);
    for (const stuk of ['"boven de"', '"Ik heb een brief"', '"Maar dan is het een"']) {
      expect(b).toContain(stuk);
    }
  });

  it("beide spelerpagina's hebben de tab, het paneel en een zesde voortgangsstap", () => {
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      const html = lees(bestand);
      expect(html).toContain('id="tab-bladzijde"');
      expect(html).toContain('id="panel-bladzijde"');
      expect(html).toContain('id="stroken-lijst"');
      expect(html).toContain('id="vp6"');
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
    expect(doel.textContent).toContain('Dit wil ik één keer alleen doen.');
  });
});
