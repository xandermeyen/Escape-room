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
    p1: {
      titel: 'Notitie An Vermeersch',
      tekst:
        'Het rooster zegt wanneer Lena terug moest zijn. Het logboek van het gastgezin zegt wanneer ze echt thuiskwam. Leg ze naast elkaar met Speler B.',
    },
    p2: {
      titel: 'Notitie An Vermeersch',
      tekst:
        'Lena tekende wekenlang hetzelfde plein. Misschien staat die kerk ergens in het vrijetijdsmateriaal.',
    },
    p3: {
      titel: 'Notitie An Vermeersch',
      tekst:
        'Een bijdrage van €35 per week. Hoe vaak bleef die uit? Speler B heeft het kasoverzicht.',
    },
    p4: {
      titel: 'Notitie An Vermeersch',
      tekst:
        "Op de intakefiche staat iemand van vroeger. Speler B vond iets op het prikbord in Lena's kamer.",
    },
    p5: {
      titel: 'Notitie An Vermeersch',
      tekst:
        'Wanneer verliet Lena het huis? Speler B weet het. Vergeet niet dat ze nog naar de halte moest wandelen.',
    },
    p6: {
      titel: 'Notitie An Vermeersch',
      tekst:
        'Waarom zei ze niets? Misschien staat het op die bladzijde. Katrijn heeft de andere stroken.',
    },
  },
  b: {
    p1: {
      titel: 'Katrijn',
      tekst:
        'Ik schreef telkens op hoe laat ze thuiskwam. Zie jij een patroon? Speler A weet hoe laat ze terug moest zijn.',
    },
    p2: {
      titel: 'Katrijn',
      tekst:
        'Op woensdag zat Lena altijd te tekenen in het atelier. Vraag Speler A wat er op die tekening staat.',
    },
    p3: {
      titel: 'Katrijn',
      tekst: 'Sommige weken kreeg ik niets van haar. Tel ze eens in het kasoverzicht.',
    },
    p4: {
      titel: 'Katrijn',
      tekst:
        'Die envelop op haar prikbord... van wie zou die zijn? Speler A heeft de lijst met haar oude contacten.',
    },
    p5: {
      titel: 'Katrijn',
      tekst:
        'Rond kwart over zeven hoorde ik de voordeur. Ik dacht dat ze ging wandelen. Speler A weet hoe ver de bushalte is.',
    },
    p6: {
      titel: 'Katrijn',
      tekst:
        'Die stroken zijn van haar dagboek. An heeft er ook. Lees ze elkaar voor, dan past de bladzijde.',
    },
  },
};

const NIEUW = 'Nieuw in het dossier';

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
      titel: 'Alle puzzels opgelost',
      tekst: 'Klik op de balk bovenaan en dien samen het rapport in. Spreek af wie typt.',
    };
  }
  if (net('p5')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De tab Bladzijde is vrij: drie stroken van een uitgescheurde dagboekbladzijde. Speler B heeft de andere drie.'
        : 'De tab Bladzijde is vrij: drie stroken van een uitgescheurde dagboekbladzijde. Speler A heeft de andere drie.',
    };
  }
  if (net('p4')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De tab Bijlage D is vrij: de dienstregeling Geel → Diest. Speler B heeft de laatste vraag (P5) onder het logboek.'
        : 'De laatste vraag (P5) staat onder het logboek. Speler A heeft nu de dienstregeling in de tab Bijlage D.',
    };
  }
  if ((net('p2') || net('p3')) && nieuw['p2'] && nieuw['p3']) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De tab Intakefiche is vrij. Speler B kan nu de kamer van Lena doorzoeken.'
        : 'De tab Kamerinspectie is vrij. Klik de zones op de foto aan. Speler A heeft nu de intakefiche.',
    };
  }
  if (net('p2') || net('p3')) {
    const nog = nieuw['p2'] ? 'P3 (het kasoverzicht)' : 'P2 (de stad)';
    return {
      titel: 'Goed bezig',
      tekst: a
        ? `Nog ${nog}, dan komt de intakefiche vrij.`
        : `Nog ${nog}, dan gaat de kamerinspectie open.`,
    };
  }
  if (net('p1')) {
    return {
      titel: NIEUW,
      tekst: a
        ? 'De tab Atelier is vrij. Samen met Speler B: welke stad tekende Lena (P2), en hoeveel weken betaalde ze niet (P3, bij Dossiernotities)?'
        : 'Er staan twee nieuwe vragen klaar: P2 onder het logboek en P3 bij Kas & Bonnen. Speler A heeft nu de tab Atelier.',
    };
  }
  return null;
}

export const KAMER14_HULP_HTML = `
  <h2 id="hulp-titel">Hulp nodig?</h2>
  <h3>Zo werkt Kamer 14</h3>
  <ul>
    <li>Jullie zijn met twee. Speler A heeft het dossier van het OPZ, Speler B dat van het gastgezin. Jullie zien elk iets anders.</li>
    <li>Bel of videobel met elkaar en lees voor wat je ziet. Geen enkele vraag los je alleen op.</li>
    <li>Een antwoord mag bij één van beide spelers ingevuld worden. Het telt dan voor allebei.</li>
    <li>Na elke opgeloste puzzel komt er iets nieuws vrij: een tab of een nieuwe vraag.</li>
  </ul>
  <h3>Vast?</h3>
  <ul>
    <li>Onder elke vraag staat <strong>Hint aanvragen</strong>. De hints gaan stap voor stap verder en kosten niets.</li>
    <li>Ook de andere speler heeft hints, soms met een ander stukje van de puzzel.</li>
    <li>"Je zit dicht bij het antwoord" betekent: één deel klopt al.</li>
  </ul>
  <h3>Technisch probleem?</h3>
  <p>Herlaad de pagina: jullie voortgang blijft bewaard. Lukt het niet, mail naar
    <a href="mailto:info@bureau-x.be?subject=Hulp%20bij%20Kamer%2014">info@bureau-x.be</a>
    met je sessiecode.</p>
`;
