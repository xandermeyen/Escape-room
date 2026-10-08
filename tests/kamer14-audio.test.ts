import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  KAMER14_BERICHTEN,
  PUZZEL_NRS,
  heeftBerichten,
  zichtbareBerichten,
  toonBerichten,
  toonOndertitel,
  toonGeluidsmelding,
  geluidsmeldingTekst,
} from '../experiences/kamer-14/js/berichten.ts';
import {
  wachttijdFragment,
  DUUR_A_SEC,
  WACHT_NA_UNLOCK_MS,
  PAUZE_TUSSEN_MS,
} from '../experiences/kamer-14/js/audio.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');

/** Vult tijdelijk een tekst in, en zet alles daarna terug. */
const origineel = structuredClone(KAMER14_BERICHTEN);
afterEach(() => {
  Object.assign(KAMER14_BERICHTEN.a, origineel.a);
  Object.assign(KAMER14_BERICHTEN.b, origineel.b);
  document.body.innerHTML = '';
});

describe('Kamer 14: volgorde van de fragmenten', () => {
  it('A begint na het unlock-geluid', () => {
    expect(wachttijdFragment('a', 'p1')).toBe(WACHT_NA_UNLOCK_MS);
  });

  it.each(PUZZEL_NRS)('B wacht bij %s tot het fragment van A gedaan is', nr => {
    const eindeA = WACHT_NA_UNLOCK_MS + DUUR_A_SEC[nr] * 1000;
    expect(wachttijdFragment('b', nr)).toBeGreaterThanOrEqual(eindeA + PAUZE_TUSSEN_MS);
  });

  it('B gebruikt de echte lengte van het bestand als die gekend is', () => {
    expect(wachttijdFragment('b', 'p1', 10)).toBe(WACHT_NA_UNLOCK_MS + 10_000 + PAUZE_TUSSEN_MS);
  });
});

describe('Kamer 14: berichten', () => {
  it('heeft een tekstveld voor elk opgenomen fragment', () => {
    for (const rol of ['a', 'b'] as const) {
      expect(Object.keys(KAMER14_BERICHTEN[rol])).toEqual(PUZZEL_NRS);
    }
  });

  it('teksten zonder gedachtestreepjes', () => {
    for (const rol of ['a', 'b'] as const) {
      for (const nr of PUZZEL_NRS) expect(KAMER14_BERICHTEN[rol][nr]).not.toMatch(/[—–]/);
    }
  });

  it('toont enkel berichten van opgeloste puzzels met een tekst', () => {
    KAMER14_BERICHTEN.a.p1 = 'Tekst na vraag 1.';
    KAMER14_BERICHTEN.a.p2 = 'Tekst na vraag 2.';
    expect(heeftBerichten('a')).toBe(true);
    expect(zichtbareBerichten('a', { p1: true })).toEqual([
      { nr: 'p1', tekst: 'Tekst na vraag 1.' },
    ]);

    document.body.innerHTML = '<div id="berichten-lijst"></div>';
    toonBerichten('a', { p1: true, p2: true, p3: true });
    const lijst = document.getElementById('berichten-lijst');
    expect(lijst?.querySelectorAll('.bericht')).toHaveLength(2);
    expect(lijst?.textContent).toContain('An Vermeersch · na vraag 2');
  });

  it('zonder teksten blijft de tab verborgen en noemt de melding hem niet', () => {
    for (const rol of ['a', 'b'] as const) {
      if (heeftBerichten(rol)) continue;
      expect(geluidsmeldingTekst(rol)).not.toContain('tab Berichten');
    }
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      expect(lees(bestand)).toMatch(/id="tab-berichten" hidden/);
      expect(lees(bestand)).toContain('id="berichten-lijst"');
    }
  });

  it('de ondertitel verschijnt tijdens het fragment en verdwijnt erna', () => {
    KAMER14_BERICHTEN.b.p3 = 'Sommige weken kreeg ik niets.';
    const audio = document.createElement('audio');
    toonOndertitel('b', 'p3', audio);
    expect(document.getElementById('ondertitel')?.textContent).toBe(
      'Katrijn: Sommige weken kreeg ik niets.',
    );
    audio.dispatchEvent(new Event('ended'));
    expect(document.getElementById('ondertitel')).toBeNull();
  });

  it('geen ondertitel zonder tekst', () => {
    KAMER14_BERICHTEN.b.p3 = '';
    toonOndertitel('b', 'p3', document.createElement('audio'));
    expect(document.getElementById('ondertitel')).toBeNull();
  });
});

describe('Kamer 14: geluidsmelding', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div class="tabs"></div>';
  });

  it('staat boven de tabs en zet het geluid aan met één klik', () => {
    let aan = 0;
    const el = toonGeluidsmelding('a', () => aan++);
    expect(el.nextElementSibling?.className).toBe('tabs');
    expect(el.textContent).toContain('bericht van An Vermeersch');
    el.querySelector<HTMLButtonElement>('.geluid-aan')?.click();
    expect(aan).toBe(1);
    expect(document.getElementById('geluidsmelding')).toBeNull();
  });

  it('verschijnt maar één keer tegelijk', () => {
    toonGeluidsmelding('b', () => {});
    toonGeluidsmelding('b', () => {});
    expect(document.querySelectorAll('#geluidsmelding')).toHaveLength(1);
  });

  it('noemt de tab Berichten zodra er teksten zijn', () => {
    KAMER14_BERICHTEN.b.p1 = 'Iets.';
    expect(geluidsmeldingTekst('b')).toContain('tab Berichten');
  });

  it("beide spelerpagina's tonen de melding bij de start", () => {
    for (const bestand of ['js/speler-a.ts', 'js/speler-b.ts']) {
      expect(lees(bestand)).toMatch(/\ntoonGeluidsmelding\('[ab]', zetGeluidAan\);/);
      expect(lees(bestand)).toMatch(/bijFout: \(\) => toonGeluidsmelding/);
    }
  });
});
