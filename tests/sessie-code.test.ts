/**
 * Sessiecodes uit het host-paneel: willekeurig, leesbaar en geldig volgens de
 * rules (^[A-Z0-9-]{3,20}$).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));

import { nieuweSessieCode } from '../shared/js/host-sessies.ts';

const RULES_PATROON = /^[A-Z0-9-]{3,20}$/;

describe('nieuweSessieCode', () => {
  it('maakt codes zoals KQM-473, zonder verwarrende tekens', () => {
    for (let i = 0; i < 200; i++) {
      const code = nieuweSessieCode();
      expect(code).toMatch(/^[A-HJ-NP-Z]{3}-[2-9]{3}$/);
      expect(code).toMatch(RULES_PATROON);
    }
  });

  it('zet een voorvoegsel ervoor (D.U.A.)', () => {
    const code = nieuweSessieCode('DUA-');
    expect(code).toMatch(/^DUA-[A-HJ-NP-Z]{3}-[2-9]{3}$/);
    expect(code).toMatch(RULES_PATROON);
  });

  it('is niet oplopend: opeenvolgende codes verschillen willekeurig', () => {
    const codes = new Set(Array.from({ length: 200 }, () => nieuweSessieCode('DUA-')));
    expect(codes.size).toBeGreaterThan(190);
  });
});
