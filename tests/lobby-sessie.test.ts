import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Firebase mocks (session.ts importeert deze) ───────────────────────────────

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

import { ref, set, get, update } from 'firebase/database';
import {
  normaliseerSessieCode,
  valideerSessie,
  zoekSessieCode,
  markeerGeopend,
  geefRollenVrij,
} from '../shared/js/session.ts';
import {
  isVerlopen,
  statusBadgeHtml,
  geopendHtml,
  VERLOOPT_NA_MS,
  verlopenCodes,
  sluitSessies,
} from '../shared/js/host-sessies.ts';
import { DEMO_CODES } from '../shared/js/demo.ts';

const getMock = get as unknown as ReturnType<typeof vi.fn>;
const setMock = set as unknown as ReturnType<typeof vi.fn>;
const refMock = ref as unknown as ReturnType<typeof vi.fn>;
const updateMock = update as unknown as ReturnType<typeof vi.fn>;

/** Laat get() alleen voor de opgegeven actieve codes een sessie teruggeven. */
function bestaandeSessies(...codes: string[]) {
  getMock.mockImplementation(({ path }: { path: string }) => {
    const code = path.replace('sessions/', '');
    const bestaat = codes.includes(code);
    return Promise.resolve({
      exists: () => bestaat,
      val: () => (bestaat ? { actief: true } : null),
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  refMock.mockImplementation((_db: unknown, path: string) => ({ path }));
});

// ── Code normaliseren ─────────────────────────────────────────────────────────

describe('normaliseerSessieCode', () => {
  it('zet om naar hoofdletters en haalt alle spaties weg', () => {
    expect(normaliseerSessieCode(' abc - 234 ')).toBe('ABC-234');
  });

  it('maakt van lange streepjes uit e-mails een koppelteken', () => {
    expect(normaliseerSessieCode('ABC–234')).toBe('ABC-234'); // en dash
    expect(normaliseerSessieCode('ABC—234')).toBe('ABC-234'); // em dash
  });

  it('verwijdert onzichtbare tekens en harde spaties', () => {
    expect(normaliseerSessieCode('ABC​-234 ')).toBe('ABC-234');
  });
});

describe('valideerSessie met ongeldige tekens', () => {
  it('vraagt Firebase niets voor een code met tekens die in een pad verboden zijn', async () => {
    for (const code of ['AB.12', 'AB#12', 'AB/12', 'AB$12', 'AB[1]']) {
      expect(await valideerSessie(code)).toBe(false);
    }
    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('zoekSessieCode', () => {
  it('vindt een geldige code, ook met kleine letters en spaties', async () => {
    bestaandeSessies('ABC-234');
    expect(await zoekSessieCode(' abc-234 ')).toBe('ABC-234');
  });

  it('vindt de code ook als het koppelteken vergeten is', async () => {
    bestaandeSessies('ABC-234');
    expect(await zoekSessieCode('abc234')).toBe('ABC-234');
  });

  it('geeft null voor een onbekende code', async () => {
    bestaandeSessies('ABC-234');
    expect(await zoekSessieCode('XYZ-999')).toBeNull();
  });
});

// ── geopendOp ─────────────────────────────────────────────────────────────────

describe('markeerGeopend', () => {
  it('bewaart een servertijdstip als geopendOp nog niet bestaat', async () => {
    getMock.mockResolvedValue({ exists: () => false, val: () => null });
    await markeerGeopend('ABC-234');
    expect(setMock).toHaveBeenCalledWith(
      { path: 'sessions/ABC-234/geopendOp' },
      { '.sv': 'timestamp' },
    );
  });

  it('overschrijft een bestaand geopendOp niet', async () => {
    getMock.mockResolvedValue({ exists: () => true, val: () => 123 });
    await markeerGeopend('ABC-234');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('gooit nooit, ook niet als Firebase weigert', async () => {
    getMock.mockResolvedValue({ exists: () => false, val: () => null });
    setMock.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(markeerGeopend('ABC-234')).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('geefRollenVrij', () => {
  it('maakt het spelers-pad leeg', async () => {
    await geefRollenVrij('ABC-234');
    expect(setMock).toHaveBeenCalledWith({ path: 'sessions/ABC-234/spelers' }, null);
  });
});

// ── Host-paneel: verlopen sessies ─────────────────────────────────────────────

describe('isVerlopen / statusBadgeHtml', () => {
  const nu = 1_800_000_000_000;
  const oud = nu - VERLOOPT_NA_MS - 1;
  const recent = nu - 60 * 60 * 1000;

  it('telt een actieve sessie die meer dan 24 uur geleden geopend werd als verlopen', () => {
    expect(isVerlopen({ actief: true, aangemaakt: oud, geopendOp: oud }, nu)).toBe(true);
    expect(
      statusBadgeHtml({ actief: true, geopendOp: oud }, 0, 5, { toonVerlopen: true, nu }),
    ).toContain('Verlopen');
  });

  it('een oude boeking die nog niet geopend werd, verloopt niet', () => {
    // aangemaakt = moment van boeken; de groep kan pas dagen later spelen
    expect(isVerlopen({ actief: true, aangemaakt: oud }, nu)).toBe(false);
    expect(isVerlopen({ actief: true, aangemaakt: oud, geopendOp: recent }, nu)).toBe(false);
  });

  it('laat recente, inactieve en ingediende sessies met rust', () => {
    expect(isVerlopen({ actief: true, geopendOp: recent }, nu)).toBe(false);
    expect(isVerlopen({ actief: false, geopendOp: oud }, nu)).toBe(false);
    expect(isVerlopen({ actief: true, geopendOp: oud, rapport: { ingediend: true } }, nu)).toBe(
      false,
    );
  });

  it('toont Voltooid boven Verlopen', () => {
    expect(
      statusBadgeHtml({ actief: true, geopendOp: oud }, 5, 5, { toonVerlopen: true, nu }),
    ).toContain('Voltooid');
  });

  it('toont geen Verlopen zonder de optie', () => {
    expect(statusBadgeHtml({ actief: true, geopendOp: oud }, 0, 5)).not.toContain('Verlopen');
  });

  it('verlopenCodes slaat demo-sessies over', () => {
    const rijen = [
      { code: 'ABC-234', data: { actief: true, geopendOp: oud } },
      { code: 'DEF-567', data: { actief: true, geopendOp: recent } },
      { code: DEMO_CODES['kamer-14'], data: { actief: true, geopendOp: oud } },
      { code: 'GHJ-892', data: { actief: false, geopendOp: oud } },
    ];
    expect(verlopenCodes(rijen, nu)).toEqual(['ABC-234']);
  });

  it('sluitSessies zet elke sessie echt op actief: false', async () => {
    expect(await sluitSessies(['ABC-234', 'KLM-345'])).toBe(2);
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/ABC-234' }, { actief: false });
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/KLM-345' }, { actief: false });
    expect(updateMock).toHaveBeenCalledTimes(2);
  });

  it('toont geopendOp, of een streepje als de code nooit geopend werd', () => {
    expect(geopendHtml({})).toBe('-');
    expect(geopendHtml({ geopendOp: nu })).not.toBe('-');
  });
});
