/**
 * kamer14-config.ts — Kamer 14-specifieke spelconfiguratie.
 * Verhaalteksten en antwoordhashes horen bij deze experience, niet in de
 * gedeelde modules.
 */
import type { TimerWaarschuwing } from '../../../shared/js/timer.ts';
import { eenTypfoutVarianten, type AntwoordRegel } from '../../../shared/js/utils.ts';

// ── Puzzel-antwoorden (SHA-256 gehasht) ───────────────────
// Plain-text antwoorden staan niet in de broncode.
// De hash is telkens die van de VASTE VORM: de invoer na normaliseerInvoer()
// uit utils.ts én na de normaliseer() van de puzzel hieronder. Nieuwe hash
// maken in de browserconsole:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('<vaste vorm>'))
//     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')))
export const KAMER14_ANTWOORD_HASHES: Record<string, string[]> = {
  // P0 toegangscode terminal (startdatum plaatsing, DDMM)
  p0: ['3812dd069593766d28dd6fe95a40d2540631adaffe8a6fead9a684fec89ddcfd'],
  // P1 de twee late weekdagen
  p1: ['6d95368648b569fb1fe2adced89be071011bb3f9f82abf498daf495cc213116e'],
  // P2 pincode van de oude gsm
  p2: ['b4755fa1bacc6873c8a0a2b26dc7dad18ca5e230db87418e571f7baca76fdc31'],
  // P3 uur van de afspraak op de markt
  p3: ['90e1062f1578fa30baaf182388e88d3ec46bc202cfb800325c3fb225f0d7bc4d'],
  // P4 cijferslot van de spaardoos
  p4: ['a0d177b4967a6d99f4ff117defe1c0d23d4e78ca4630febcb948ee9e4520eff3'],
  // P5 hoe laat Katrijn ten vroegste thuis kon zijn
  p5: ['7c4b96e4587b038445c10d2b4722827d2ba8a4baf9343db5ffcede2f713f0c61'],
  // Eindrapport (geen puzzels, enkel in einde.html gecontroleerd)
  bestemming: ['0ba7ea9cf252f255e39e41ea00307fe7995436e190d08bc4adf70da603d609e9'],
  // "dochter", "noor", "kind", "dochtertje": één woord uit de zin volstaat
  wie: [
    'a795fc6be3ad1463ff4bfcb77cd459bd60189957d3d92a0eb5ec32ce89ca71c9',
    '92a70799e19d8734fecfb8e59aa930e9f386f7645059a1f2f04eb8483c9b5f1d',
    '0b27c158feb36ab18a10ff687909ec730ece6280581dd407e2672359be7725dd',
    'fbc3ea80776e9064e4c10c0bd8973aab9309d564c5a2043c1aafd8a34c79849b',
  ],
  vervoer: ['04e027e4990a203f4899f7e87c2d5ff6b9019e9565795619a59ce06c099560d4'],
  terug: [
    'b2398757b918b4169156035d58932102d5d72c26251693b3fd89bb7a03395e83',
    'c01c4a36f5a17093d632590b7fcfcc36bbb9b64f44ff518a900030b3f3fb2f7b',
  ],
};

// ── Normalizers per puzzel ────────────────────────────────
// Krijgen de basisvorm binnen (kleine letters, geen accenten, leestekens
// als spatie, enkele spaties) en geven één vaste vorm terug.

const WEEKDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

const DAG_AFKORTINGEN: Record<string, string> = {
  ma: 'maandag',
  maa: 'maandag',
  di: 'dinsdag',
  din: 'dinsdag',
  dins: 'dinsdag',
  wo: 'woensdag',
  woe: 'woensdag',
  woen: 'woensdag',
  do: 'donderdag',
  don: 'donderdag',
  dond: 'donderdag',
  vr: 'vrijdag',
  vrij: 'vrijdag',
  za: 'zaterdag',
  zat: 'zaterdag',
  zo: 'zondag',
  zon: 'zondag',
};

const VULWOORDEN = new Set(['en', 'op', 'de', 'elke', 'iedere', 'telkens', 'of']);

function herkenDag(woord: string): string | null {
  const afkorting = DAG_AFKORTINGEN[woord];
  if (afkorting) return afkorting;
  // "dinsdag", "dinsdagen", "dinsdags", "dinsdagochtend", ...
  return WEEKDAGEN.find(dag => woord.startsWith(dag)) ?? null;
}

/** P1: dagen herkennen, vulwoorden negeren, sorteren in weekvolgorde. */
export function normaliseerDagen(basis: string): string {
  const dagen = new Set<string>();
  const overige: string[] = [];
  for (const woord of basis.split(' ')) {
    if (!woord || VULWOORDEN.has(woord)) continue;
    const dag = herkenDag(woord);
    if (dag) dagen.add(dag);
    else overige.push(woord);
  }
  const gesorteerd = [...dagen].sort((a, b) => WEEKDAGEN.indexOf(a) - WEEKDAGEN.indexOf(b));
  // Onbekende woorden blijven staan, zodat de twee dagen plus een stadsnaam niet
  // stilletjes als juist telt.
  return [...gesorteerd, ...overige].join(' ');
}

const GETALWOORDEN: Record<string, number> = {
  nul: 0,
  een: 1,
  twee: 2,
  drie: 3,
  vier: 4,
  vijf: 5,
  zes: 6,
  zeven: 7,
  acht: 8,
  negen: 9,
  tien: 10,
  elf: 11,
  twaalf: 12,
  dertien: 13,
  veertien: 14,
  vijftien: 15,
  zestien: 16,
  zeventien: 17,
  achttien: 18,
  negentien: 19,
  twintig: 20,
};

/** P3: "5", "5 weken", "vijf", "vijf weken", "5w" → alleen het cijfer. */
export function normaliseerAantal(basis: string): string {
  const woorden = basis.split(' ');
  for (const woord of woorden) {
    const cijfers = /^(\d+)/.exec(woord);
    if (cijfers) return String(parseInt(cijfers[1] ?? '', 10));
  }
  // Geen cijfers: getalwoorden. "een" telt pas als er geen ander getal staat
  // ("een week of vijf" → 5).
  const getallen = woorden.filter(w => w in GETALWOORDEN);
  const keuze = getallen.find(w => w !== 'een') ?? getallen[0];
  return keuze !== undefined ? String(GETALWOORDEN[keuze]) : basis;
}

/** Codes op een cijferslot: enkel de cijfers tellen. */
export function normaliseerCijfers(basis: string): string {
  const cijfers = basis.replace(/\D/g, '');
  return cijfers || basis;
}

/**
 * Rapport: elk woord van de zin is ook een kandidaat, zodat "op de Grote
 * Markt in ..." of "bij haar ... en Marie" telt als het juiste woord erin staat.
 * Met een typfout per woord, vanaf vier letters.
 */
export function woordVarianten(basis: string): string[] {
  const uit: string[] = [];
  for (const w of basis.split(' ').filter(Boolean)) {
    uit.push(w);
    if (w.length >= 4) uit.push(...eenTypfoutVarianten(w));
  }
  return uit;
}

/**
 * P5: elke tijdnotatie → "uu:mm". Leestekens zijn al spaties geworden, dus
 * "8:15" en "8.15" komen hier binnen als "8 15".
 * Herkent o.a. 8u15, 08u15, 8 15, 0815, 815, 8h15, "om 8u15", "8u15 uur".
 */
export function normaliseerTijd(basis: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const metMinuten = /(?<!\d)(\d{1,2}) ?(?:u|h|uur)? ?(\d{2})(?!\d)/.exec(basis);
  if (metMinuten) {
    const uur = parseInt(metMinuten[1] ?? '', 10);
    const min = parseInt(metMinuten[2] ?? '', 10);
    if (uur <= 23 && min <= 59) return `${pad(uur)}:${pad(min)}`;
  }
  const alleenUur = /(?<!\d)(\d{1,2}) ?(?:u|h|uur)?$/.exec(basis);
  if (alleenUur) {
    const uur = parseInt(alleenUur[1] ?? '', 10);
    if (uur <= 23) return `${pad(uur)}:00`;
  }
  return basis;
}

/**
 * Vervoer (eindrapport): herkent een vervoermiddel in vrije tekst en geeft
 * één vaste vorm per soort terug. Alle soorten staan erin (ook de foute),
 * zodat deze lijst niet verklapt welke juist is: dat beslist de hash.
 * "met de bus van De Lijn", "lijn 19", "autobus" → zelfde vorm.
 * Noemt iemand twee soorten ("bus of trein"), dan telt het niet.
 */
const VERVOER_SOORTEN: Record<string, string[]> = {
  bus: ['bus', 'autobus', 'bussen', 'busje', 'buslijn', 'lijnbus', 'belbus', 'lijn', 'delijn'],
  trein: ['trein', 'nmbs', 'sncb', 'spoor', 'treinen'],
  auto: ['auto', 'wagen', 'taxi', 'lift', 'carpool'],
  fiets: ['fiets', 'velo', 'brommer', 'bromfiets', 'step'],
  voet: ['voet', 'lopen', 'wandelen', 'stappen', 'gewandeld', 'gelopen'],
  tram: ['tram', 'metro'],
};

/** Verschillen twee woorden hoogstens één letter (weg, erbij, anders, omgewisseld)? */
function eenLetterVerschil(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  return eenTypfoutVarianten(a).includes(b);
}

export function normaliseerVervoer(basis: string): string {
  const gevonden = new Set<string>();
  for (const woord of basis.split(' ')) {
    for (const [soort, woorden] of Object.entries(VERVOER_SOORTEN)) {
      // Typfouten per woord ("autbus", "ljn"), maar pas vanaf 3 letters.
      const past = woorden.some(w =>
        woord.length >= 3 ? eenLetterVerschil(woord, w) : woord === w,
      );
      if (past) gevonden.add(soort);
    }
  }
  return gevonden.size === 1 ? ([...gevonden][0] ?? basis) : basis;
}

// ── "Dicht bij"-hashes (gedeeltelijke antwoorden) ─────────
// Een fout antwoord waarvan een deel overeenkomt met een van deze hashes,
// krijgt de melding "Je zit dicht bij het antwoord. Overleg nog eens."
const BIJNA_HASHES = {
  // één van de twee dagen
  p1: [
    '6840256bfd48d0fd13232873b39598f56713436ea2a7c420903f61c3beff836a',
    '6191fbd66df12698077ebe41ef598172d4fdb37ef4ba362ed72704b6d1e0f43b',
  ],
  // het juiste uur (bv. de bus van 07:35 ingevuld in plaats van thuiskomst)
  p5: ['19b100ab7725c612f3d80ff203ca53cea5cadaafae3bf0f88f0fb4089fe08815'],
};

const woorden = (vorm: string) => vorm.split(' ').filter(Boolean);

export const KAMER14_ANTWOORD_REGELS: Record<string, AntwoordRegel> = {
  p0: { normaliseer: normaliseerCijfers },
  p1: {
    normaliseer: normaliseerDagen,
    bijnaHashes: BIJNA_HASHES.p1,
    deelvormen: vorm => woorden(vorm).filter(w => WEEKDAGEN.includes(w)),
  },
  p2: { normaliseer: normaliseerCijfers },
  p3: { normaliseer: normaliseerTijd },
  p4: { normaliseer: normaliseerCijfers },
  p5: {
    normaliseer: normaliseerTijd,
    bijnaHashes: BIJNA_HASHES.p5,
    deelvormen: vorm => (/^\d{2}:\d{2}$/.test(vorm) ? [vorm.slice(0, 2)] : []),
  },
  bestemming: { varianten: woordVarianten },
  wie: { varianten: woordVarianten },
  vervoer: { normaliseer: normaliseerVervoer },
  terug: { normaliseer: normaliseerTijd },
};

// ── Puzzels en vrijgave (voor de speldata) ────────────────
/** Alle puzzels van Kamer 14, in speelvolgorde. */
export const KAMER14_PUZZELS: string[] = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

/** Korte naam per puzzel, voor het dashboard en de tests. */
export const KAMER14_PUZZEL_NAMEN: Record<string, string> = {
  p0: 'Toegangscode',
  p1: 'Late dagen',
  p2: 'Pincode gsm',
  p3: 'Voicemail',
  p4: 'Spaardoos',
  p5: 'Alibi Katrijn',
  p6: 'Dagboekstroken',
};

/** Puzzels met een slot dat een antwoord controleert (P6 legt stroken). */
export const KAMER14_SLOT_PUZZELS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'] as const;
export type Kamer14SlotPuzzel = (typeof KAMER14_SLOT_PUZZELS)[number];

/** De laatste puzzel: daarna komt de knop naar het rapport. */
export const KAMER14_LAATSTE = 'p6';

// Welke puzzels opgelost moeten zijn voor een puzzel vrijkomt voor de groep.
export const KAMER14_VRIJGAVE: Record<string, string[]> = {
  p0: [],
  p1: ['p0'],
  p2: ['p1'],
  p3: ['p2'],
  p4: ['p1'],
  p5: ['p3', 'p4'],
  p6: ['p5'],
};

// ── Timer-waarschuwingen in de verhaalwereld van Kamer 14 ─
export const KAMER14_TIMER_WAARSCHUWINGEN: TimerWaarschuwing[] = [
  {
    minuten: 30,
    titel: 'Halverwege',
    tekst: 'Het is half vijf. Om vijf uur beslist An of ze Lena als vermist meldt.',
    urgent: false,
  },
  {
    minuten: 10,
    titel: '⚠ Dringend: nog 10 minuten',
    tekst: 'Nog tien minuten. Zonder rapport meldt An een vermissing.',
    urgent: true,
  },
];
