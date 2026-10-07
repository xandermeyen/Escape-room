/**
 * dua-hulp.ts — teksten voor de hulp tijdens D.U.A. (zie shared/js/hulp.ts).
 */
import type { Melding } from '../../../shared/js/hulp.ts';

export type Tijdperk = '1934' | '2034';

const STEM_1934 = 'Een stem uit de doos';
const DOSSIER_2034 = 'Notitie Bureau X';

export const DUA_INACTIEF: Record<Tijdperk, Record<string, Melding>> = {
  '1934': {
    p0: {
      titel: STEM_1934,
      tekst: 'Druk het zegel. Meer hoeft er niet te gebeuren. Vraag 2034 dan wat zij zien.',
    },
    p1: {
      titel: STEM_1934,
      tekst:
        'Eerst elke hamer in zijn vak, dan vijf letters dieper. Welk woord moet 2034 straks lezen? Denk aan jullie eigen opdracht in het Noordstation.',
    },
    p2: {
      titel: STEM_1934,
      tekst:
        'Kies het nummer dat de brief belooft en wacht tot de perronwachter helemaal rechts loopt.',
    },
    p3: {
      titel: STEM_1934,
      tekst:
        '2034 heeft de plattegrond, jullie stonden erbij. Vertel hen in welke volgorde de dragers liepen.',
    },
    p4: {
      titel: STEM_1934,
      tekst:
        'Ga pas naar binnen als je weet waar de politie in december zal zoeken. 2034 heeft het huiszoekingsverslag.',
    },
    p5: {
      titel: STEM_1934,
      tekst:
        'Eén plek overleeft de eeuw. 2034 weet welke gebouwen verbouwd of ontruimd werden. Vraag het voor je klikt.',
    },
  },
  '2034': {
    p0: {
      titel: DOSSIER_2034,
      tekst: 'Het vel blijft leeg zolang 1934 niets doet. Vraag hen het zegel te drukken.',
    },
    p1: {
      titel: DOSSIER_2034,
      tekst:
        'De doorslag verschijnt pas als 1934 de brief verstuurt. Lees daarna de dieper gedrukte letters in volgorde.',
    },
    p2: {
      titel: DOSSIER_2034,
      tekst:
        'Het ticket is half onleesbaar. Het tweede cijfer staat in de brief: één meer dan het aantal brieven dat het bisdom telt.',
    },
    p3: {
      titel: DOSSIER_2034,
      tekst:
        'Eén getuige vertelt iets wat die nacht onmogelijk was. Leg zijn verhaal naast De Gentenaar, en vraag 1934 wat zij zagen.',
    },
    p4: {
      titel: DOSSIER_2034,
      tekst:
        'Waar liet 1934 het mapje? Vraag het gewoon. Ligt het op een plek uit het huiszoekingsverslag, zeg het hen dan.',
    },
    p5: {
      titel: DOSSIER_2034,
      tekst:
        '1934 mag de plek niet noemen. Stel ja-neevragen en vertel hen wat de eeuw met elk gebouw deed.',
    },
  },
};

const NIEUW = 'De lijn kraakt';

/** Melding na een statuswijziging: wat is er nu open, en wat doet de andere kant. */
export function duaVrijgaveMelding(
  tijdperk: Tijdperk,
  oud: Record<string, boolean>,
  nieuw: Record<string, boolean>,
): Melding | null {
  const net = (p: string) => !!nieuw[p] && !oud[p];
  const t1934 = tijdperk === '1934';

  if (net('p5')) {
    return {
      titel: 'Gevonden',
      tekst: t1934 ? 'Schrijf nu de veertiende brief.' : 'Schrijf nu jullie eindrapport.',
    };
  }
  if (net('p4')) {
    return {
      titel: NIEUW,
      tekst: t1934
        ? 'Het mapje overleefde de huiszoeking. Kies nu de bergplaats op het stadsplan (⑤).'
        : 'Het stadsplan is open (⑤). 1934 kiest de plek; jullie vinden ze zonder dat zij ze noemen.',
    };
  }
  if ((net('p2') || net('p3')) && nieuw['p2'] && nieuw['p3']) {
    return {
      titel: NIEUW,
      tekst: t1934
        ? '2034 kan nu de werkkamer in het museum doorzoeken (④). Verstop het mapje, als dat nog niet gebeurde.'
        : 'De museale werkkamer is open (④). Vraag 1934 waar ze het mapje lieten.',
    };
  }
  if (net('p2') || net('p3')) {
    const nog = nieuw['p2'] ? 'de route (③)' : 'de kluis (②)';
    return { titel: 'Goed bezig', tekst: `Nog ${nog}, dan opent de werkkamer (④).` };
  }
  if (net('p1')) {
    return {
      titel: NIEUW,
      tekst: t1934
        ? '2034 las de brief. Nu tegelijk: deponeer het paneel in de kluis (②) en vertel 2034 de route van de dragers (③).'
        : 'Nu open: de bagagekluis (②) en de getuigen (③). 1934 deponeert het paneel en kent de route.',
    };
  }
  if (net('p0')) {
    return {
      titel: 'De handdruk is gelukt',
      tekst: t1934
        ? 'Herstel nu de typemachine en typ brief XII (①).'
        : 'Wacht op de doorslag van brief XII (①). 1934 moet eerst de typemachine herstellen.',
    };
  }
  return null;
}

export const DUA_HULP_HTML = `
  <h2 id="hulp-titel">Hulp nodig?</h2>
  <h3>Zo werkt D.U.A.</h3>
  <ul>
    <li>Jullie spelen in twee tijdperken. 1934 doet dingen, 2034 vindt wat er honderd jaar later van overblijft.</li>
    <li>Bel of videobel en zeg hardop wat je doet en ziet. Wat 1934 verknoeit, merkt 2034 pas later.</li>
    <li>Met z'n tweeën? Elk één tijdperk. Met meer? Verdeel de rollen per tijdperk; jullie zien hetzelfde dossier.</li>
    <li>De verdenkingsmeter stijgt bij risico's. Op 100% duiken jullie onder en verliezen jullie 5 minuten.</li>
  </ul>
  <h3>Vast?</h3>
  <ul>
    <li>Bij de puzzels staat <strong>Hint vragen</strong>. De hints gaan stap voor stap verder.</li>
    <li>Vraag het de andere kant: vaak heeft het andere tijdperk het ontbrekende stuk.</li>
    <li>"Je zit er vlak naast" betekent: bijna, overleg nog even.</li>
  </ul>
  <h3>Technisch probleem?</h3>
  <p>Herlaad de pagina: jullie voortgang blijft bewaard. Lukt het niet, mail naar
    <a href="mailto:info@bureau-x.be?subject=Hulp%20bij%20D.U.A.">info@bureau-x.be</a>
    met je sessiecode.</p>
`;
