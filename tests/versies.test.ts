import { describe, it, expect } from 'vitest';
import {
  ALLE_VERSIES,
  filterOpVersie,
  huidigeVersie,
  sessieMoment,
  versieVan,
  type Versie,
} from '../shared/js/versies.ts';
import { KAMER14_VERSIES } from '../experiences/kamer-14/js/kamer14-config.ts';
import { DUA_VERSIES } from '../experiences/dua/js/dua-config.ts';

// Bewust niet op volgorde: de code mag daar niet op rekenen.
const VERSIES: Versie[] = [
  { id: 'v2', vanaf: 200, wat: 'tweede' },
  { id: 'v1', vanaf: 100, wat: 'eerste' },
  { id: 'v3', vanaf: 300, wat: 'derde' },
];

describe('versies', () => {
  it('gebruikt de timerstart, anders het aanmaakmoment', () => {
    expect(sessieMoment({ timerGestart: 250, aangemaakt: 150 })).toBe(250);
    expect(sessieMoment({ timerGestart: null, aangemaakt: 150 })).toBe(150);
    expect(sessieMoment({})).toBeNull();
  });

  it('kent een sessie toe aan de versie die toen live stond', () => {
    expect(versieVan({ timerGestart: 150 }, VERSIES)?.id).toBe('v1');
    expect(versieVan({ timerGestart: 200 }, VERSIES)?.id).toBe('v2');
    expect(versieVan({ timerGestart: 999 }, VERSIES)?.id).toBe('v3');
  });

  it('geboekt in een oude versie maar gespeeld in de nieuwe telt als nieuw', () => {
    expect(versieVan({ aangemaakt: 150, timerGestart: 350 }, VERSIES)?.id).toBe('v3');
  });

  it('zonder tijdstip of van vóór de eerste versie: de oudste', () => {
    expect(versieVan({}, VERSIES)?.id).toBe('v1');
    expect(versieVan({ timerGestart: 5 }, VERSIES)?.id).toBe('v1');
  });

  it('de huidige versie is de nieuwste', () => {
    expect(huidigeVersie(VERSIES)?.id).toBe('v3');
    expect(huidigeVersie([])).toBeNull();
  });

  it('filtert op versie, of niet bij "alle"', () => {
    const rijen = [
      { code: 'A', data: { timerGestart: 150 } },
      { code: 'B', data: { timerGestart: 350 } },
      { code: 'C', data: { timerGestart: 360 } },
    ];
    expect(filterOpVersie(rijen, VERSIES, 'v3').map(r => r.code)).toEqual(['B', 'C']);
    expect(filterOpVersie(rijen, VERSIES, 'v2')).toEqual([]);
    expect(filterOpVersie(rijen, VERSIES, ALLE_VERSIES)).toHaveLength(3);
  });

  it.each([
    ['Kamer 14', KAMER14_VERSIES],
    ['D.U.A.', DUA_VERSIES],
  ])("%s: geldige versielijst (unieke id's, geldige datums, oplopend)", (_naam, lijst) => {
    expect(lijst.length).toBeGreaterThan(0);
    expect(new Set(lijst.map(v => v.id)).size).toBe(lijst.length);
    for (const v of lijst) {
      expect(Number.isFinite(v.vanaf)).toBe(true);
      expect(v.wat.trim()).not.toBe('');
    }
    const datums = lijst.map(v => v.vanaf);
    expect(datums).toEqual([...datums].sort((a, b) => a - b));
  });
});
