import { describe, it, expect, beforeEach } from 'vitest';
import { _resetVoorTests, maakKeuze } from '../shared/js/cookies.ts';
import { experienceUitPad, meetEenmalig, meetEvent, meetSpel } from '../shared/js/meet.ts';

/** Alle 'event'-oproepen in de dataLayer, als [naam, params]. */
function events(): [string, Record<string, unknown>][] {
  return (window.dataLayer ?? [])
    .map(a => Array.from(a as ArrayLike<unknown>))
    .filter(a => a[0] === 'event')
    .map(a => [a[1] as string, a[2] as Record<string, unknown>]);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete window.dataLayer;
  delete window.gtag;
  _resetVoorTests();
});

describe('experienceUitPad', () => {
  it('herkent de landings- en spelpagina’s', () => {
    expect(experienceUitPad('/kamer-14/')).toBe('kamer_14');
    expect(experienceUitPad('/experiences/kamer-14/einde.html')).toBe('kamer_14');
    expect(experienceUitPad('/dua/')).toBe('dua');
    expect(experienceUitPad('/experiences/dua/speler-1934.html')).toBe('dua');
    expect(experienceUitPad('/')).toBeUndefined();
    expect(experienceUitPad('/privacy.html')).toBeUndefined();
  });
});

describe('meetEvent', () => {
  it('stuurt niets zonder toestemming', () => {
    expect(meetEvent('reservation_submit', { experience: 'dua' })).toBe(false);
    expect(events()).toEqual([]);
  });

  it('stuurt niets na weigeren', () => {
    maakKeuze(false);
    expect(meetEvent('reservation_submit')).toBe(false);
    expect(events()).toEqual([]);
  });

  it('stuurt het event na accepteren, zonder lege parameters', () => {
    maakKeuze(true);
    expect(meetEvent('reservation_submit', { experience: 'dua', leeg: undefined })).toBe(true);
    expect(events()).toEqual([['reservation_submit', { experience: 'dua' }]]);
  });
});

describe('meetEenmalig en meetSpel', () => {
  beforeEach(() => maakKeuze(true));

  it('telt hetzelfde event per sleutel maar één keer', () => {
    expect(meetEenmalig('game_start', 'ABC123', { rol: 'a' })).toBe(true);
    expect(meetEenmalig('game_start', 'ABC123', { rol: 'a' })).toBe(false);
    expect(meetEenmalig('game_complete', 'ABC123')).toBe(true);
    expect(events().map(e => e[0])).toEqual(['game_start', 'game_complete']);
  });

  it('negeert demo-sessies en ontbrekende codes', () => {
    expect(meetSpel('game_start', 'DEMO-K14')).toBe(false);
    expect(meetSpel('game_start', null)).toBe(false);
    expect(events()).toEqual([]);
  });

  it('herhaalt niet als er eerst geen toestemming was', () => {
    _resetVoorTests();
    maakKeuze(false);
    expect(meetEenmalig('game_start', 'XYZ')).toBe(false);
    maakKeuze(true);
    expect(meetEenmalig('game_start', 'XYZ')).toBe(true);
  });
});
