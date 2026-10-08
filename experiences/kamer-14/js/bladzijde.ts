/**
 * bladzijde.ts: P6, de uitgescheurde bladzijde uit Lena's dagboek.
 *
 * De bladzijde is in zes stroken gescheurd. Speler A heeft de stroken 1, 3
 * en 5 (achter de tekening in de ateliermap), Speler B de stroken 2, 4 en 6
 * (achter het nachtkastje gevallen). Zinnen lopen over de scheuren heen:
 * wie zijn eigen drie stroken in de juiste volgorde wil leggen, moet weten
 * hoe de stroken van de ander beginnen en eindigen.
 *
 * Eén speler die zijn helft juist legt, lost P6 op voor de groep. Daarna
 * zien beide spelers de volledige bladzijde.
 */
import type { Kamer14Rol } from './kamer14-hulp.ts';

export interface Strook {
  id: string;
  regels: string[];
}

/** Alle stroken in de juiste volgorde (1 tot 6). */
export const STROKEN: Strook[] = [
  {
    id: 'k7',
    regels: [
      'Maandag 5 mei',
      'Morgen ga ik. Ik heb het aan niemand gezegd en dat blijft zo tot ik in de bus zit.',
      'Marie en ik zaten vroeger elke zomer bij haar oma in Diest, boven de',
    ],
  },
  {
    id: 'r2',
    regels: [
      'bloemenwinkel. Vanaf de trap zag je de toren van de kerk. Die heb ik nu getekend, zonder te kijken.',
      'Toen ik ziek werd, heb ik haar niet meer teruggebeld. Niet één keer. Ik',
    ],
  },
  {
    id: 'm4',
    regels: [
      'schaamde me. Daarna wist ik niet meer waar ze woonde.',
      'Op dinsdag zat ik in de bibliotheek. Eerst haar naam, dan oude adressen, dan de bloemenwinkel. Die bestaat nog. Ik heb een brief',
    ],
  },
  {
    id: 't9',
    regels: [
      'gestuurd en ze schreef terug.',
      'Op donderdag ging ik naar Geel Markt. Welke bus, hoe laat, hoe lang, hoeveel. Ik heb alles twee keer opgeschreven.',
      'Ik heb geld opzij gelegd, het geld voor',
    ],
  },
  {
    id: 'w3',
    regels: [
      'Katrijn. Dat is niet eerlijk, ik weet het. Het is voor als het misloopt. Ik geef het terug, tot de laatste euro.',
      'An zou meegaan als ik het vroeg. Ze zou het goed bedoelen. Maar dan is het een',
    ],
  },
  {
    id: 'f5',
    regels: ['begeleid bezoek en geen vriendin die langskomt.', 'Dit wil ik één keer alleen doen.'],
  },
];

/** De stroken van een speler, in de juiste volgorde. */
export function strokenVan(rol: Kamer14Rol): Strook[] {
  return STROKEN.filter((_, i) => (rol === 'a' ? i % 2 === 0 : i % 2 === 1));
}

/** Klopt de volgorde van de stroken (ids) voor deze speler? */
export function volgordeKlopt(rol: Kamer14Rol, volgorde: string[]): boolean {
  const juist = strokenVan(rol).map(s => s.id);
  return volgorde.length === juist.length && volgorde.every((id, i) => id === juist[i]);
}

/**
 * Beginvolgorde op het scherm: vast (zodat beide toestellen en herladen
 * hetzelfde tonen) en nooit al juist.
 */
export function beginVolgorde(rol: Kamer14Rol): string[] {
  const [een, twee, drie] = strokenVan(rol).map(s => s.id) as [string, string, string];
  return rol === 'a' ? [drie, een, twee] : [twee, drie, een];
}

/** Verplaatst een element in een lijst een plaats op (-1) of neer (+1). */
export function verschuif(lijst: string[], index: number, richting: -1 | 1): string[] {
  const doel = index + richting;
  if (doel < 0 || doel >= lijst.length) return lijst;
  const kopie = [...lijst];
  [kopie[index], kopie[doel]] = [kopie[doel] as string, kopie[index] as string];
  return kopie;
}

// ── Weergave ──────────────────────────────────────────────

function strookElement(strook: Strook): HTMLElement {
  const el = document.createElement('div');
  el.className = 'strook-papier';
  for (const regel of strook.regels) {
    const p = document.createElement('p');
    p.textContent = regel;
    el.append(p);
  }
  return el;
}

export interface BladzijdeOpties {
  rol: Kamer14Rol;
  lijst: HTMLElement;
  knop: HTMLButtonElement;
  feedback: HTMLElement;
  /** Juist gelegd: puzzel markeren. */
  bijJuist: () => void;
  /** Foute volgorde bevestigd: speldata en hint-tip. */
  bijFout: () => void;
}

/** Toont de eigen stroken met knoppen om ze te verschuiven, plus slepen. */
export function initBladzijde(opties: BladzijdeOpties): void {
  const { rol, lijst, knop, feedback } = opties;
  const perId = new Map(STROKEN.map(s => [s.id, s]));
  let volgorde = beginVolgorde(rol);
  let gesleept: number | null = null;
  const ander = rol === 'a' ? 'Speler B' : 'Speler A';

  const teken = (focusId?: string, focusRichting?: -1 | 1) => {
    lijst.replaceChildren();
    volgorde.forEach((id, index) => {
      const strook = perId.get(id);
      if (!strook) return;
      const li = document.createElement('li');
      li.className = 'strook';
      li.draggable = true;
      li.dataset['strook'] = id;
      li.setAttribute('aria-label', `Strook ${index + 1} van 3`);

      const knoppen = document.createElement('div');
      knoppen.className = 'strook-knoppen';
      const maakKnop = (richting: -1 | 1) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'strook-knop';
        b.textContent = richting === -1 ? '↑' : '↓';
        b.setAttribute('aria-label', richting === -1 ? 'Strook omhoog' : 'Strook omlaag');
        b.disabled = richting === -1 ? index === 0 : index === volgorde.length - 1;
        b.addEventListener('click', () => {
          volgorde = verschuif(volgorde, index, richting);
          feedback.textContent = '';
          teken(id, richting);
        });
        return b;
      };
      knoppen.append(maakKnop(-1), maakKnop(1));
      li.append(strookElement(strook), knoppen);

      li.addEventListener('dragstart', () => {
        gesleept = index;
        li.classList.add('sleept');
      });
      li.addEventListener('dragend', () => li.classList.remove('sleept'));
      li.addEventListener('dragover', e => e.preventDefault());
      li.addEventListener('drop', e => {
        e.preventDefault();
        if (gesleept === null || gesleept === index) return;
        const kopie = [...volgorde];
        const [weg] = kopie.splice(gesleept, 1);
        if (weg) kopie.splice(index, 0, weg);
        volgorde = kopie;
        gesleept = null;
        feedback.textContent = '';
        teken();
      });

      lijst.append(li);
      if (id === focusId) {
        const terug = li.querySelector<HTMLButtonElement>(
          `.strook-knop:${focusRichting === -1 ? 'first-child' : 'last-child'}`,
        );
        (terug && !terug.disabled
          ? terug
          : li.querySelector<HTMLButtonElement>('.strook-knop:not(:disabled)')
        )?.focus();
      }
    });
  };

  knop.addEventListener('click', () => {
    if (volgordeKlopt(rol, volgorde)) {
      feedback.className = 'puzzel-feedback correct';
      feedback.textContent = 'De bladzijde past.';
      knop.disabled = true;
      opties.bijJuist();
    } else {
      feedback.className = 'puzzel-feedback fout';
      feedback.textContent = `Dat past nog niet. Lees ${ander} voor hoe jouw stroken beginnen en eindigen.`;
      opties.bijFout();
    }
  });

  teken();
}

/** Toont de volledige bladzijde (na P6) in het gegeven element. */
export function toonVolledigeBladzijde(doel: HTMLElement): void {
  if (doel.childElementCount > 0) return;
  for (const strook of STROKEN) doel.append(strookElement(strook));
  doel.hidden = false;
}
