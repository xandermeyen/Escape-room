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
  p1: ['6d95368648b569fb1fe2adced89be071011bb3f9f82abf498daf495cc213116e'],
  p2: ['0ba7ea9cf252f255e39e41ea00307fe7995436e190d08bc4adf70da603d609e9'],
  p3: ['7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451'],
  p4: ['91ada21b3f9f3b21939e6a7c3154c4f7cf002db220306095cb48010c84f4efaa'],
  p5: ['89f2a5f508866dcf1498b9e2059f33663672ddfc2a553f97bd17373545a43f82'],
  // Eindrapport, veld "vervoer" (geen puzzel, enkel in einde.html gecontroleerd)
  vervoer: ['04e027e4990a203f4899f7e87c2d5ff6b9019e9565795619a59ce06c099560d4'],
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

/** P4: voor- en achternaam in vaste (alfabetische) volgorde. */
export function normaliseerNaam(basis: string): string {
  return basis.split(' ').filter(Boolean).sort().join(' ');
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
  // één week ernaast
  p3: [
    'e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683',
    '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3',
  ],
  // alleen de voornaam of alleen de achternaam
  p4: [
    'c6d17a3613b9914e68707fcfac8410f097643bc5840681bb533030d73cbb18f8',
    '6983682fa44129f21f376d56c3d534e1ddd42a8f14682f36f3ce627bb623ff68',
  ],
  // juiste uur, verkeerde minuten
  p5: ['19b100ab7725c612f3d80ff203ca53cea5cadaafae3bf0f88f0fb4089fe08815'],
};

const woorden = (vorm: string) => vorm.split(' ').filter(Boolean);

export const KAMER14_ANTWOORD_REGELS: Record<string, AntwoordRegel> = {
  p1: {
    normaliseer: normaliseerDagen,
    bijnaHashes: BIJNA_HASHES.p1,
    deelvormen: vorm => woorden(vorm).filter(w => WEEKDAGEN.includes(w)),
  },
  p3: { normaliseer: normaliseerAantal, bijnaHashes: BIJNA_HASHES.p3 },
  p4: {
    normaliseer: normaliseerNaam,
    // Eén letter verschil mag (typfout). De varianten worden van de invoer
    // gemaakt en daarna gehasht, het antwoord zelf staat nergens.
    varianten: basis => eenTypfoutVarianten(basis),
    bijnaHashes: BIJNA_HASHES.p4,
    deelvormen: woorden,
  },
  vervoer: { normaliseer: normaliseerVervoer },
  p5: {
    normaliseer: normaliseerTijd,
    bijnaHashes: BIJNA_HASHES.p5,
    deelvormen: vorm => (/^\d{2}:\d{2}$/.test(vorm) ? [vorm.slice(0, 2)] : []),
  },
};

// ── Puzzels en vrijgave (voor de speldata) ────────────────
/** Alle puzzels van Kamer 14. P6 is de uitgescheurde bladzijde (bladzijde.ts). */
export const KAMER14_PUZZELS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

/** De laatste puzzel: daarna komt de balk naar het rapport. */
export const KAMER14_LAATSTE = 'p6';

// Welke puzzels opgelost moeten zijn voor een puzzel vrijkomt voor de groep.
export const KAMER14_VRIJGAVE: Record<string, string[]> = {
  p1: [],
  p2: ['p1'],
  p3: ['p1'],
  p4: ['p2', 'p3'],
  p5: ['p4'],
  p6: ['p5'],
};

// ── Timer-waarschuwingen in de verhaalwereld van Kamer 14 ─
export const KAMER14_TIMER_WAARSCHUWINGEN: TimerWaarschuwing[] = [
  {
    minuten: 30,
    titel: 'Melding — halftime',
    tekst:
      'Het kantoor van An Vermeersch sluit om 17u00. U heeft nog 30 minuten om uw rapport in te dienen.',
    urgent: false,
  },
  {
    minuten: 10,
    titel: '⚠ Dringend — nog 10 minuten',
    tekst:
      'Het intern dossier van Lena Bogaert wordt automatisch gesloten als er geen rapport is ingediend.',
    urgent: true,
  },
];
