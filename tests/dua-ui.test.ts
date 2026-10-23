import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks (dua-ui.ts en zijn imports gebruiken deze) ─────────────────

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  get: vi.fn(),
  update: vi.fn(() => Promise.resolve()),
  onValue: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  runTransaction: vi.fn(),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/session.ts', () => ({ valideerSessie: vi.fn() }));
vi.mock('../experiences/dua/js/dua-audio.ts', () => ({
  fx: new Proxy({}, { get: () => vi.fn() }),
  isGedempt: vi.fn(),
  wisselGeluid: vi.fn(),
}));
vi.mock('../experiences/dua/js/dua-session.ts', () => ({
  telHint: vi.fn(() => Promise.resolve()),
  zetBadge: vi.fn(),
}));

import { ontgrendeld, tekenVoortgang } from '../experiences/dua/js/dua-ui.ts';

// ── ontgrendeld: de kern van de D.U.A.-voortgangsketen ────────────────────────
// P0 (handdruk) → P1 (brief) → P2 & P3 (parallel) → P4 (museum) → P5 (stadsplan)

describe('ontgrendeld', () => {
  it('P1 vereist P0', () => {
    expect(ontgrendeld({}, 1)).toBe(false);
    expect(ontgrendeld({ p0: true }, 1)).toBe(true);
  });

  it('P2 en P3 komen samen vrij na P1', () => {
    const naP1 = { p0: true, p1: true };
    expect(ontgrendeld(naP1, 2)).toBe(true);
    expect(ontgrendeld(naP1, 3)).toBe(true);
    expect(ontgrendeld({ p0: true }, 2)).toBe(false);
    expect(ontgrendeld({ p0: true }, 3)).toBe(false);
  });

  it('P4 vereist P2 én P3', () => {
    expect(ontgrendeld({ p1: true, p2: true }, 4)).toBe(false);
    expect(ontgrendeld({ p1: true, p3: true }, 4)).toBe(false);
    expect(ontgrendeld({ p1: true, p2: true, p3: true }, 4)).toBe(true);
  });

  it('P5 vereist P4', () => {
    expect(ontgrendeld({ p2: true, p3: true }, 5)).toBe(false);
    expect(ontgrendeld({ p4: true }, 5)).toBe(true);
  });

  it('onbekende stappen zijn nooit ontgrendeld', () => {
    expect(ontgrendeld({ p0: true, p1: true }, 0)).toBe(false);
    expect(ontgrendeld({ p0: true, p1: true }, 6)).toBe(false);
  });
});

// ── tekenVoortgang ────────────────────────────────────────────────────────────

describe('tekenVoortgang', () => {
  beforeEach(() => {
    document.body.innerHTML = [1, 2, 3, 4, 5].map(i => `<div id="pz${i}"></div>`).join('');
  });

  const heeft = (i: number, klasse: string) =>
    document.getElementById(`pz${i}`)!.classList.contains(klasse);

  it('markeert opgeloste puzzels als af en bereikbare als open', () => {
    tekenVoortgang({ p0: true, p1: true });
    expect(heeft(1, 'af')).toBe(true);
    expect(heeft(2, 'open')).toBe(true);
    expect(heeft(3, 'open')).toBe(true);
    expect(heeft(4, 'open')).toBe(false); // vergrendeld tot P2+P3
    expect(heeft(5, 'open')).toBe(false);
  });

  it('crasht niet als elementen ontbreken', () => {
    document.body.innerHTML = '';
    expect(() => tekenVoortgang({ p1: true })).not.toThrow();
  });
});

describe('ontgrendeld volgt DUA_VRIJGAVE', () => {
  it('geeft dezelfde uitkomst als de vrijgavetabel', async () => {
    const { ontgrendeld } = await import('../experiences/dua/js/dua-ui.ts');
    const { DUA_VRIJGAVE } = await import('../experiences/dua/js/dua-config.ts');
    const p = { p0: true, p1: true, p2: true, p3: false, p4: false };
    expect(ontgrendeld(p, 1)).toBe(true);
    expect(ontgrendeld(p, 2)).toBe(true);
    expect(ontgrendeld(p, 4)).toBe(false);
    expect(ontgrendeld({ ...p, p3: true }, 4)).toBe(true);
    expect(ontgrendeld(p, 0)).toBe(false);
    expect(ontgrendeld(p, 6)).toBe(false);
    for (let i = 1; i <= 5; i++) {
      const alles = Object.fromEntries((DUA_VRIJGAVE[`p${i}`] ?? []).map(v => [v, true]));
      expect(ontgrendeld(alles, i)).toBe(true);
    }
  });
});

// ── Hints: bewaard over een herlaad, en elke stap telt één keer ──────────────
import { herstelHints, duaHint } from '../experiences/dua/js/dua-ui.ts';
import { telHint } from '../experiences/dua/js/dua-session.ts';

describe('hints bewaren', () => {
  const blokHtml = `
    <div class="hint-blok" id="hint-test">
      <button class="hint-knop">Hint vragen</button>
      <div class="hint-stap verborgen">een</div>
      <div class="hint-stap verborgen">twee</div>
      <div class="hint-stap verborgen">drie</div>
      <button class="hint-verder verborgen">Nog een hint</button>
    </div>`;
  const open = () => document.querySelectorAll('.hint-stap:not(.verborgen)').length;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = blokHtml;
    vi.mocked(telHint).mockClear();
  });

  it('een geopende stap blijft open na een herlaad en telt niet opnieuw', () => {
    duaHint('SES', 'hint-test');
    duaHint('SES', 'hint-test');
    expect(open()).toBe(2);
    expect(telHint).toHaveBeenCalledTimes(2);

    document.body.innerHTML = blokHtml; // herlaad: alles weer verborgen
    herstelHints('SES');
    expect(open()).toBe(2);
    expect(document.querySelector('.hint-knop')!.classList).toContain('verborgen');
    expect(document.querySelector('.hint-verder')!.classList).not.toContain('verborgen');
    expect(telHint).toHaveBeenCalledTimes(2);

    duaHint('SES', 'hint-test'); // de derde stap is echt nieuw
    expect(open()).toBe(3);
    expect(telHint).toHaveBeenCalledTimes(3);
  });

  it('een andere sessie erft geen geopende hints', () => {
    duaHint('SES', 'hint-test');
    document.body.innerHTML = blokHtml;
    herstelHints('ANDER');
    expect(open()).toBe(0);
  });
});
