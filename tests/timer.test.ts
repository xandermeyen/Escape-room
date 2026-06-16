import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Firebase mocks (timer.ts importeert deze) ─────────────────────────────────

vi.mock('firebase/database', () => ({
  ref:             vi.fn(),
  get:             vi.fn(),
  set:             vi.fn(),
  serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({
  db: {},
}));

vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

// Pas na de mocks importeren
import { formateerTijd } from '../shared/js/timer.ts';

// ── formateerTijd ─────────────────────────────────────────────────────────────

describe('formateerTijd', () => {
  it('geeft 00:00 terug bij 0 ms', () => {
    expect(formateerTijd(0)).toBe('00:00');
  });

  it('geeft 00:00 terug bij negatieve waarden (klemming op 0)', () => {
    expect(formateerTijd(-5000)).toBe('00:00');
  });

  it('geeft 01:00 terug bij 60 000 ms (1 minuut)', () => {
    expect(formateerTijd(60_000)).toBe('01:00');
  });

  it('geeft 60:00 terug bij 3 600 000 ms (1 uur)', () => {
    expect(formateerTijd(3_600_000)).toBe('60:00');
  });

  it('formatteert seconden altijd met twee cijfers', () => {
    expect(formateerTijd(9_000)).toBe('00:09');   // 9 seconden
    expect(formateerTijd(65_000)).toBe('01:05');  // 1 min + 5 sec
  });

  it('formatteert minuten altijd met twee cijfers', () => {
    expect(formateerTijd(5_000)).toBe('00:05');
    expect(formateerTijd(600_000)).toBe('10:00');
  });

  it('rondt fractionele seconden af naar beneden', () => {
    expect(formateerTijd(1_999)).toBe('00:01'); // 1.999 sec → 1 sec
    expect(formateerTijd(59_999)).toBe('00:59');
  });

  it('geeft 59:59 terug bij bijna 1 uur', () => {
    expect(formateerTijd(3_599_000)).toBe('59:59');
  });

  it('geeft 30:00 terug bij halftime (30 minuten)', () => {
    expect(formateerTijd(30 * 60 * 1000)).toBe('30:00');
  });

  it('geeft 10:00 terug bij de urgente waarschuwing (10 minuten)', () => {
    expect(formateerTijd(10 * 60 * 1000)).toBe('10:00');
  });
});


// ── Timer-gedrag (initialiseerTimer + tick) ───────────────────────────────────
//
// Deze tests laden timer.ts telkens vers (vi.resetModules) zodat de module-state
// (waarschuwing-vlaggen, interval) per test schoon is, en zetten eigen Firebase-
// mocks via vi.doMock zodat get/set per test te sturen zijn.

const UUR_MS = 60 * 60 * 1000;
const START  = 1_000_000; // niet-nul starttijd (timer.ts bailt bij een falsy starttijd)

interface TimerMod {
  initialiseerTimer: (code: string) => Promise<void>;
  setMock: ReturnType<typeof vi.fn>;
}

/**
 * Laadt een verse timer-module met stuurbare Firebase-mocks.
 * @param bestaat    of timerGestart al een waarde heeft in Firebase
 * @param startTijd  de starttijd die teruggelezen wordt
 */
async function laadTimer(bestaat: boolean, startTijd: number = START): Promise<TimerMod> {
  vi.resetModules();

  const getMock = vi.fn();
  const setMock = vi.fn(() => Promise.resolve());

  // Eerste get(): bestaat de starttijd al?
  getMock.mockResolvedValueOnce({
    exists: () => bestaat,
    val:    () => (bestaat ? startTijd : null),
  });
  // Tweede get(): de (eventueel net gezette) starttijd teruglezen.
  getMock.mockResolvedValueOnce({
    exists: () => true,
    val:    () => startTijd,
  });

  vi.doMock('firebase/database', () => ({
    ref:             vi.fn((_db: unknown, path: string) => ({ path })),
    get:             getMock,
    set:             setMock,
    serverTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  }));
  vi.doMock('../shared/js/firebase-config.ts', () => ({ db: {} }));
  vi.doMock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

  const mod = await import('../shared/js/timer.ts');
  return { initialiseerTimer: mod.initialiseerTimer, setMock };
}

describe('initialiseerTimer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    vi.setSystemTime(START + 60_000); // 1 min na de start, ruim binnen de tijd
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.doUnmock('firebase/database');
    vi.doUnmock('../shared/js/firebase-config.ts');
    vi.doUnmock('../shared/js/auth.ts');
  });

  it('schrijft timerGestart enkel als die nog niet bestaat', async () => {
    const { initialiseerTimer, setMock } = await laadTimer(false);
    await initialiseerTimer('ABC');
    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(expect.anything(), { '.sv': 'timestamp' });
  });

  it('schrijft timerGestart NIET als die al bestaat', async () => {
    const { initialiseerTimer, setMock } = await laadTimer(true);
    await initialiseerTimer('ABC');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('bouwt de klokknop in de pagina', async () => {
    const { initialiseerTimer } = await laadTimer(true);
    await initialiseerTimer('ABC');
    expect(document.getElementById('timer-klok-knop')).not.toBeNull();
  });
});

describe('tick — waarschuwingen en redirect', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.doUnmock('firebase/database');
    vi.doUnmock('../shared/js/firebase-config.ts');
    vi.doUnmock('../shared/js/auth.ts');
  });

  it('toont een niet-urgente melding bij 30 minuten resterend', async () => {
    vi.setSystemTime(START + (UUR_MS - 29 * 60_000)); // 29 min resterend
    const { initialiseerTimer } = await laadTimer(true);
    await initialiseerTimer('ABC');

    const melding = document.getElementById('timer-waarschuwing');
    expect(melding).not.toBeNull();
    expect(melding!.classList.contains('timer-waarschuwing-urgent')).toBe(false);
  });

  it('toont een urgente melding bij 10 minuten resterend', async () => {
    vi.setSystemTime(START + (UUR_MS - 9 * 60_000)); // 9 min resterend
    const { initialiseerTimer } = await laadTimer(true);
    await initialiseerTimer('ABC');

    const melding = document.getElementById('timer-waarschuwing');
    expect(melding).not.toBeNull();
    expect(melding!.classList.contains('timer-waarschuwing-urgent')).toBe(true);
  });

  it('toont nog geen waarschuwing bij ruim de tijd (58 min resterend)', async () => {
    vi.setSystemTime(START + 2 * 60_000); // 2 min verstreken
    const { initialiseerTimer } = await laadTimer(true);
    await initialiseerTimer('ABC');

    expect(document.getElementById('timer-waarschuwing')).toBeNull();
  });

  it('navigeert naar tijd-voorbij.html als de tijd op is', async () => {
    vi.setSystemTime(START + UUR_MS + 1_000); // voorbij de limiet

    const origLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: '' },
    });

    try {
      const { initialiseerTimer } = await laadTimer(true);
      await initialiseerTimer('SESSIE1');
      expect(window.location.href).toContain('tijd-voorbij.html');
      expect(window.location.href).toContain('sessie=SESSIE1');
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: origLocation,
      });
    }
  });
});
