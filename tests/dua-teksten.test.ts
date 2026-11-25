import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import { antwoordKlopt } from '../shared/js/utils.ts';
import { DUA_P1 } from '../experiences/dua/js/dua-config.ts';
import { duaOplossing } from '../experiences/dua/js/dua-oplossing.ts';
import { duaTaal, tekst, zetDuaTaal } from '../experiences/dua/js/dua-tekst.ts';
import { duaInactief, duaVrijgaveMelding } from '../experiences/dua/js/dua-hulp.ts';
import { nl } from '../experiences/dua/js/teksten/nl.ts';
import { en } from '../experiences/dua/js/teksten/en.ts';
import { BRIEFTEKST } from '../experiences/dua/js/dua-session.ts';

const ROOT = resolve(import.meta.dirname, '..');

/** Alle teksten met hun pad, bv. ["s1934.vak", "vak {nr}"]. */
function plat(o: unknown, pad = ''): [string, string][] {
  if (typeof o === 'string') return [[pad, o]];
  return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
    plat(v, pad ? `${pad}.${k}` : k),
  );
}
const plekken = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('D.U.A.-teksten: Nederlands en Engels', () => {
  const nlPlat = new Map(plat(nl));
  const enPlat = new Map(plat(en));

  it('hebben dezelfde sleutels en evenveel hintstappen', () => {
    expect([...enPlat.keys()].sort()).toEqual([...nlPlat.keys()].sort());
  });

  it('hebben dezelfde {plekken} in elke tekst', () => {
    for (const [pad, tekstNl] of nlPlat) {
      expect(plekken(enPlat.get(pad) ?? ''), pad).toEqual(plekken(tekstNl));
    }
  });

  it('geen lege of onvertaalde Engelse tekst (behalve namen die gelijk blijven)', () => {
    const gelijkMag = new Set(['ui.telefoon', 'plekken.gravensteen']);
    for (const [pad, tekstEn] of enPlat) {
      expect(tekstEn.trim(), pad).not.toBe('');
      if (!gelijkMag.has(pad) && /[a-z]{4,}/.test(tekstEn)) {
        expect(tekstEn, pad).not.toBe(nlPlat.get(pad));
      }
    }
  });

  it('elke hint in de HTML heeft een tekst in elke taal', () => {
    for (const pagina of ['speler-1934.html', 'speler-2034.html']) {
      const doc = new JSDOM(readFileSync(resolve(ROOT, 'experiences/dua', pagina), 'utf8')).window
        .document;
      doc.querySelectorAll('.hint-blok[id]').forEach(blok => {
        const n = blok.querySelectorAll('.hint-stap').length;
        for (const t of [nl, en]) {
          expect((t.hints as Record<string, readonly string[]>)[blok.id]?.length, blok.id).toBe(n);
        }
      });
    }
  });
});

describe('tekst() en de speltaal', () => {
  afterEach(() => zetDuaTaal('nl'));

  it('is Nederlands tot er een taal gezet wordt', () => {
    expect(duaTaal()).toBe('nl');
    expect(tekst().s1934.machineWeer).toBe('De typemachine doet het weer.');
  });

  it('geeft na zetDuaTaal("en") de Engelse teksten, ook in de hulp', async () => {
    await zetDuaTaal('en');
    expect(duaTaal()).toBe('en');
    expect(tekst().s1934.machineWeer).toBe('The typewriter works again.');
    expect(duaInactief('2034')['p0']?.titel).toBe('Bureau X note');
    expect(duaVrijgaveMelding('1934', {}, { p5: true })?.tekst).toBe(
      'Now write the fourteenth letter.',
    );
  });
});

describe('P1 in elke taal', () => {
  const kaart = ['LAMGO', 'DSBCE', 'FHIKN', 'PQRTU', 'VWXYZ'];
  /** Code van het briefje → woord, met de codekaart (eerst de rij, dan de kolom). */
  const decodeer = (code: string) =>
    code
      .split('·')
      .map(g => g.trim())
      .map(g => kaart[Number(g[0]) - 1]![Number(g[1]) - 1])
      .join('');

  it.each(['nl', 'en'] as const)(
    '%s: het woord van de code is oplosbaar in de brief',
    async taal => {
      const p1 = DUA_P1[taal];
      const woord = decodeer(p1.code);
      expect(woord).toHaveLength(p1.letters);
      expect(await antwoordKlopt(woord.toLowerCase(), p1.woordHash)).toBe(true);

      // De letters staan in leesvolgorde in de brief, en het woord staat er niet letterlijk in.
      let vanaf = 0;
      for (const letter of woord) {
        const i = p1.brief.indexOf(letter, vanaf);
        expect(i, `${taal}: ${letter}`).toBeGreaterThanOrEqual(0);
        vanaf = i + 1;
      }
      expect(p1.brief.replace(/[^A-Z]/g, '')).not.toContain(woord);
    },
  );

  it('de Nederlandse brief is ongewijzigd', () => {
    expect(BRIEFTEKST).toBe(DUA_P1.nl.brief);
    expect(DUA_P1.nl.letters).toBe(5);
  });
});

describe('de oplossing op het tijd-voorbij-scherm', () => {
  it('bestaat in beide talen, met evenveel zinnen', () => {
    expect(duaOplossing('nl')).toHaveLength(5);
    expect(duaOplossing('en')).toHaveLength(5);
    expect(duaOplossing()).toEqual(duaOplossing('nl'));
    expect(duaOplossing('en')[0]).toContain('LOCKER');
  });
});
