import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks (session.ts importeert deze) ───────────────────────────────

vi.mock('firebase/database', () => ({
  ref:             vi.fn((_db: unknown, path: string) => ({ path })),
  set:             vi.fn(() => Promise.resolve()),
  get:             vi.fn(),
  update:          vi.fn(() => Promise.resolve()),
  onValue:         vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  runTransaction:  vi.fn(),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({
  db: {},
}));

vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

// Pas na de mocks importeren
import { ref, set, get, update, onValue, runTransaction } from 'firebase/database';
import {
  valideerSessie,
  puzzelVoltooid,
  claimRol,
  diendRapportIn,
  luisterNaarStatus,
} from '../shared/js/session.ts';

// Korte alias zodat de tests de mocks kunnen sturen
const getMock            = get            as unknown as ReturnType<typeof vi.fn>;
const setMock            = set            as unknown as ReturnType<typeof vi.fn>;
const updateMock         = update         as unknown as ReturnType<typeof vi.fn>;
const onValueMock        = onValue        as unknown as ReturnType<typeof vi.fn>;
const runTransactionMock = runTransaction as unknown as ReturnType<typeof vi.fn>;
const refMock            = ref            as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // ref-implementatie opnieuw zetten (clearAllMocks wist enkel de call-historie)
  refMock.mockImplementation((_db: unknown, path: string) => ({ path }));
});

// ── valideerSessie ────────────────────────────────────────────────────────────

describe('valideerSessie', () => {
  it('geeft false terug als de sessie niet bestaat', async () => {
    getMock.mockResolvedValue({ exists: () => false, val: () => null });
    expect(await valideerSessie('ABC')).toBe(false);
  });

  it('geeft false terug als de sessie actief: false heeft', async () => {
    getMock.mockResolvedValue({ exists: () => true, val: () => ({ actief: false }) });
    expect(await valideerSessie('ABC')).toBe(false);
  });

  it('geeft true terug als de sessie actief: true heeft', async () => {
    getMock.mockResolvedValue({ exists: () => true, val: () => ({ actief: true }) });
    expect(await valideerSessie('ABC')).toBe(true);
  });

  it('leest van het juiste sessiepad', async () => {
    getMock.mockResolvedValue({ exists: () => true, val: () => ({ actief: true }) });
    await valideerSessie('XYZ');
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/XYZ');
  });
});

// ── puzzelVoltooid ────────────────────────────────────────────────────────────

describe('puzzelVoltooid', () => {
  it('roept set aan met true op het juiste puzzelpad', async () => {
    await puzzelVoltooid('ABC', 3);
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC/puzzels/p3');
    expect(setMock).toHaveBeenCalledWith({ path: 'sessions/ABC/puzzels/p3' }, true);
  });
});

// ── claimRol ──────────────────────────────────────────────────────────────────

describe('claimRol', () => {
  it('gebruikt runTransaction en claimt een vrije rol', async () => {
    // Simuleer een vrije rol: huidige waarde is null -> updater geeft 'bezet'
    runTransactionMock.mockImplementation(async (_ref: unknown, updater: (h: unknown) => unknown) => {
      const nieuw = updater(null);
      return { committed: nieuw !== undefined };
    });

    const ok = await claimRol('ABC', 'spelerA');

    expect(runTransactionMock).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('weigert een rol die al bezet is', async () => {
    // Simuleer een bezette rol: huidige waarde is niet null -> updater breekt af (undefined)
    runTransactionMock.mockImplementation(async (_ref: unknown, updater: (h: unknown) => unknown) => {
      const nieuw = updater('bezet');
      return { committed: nieuw !== undefined };
    });

    const ok = await claimRol('ABC', 'spelerA');

    expect(runTransactionMock).toHaveBeenCalled();
    expect(ok).toBe(false);
  });
});

// ── diendRapportIn ────────────────────────────────────────────────────────────

describe('diendRapportIn', () => {
  it('roept update aan met ingediend: true op het rapportpad', async () => {
    await diendRapportIn('ABC', {
      bestemming: 'Diest',
      wie:        'Marie',
      vervoer:    'trein',
      tijdstip:   '07:35',
    });

    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC/rapport');
    expect(updateMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/rapport' },
      expect.objectContaining({ ingediend: true }),
    );
  });
});

// ── luisterNaarStatus ─────────────────────────────────────────────────────────

describe('luisterNaarStatus', () => {
  it('geeft de unsubscribe-functie van onValue terug', () => {
    const unsub = vi.fn();
    onValueMock.mockReturnValue(unsub);

    const resultaat = luisterNaarStatus('ABC', () => {});

    expect(resultaat).toBe(unsub);
  });

  it('roept de callback aan met de puzzelstatus', () => {
    onValueMock.mockImplementation((_ref: unknown, cb: (snap: unknown) => void) => {
      cb({ val: () => ({ p1: true, p2: false }) });
      return vi.fn();
    });

    const callback = vi.fn();
    luisterNaarStatus('ABC', callback);

    expect(callback).toHaveBeenCalledWith({ p1: true, p2: false });
  });

  it('geeft een leeg object door als er geen status is', () => {
    onValueMock.mockImplementation((_ref: unknown, cb: (snap: unknown) => void) => {
      cb({ val: () => null });
      return vi.fn();
    });

    const callback = vi.fn();
    luisterNaarStatus('ABC', callback);

    expect(callback).toHaveBeenCalledWith({});
  });
});
