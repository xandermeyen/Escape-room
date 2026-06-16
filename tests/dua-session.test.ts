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
