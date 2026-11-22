import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUA_HINTS, bewaakHints, vulZichtbareHints } from '../experiences/dua/js/dua-hints.ts';

const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

describe('D.U.A.-hints staan niet in de paginabron', () => {
  it.each(['experiences/dua/speler-1934.html', 'experiences/dua/speler-2034.html'])(
    '%s: elke hintstap is leeg, en elk blok heeft evenveel stappen als teksten',
    pad => {
      const doc = new DOMParser().parseFromString(lees(pad), 'text/html');
      const blokken = doc.querySelectorAll<HTMLElement>('.hint-blok[id]');
      expect(blokken.length).toBeGreaterThan(0);
      blokken.forEach(blok => {
        const stappen = blok.querySelectorAll('.hint-stap');
        expect(DUA_HINTS[blok.id], blok.id).toBeDefined();
        expect(stappen.length, blok.id).toBe(DUA_HINTS[blok.id]!.length);
        stappen.forEach(stap => expect(stap.textContent?.trim(), blok.id).toBe(''));
      });
    },
  );
});

describe('D.U.A.-hints vullen', () => {
  const html = `
    <div class="hint-blok" id="hint-p1a">
      <div class="hint-stap verborgen"></div>
      <div class="hint-stap verborgen"></div>
      <div class="hint-stap verborgen"></div>
    </div>`;

  it('enkel zichtbare stappen krijgen hun tekst', () => {
    document.body.innerHTML = html;
    const stappen = document.querySelectorAll('.hint-stap');
    stappen[0]!.classList.remove('verborgen');
    vulZichtbareHints();
    expect(stappen[0]!.textContent).toBe(DUA_HINTS['hint-p1a']![0]);
    expect(stappen[1]!.textContent).toBe('');
    expect(stappen[2]!.textContent).toBe('');
  });

  it('een stap die later zichtbaar wordt, krijgt meteen zijn tekst', async () => {
    document.body.innerHTML = html;
    const kijker = bewaakHints(document.body);
    const stap = document.querySelectorAll('.hint-stap')[1]!;
    stap.classList.remove('verborgen');
    await Promise.resolve();
    expect(stap.textContent).toBe(DUA_HINTS['hint-p1a']![1]);
    kijker.disconnect();
  });
});
