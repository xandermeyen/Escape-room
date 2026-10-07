import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  onValue: vi.fn(() => vi.fn()),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  increment: vi.fn(() => ({ '.sv': { increment: 1 } })),
}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/reviews.ts', () => ({ schrijfReview: vi.fn() }));

import { set, runTransaction } from 'firebase/database';
import { DEMO_CODES, isDemoCode, koppelDemoModus } from '../shared/js/demo.ts';
import { resetDemo } from '../shared/js/session.ts';
import { registreerPoging, registreerHint, registreerOpgelost } from '../shared/js/speldata.ts';
import { koppelReviewFormulier } from '../shared/js/review-form.ts';
import { schrijfReview } from '../shared/js/reviews.ts';

const setMock = set as unknown as ReturnType<typeof vi.fn>;
const txMock = runTransaction as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('demo-codes', () => {
  it('één vaste, geldige code per experience', () => {
    expect(DEMO_CODES['kamer-14']).toBe('DEMO-K14');
    expect(DEMO_CODES.dua).toBe('DEMO-DUA');
    for (const code of Object.values(DEMO_CODES)) expect(code).toMatch(/^[A-Z0-9-]{3,20}$/);
  });

  it('herkent demo-sessies aan de code', () => {
    expect(isDemoCode('DEMO-K14')).toBe(true);
    expect(isDemoCode('ABC-234')).toBe(false);
    expect(isDemoCode(null)).toBe(false);
  });
});

describe('rolwissel op de spelerpagina', () => {
  it('verschijnt alleen in demomodus', () => {
    expect(koppelDemoModus('ABC-234', 'Speler A', [])).toBe(false);
    expect(document.getElementById('demo-balk')).toBeNull();
  });

  it('linkt naar de andere rol en schakelt eerst de guard uit', () => {
    const guardUit = vi.fn();
    koppelDemoModus(
      'DEMO-K14',
      'Speler A',
      [{ label: 'Speler B', href: 'speler-b.html?sessie=DEMO-K14' }],
      guardUit,
    );
    const link = document.querySelector<HTMLAnchorElement>('#demo-balk a')!;
    expect(link.textContent).toBe('Wissel naar Speler B');
    expect(link.getAttribute('href')).toBe('speler-b.html?sessie=DEMO-K14');
    link.addEventListener('click', e => e.preventDefault());
    link.click();
    expect(guardUit).toHaveBeenCalled();
    expect(document.getElementById('demo-balk')?.textContent).toContain('Demomodus · Speler A');
  });
});

describe('demo telt niet mee', () => {
  it('geen speldata voor demo-sessies', async () => {
    await registreerPoging('DEMO-K14', 'p1', 'fout');
    await registreerHint('DEMO-K14', 'p1', 'a', 1);
    await registreerOpgelost('DEMO-K14', 'p1');
    expect(setMock).not.toHaveBeenCalled();
    expect(txMock).not.toHaveBeenCalled();
  });

  it('reviews worden in demomodus niet verstuurd', () => {
    document.body.innerHTML = `
      <div id="review-sterren"><button class="ster" data-waarde="5"></button></div>
      <textarea id="review-tekst"></textarea>
      <button id="btn-review-verstuur"></button>`;
    koppelReviewFormulier('kamer-14', 'DEMO-K14');
    const knop = document.getElementById('btn-review-verstuur') as HTMLButtonElement;
    expect(knop.disabled).toBe(true);
    expect(document.body.textContent).toContain('Demomodus');
    knop.click();
    expect(schrijfReview).not.toHaveBeenCalled();
  });
});

describe('resetDemo', () => {
  it('wist de sessie en maakt ze opnieuw aan met demo: true', async () => {
    txMock.mockImplementation(async (_ref: unknown, fn: (h: unknown) => unknown) => {
      const waarde = fn(null);
      expect(waarde).toMatchObject({ demo: true, actief: true, ervaringsId: 'kamer-14' });
      return { committed: true };
    });
    await resetDemo('DEMO-K14', { ervaringsId: 'kamer-14' });
    expect(setMock).toHaveBeenCalledWith({ path: 'sessions/DEMO-K14' }, null);
    expect(txMock).toHaveBeenCalledOnce();
  });

  it('meldt een fout als opnieuw aanmaken mislukt', async () => {
    txMock.mockResolvedValue({ committed: false });
    await expect(resetDemo('DEMO-K14')).rejects.toThrow();
  });
});
