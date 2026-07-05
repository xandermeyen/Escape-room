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
  luisterNaarRapport,
  maakSessie,
  bewaakSessieGesloten,
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
    runTransactionMock.mockImplementation(async (_ref: unknown, updater: (h: unknown) => unknown) => {
      const nieuw = updater(null);
      return { committed: nieuw !== undefined };
    });

    const ok = await claimRol('ABC', 'spelerA');

    expect(runTransactionMock).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('weigert een rol die al bezet is', async () => {
    runTransactionMock.mockImplementation(async (_ref: unknown, updater: (h: unknown) => unknown) => {
      const nieuw = updater('bezet');
      return { committed: nieuw !== undefined };
    });

    const ok = await claimRol('ABC', 'spelerA');

    expect(runTransactionMock).toHaveBeenCalled();
    expect(ok).toBe(false);
  });

  it('draait de transactie op het juiste spelers-pad', async () => {
    runTransactionMock.mockResolvedValue({ committed: true });

    await claimRol('XYZ', 'spelerB');

    expect(refMock).toHaveBeenCalledWith({}, 'sessions/XYZ/spelers/spelerB');
    expect(runTransactionMock).toHaveBeenCalledWith(
      { path: 'sessions/XYZ/spelers/spelerB' },
      expect.any(Function),
    );
  });

  it('updater: claimt een vrije rol (null) en breekt af bij een bezette rol', async () => {
    let updater: (h: unknown) => unknown = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: (h: unknown) => unknown) => {
      updater = fn;
      return { committed: true };
    });

    await claimRol('ABC', 'spelerA');

    expect(updater(null)).toBe('bezet');
    expect(updater('bezet')).toBeUndefined();
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

// ── luisterNaarRapport ────────────────────────────────────────────────────────

describe('luisterNaarRapport', () => {
  it('geeft de unsubscribe-functie van onValue terug', () => {
    const unsub = vi.fn();
    onValueMock.mockReturnValue(unsub);

    expect(luisterNaarRapport('ABC', () => {})).toBe(unsub);
  });
});

// ── maakSessie ────────────────────────────────────────────────────────────────

describe('maakSessie', () => {
  it('maakt de sessie aan via een transactie op het sessiepad', async () => {
    let updater: (h: unknown) => unknown = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: (h: unknown) => unknown) => {
      updater = fn;
      return { committed: true };
    });

    const ok = await maakSessie('ABC-123', { ervaringsId: 'kamer-14' });

    expect(ok).toBe(true);
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC-123');

    const nieuw = updater(null) as Record<string, unknown>;
    expect(nieuw).toMatchObject({
      actief: true,
      ervaringsId: 'kamer-14',
      puzzels: { p1: false, p2: false, p3: false, p4: false, p5: false },
      rapport: { ingediend: false, inhoud: {} },
    });
  });

  it('breekt af als de sessie al bestaat', async () => {
    let updater: (h: unknown) => unknown = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: (h: unknown) => unknown) => {
      updater = fn;
      const resultaat = fn({ actief: true });
      return { committed: resultaat !== undefined };
    });

    const ok = await maakSessie('ABC-123');

    expect(ok).toBe(false);
    expect(updater({ actief: true })).toBeUndefined();
  });

  it('neemt aantalSpelers en eigen puzzelIds mee (D.U.A.)', async () => {
    let updater: (h: unknown) => unknown = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: (h: unknown) => unknown) => {
      updater = fn;
      return { committed: true };
    });

    await maakSessie('DUA-2026-001', {
      ervaringsId: 'dua',
      aantalSpelers: 3,
      puzzelIds: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'],
    });

    const nieuw = updater(null) as Record<string, unknown>;
    expect(nieuw.ervaringsId).toBe('dua');
    expect(nieuw.aantalSpelers).toBe(3);
    expect(nieuw.puzzels).toEqual({
      p0: false, p1: false, p2: false, p3: false, p4: false, p5: false,
    });
  });
});

// ── bewaakSessieGesloten ──────────────────────────────────────────────────────

describe('bewaakSessieGesloten', () => {
  it('vuurt opGesloten als actief false wordt zonder ingediend rapport', async () => {
    let actiefCb: (snap: { val: () => unknown }) => void = () => {};
    onValueMock.mockImplementation((_ref: unknown, cb: (snap: { val: () => unknown }) => void) => {
      actiefCb = cb;
      return vi.fn();
    });
    getMock.mockResolvedValue({ val: () => null }); // rapport niet ingediend

    const opGesloten = vi.fn();
    bewaakSessieGesloten('ABC', opGesloten);

    actiefCb({ val: () => false });
    await vi.waitFor(() => expect(opGesloten).toHaveBeenCalled());
  });

  it('doet niets zolang de sessie actief is', () => {
    let actiefCb: (snap: { val: () => unknown }) => void = () => {};
    onValueMock.mockImplementation((_ref: unknown, cb: (snap: { val: () => unknown }) => void) => {
      actiefCb = cb;
      return vi.fn();
    });

    const opGesloten = vi.fn();
    bewaakSessieGesloten('ABC', opGesloten);

    actiefCb({ val: () => true });
    expect(opGesloten).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();
  });

  it('vuurt NIET bij een natuurlijk einde (rapport ingediend)', async () => {
    let actiefCb: (snap: { val: () => unknown }) => void = () => {};
    onValueMock.mockImplementation((_ref: unknown, cb: (snap: { val: () => unknown }) => void) => {
      actiefCb = cb;
      return vi.fn();
    });
    getMock.mockResolvedValue({ val: () => true }); // rapport wél ingediend

    const opGesloten = vi.fn();
    bewaakSessieGesloten('ABC', opGesloten);

    actiefCb({ val: () => false });
    // De get-promise moet eerst afgehandeld zijn
    await new Promise((r) => setTimeout(r, 0));
    expect(opGesloten).not.toHaveBeenCalled();
  });
});
