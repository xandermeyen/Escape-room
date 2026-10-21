import { describe, it, expect, afterEach, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FRAGMENT_TEKST,
  SPREKER,
  VOICEMAIL_TEKST,
  GELUIDSMELDING,
  gehoordeFragmenten,
  toonBerichten,
  toonOndertitel,
  toonGeluidsmelding,
} from '../experiences/kamer-14/js/berichten.ts';
import {
  FRAGMENTEN,
  FRAGMENT_NA_PUZZEL,
  KORTJAKJE,
  type FragmentId,
} from '../experiences/kamer-14/js/audio.ts';
import { EINDES } from '../experiences/kamer-14/js/eindes.ts';
import { KAMER14_PUZZELS } from '../experiences/kamer-14/js/kamer14-config.ts';

const IDS = Object.keys(FRAGMENTEN) as FragmentId[];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Kamer 14: verhaalfragmenten', () => {
  it('elk fragment heeft een spreker en een tekst', () => {
    for (const id of IDS) {
      expect(SPREKER[id]).toBeTruthy();
      expect(FRAGMENT_TEKST[id].length).toBeGreaterThan(40);
    }
  });

  it('fragmenten volgen enkel op bestaande puzzels', () => {
    for (const puzzel of Object.keys(FRAGMENT_NA_PUZZEL)) {
      expect(KAMER14_PUZZELS).toContain(puzzel);
    }
  });

  it('teksten zonder gedachtestreepjes', () => {
    const alle = [
      ...Object.values(FRAGMENT_TEKST),
      ...Object.values(VOICEMAIL_TEKST),
      ...Object.values(EINDES).flatMap(e => e.alineas),
    ];
    for (const tekst of alle) expect(tekst).not.toMatch(/[—–]/);
  });

  it('de voicemail noemt het uur nooit', () => {
    const tekst = Object.values(VOICEMAIL_TEKST).join(' ');
    expect(tekst).not.toMatch(/\b(tien|10)\b/i);
  });

  it('het beiaarddeuntje begint met do do sol sol la la sol', () => {
    const [c, c2, g, g2, a, a2, g3] = KORTJAKJE;
    expect(c).toBe(c2);
    expect(g).toBe(g2);
    expect(a).toBe(a2);
    expect(g3).toBe(g);
    expect(g! / c!).toBeCloseTo(1.5, 2); // kwint
  });
});

describe('Kamer 14: berichten in de zijbalk', () => {
  it('de briefing staat er altijd, de rest pas na zijn puzzel', () => {
    expect(gehoordeFragmenten({})).toEqual(['briefing']);
    expect(gehoordeFragmenten({ p4: true })).toEqual(['briefing', 'wending']);
    expect(gehoordeFragmenten({ p4: true, p5: true, p6: true })).toEqual([
      'briefing',
      'wending',
      'telefoon',
      'dagboek',
    ]);
  });

  it('toont het nieuwste bericht bovenaan, met een knop om opnieuw te luisteren', () => {
    const lijst = document.createElement('div');
    const opnieuw = vi.fn();
    toonBerichten({ p4: true }, lijst, opnieuw);
    const koppen = [...lijst.querySelectorAll('summary')].map(s => s.textContent);
    expect(koppen).toEqual([SPREKER.wending, SPREKER.briefing]);
    lijst.querySelector<HTMLButtonElement>('.bericht-luister')!.click();
    expect(opnieuw).toHaveBeenCalledWith('wending');
  });

  it('de ondertitel verdwijnt als het fragment stopt', () => {
    const audio = document.createElement('audio');
    toonOndertitel('Katrijn', 'Hallo', audio);
    expect(document.getElementById('ondertitel')?.textContent).toBe('Katrijn: Hallo');
    audio.dispatchEvent(new Event('ended'));
    expect(document.getElementById('ondertitel')).toBeNull();
  });

  it('de geluidsmelding zet het geluid aan en sluit', () => {
    const zetAan = vi.fn();
    const el = toonGeluidsmelding(zetAan);
    expect(el.textContent).toContain(GELUIDSMELDING);
    el.querySelector<HTMLButtonElement>('.geluid-aan')!.click();
    expect(zetAan).toHaveBeenCalledOnce();
    expect(document.getElementById('geluidsmelding')).toBeNull();
  });
});

describe('Kamer 14: opnames', () => {
  const pad = (karakter: string, bestand: string) =>
    resolve(__dirname, '../public/experiences/kamer-14/audio', karakter, `${bestand}.mp3`);
  const alle = [
    ...IDS.map(id => FRAGMENTEN[id]),
    ...Object.values(EINDES).flatMap(e => e.audio),
    { karakter: 'marie', bestand: 'voicemail-1' },
    { karakter: 'marie', bestand: 'voicemail-2' },
  ];

  // Zodra de opnames er zijn, moet elk bestand bestaan. Tot dan: overslaan.
  const aanwezig = alle.some(a => existsSync(pad(a.karakter, a.bestand)));
  it.skipIf(!aanwezig).each(alle)('$karakter/$bestand.mp3 bestaat', ({ karakter, bestand }) => {
    expect(existsSync(pad(karakter, bestand))).toBe(true);
  });
});
