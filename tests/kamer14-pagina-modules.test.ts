import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/tijd-voorbij.ts', () => ({
  sluitSessieUitUrl: vi.fn(() => Promise.resolve(false)),
}));
vi.mock('../shared/js/review-form.ts', () => ({ koppelReviewFormulier: vi.fn() }));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import {
  KAMER14_PUZZELS,
  KAMER14_SLOT_PUZZELS,
} from '../experiences/kamer-14/js/kamer14-config.ts';
import { pasZichtbaarheidToe } from '../experiences/kamer-14/js/kamer14-speler.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');
const body = (bestand: string) =>
  (lees(bestand).match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '').replace(
    /<script[\s\S]*?<\/script>/g,
    '',
  );
const SPELERS = ['speler-a.html', 'speler-b.html'];

describe("geen inline scripts in de Kamer 14-pagina's", () => {
  it.each([...SPELERS, 'einde.html', 'tijd-voorbij.html', 'index.html'])(
    '%s heeft enkel <script type="module" src>',
    bestand => {
      const scripts = lees(bestand).match(/<script\b[^>]*>/g) ?? [];
      scripts.forEach(tag => expect(tag).toMatch(/type="module"[^>]*src=|src=[^>]*type="module"/));
    },
  );
});

describe.each(SPELERS)('%s: opbouw van de kamer', bestand => {
  beforeEach(() => {
    document.body.innerHTML = body(bestand);
  });

  it('elk voorwerp opent een close-up die bestaat', () => {
    const knoppen = [...document.querySelectorAll<HTMLElement>('[data-open]')];
    expect(knoppen.length).toBeGreaterThan(4);
    for (const k of knoppen) {
      const doel = document.getElementById(k.dataset['open']!);
      expect(doel?.tagName, k.dataset['open']).toBe('DIALOG');
    }
  });

  it('elke close-up heeft een titel en een knop om terug te gaan', () => {
    for (const d of document.querySelectorAll('dialog.closeup')) {
      const titel = d.getAttribute('aria-labelledby');
      expect(titel && document.getElementById(titel), d.id).toBeTruthy();
      expect(d.querySelector('[data-sluit]'), d.id).not.toBeNull();
    }
  });

  it('data-na en data-weg-na noemen enkel bestaande puzzels', () => {
    for (const el of document.querySelectorAll<HTMLElement>('[data-na], [data-weg-na]')) {
      const lijst = `${el.dataset['na'] ?? ''} ${el.dataset['wegNa'] ?? ''}`.trim().split(/\s+/);
      for (const p of lijst) expect(KAMER14_PUZZELS).toContain(p);
    }
  });

  it('elk voorwerp heeft een toegankelijke naam', () => {
    for (const v of document.querySelectorAll<HTMLElement>('.voorwerp')) {
      const naam = v.getAttribute('aria-label') ?? v.textContent?.trim();
      expect(naam, v.outerHTML.slice(0, 80)).toBeTruthy();
    }
  });

  it('wat pas later verschijnt, is bij het begin verborgen en daarna zichtbaar', () => {
    const later = document.querySelector<HTMLElement>('[data-na]');
    if (!later) return;
    const nodig = later.dataset['na']!.split(/\s+/);
    pasZichtbaarheidToe({}, document.body);
    expect(later.hasAttribute('hidden')).toBe(true);
    pasZichtbaarheidToe(Object.fromEntries(nodig.map(p => [p, true])), document.body);
    expect(later.hasAttribute('hidden')).toBe(false);
  });

  it('geen gedachtestreepjes in wat spelers lezen', () => {
    expect(document.body.textContent).not.toMatch(/[—–]/);
  });
});

describe('sloten', () => {
  it('elk slot staat op precies één spelerpagina', () => {
    for (const p of KAMER14_SLOT_PUZZELS) {
      const waar = SPELERS.filter(b =>
        new RegExp(`class="slot-open[^"]*" id="btn-${p}"`).test(lees(b)),
      );
      expect(waar, p).toHaveLength(1);
    }
  });

  it('A heeft de computer en het notitieblok, B de gsm, de spaardoos en de schriften', () => {
    const plek = (p: string) => SPELERS.find(b => lees(b).includes(`id="btn-${p}"`));
    expect(['p0', 'p1', 'p3'].map(plek)).toEqual(Array(3).fill('speler-a.html'));
    expect(['p2', 'p4', 'p5'].map(plek)).toEqual(Array(3).fill('speler-b.html'));
  });
});

describe('spelerteksten in de code', () => {
  const bronnen = [
    '../shared/js/utils.ts',
    '../shared/js/deel.ts',
    '../shared/js/timer.ts',
    '../experiences/kamer-14/js/kamer14-config.ts',
    '../experiences/kamer-14/js/kamer14-hulp.ts',
    '../experiences/kamer-14/js/hints.ts',
    '../experiences/kamer-14/js/berichten.ts',
    '../experiences/kamer-14/js/eindes.ts',
    '../experiences/kamer-14/js/einde.ts',
    '../experiences/dua/js/dua-session.ts',
  ];

  it.each(bronnen)('%s: geen gedachtestreepje in een tekst tussen aanhalingstekens', pad => {
    const code = readFileSync(resolve(__dirname, pad), 'utf8')
      .split('\n')
      .filter(regel => !/^\s*(\/\/|\*|\/\*)/.test(regel))
      .join('\n');
    expect(code).not.toMatch(/['`][^'`\n]*[—–][^'`\n]*['`]/);
  });

  it('feedback bij een juist antwoord noemt Firebase niet', () => {
    const utils = readFileSync(resolve(__dirname, '../shared/js/utils.ts'), 'utf8');
    expect(utils).not.toMatch(/textContent = '[^']*Firebase/);
  });
});

describe('tijd voorbij: nieuwe post', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    window.history.replaceState({}, '', '/experiences/kamer-14/tijd-voorbij.html');
    document.body.innerHTML = body('tijd-voorbij.html');
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => vi.useRealTimers());

  it('verschijnt na 4 seconden en opent de briefkaart met een klik of Enter', async () => {
    await import('../experiences/kamer-14/js/tijd-voorbij.ts');
    const notif = document.getElementById('nieuwe-post-notif')!;
    expect(notif.classList).toContain('verborgen');
    vi.advanceTimersByTime(4000);
    expect(notif.classList).not.toContain('verborgen');
    notif.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(document.getElementById('briefkaart-blok')!.classList).not.toContain('verborgen');
    expect(notif.style.display).toBe('none');
  });

  it('de briefkaart past bij het nieuwe verhaal', () => {
    const t = document.body.textContent ?? '';
    expect(t).toContain('Lieve Katrijn');
    expect(t).not.toMatch(/bloemenzaak|ontbijt/);
  });
});
