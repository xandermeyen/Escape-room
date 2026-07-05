import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks (dua-ui.ts en zijn imports gebruiken deze) ─────────────────

vi.mock('firebase/database', () => ({
  ref:             vi.fn((_db: unknown, path: string) => ({ path })),
  set:             vi.fn(() => Promise.resolve()),
  get:             vi.fn(),
  update:          vi.fn(() => Promise.resolve()),
  onValue:         vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  runTransaction:  vi.fn(),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

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
    document.body.innerHTML = [1, 2, 3, 4, 5]
      .map((i) => `<div id="pz${i}"></div>`)
      .join('');
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
