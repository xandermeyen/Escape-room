import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../shared/js/session.ts', () => ({ bepaalSpeltaal: vi.fn() }));

import { bepaalSpeltaal } from '../shared/js/session.ts';
import {
  startSpeltaal,
  vertaalDocument,
  veiligeInhoud,
  zoekSpeltaal,
} from '../shared/js/spelvertaling.ts';
import { SPELPAGINAS } from '../i18n/config.ts';
import en from '../i18n/spel/dua.en.ts';

const bepaal = bepaalSpeltaal as unknown as ReturnType<typeof vi.fn>;
const ROOT = resolve(import.meta.dirname, '..');

function html(fragment: DocumentFragment): string {
  const div = document.createElement('div');
  div.appendChild(fragment);
  return div.innerHTML;
}

describe('veiligeInhoud', () => {
  it('houdt eenvoudige opmaak en veilige links', () => {
    expect(html(veiligeInhoud('A <b>vet</b> en <em>schuin</em><br>regel'))).toBe(
      'A <b>vet</b> en <em>schuin</em><br>regel',
    );
    expect(html(veiligeInhoud('<a href="https://x.be" target="_blank" rel="noopener">x</a>'))).toBe(
      '<a href="https://x.be" target="_blank" rel="noopener">x</a>',
    );
    expect(html(veiligeInhoud('<span class="hintje">(P1)</span>'))).toBe(
      '<span class="hintje">(P1)</span>',
    );
  });

  it('laat scripts, event-handlers en gevaarlijke links niet door', () => {
    expect(html(veiligeInhoud('<img src=x onerror="alert(1)">tekst'))).toBe('tekst');
    expect(html(veiligeInhoud('<script>alert(1)</script>ok'))).toBe('alert(1)ok');
    expect(html(veiligeInhoud('<b onclick="alert(1)">vet</b>'))).toBe('<b>vet</b>');
    expect(html(veiligeInhoud('<a href="javascript:alert(1)">x</a>'))).toBe('<a>x</a>');
  });
});

describe('vertaalDocument', () => {
  beforeEach(() => {
    document.head.innerHTML = '<title data-i18n="t">Titel</title>';
    document.body.innerHTML = `
      <h3 data-i18n="kop">De <span class="hintje">(P1)</span> kop</h3>
      <input data-i18n-placeholder="veld" placeholder="Naam" />
      <p data-i18n="weg">Blijft</p>
      <button id="knop">Klik</button>`;
  });

  it('vervangt tekst en attributen, en laat de rest staan', () => {
    const ontbrekend = vertaalDocument({
      t: 'Title',
      kop: 'The <span class="hintje">(P1)</span> heading',
      veld: 'Name',
    });
    expect(document.title).toBe('Title');
    expect(document.querySelector('h3')!.innerHTML).toBe(
      'The <span class="hintje">(P1)</span> heading',
    );
    expect(document.querySelector('input')!.placeholder).toBe('Name');
    expect(document.querySelector('[data-i18n="weg"]')!.textContent).toBe('Blijft');
    expect(document.getElementById('knop')!.textContent).toBe('Klik');
    expect(ontbrekend).toEqual(['weg']);
  });
});

describe('zoekSpeltaal en startSpeltaal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    bepaal.mockReset();
    document.documentElement.lang = 'nl';
    document.documentElement.className = 'i18n-wacht';
  });
  afterEach(() => vi.useRealTimers());

  it('zonder sessie telt de hint', async () => {
    expect(await zoekSpeltaal(null, 'en')).toBe('en');
    expect(await zoekSpeltaal(null, null)).toBe('nl');
    expect(bepaal).not.toHaveBeenCalled();
  });

  it('vraagt de taal één keer aan Firebase en onthoudt ze per sessie', async () => {
    bepaal.mockResolvedValue('en');
    expect(await zoekSpeltaal('ABC-123', null)).toBe('en');
    expect(await zoekSpeltaal('ABC-123', null)).toBe('en');
    expect(bepaal).toHaveBeenCalledTimes(1);
  });

  it('antwoordt Firebase niet op tijd, dan de hint, zonder iets te onthouden', async () => {
    vi.useFakeTimers();
    bepaal.mockReturnValue(new Promise(() => {}));
    const taal = zoekSpeltaal('TRAAG-1', 'en');
    await vi.advanceTimersByTimeAsync(3000);
    expect(await taal).toBe('en');
    expect(sessionStorage.getItem('speltaal:TRAAG-1')).toBeNull();
  });

  it('een Nederlandse sessie: niets vertaald, pagina zichtbaar', async () => {
    bepaal.mockResolvedValue('nl');
    document.body.innerHTML = '<p data-i18n="dua-tijd.body.se">De lijn valt stil.</p>';
    expect(await startSpeltaal('dua', 'NL-1')).toBe('nl');
    expect(document.body.textContent).toBe('De lijn valt stil.');
    expect(document.documentElement.classList.contains('i18n-wacht')).toBe(false);
  });

  it('een Engelse sessie: lang="en" en de Engelse tekst', async () => {
    bepaal.mockResolvedValue('en');
    document.body.innerHTML = '<p data-i18n="dua-tijd.body.se">De lijn valt stil.</p>';
    expect(await startSpeltaal('dua', 'EN-1')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.body.textContent).toBe('The line goes dead.');
    expect(document.documentElement.classList.contains('i18n-wacht')).toBe(false);
  });

  it('een fout toont de pagina toch, in het Nederlands', async () => {
    bepaal.mockRejectedValue(new Error('stuk'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startSpeltaal('dua', 'FOUT-1')).toBe('nl');
    expect(document.documentElement.classList.contains('i18n-wacht')).toBe(false);
  });
});

describe('D.U.A.-pagina’s', () => {
  it.each(SPELPAGINAS.map(p => p.bron))('%s wacht op de vertaling', bron => {
    const doc = new JSDOM(readFileSync(resolve(ROOT, bron), 'utf8')).window.document;
    expect(doc.documentElement.classList.contains('i18n-wacht')).toBe(true);
  });

  it.each(SPELPAGINAS.map(p => p.bron))(
    '%s: elke Engelse vertaling komt veilig en volledig door',
    bron => {
      const doc = new JSDOM(readFileSync(resolve(ROOT, bron), 'utf8')).window.document;
      const ontbrekend = vertaalDocument(en, doc as unknown as Document);
      expect(ontbrekend).toEqual([]);
      // Niets van de opmaak in de vertalingen gaat verloren door de filter.
      for (const [sleutel, waarde] of Object.entries(en)) {
        if (typeof waarde !== 'string') continue;
        const el = doc.querySelector(`[data-i18n="${sleutel}"]`);
        if (!el) continue;
        const verwacht = new JSDOM(`<body>${waarde}</body>`).window.document.body.innerHTML;
        expect(el.innerHTML, sleutel).toBe(verwacht);
      }
    },
  );

  it('de startmodules vertalen vóór ze iets anders doen', () => {
    for (const f of ['lobby', 'speler-1934', 'speler-2034', 'einde', 'tijd-voorbij']) {
      const code = readFileSync(resolve(ROOT, `experiences/dua/js/${f}.ts`), 'utf8');
      const start = code.indexOf("await startSpeltaal('dua');");
      expect(start, f).toBeGreaterThan(0);
      const naImports = code.slice(0, start).replace(/import[\s\S]*?;\n/g, '');
      expect(
        naImports
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*\n/g, '')
          .trim(),
        f,
      ).toBe('');
    }
  });
});
