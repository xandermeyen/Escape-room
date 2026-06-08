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
