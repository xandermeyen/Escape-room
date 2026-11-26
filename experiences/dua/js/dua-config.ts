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
import type { Versie } from '../../../shared/js/versies.ts';
import type { Speltaal } from '../../../shared/js/speltaal.ts';

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

/**
 * P1 per taal (zie docs/adr/001-meertaligheid.md): de brief die de Schrijver typt,
 * de code op het briefje van de Loper (eerst de rij, dan de kolom op de codekaart
 * RR-12, die in elke taal dezelfde is) en het woord als hash. De letterhamers
 * zijn in elke taal dezelfde.
 */
export interface P1Taal {
  brief: string;
  code: string;
  /** Aantal letters van het woord, en hetzelfde getal voluit voor in een zin. */
  letters: number;
  lettersVoluit: string;
  woordHash: string[];
}

export const DUA_P1: Record<Speltaal, P1Taal> = {
  nl: {
    brief:
      'MONSEIGNEUR. KIJK NIET LANGER WEG. UW AARZELING KOST U MEER DAN GELD. ' +
      'EEN LAATSTE TEKEN IS ONDERWEG: ZOEK WAAR REIZIGERS WACHTEN. ' +
      'HET NUMMER IS EEN MEER DAN HET AANTAL BRIEVEN DAT U TELT. - D.U.A.',
    code: '34 · 11 · 45 · 33 · 22',
    letters: 5,
    lettersVoluit: 'Vijf',
    woordHash: ['821713fad1075e18471e008705ef3f8a0a3e2bca4948efd750947808a012935c'],
  },
  en: {
    brief:
      'MONSEIGNEUR. LOOK AWAY NO LONGER. YOUR HESITATION WILL COST YOU MORE THAN MONEY. ' +
      'ONE LAST SIGN IS ON ITS WAY: SEEK WHERE TRAVELLERS WAIT. ' +
      'THE NUMBER IS ONE MORE THAN THE COUNT OF OUR LETTERS IN YOUR HANDS. - D.U.A.',
    code: '11 · 15 · 24 · 34 · 25 · 43',
    letters: 6,
    lettersVoluit: 'Six',
    woordHash: ['8bca6dada231e0fd80bf5ff9ff16aa79de1fb8e7b11cd282c0ea251d78376e9d'],
  },
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

/** "RR-12", "rr 12", "RR12" en "12" geven 12; iets anders null. */
export function archiefNummer(invoer: string): number | null {
  const m = /^(?:RR[\s-]*)?0*(\d{1,2})$/i.exec(invoer.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Versies voor de speldata in het host-paneel (zie shared/js/versies.ts).
 * Voeg een regel toe bij een wijziging die speeltijd of puzzels verandert.
 */
export const DUA_VERSIES: Versie[] = [
  { id: 'v1', vanaf: Date.UTC(2026, 0, 1), wat: 'Eerste versie' },
  {
    id: 'v2',
    vanaf: Date.parse('2026-10-23T13:24:00+02:00'),
    wat: 'Fixes uit de speltest met 2, 3 en 4 spelers',
  },
  {
    id: 'v3',
    vanaf: Date.parse('2026-11-10T23:00:00+01:00'),
    wat: 'P1: typemachine en woord alleen samen oplosbaar',
  },
];
