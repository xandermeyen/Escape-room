import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  set: vi.fn(() => Promise.resolve()),
  get: vi.fn(),
  update: vi.fn(() => Promise.resolve()),
  onValue: vi.fn(() => vi.fn()),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  runTransaction: vi.fn(),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import { ref, update, runTransaction } from 'firebase/database';
import {
  zetZegel,
  zetBrief,
  zetKluisNummer,
  verhoogVerdenking,
  telHint,
  zetHamers,
  zetLetterKeuze,
  gomBrief,
  startKamer,
  verstopMapje,
  kamerVerlopen,
  wisVerstopPlekAls,
  wisPin1934Als,
  HAMERS_START,
  HAMERS_GOED,
  STRAF_BIJ_HONDERD_MS,
} from '../experiences/dua/js/dua-session.ts';

type Meta = { verdenking: number; strafMs: number; hints: number };

const refMock = ref as unknown as ReturnType<typeof vi.fn>;
const updateMock = update as unknown as ReturnType<typeof vi.fn>;
const runTransactionMock = runTransaction as unknown as ReturnType<typeof vi.fn>;

// Vangt de updater op die aan runTransaction wordt meegegeven, zodat we de
// pure verdenkings-/hintlogica los kunnen testen.
function vangUpdater(): () => (m: Meta | null) => Meta {
  let updater: (m: Meta | null) => Meta = () => ({ verdenking: 0, strafMs: 0, hints: 0 });
  runTransactionMock.mockImplementation(async (_ref: unknown, fn: unknown) => {
    updater = fn as (m: Meta | null) => Meta;
    return { committed: true };
  });
  return () => updater;
}

beforeEach(() => {
  vi.clearAllMocks();
  refMock.mockImplementation((_db: unknown, path: string) => ({ path }));
});

describe('zet-acties (1934) schrijven op het juiste dua-pad', () => {
  it('zetZegel zet p0zegel', async () => {
    await zetZegel('ABC');
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC/dua');
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC/dua' }, { p0zegel: true });
  });

  it('zetBrief slaat de gekozen letters als csv op', async () => {
    await zetBrief('ABC', [3, 1, 2]);
    expect(updateMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/dua' },
      { brief: { letters: '3,1,2', verstuurd: true } },
    );
  });

  it('zetKluisNummer schrijft het nummer', async () => {
    await zetKluisNummer('ABC', '42');
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC/dua' }, { kluisNummer: '42' });
  });
});

describe('verhoogVerdenking', () => {
  it('draait op het meta-pad en telt op binnen het maximum', async () => {
    const haal = vangUpdater();
    await verhoogVerdenking('ABC', 15);
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC/dua/meta');
    expect(haal()({ verdenking: 50, strafMs: 0, hints: 0 })).toEqual({
      verdenking: 65,
      strafMs: 0,
      hints: 0,
    });
    expect(haal()(null)).toEqual({ verdenking: 15, strafMs: 0, hints: 0 });
  });

  it('bij 100% volgt een tijdstraf en valt verdenking terug naar 60', async () => {
    const haal = vangUpdater();
    await verhoogVerdenking('ABC', 60);
    const r = haal()({ verdenking: 50, strafMs: 0, hints: 0 });
    expect(r.verdenking).toBe(60);
    expect(r.strafMs).toBe(STRAF_BIJ_HONDERD_MS);
  });
});

describe('telHint', () => {
  it('verhoogt de hint-teller met 1', async () => {
    const haal = vangUpdater();
    await telHint('ABC');
    expect(refMock).toHaveBeenCalledWith({}, 'sessions/ABC/dua/meta');
    expect(haal()({ verdenking: 0, strafMs: 0, hints: 2 })).toEqual({
      verdenking: 0,
      strafMs: 0,
      hints: 3,
    });
    expect(haal()(null)).toEqual({ verdenking: 0, strafMs: 0, hints: 1 });
  });
});

describe('gedeelde puzzelstaat en werkkamer', () => {
  it('de hamerletters zijn dezelfde zes, anders gerangschikt', () => {
    expect([...HAMERS_START].sort().join('')).toBe([...HAMERS_GOED].sort().join(''));
    expect(HAMERS_START).not.toBe(HAMERS_GOED);
  });

  it('zetHamers en zetLetterKeuze schrijven op het dua-pad', async () => {
    await zetHamers('ABC', 'KNRSTU');
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC/dua' }, { hamers: 'KNRSTU' });
    await zetLetterKeuze('ABC', [3, 1, 2]);
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC/dua' }, { letterKeuze: '3,1,2' });
  });

  it('een nieuw vel wist ook de gekozen letters', async () => {
    await gomBrief('ABC');
    expect(updateMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/dua' },
      { brief: { letters: '', verstuurd: false }, letterKeuze: '' },
    );
  });

  it('startKamer zet het einde, verstopMapje zet de plek en stopt de klok in één keer', async () => {
    await startKamer('ABC', 123456);
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC/dua' }, { kamerEinde: 123456 });
    await verstopMapje('ABC', 'schouw');
    expect(updateMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC/dua' },
      { verstopPlek: 'schouw', kamerEinde: null },
    );
  });

  it('kamerVerlopen wist de klok alleen als het nog dezelfde ronde is', async () => {
    let updater: (huidig: number | null) => number | null | undefined = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: unknown) => {
      updater = fn as typeof updater;
      return { committed: true };
    });
    expect(await kamerVerlopen('ABC', 999)).toBe(true);
    expect(updater(999)).toBeNull();
    expect(updater(1000)).toBeUndefined();
    expect(updater(null)).toBeUndefined();
  });

  it('kamerVerlopen meldt false als een andere tab de transactie won', async () => {
    runTransactionMock.mockResolvedValue({ committed: false });
    expect(await kamerVerlopen('ABC', 999)).toBe(false);
  });

  it('een verkeerde keuze wissen overschrijft geen nieuwe keuze van 1934', async () => {
    let updater: (huidig: string | null) => string | null | undefined = () => undefined;
    runTransactionMock.mockImplementation(async (_ref: unknown, fn: unknown) => {
      updater = fn as typeof updater;
      return { committed: true };
    });
    await wisVerstopPlekAls('ABC', 'bureau');
    expect(updater('bureau')).toBeNull();
    expect(updater('schouw')).toBeUndefined();
    await wisPin1934Als('ABC', 'belfort');
    expect(updater('belfort')).toBeNull();
    expect(updater('sintbaafs')).toBeUndefined();
  });
});
