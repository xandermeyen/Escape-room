/**
 * dua-config.ts — antwoordcontrole en vrijgave voor D.U.A.
 * Antwoorden staan enkel als SHA-256-hash in de bundle (zelfde aanpak als
 * Kamer 14). De hash is die van de vaste vorm na normaliseerInvoer() en de
 * normaliseer() van de puzzel.
 */
import {
  eenTypfoutVarianten,
  normaliseerInvoer,
  type AntwoordRegel,
} from '../../../shared/js/utils.ts';

export const DUA_HASHES: Record<string, string[]> = {
  // P1: het woord in de doorslag
  woord: ['821713fad1075e18471e008705ef3f8a0a3e2bca4948efd750947808a012935c'],
  // P2: het kluisnummer dat 1934 kiest
  kluis: ['3fdba35f04dc8c462986c992bcf875546257113072a909c162f7e470e581e278'],
  // P3: zonenummers van de route
  route: ['2eab8676deafcd2510a31613085a1242fb15f413789aa73787d541aae745818d'],
  // P5: de plek die de eeuw overleeft
  plek: ['a360c666cfc62f704fdf79dd29e11861f604a726877e077944e6fb24e829b04f'],
};

/** Alleen de cijfers: "3-1-9-4", "3 1 9 4" en "3,1,9,4" worden "3194". */
export function alleenCijfers(basis: string): string {
  return basis.replace(/\D/g, '');
}

export const DUA_REGELS: Record<string, AntwoordRegel> = {
  kluis: {
    normaliseer: alleenCijfers,
    // één ernaast (12 of 14)
    bijnaHashes: [
      '6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918',
      '8527a891e224136950ff32ca212b45bc93f69fbb801c3b1ebedac52775f99e61',
    ],
  },
  route: {
    normaliseer: alleenCijfers,
    // juiste plekken, verkeerde volgorde: de cijfers gesorteerd
    bijnaHashes: ['6f42ae6ab479ee1698056d7ac5452bd3ccdedf788e1d78e5c1098ee13ee00f2b'],
    deelvormen: vorm => [[...vorm].sort().join('')],
  },
};

export const DUA_BIJNA_ROUTE =
  'De juiste plekken, maar niet in de juiste volgorde. Vraag 1934 in welke volgorde ze het zagen.';
export const DUA_BIJNA_KLUIS =
  'Je zit er vlak naast. Hoeveel brieven kreeg het bisdom echt? Brief XIII komt nooit aan.';

/**
 * P1 (2034): klopt wat de speler typte met het woord in de doorslag?
 * Soepel voor hoofdletters, spaties en leestekens; één letter verschil is
 * 'bijna'.
 */
export function beoordeelDoorslag(invoer: string, woord: string): 'juist' | 'bijna' | 'fout' {
  const a = normaliseerInvoer(invoer).replace(/\s/g, '');
  const b = normaliseerInvoer(woord).replace(/\s/g, '');
  if (!a || !b) return 'fout';
  if (a === b) return 'juist';
  return eenTypfoutVarianten(a).includes(b) ? 'bijna' : 'fout';
}

/** Wanneer komt welke puzzel vrij. ontgrendeld() in dua-ui.ts leest deze tabel. */
export const DUA_VRIJGAVE: Record<string, string[]> = {
  p0: [],
  p1: ['p0'],
  p2: ['p1'],
  p3: ['p1'],
  p4: ['p2', 'p3'],
  p5: ['p4'],
};

export const DUA_PUZZELS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
