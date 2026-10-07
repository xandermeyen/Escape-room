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
  p3: ['2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3'],
  p4: ['91ada21b3f9f3b21939e6a7c3154c4f7cf002db220306095cb48010c84f4efaa'],
  p5: ['89f2a5f508866dcf1498b9e2059f33663672ddfc2a553f97bd17373545a43f82'],
};

// ── Normalizers per puzzel ────────────────────────────────
// Krijgen de basisvorm binnen (kleine letters, geen accenten, leestekens
// als spatie, enkele spaties) en geven één vaste vorm terug.

const WEEKDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

const DAG_AFKORTINGEN: Record<string, string> = {
  ma: 'maandag', maa: 'maandag',
  di: 'dinsdag', din: 'dinsdag', dins: 'dinsdag',
  wo: 'woensdag', woe: 'woensdag', woen: 'woensdag',
  do: 'donderdag', don: 'donderdag', dond: 'donderdag',
  vr: 'vrijdag', vrij: 'vrijdag',
  za: 'zaterdag', zat: 'zaterdag',
  zo: 'zondag', zon: 'zondag',
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
  // Onbekende woorden blijven staan, zodat "dinsdag donderdag diest" niet
  // stilletjes als juist telt.
  return [...gesorteerd, ...overige].join(' ');
}

const GETALWOORDEN: Record<string, number> = {
  nul: 0, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
  tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16,
  zeventien: 17, achttien: 18, negentien: 19, twintig: 20,
};

/** P3: "7", "7 weken", "zeven", "zeven weken", "7w" → alleen het cijfer. */
export function normaliseerAantal(basis: string): string {
  const woorden = basis.split(' ');
  for (const woord of woorden) {
    const cijfers = /^(\d+)/.exec(woord);
    if (cijfers) return String(parseInt(cijfers[1] ?? '', 10));
  }
  // Geen cijfers: getalwoorden. "een" telt pas als er geen ander getal staat
  // ("een week of zeven" → 7).
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
 * "7:35" en "7.35" komen hier binnen als "7 35".
 * Herkent o.a. 7u35, 07u35, 7 35, 0735, 735, 7h35, "om 7u35", "7u35 uur".
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

export const KAMER14_ANTWOORD_REGELS: Record<string, AntwoordRegel> = {
  p1: { normaliseer: normaliseerDagen },
  p3: { normaliseer: normaliseerAantal },
  p4: {
    normaliseer: normaliseerNaam,
    // Eén letter verschil mag (typfout). De varianten worden van de invoer
    // gemaakt en daarna gehasht, het antwoord zelf staat nergens.
    varianten: basis => eenTypfoutVarianten(basis),
  },
  p5: { normaliseer: normaliseerTijd },
};

// ── Timer-waarschuwingen in de verhaalwereld van Kamer 14 ─
export const KAMER14_TIMER_WAARSCHUWINGEN: TimerWaarschuwing[] = [
  {
    minuten: 30,
    titel: 'Melding — halftime',
    tekst: 'Het kantoor van An Vermeersch sluit om 17u00. U heeft nog 30 minuten om uw rapport in te dienen.',
    urgent: false,
  },
  {
    minuten: 10,
    titel: '⚠ Dringend — nog 10 minuten',
    tekst: 'Het intern dossier van Lena Bogaert wordt automatisch gesloten als er geen rapport is ingediend.',
    urgent: true,
  },
];
