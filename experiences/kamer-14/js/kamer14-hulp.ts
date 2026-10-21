/**
 * kamer14-hulp.ts — teksten voor de hulp tijdens Kamer 14 (zie shared/js/hulp.ts):
 * verhaalmeldingen bij inactiviteit, meldingen na elke opgeloste puzzel en
 * de uitleg achter "Hulp nodig?".
 */
import type { Melding } from '../../../shared/js/hulp.ts';

export type Kamer14Rol = 'a' | 'b';

/** Verhaalmelding per puzzel na lange inactiviteit, per speler. */
export const KAMER14_INACTIEF: Record<Kamer14Rol, Record<string, Melding>> = {
  a: {
    p0: {
      titel: 'An Vermeersch',
      tekst:
        'Mijn computer vraagt wanneer Lena bij Katrijn en Luc begon. Wie in haar kamer staat, vindt dat wel.',
    },
    p1: {
      titel: 'An Vermeersch',
      tekst:
        'Mijn rooster zegt wanneer Lena thuis moest zijn. Katrijn schrijft op wanneer ze echt thuiskwam. Leg ze naast elkaar.',
    },
    p2: {
      titel: 'An Vermeersch',
      tekst: 'Dat gele krijt op haar tekening. Waarom maar vier ramen?',
    },
    p3: {
      titel: 'An Vermeersch',
      tekst: 'Een beiaard speelt niet zomaar iets. Er staat een lijstje in de folder.',
    },
    p4: {
      titel: 'An Vermeersch',
      tekst:
        'Volgens mijn boekje betaalde ze elke week. Volgens Katrijn niet. Waar ging dat geld naartoe?',
    },
    p5: {
      titel: 'An Vermeersch',
      tekst: 'Een buurman zag Katrijn om 7u35 op de Markt. Hoe lang wandel je dan naar huis?',
    },
    p6: {
      titel: 'An Vermeersch',
      tekst:
        'Waarom zei ze niets? Misschien staat het op die bladzijde. Katrijn heeft de andere stroken.',
    },
  },
  b: {
    p0: {
      titel: 'Katrijn',
      tekst:
        'An zit aan haar computer en kan er niet in. Ze vraagt wanneer Lena bij ons kwam wonen. Kijk eens in de kast.',
    },
    p1: {
      titel: 'Katrijn',
      tekst: 'Ik schreef telkens op hoe laat ze thuiskwam. An weet hoe laat ze terug moest zijn.',
    },
    p2: {
      titel: 'Katrijn',
      tekst: 'Die oude gsm... "mijn plein". Ze tekende al weken hetzelfde plein, zegt An.',
    },
    p3: {
      titel: 'Katrijn',
      tekst: 'Wat speelt die beiaard daar? An heeft een folder van Diest in de map.',
    },
    p4: {
      titel: 'Katrijn',
      tekst: 'Die spaardoos... Ze legde elke week iets opzij. Tel eens wat er bij elkaar komt.',
    },
    p5: {
      titel: 'Katrijn',
      tekst: 'Ik schreef 07u45 op. Of dat klopt? Vraag An maar wie er gebeld heeft.',
    },
    p6: {
      titel: 'Katrijn',
      tekst: 'Die stroken zijn van haar dagboek. An heeft er ook. Lees ze elkaar voor.',
    },
  },
};

const NIEUW = 'Nieuw';

/**
 * Melding na een statuswijziging: wat kwam er vrij voor deze speler, en wat
 * doet de andere speler nu. Puur, zodat het te testen valt.
 */
export function kamer14VrijgaveMelding(
  rol: Kamer14Rol,
  oud: Record<string, boolean>,
  nieuw: Record<string, boolean>,
): Melding | null {
  const net = (p: string) => !!nieuw[p] && !oud[p];
  const a = rol === 'a';

  if (net('p6')) {
    return {
      titel: 'De bladzijde past',
      tekst:
        'Luister naar Lena. Daarna schrijven jullie samen het rapport voor An. Spreek af wie typt.',
    };
  }
  if (net('p5')) {
    return {
      titel: NIEUW,
      tekst: a
        ? "In de ateliermap zaten drie stroken uit Lena's dagboek. Ze liggen op het bureau. Speler B heeft de andere drie."
        : 'Katrijn vond drie stroken achter het nachtkastje. Speler A heeft de andere drie.',
    };
  }
  if ((net('p3') || net('p4')) && nieuw['p3'] && nieuw['p4']) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De telefoon: een buurman belde over vanochtend. Speler B heeft het logboek van Katrijn.'
        : 'Er klopt iets niet in het logboek van Katrijn. Speler A heeft een telefoonnotitie van een buurman.',
    };
  }
  if (net('p4')) {
    return {
      titel: 'Open',
      tekst: a ? 'Speler B kreeg de spaardoos open.' : 'De spaardoos is open.',
    };
  }
  if (net('p2')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De gsm van Lena is open. Er staat een voicemail op. Het uur van de afspraak noteer jij op je notitieblok.'
        : 'De gsm is open. Er staat een voicemail op. Speler A noteert het uur.',
    };
  }
  if (net('p1')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'An haalde de ateliermap van Lena op. Ze ligt op het bureau.'
        : 'Speler A heeft nu de ateliermap van Lena, met haar tekening.',
    };
  }
  if (net('p0')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'Je zit in het dossier. Speler B kreeg de schriften van Katrijn.'
        : 'Katrijn legde haar schriften op het bed: het logboek en het kasboek.',
    };
  }
  return null;
}

export const KAMER14_HULP_HTML = `
  <h2 id="hulp-titel">Hulp nodig?</h2>
  <h3>Zo werkt Kamer 14</h3>
  <ul>
    <li>Jullie zijn met twee. Speler A zit aan het bureau van An bij het OPZ, Speler B staat in de kamer van Lena. Jullie zien elk iets anders.</li>
    <li>Bel of videobel met elkaar en vertel wat je ziet. Geen enkel slot krijg je alleen open.</li>
    <li>Een slot dat opengaat, telt voor allebei. Daarna komt er bij één van jullie iets nieuws bij. Wat nieuw is, licht geel op.</li>
  </ul>
  <h3>Vast?</h3>
  <ul>
    <li>Onder <strong>Vast?</strong> in de zijbalk staan hints. Ze gaan stap voor stap verder en kosten niets.</li>
    <li>Ook de andere speler heeft hints, soms met een ander stukje van de puzzel.</li>
    <li>"Je zit dicht bij het antwoord" betekent: één deel klopt al.</li>
  </ul>
  <h3>Technisch probleem?</h3>
  <p>Herlaad de pagina: jullie voortgang blijft bewaard. Lukt het niet, mail naar
    <a href="mailto:info@bureau-x.be?subject=Hulp%20bij%20Kamer%2014">info@bureau-x.be</a>
    met je sessiecode.</p>
`;
