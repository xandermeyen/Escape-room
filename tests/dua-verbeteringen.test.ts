import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// dua-ui.ts importeert Firebase; voor maakSvgToegankelijk is dat niet nodig.
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('firebase/database', () => ({ ref: vi.fn(), onValue: vi.fn() }));
vi.mock('../experiences/dua/js/dua-session.ts', () => ({ telHint: vi.fn(), zetBadge: vi.fn() }));
vi.mock('../shared/js/timer.ts', () => ({
  formateerTijd: vi.fn(),
  TIJDSLIMIET_MS: 3600000,
  zorgStartTijd: vi.fn(),
  serverNu: vi.fn(),
}));
vi.mock('../experiences/dua/js/dua-audio.ts', () => ({
  fx: {},
  isGedempt: vi.fn(),
  wisselGeluid: vi.fn(),
}));

import { beoordeelAntwoord } from '../shared/js/utils.ts';
import {
  DUA_HASHES,
  DUA_REGELS,
  DUA_VRIJGAVE,
  alleenCijfers,
  beoordeelDoorslag,
} from '../experiences/dua/js/dua-config.ts';
import { duaVrijgaveMelding, DUA_INACTIEF } from '../experiences/dua/js/dua-hulp.ts';
import { duaOplossing } from '../experiences/dua/js/dua-oplossing.ts';
import { maakSvgToegankelijk, ontgrendeld } from '../experiences/dua/js/dua-ui.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/dua', bestand), 'utf8');

describe('D.U.A.: soepele antwoordcontrole', () => {
  it("route: koppeltekens, spaties en komma's maken niet uit", async () => {
    for (const invoer of ['3194', '3-1-9-4', '3 1 9 4', '3, 1, 9, 4']) {
      expect(await beoordeelAntwoord(invoer, DUA_HASHES.route ?? [], DUA_REGELS.route)).toBe(
        'juist',
      );
    }
  });

  it('route: juiste plekken in de verkeerde volgorde is bijna', async () => {
    expect(await beoordeelAntwoord('1349', DUA_HASHES.route ?? [], DUA_REGELS.route)).toBe('bijna');
    expect(await beoordeelAntwoord('5194', DUA_HASHES.route ?? [], DUA_REGELS.route)).toBe('fout');
  });

  it('kluisnummer: alleen het beloofde nummer, één ernaast is bijna', async () => {
    const k = (v: string) => beoordeelAntwoord(v, DUA_HASHES.kluis ?? [], DUA_REGELS.kluis);
    expect(await k('12')).toBe('bijna');
    expect(await k('14')).toBe('bijna');
    expect(await k('31')).toBe('fout');
  });

  it('doorslag: hoofdletters en leestekens maken niet uit, één letter ernaast is bijna', () => {
    expect(beoordeelDoorslag(' Kluis. ', 'kluis')).toBe('juist');
    expect(beoordeelDoorslag('kluus', 'kluis')).toBe('bijna');
    expect(beoordeelDoorslag('trein', 'kluis')).toBe('fout');
    expect(beoordeelDoorslag('', 'kluis')).toBe('fout');
  });

  it('alleenCijfers', () => {
    expect(alleenCijfers('nr. 1 3')).toBe('13');
  });
});

describe('D.U.A.: vrijgave', () => {
  it('komt overeen met ontgrendeld() uit dua-ui', () => {
    const toestanden: Record<string, boolean>[] = [
      {},
      { p0: true },
      { p0: true, p1: true },
      { p0: true, p1: true, p2: true, p3: true },
    ];
    for (const status of toestanden) {
      for (let i = 1; i <= 5; i++) {
        const vereist = DUA_VRIJGAVE[`p${i}`] ?? [];
        expect(vereist.every(v => (status as Record<string, boolean>)[v])).toBe(
          ontgrendeld(status, i),
        );
      }
    }
  });

  it('meldt na P1 wat elk tijdperk nu kan', () => {
    expect(duaVrijgaveMelding('1934', { p0: true }, { p0: true, p1: true })?.tekst).toContain(
      'kluis',
    );
    expect(duaVrijgaveMelding('2034', { p0: true }, { p0: true, p1: true })?.tekst).toContain(
      'getuigen',
    );
    expect(duaVrijgaveMelding('2034', { p0: true }, { p0: true })).toBeNull();
  });

  it('heeft een inactiviteitsmelding per puzzel voor beide tijdperken', () => {
    for (const t of ['1934', '2034'] as const) {
      expect(Object.keys(DUA_INACTIEF[t]).sort()).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5']);
    }
  });
});

describe('D.U.A.: geen weggeefsels of vastlopers', () => {
  it('geen hint geeft letterlijk de oplossing', () => {
    for (const bestand of ['speler-1934.html', 'speler-2034.html']) {
      expect(lees(bestand)).not.toMatch(/» Oplossing:/);
    }
  });

  it('1934 heeft hints voor de typemachine, de kluis en de bergplaats', () => {
    const html = lees('speler-1934.html');
    for (const id of ['hint-p1a', 'hint-p2a', 'hint-p4a', 'hint-p5a'])
      expect(html).toContain(`id="${id}"`);
  });

  it('alle labels in de werkkamer staan in dezelfde schrijfwijze', () => {
    for (const bestand of ['speler-1934.html', 'speler-2034.html']) {
      const html = lees(bestand);
      expect(html).not.toContain('>vensterbank<');
      expect(html).not.toContain('>losse vloerplank<');
    }
  });

  it('het kluisslot werkt met knoppen, niet met een dubbelklik', () => {
    expect(lees('speler-2034.html')).toContain('id="btn-cijfer-ok"');
    expect(lees('js/speler-2034.ts')).not.toContain("'dblclick'");
  });

  it('tijd-voorbij eindigt met de oplossing en een review', () => {
    const html = lees('tijd-voorbij.html');
    expect(html).toContain('id="oplossing-blok"');
    expect(html).toContain('id="review-sterren"');
    expect(duaOplossing()).toHaveLength(5);
    expect(lees('js/dua-oplossing.ts')).not.toMatch(/KLUIS|Sint-Baafs/);
  });
});

describe('maakSvgToegankelijk', () => {
  it('maakt plekken focusbaar en klikbaar met Enter', () => {
    document.body.innerHTML = `<svg><rect data-plek="schouw"></rect></svg>`;
    const rect = document.querySelector('rect')!;
    const klik = vi.fn();
    rect.addEventListener('click', klik);
    maakSvgToegankelijk('[data-plek]');
    expect(rect.getAttribute('tabindex')).toBe('0');
    expect(rect.getAttribute('aria-label')).toBe('Schouw');
    rect.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(klik).toHaveBeenCalledOnce();
  });
});
