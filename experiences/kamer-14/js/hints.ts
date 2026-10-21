/**
 * hints.ts: de hints van Kamer 14, per puzzel en per speler.
 *
 * De hints staan in de zijbalk onder "Vast?". Enkel puzzels die vrij zijn en
 * nog niet opgelost, krijgen een blok. Elke speler ziet de hints vanuit zijn
 * eigen kant: wat hij zelf heeft en wat hij aan de ander moet vragen.
 * De blokken gebruiken de gewone hint-opmaak (hint-knop, hint-stap,
 * hint-verder), zodat utils.volgendHint en hulp.ts ze herkennen.
 */
import type { Kamer14Rol } from './kamer14-hulp.ts';
import { KAMER14_PUZZEL_NAMEN, KAMER14_PUZZELS, KAMER14_VRIJGAVE } from './kamer14-config.ts';

export const KAMER14_HINTS: Record<Kamer14Rol, Record<string, string[]>> = {
  a: {
    p0: [
      'De computer vraagt de dag en maand waarop Lena bij het gastgezin begon. Dat staat niet bij jou.',
      'Speler B staat in de kamer van Lena. Wat krijg je als je ergens nieuw komt wonen?',
      'De welkomstkaart in de kleerkast heeft een datum. Typ dag en maand: vier cijfers.',
    ],
    p1: [
      'Het rooster zegt hoe laat Lena terug moest zijn. Speler B heeft het logboek van Katrijn met het uur waarop ze echt thuiskwam.',
      'Vergelijk week per week. Op twee dagen is ze telkens uren te laat.',
      'De wandeling langs het kanaal en de tweede bakkerijdag van de week. Zoek in het rooster welke weekdagen dat zijn.',
    ],
    p2: [
      'Op de gsm van Lena staat de sticker "mijn plein". Jij hebt een tekening van een plein.',
      'Lena kleurde vier ramen geel. Beschrijf aan Speler B in welke huizen, van links naar rechts.',
      'Het huis met de kroon, de smalle gevel met de erker, de halve zonnewijzer en de groene luiken. Speler B zoekt hun nummers op de kaart.',
    ],
    p3: [
      'Op de gsm van Lena staat een voicemail. Vraag Speler B wat er gezegd wordt.',
      'Het uur valt weg achter de beiaard. Welk deuntje speelt er? De folder in de ateliermap weet meer.',
      'Het deuntje is "Altijd is Kortjakje ziek". In de folder staat hoe laat de beiaard dat speelt.',
    ],
    p4: [
      'Volgens het kwitantieboekje betaalde Lena elke week €35. Vraag Speler B wat het kasboek van Katrijn zegt.',
      'Het geld dat volgens het kasboek nooit binnenkwam, plus wat de bakkerij haar gaf.',
      '7 weken × €35 en €40 van de bakkerij. Speler B zet die som op het slot.',
    ],
    p5: [
      'Je hebt een telefoonnotitie van een buurman. Waar stond Katrijn om 7u35?',
      'Hoe lang wandel je van de Markt naar de Gasthuisstraat? Bijlage D zegt het.',
      'Om 7u35 op de Markt en een kwartier wandelen: Katrijn kon niet om 07u45 thuis zijn. Speler B noteert het vroegste uur.',
    ],
    p6: [
      'Lees Speler B voor hoe elk van jouw stroken begint en eindigt.',
      'Een zin die halverwege stopt, loopt verder op een strook van Speler B.',
      'De strook met de datum komt eerst. Dan "naar mij vraagt", als laatste "de fiets heb ik bij elkaar".',
    ],
  },
  b: {
    p0: [
      'Speler A zit voor een computer op slot. Die vraagt de dag waarop Lena bij het gastgezin begon.',
      'Kijk in de kleerkast.',
      'De welkomstkaart is van 3 april 2023. Geef Speler A de code 0304.',
    ],
    p1: [
      'In het logboek van Katrijn staat hoe laat Lena thuiskwam, niet hoe laat ze terug moest zijn. Dat weet Speler A.',
      'Lees Speler A per dag de uren voor.',
      'De wandelingen en de tweede bakkerijbeurt van elke week lopen uren uit. Speler A vindt in het rooster welke weekdagen dat zijn.',
    ],
    p2: [
      '"Mijn plein": op het prikbord hangt een kaart van een plein met genummerde huizen.',
      'Speler A heeft een tekening van hetzelfde plein. Vraag wat er opvalt.',
      'Vier ramen zijn geel ingekleurd. Zet de nummers van die huizen op een rij, van links naar rechts zoals op de tekening.',
    ],
    p3: [
      'Luister de voicemail goed. Het belangrijkste woord valt weg.',
      'Neurie of beschrijf het deuntje van de beiaard aan Speler A.',
      'Het is "Altijd is Kortjakje ziek" (do do sol sol la la sol). Speler A heeft een folder met het uur.',
    ],
    p4: [
      '"Voor N.": Lena spaarde voor iets. Hoeveel had ze bij elkaar?',
      'Tel in het kasboek de weken met €0. Speler A heeft nog een briefje over geld.',
      '7 × €35 = €245, plus €40 van de bakkerij. Kijk ook naar de kassabon in de kast.',
    ],
    p5: [
      'Katrijn schrijft dat ze om 07u45 de kamer leeg vond. Klopt dat? Speler A heeft een getuige.',
      'Vraag Speler A waar Katrijn om 7u35 stond en hoe ver dat van huis is.',
      'De Markt ligt op een kwartier wandelen van de Gasthuisstraat. Tel dat op bij 7u35.',
    ],
    p6: [
      'Lees Speler A voor hoe elk van jouw stroken begint en eindigt.',
      'Jouw stroken beginnen midden in een zin. Welke strook van Speler A gaat eraan vooraf?',
      'Eerst "verpleegster zei", dan "weet niet wat ik", als laatste "neem ik de bus terug".',
    ],
  },
};

/** Id van het hint-blok van een puzzel voor een speler (A zonder achtervoegsel). */
export function hintBlokId(rol: Kamer14Rol, puzzel: string): string {
  return `hint-${puzzel}${rol === 'a' ? '' : `-${rol}`}`;
}

function hintBlok(rol: Kamer14Rol, puzzel: string): HTMLElement {
  const stappen = KAMER14_HINTS[rol][puzzel] ?? [];
  const blok = document.createElement('div');
  blok.className = 'hint-blok';
  blok.id = hintBlokId(rol, puzzel);
  blok.dataset['puzzel'] = puzzel;
  blok.hidden = true;

  const titel = document.createElement('p');
  titel.className = 'hint-titel';
  titel.textContent = KAMER14_PUZZEL_NAMEN[puzzel] ?? puzzel;

  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'hint-knop';
  knop.dataset['actie'] = 'hint';
  knop.textContent = 'Toon een hint';
  blok.append(titel, knop);

  stappen.forEach((tekst, i) => {
    const stap = document.createElement('div');
    stap.className = 'hint-stap verborgen';
    const nr = document.createElement('span');
    nr.className = 'hint-nr';
    nr.textContent = `Hint ${i + 1} van ${stappen.length}`;
    stap.append(nr, document.createTextNode(tekst));
    blok.append(stap);
  });

  const verder = document.createElement('button');
  verder.type = 'button';
  verder.className = 'hint-verder verborgen';
  verder.dataset['actie'] = 'hint';
  verder.textContent = 'Nog een hint';
  blok.append(verder);
  return blok;
}

/** Maakt alle hint-blokken aan in de zijbalk. */
export function initHints(
  rol: Kamer14Rol,
  lijst: HTMLElement | null = document.getElementById('hints-lijst'),
): void {
  if (!lijst) return;
  lijst.replaceChildren(...KAMER14_PUZZELS.map(p => hintBlok(rol, p)));
}

/** Toont enkel de hints van puzzels die vrij zijn en nog niet opgelost. */
export function updateHints(
  status: Record<string, boolean>,
  lijst: HTMLElement | null = document.getElementById('hints-lijst'),
): void {
  if (!lijst) return;
  let zichtbaar = 0;
  lijst.querySelectorAll<HTMLElement>('.hint-blok').forEach(blok => {
    const p = blok.dataset['puzzel'] ?? '';
    const open = !status[p] && (KAMER14_VRIJGAVE[p] ?? []).every(v => status[v]);
    blok.hidden = !open;
    if (open) zichtbaar++;
  });
  lijst.closest('section')?.toggleAttribute('hidden', zichtbaar === 0);
}
