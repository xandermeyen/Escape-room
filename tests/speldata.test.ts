import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(),
  set: vi.fn(() => Promise.resolve()),
  runTransaction: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  increment: vi.fn((n: number) => ({ '.sv': { increment: n } })),
}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import { get, set, runTransaction } from 'firebase/database';
import {
  registreerPoging,
  registreerHint,
  registreerOpgelost,
  registreerVrijgaves,
  luisterNaarHints,
  puzzelUitHintBlok,
  puzzelDuur,
  hoogsteHint,
  berekenGemiddelden,
  moeilijkstePuzzel,
  type SessieStats,
} from '../shared/js/speldata.ts';
import { formateerDuur, statsDetailHtml, gemiddeldenHtml } from '../shared/js/host-stats.ts';

const getMock = get as unknown as ReturnType<typeof vi.fn>;
const setMock = set as unknown as ReturnType<typeof vi.fn>;
const txMock = runTransaction as unknown as ReturnType<typeof vi.fn>;

const wachtEven = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('speldata schrijven', () => {
  it('telt een foute poging met increment(1)', async () => {
    await registreerPoging('ABC', 'p2', 'fout');
    expect(setMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/stats/p2/fout' },
      { '.sv': { increment: 1 } },
    );
  });

  it('telt een bijna-poging apart', async () => {
    await registreerPoging('ABC', 'p5', 'bijna');
    expect(setMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/stats/p5/bijna' },
      expect.anything(),
    );
  });

  it('zet opgelost enkel als het nog niet bestaat', async () => {
    getMock.mockResolvedValueOnce({ exists: () => false });
    await registreerOpgelost('ABC', 'p1');
    expect(setMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/stats/p1/opgelost' },
      { '.sv': 'timestamp' },
    );

    setMock.mockClear();
    getMock.mockResolvedValueOnce({ exists: () => true });
    await registreerOpgelost('ABC', 'p1');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('een mislukte schrijfactie blokkeert het spel niet', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setMock.mockRejectedValueOnce(new Error('permission_denied'));
    await expect(registreerPoging('ABC', 'p1', 'fout')).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it('bewaart alleen de hoogste hintstap per rol', async () => {
    await registreerHint('ABC', 'p3', 'b', 2);
    expect(txMock.mock.calls[0]?.[0]).toEqual({ path: 'sessions/ABC/stats/p3/hints/b' });
    const update = txMock.mock.calls[0]?.[1] as (h: number | null) => number | undefined;
    expect(update(null)).toBe(2);
    expect(update(1)).toBe(2);
    expect(update(3)).toBeUndefined(); // afbreken: niets overschrijven
  });

  it('zet de starttijd van puzzels die net vrijkwamen, één keer', async () => {
    getMock.mockResolvedValue({ exists: () => false });
    const vrijgave = { p1: [], p2: ['p1'], p3: ['p1'], p4: ['p2', 'p3'] };
    registreerVrijgaves('VRIJ', {}, vrijgave);
    await wachtEven();
    expect(setMock.mock.calls.map(c => c[0].path)).toEqual(['sessions/VRIJ/stats/p1/start']);

    setMock.mockClear();
    registreerVrijgaves('VRIJ', { p1: true }, vrijgave);
    registreerVrijgaves('VRIJ', { p1: true }, vrijgave); // tweede keer: niets nieuws
    await wachtEven();
    expect(setMock.mock.calls.map(c => c[0].path).sort()).toEqual([
      'sessions/VRIJ/stats/p2/start',
      'sessions/VRIJ/stats/p3/start',
    ]);
  });

  it('koppelt hint-geopend aan puzzel en rol', async () => {
    const stop = luisterNaarHints('ABC', blokId => {
      const puzzel = puzzelUitHintBlok(blokId);
      return puzzel ? { puzzel, rol: 'a' } : null;
    });
    document.dispatchEvent(
      new CustomEvent('hint-geopend', { detail: { blokId: 'hint-p4', stap: 1 } }),
    );
    document.dispatchEvent(
      new CustomEvent('hint-geopend', { detail: { blokId: 'iets-anders', stap: 1 } }),
    );
    stop();
    await wachtEven();
    expect(txMock).toHaveBeenCalledTimes(1);
    expect(txMock.mock.calls[0]?.[0]).toEqual({ path: 'sessions/ABC/stats/p4/hints/a' });
  });
});

describe('puzzelUitHintBlok', () => {
  it.each([
    ['hint-p1', 'p1'],
    ['hint-p3-b', 'p3'],
    ['hint-p4a', 'p4'],
    ['geen-hint', null],
  ])('%s → %s', (blok, verwacht) => {
    expect(puzzelUitHintBlok(blok)).toBe(verwacht);
  });
});

describe('berekeningen', () => {
  const sessies: SessieStats[] = [
    {
      p1: { start: 0, opgelost: 120_000, fout: 2, hints: { a: 1 } },
      p2: { start: 120_000, opgelost: 720_000, bijna: 1 },
    },
    {
      p1: { start: 0, opgelost: 240_000 },
      p2: { start: 240_000, fout: 4, hints: { b: 3 } }, // niet opgelost
    },
  ];

  it('puzzelDuur', () => {
    expect(puzzelDuur({ start: 1000, opgelost: 61_000 })).toBe(60_000);
    expect(puzzelDuur({ start: 1000 })).toBeNull();
    expect(puzzelDuur(undefined)).toBeNull();
  });

  it('hoogsteHint', () => {
    expect(hoogsteHint({ hints: { a: 1, b: 3 } })).toBe(3);
    expect(hoogsteHint({})).toBe(0);
  });

  it('gemiddelden per puzzel', () => {
    const [p1, p2] = berekenGemiddelden(sessies, ['p1', 'p2']);
    expect(p1).toMatchObject({ aantal: 2, gemDuurMs: 180_000, gemFout: 1, aandeelHint: 0.5 });
    // p2: duur enkel van de opgeloste sessie, pogingen over beide sessies
    expect(p2).toMatchObject({
      aantal: 1,
      gemDuurMs: 600_000,
      gemFout: 2,
      gemBijna: 0.5,
      aandeelHint: 0.5,
    });
  });

  it('moeilijkste puzzel = langste gemiddelde tijd', () => {
    expect(moeilijkstePuzzel(berekenGemiddelden(sessies, ['p1', 'p2']))).toBe('p2');
    expect(moeilijkstePuzzel([])).toBeNull();
  });
});

describe('host-stats', () => {
  it('formateerDuur', () => {
    expect(formateerDuur(754_000)).toBe('12:34');
    expect(formateerDuur(5_000)).toBe('0:05');
    expect(formateerDuur(null)).toBe('-');
  });

  it('details tonen tijd, pogingen en hints per rol', () => {
    const html = statsDetailHtml(
      { p1: { start: 0, opgelost: 90_000, fout: 1, bijna: 2, hints: { a: 2 } } },
      ['p1', 'p2'],
      { a: 'A', b: 'B' },
    );
    expect(html).toContain('1:30');
    expect(html).toContain('A 2');
    expect(html).toContain('P2');
  });

  it('lege speldata geeft een duidelijke melding', () => {
    expect(statsDetailHtml(undefined, ['p1'], {})).toContain('Nog geen speldata');
    expect(gemiddeldenHtml([], ['p1'])).toContain('Nog geen speldata');
  });

  it('markeert de moeilijkste puzzel', () => {
    const html = gemiddeldenHtml(
      [{ p1: { start: 0, opgelost: 60_000 }, p2: { start: 0, opgelost: 600_000 } }],
      ['p1', 'p2'],
    );
    expect(html).toMatch(/P2 <span class="stats-zwaarste">moeilijkst/);
  });
});
