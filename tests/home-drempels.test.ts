import { describe, expect, it } from 'vitest';
import { MIN_TELLER, gemiddeldeScore, reviewsTonen, tellerTonen } from '../js/home-drempels.ts';

const r = (...scores: number[]) => scores.map(rating => ({ rating }));

describe('homepage: reviews tonen', () => {
  it('niet onder de 5 reviews, ook al zijn ze allemaal 5 sterren', () => {
    expect(reviewsTonen(r(5, 5, 5, 5))).toBe(false);
  });

  it('niet bij een gemiddelde onder de 4', () => {
    expect(reviewsTonen(r(5, 4, 4, 3, 3))).toBe(false);
  });

  it('wel vanaf 5 reviews met gemiddeld 4 of meer', () => {
    expect(reviewsTonen(r(5, 4, 4, 4, 3))).toBe(true);
  });

  it('gemiddelde van niets is 0', () => {
    expect(gemiddeldeScore([])).toBe(0);
  });
});

describe('homepage: teller', () => {
  it(`toont pas vanaf ${MIN_TELLER} groepen`, () => {
    expect(tellerTonen(MIN_TELLER - 1)).toBe(false);
    expect(tellerTonen(MIN_TELLER)).toBe(true);
  });

  it('negeert onzin', () => {
    expect(tellerTonen(Number.NaN)).toBe(false);
    expect(tellerTonen(12.5)).toBe(false);
  });
});
