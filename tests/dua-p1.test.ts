/**
 * D.U.A. P1 (herontwerp): de typemachine en het woord kunnen alleen samen.
 * 1934 heeft vaknummers en een gecodeerd briefje, 2034 het restauratieverslag
 * en de codekaart (RR-12). Deze tests houden de pagina's en de antwoorden in lijn.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// dua-session.ts importeert Firebase; voor de constanten is dat niet nodig.
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import { antwoordKlopt } from '../shared/js/utils.ts';
import { DUA_HASHES, archiefNummer } from '../experiences/dua/js/dua-config.ts';
import { BRIEFTEKST, HAMERS_GOED, HAMERS_START } from '../experiences/dua/js/dua-session.ts';

const pagina = (bestand: string): Document =>
  new DOMParser().parseFromString(
    readFileSync(resolve(__dirname, '../experiences/dua', bestand), 'utf8'),
    'text/html',
  );

const p1934 = pagina('speler-1934.html');
const p2034 = pagina('speler-2034.html');

/** Leest de codekaart uit de 2034-pagina: rij 1 tot 5, kolom 1 tot 5. */
function codekaart(): string[][] {
  return [...p2034.querySelectorAll('#codekaart tbody tr')].map(tr =>
    [...tr.querySelectorAll('td')].map(td => td.textContent?.trim() ?? ''),
  );
}

/** De getallen op het briefje van de Loper (1934). */
function loperCode(): string[] {
  const tekst = p1934.querySelector('.loper-code')?.textContent ?? '';
  return tekst.match(/\d{2}/g) ?? [];
}

function ontcijfer(code: string[], kaart: string[][]): string {
  return code.map(g => kaart[Number(g[0]) - 1]?.[Number(g[1]) - 1] ?? '?').join('');
}

describe('D.U.A. P1: codekaart en briefje van de Loper', () => {
  it('de codekaart is 5 bij 5 met 25 verschillende letters', () => {
    const kaart = codekaart();
    expect(kaart).toHaveLength(5);
    for (const rij of kaart) expect(rij).toHaveLength(5);
    expect(new Set(kaart.flat()).size).toBe(25);
  });

  it('het briefje ontcijfert tot het antwoord van P1', async () => {
    const woord = ontcijfer(loperCode(), codekaart());
    expect(woord).toHaveLength(5);
    expect(await antwoordKlopt(woord.toLowerCase(), DUA_HASHES.woord ?? [])).toBe(true);
  });

  it('het voorbeeld op de codekaart klopt', () => {
    const tekst = p2034.querySelector('#codekaart')?.textContent ?? '';
    const m = /Voorbeeld:\s*(\d)(\d) is ([A-Z])/.exec(tekst);
    expect(m).not.toBeNull();
    const [, r, k, letter] = m ?? [];
    expect(codekaart()[Number(r) - 1]?.[Number(k) - 1]).toBe(letter);
    // Het voorbeeld mag geen letter van het antwoord verklappen.
    expect(loperCode()).not.toContain(`${r}${k}`);
  });

  it('de letters van het woord staan in leesvolgorde in de brief', () => {
    const woord = ontcijfer(loperCode(), codekaart());
    let vanaf = 0;
    for (const letter of woord) {
      const i = BRIEFTEKST.indexOf(letter, vanaf);
      expect(i, `letter ${letter}`).toBeGreaterThan(-1);
      vanaf = i + 1;
    }
  });

  it('de codekaart is pas zichtbaar na het opzoeken', () => {
    expect(p2034.getElementById('codekaart')?.classList.contains('verborgen')).toBe(true);
  });

  it('archiefNummer begrijpt de gangbare schrijfwijzen', () => {
    for (const invoer of ['RR-12', 'rr-12', 'RR 12', 'RR12', '12', ' RR-012 ']) {
      expect(archiefNummer(invoer), invoer).toBe(12);
    }
    expect(archiefNummer('RR-13')).toBe(13);
    expect(archiefNummer('RR-')).toBeNull();
    expect(archiefNummer('brief 12')).toBeNull();
  });
});

describe('D.U.A. P1: typemachine', () => {
  it('het restauratieverslag toont de hamers in de juiste volgorde', () => {
    const letters = [...p2034.querySelectorAll('#typekoppen .typekop-letter')].map(
      el => el.textContent?.trim() ?? '',
    );
    expect(letters.join('')).toBe(HAMERS_GOED);
  });

  it('elke vak start met een verkeerde hamer, en de volgorde is niet alfabetisch', () => {
    for (let i = 0; i < HAMERS_GOED.length; i++) {
      expect(HAMERS_START[i]).not.toBe(HAMERS_GOED[i]);
    }
    expect(HAMERS_GOED).not.toBe([...HAMERS_GOED].sort().join(''));
  });

  it('de hint van 1934 noemt dezelfde volgorde als het verslag', () => {
    const hint = p1934.querySelector('#hint-p1a')?.textContent ?? '';
    expect(hint.replace(/\s+/g, ' ')).toContain(`vak 1 tot 6: ${[...HAMERS_GOED].join(', ')}`);
  });

  it('de hints van P1 blijven bereikbaar terwijl de brief vergrendeld is', () => {
    const css = readFileSync(resolve(__dirname, '../experiences/dua/css/dua.css'), 'utf8');
    expect(css).toMatch(/\.stuk\.slot \.hint-blok\s*\{\s*pointer-events: auto;/);
    expect(p1934.querySelector('#s-brief.slot #hint-p1a')).not.toBeNull();
  });
});
