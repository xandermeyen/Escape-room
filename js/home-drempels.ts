/**
 * home-drempels.ts: wanneer de homepage reviews en de teller toont.
 * Apart van landing-home.ts, zodat tests dit zonder Firebase kunnen laden.
 */

/** Reviews pas tonen vanaf zoveel goedgekeurde reviews... */
export const MIN_REVIEWS = 5;
/** ...met minstens dit gemiddelde. Daaronder trekt de sectie het vertrouwen omlaag. */
export const MIN_GEMIDDELDE = 4;
/** De teller pas tonen vanaf zoveel uitgespeelde groepen ("2 groepen" overtuigt niemand). */
export const MIN_TELLER = 10;

export function gemiddeldeScore(reviews: readonly { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  return reviews.reduce((som, r) => som + r.rating, 0) / reviews.length;
}

export function reviewsTonen(reviews: readonly { rating: number }[]): boolean {
  return reviews.length >= MIN_REVIEWS && gemiddeldeScore(reviews) >= MIN_GEMIDDELDE;
}

export function tellerTonen(aantal: number): boolean {
  return Number.isInteger(aantal) && aantal >= MIN_TELLER;
}
