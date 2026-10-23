import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(),
}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/meet.ts', () => ({ meetSpel: vi.fn() }));
vi.mock('../shared/js/session.ts', () => ({ sluitSessie: vi.fn(() => Promise.resolve()) }));
vi.mock('../shared/js/timer.ts', () => ({
  TIJDSLIMIET_MS: 60 * 60 * 1000,
  koppelServerTijd: vi.fn(() => Promise.resolve()),
  serverNu: vi.fn(),
}));

import { get } from 'firebase/database';
import { serverNu } from '../shared/js/timer.ts';
import { sluitSessie } from '../shared/js/session.ts';
import { meetSpel } from '../shared/js/meet.ts';
import { beoordeelSessieEinde, sluitSessieUitUrl } from '../shared/js/tijd-voorbij.ts';

const getMock = get as unknown as ReturnType<typeof vi.fn>;
const nuMock = serverNu as unknown as ReturnType<typeof vi.fn>;
const UUR = 60 * 60 * 1000;
const START = 1_000_000_000_000;

function sessieData(data: unknown) {
  getMock.mockResolvedValue({ val: () => data });
}

beforeEach(() => {
  vi.clearAllMocks();
  nuMock.mockReturnValue(START + 10 * 60 * 1000);
});

describe('beoordeelSessieEinde', () => {
  it('een sessie die niet bestaat is onbekend', async () => {
    sessieData(null);
    expect(await beoordeelSessieEinde('NOPE')).toBe('onbekend');
  });

  it('een lopende sessie is nog bezig', async () => {
    sessieData({ actief: true, timerGestart: START });
    expect(await beoordeelSessieEinde('ABC')).toBe('bezig');
  });

  it('zonder starttijd is er nog niets verlopen', async () => {
    sessieData({ actief: true });
    expect(await beoordeelSessieEinde('ABC')).toBe('bezig');
  });

  it('na 60 minuten is de tijd verlopen', async () => {
    sessieData({ actief: true, timerGestart: START });
    nuMock.mockReturnValue(START + UUR + 1000);
    expect(await beoordeelSessieEinde('ABC')).toBe('verlopen');
  });

  it('opgebouwde tijdstraf (D.U.A.) schuift het einde op', async () => {
    sessieData({ actief: true, timerGestart: START, dua: { meta: { strafMs: 5 * 60 * 1000 } } });
    nuMock.mockReturnValue(START + UUR + 60 * 1000);
    expect(await beoordeelSessieEinde('ABC')).toBe('bezig');
    nuMock.mockReturnValue(START + UUR + 5 * 60 * 1000 + 1000);
    expect(await beoordeelSessieEinde('ABC')).toBe('verlopen');
  });

  it('een al gesloten sessie telt als gesloten', async () => {
    sessieData({ actief: false, timerGestart: START });
    expect(await beoordeelSessieEinde('ABC')).toBe('gesloten');
  });
});

describe('sluitSessieUitUrl', () => {
  const zetUrl = (zoek: string) => window.history.replaceState({}, '', `/tijd-voorbij.html${zoek}`);

  it('zonder sessiecode gebeurt er niets', async () => {
    zetUrl('');
    expect(await sluitSessieUitUrl()).toBe(false);
    expect(sluitSessie).not.toHaveBeenCalled();
  });

  it('een lopende sessie wordt niet gesloten en toont geen oplossing', async () => {
    zetUrl('?sessie=ANDERS-1');
    sessieData({ actief: true, timerGestart: START });
    expect(await sluitSessieUitUrl()).toBe(false);
    expect(sluitSessie).not.toHaveBeenCalled();
    expect(meetSpel).not.toHaveBeenCalled();
  });

  it('een verlopen sessie wordt gesloten en toont de oplossing', async () => {
    zetUrl('?sessie=ECHT-1');
    sessieData({ actief: true, timerGestart: START });
    nuMock.mockReturnValue(START + UUR + 1000);
    expect(await sluitSessieUitUrl()).toBe(true);
    expect(sluitSessie).toHaveBeenCalledWith('ECHT-1');
    expect(meetSpel).toHaveBeenCalledWith('game_fail', 'ECHT-1', { reden: 'tijd' });
  });

  it('een al gesloten sessie toont de oplossing zonder opnieuw te sluiten', async () => {
    zetUrl('?sessie=KLAAR-1');
    sessieData({ actief: false, timerGestart: START });
    expect(await sluitSessieUitUrl()).toBe(true);
    expect(sluitSessie).not.toHaveBeenCalled();
  });

  it('bij een leesfout blijft de oplossing verborgen', async () => {
    zetUrl('?sessie=FOUT-1');
    getMock.mockRejectedValue(new Error('offline'));
    expect(await sluitSessieUitUrl()).toBe(false);
  });
});
