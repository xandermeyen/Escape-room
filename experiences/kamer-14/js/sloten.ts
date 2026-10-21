/**
 * sloten.ts: de bedieningen van de sloten in Kamer 14.
 *
 * - Een toetsenbord (.toetsen[data-voor]) voor de computer en de gsm: elke
 *   toets zet een cijfer in het invoerveld, "wis" haalt het laatste weg.
 * - Draaiwieltjes (.wieltjes[data-voor]) voor de spaardoos: elk wieltje
 *   draait van 0 tot 9 en de stand komt als tekst in het (verborgen) veld.
 *
 * Het nakijken zelf blijft bij controleerAntwoordHash in utils.ts: de
 * bedieningen vullen enkel het invoerveld en klikken op de knop.
 */

/** Toetsen op een cijferslot, in de volgorde van een telefoon. */
export const TOETSEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'wis', '0'] as const;

/** Voegt een cijfer toe, tot de maximale lengte. */
export function voegCijferToe(waarde: string, cijfer: string, max: number): string {
  return waarde.length >= max ? waarde : waarde + cijfer;
}

/** Draait een wieltje één stap (+1 of -1), rond van 9 naar 0. */
export function draai(cijfer: number, richting: 1 | -1): number {
  return (cijfer + richting + 10) % 10;
}

function maakToetsenbord(houder: HTMLElement, opKlik?: () => void): void {
  const input = document.getElementById(houder.dataset['voor'] ?? '') as HTMLInputElement | null;
  if (!input) return;
  const max = input.maxLength > 0 ? input.maxLength : 8;
  houder.replaceChildren();
  houder.setAttribute('role', 'group');
  houder.setAttribute('aria-label', 'Cijfertoetsen');
  for (const t of TOETSEN) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `toets toets-${t}`;
    b.textContent = t === 'wis' ? '⌫' : t;
    if (t === 'wis') b.setAttribute('aria-label', 'Laatste cijfer wissen');
    b.addEventListener('click', () => {
      opKlik?.();
      if (t === 'wis') input.value = input.value.slice(0, -1);
      else input.value = voegCijferToe(input.value, t, max);
      input.dispatchEvent(new Event('input'));
    });
    houder.append(b);
  }
}

function maakWieltjes(houder: HTMLElement, opKlik?: () => void): void {
  const input = document.getElementById(houder.dataset['voor'] ?? '') as HTMLInputElement | null;
  if (!input) return;
  const aantal = Number(houder.dataset['aantal'] ?? 3);
  const stand = Array.from({ length: aantal }, () => 0);
  const schrijf = () => {
    input.value = stand.join('');
  };
  houder.replaceChildren();
  houder.setAttribute('role', 'group');
  houder.setAttribute('aria-label', `Cijferslot met ${aantal} wieltjes`);

  stand.forEach((_, i) => {
    const wiel = document.createElement('div');
    wiel.className = 'wiel';
    const op = document.createElement('button');
    const neer = document.createElement('button');
    const cijfer = document.createElement('output');
    op.type = neer.type = 'button';
    op.className = 'wiel-knop';
    neer.className = 'wiel-knop';
    op.textContent = '▲';
    neer.textContent = '▼';
    op.setAttribute('aria-label', `Wieltje ${i + 1} hoger`);
    neer.setAttribute('aria-label', `Wieltje ${i + 1} lager`);
    cijfer.className = 'wiel-cijfer';
    cijfer.setAttribute('aria-live', 'polite');
    cijfer.setAttribute('aria-label', `Wieltje ${i + 1}`);
    cijfer.textContent = '0';
    const zet = (richting: 1 | -1) => {
      opKlik?.();
      stand[i] = draai(stand[i] ?? 0, richting);
      cijfer.textContent = String(stand[i]);
      cijfer.classList.remove('draait');
      void cijfer.offsetWidth; // animatie opnieuw starten
      cijfer.classList.add('draait');
      schrijf();
    };
    op.addEventListener('click', () => zet(1));
    neer.addEventListener('click', () => zet(-1));
    wiel.addEventListener('wheel', e => {
      e.preventDefault();
      zet(e.deltaY < 0 ? 1 : -1);
    });
    wiel.append(op, cijfer, neer);
    houder.append(wiel);
  });
  schrijf();
}

/** Bouwt alle toetsenborden en wieltjes op de pagina. */
export function initSloten(opKlik?: () => void): void {
  document
    .querySelectorAll<HTMLElement>('.toetsen[data-voor]')
    .forEach(h => maakToetsenbord(h, opKlik));
  document
    .querySelectorAll<HTMLElement>('.wieltjes[data-voor]')
    .forEach(h => maakWieltjes(h, opKlik));
}
