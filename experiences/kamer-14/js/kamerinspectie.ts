/**
 * kamerinspectie.ts: de kamer van Lena (Speler B, tab Kamerinspectie).
 *
 * Zeven klikbare zones op de foto. Elke zone opent een venster met de
 * bevinding van An Vermeersch; het prikbord toont ook de envelop, de
 * prullenmand de dagpas. De teller onderaan houdt bij hoeveel zones bekeken
 * zijn. Stond vroeger als los <script> in speler-b.html.
 */

export interface Zone {
  titel: string;
  tekst: string;
  /** Toont de envelop van Marie in het venster. */
  heeftPrikbord?: boolean;
  /** Toont de dagpas van De Lijn in het venster. */
  heeftDagpas?: boolean;
}

export const ZONES: Record<string, Zone> = {
  bed: {
    titel: 'Zone 1  -  Bed',
    tekst:
      'Opgemaakt. Lakens strak. Geen briefje onder kussen aangetroffen. Kussen zit nog op originele positie.',
  },
  kast: {
    titel: 'Zone 2  -  Kledingkast',
    tekst:
      'Half leeg. Zomerjurk en reisjas ontbreken. Overige kleding aanwezig. Geen verborgen voorwerpen op de bovenste plank.',
  },
  nachtkastje: {
    titel: 'Zone 3  -  Nachtkastje',
    tekst:
      'OPZ-dagboek aanwezig. Laatste bladzijde ontbreekt  -  ruw uitgescheurd. Pen. Eén ongebruikte postzegel in de la aangetroffen.',
  },
  onderbed: {
    titel: 'Zone 4  -  Onder bed',
    tekst:
      'Lege koekjesdoos aangetroffen, schuifbaar. Mogelijk gebruikt als bewaarplaats. Geen verdere inhoud.',
  },
  raam: {
    titel: 'Zone 5  -  Raam',
    tekst: 'Gesloten en op slot. Geen sporen van geforceerde ingang. Vensterbank leeg.',
  },
  prikbord: {
    titel: 'Zone 6  -  Prikbord',
    tekst:
      'Eén envelop vastgespeld met rode punaise. Afzender: Diest, 3 april 2025. Meerdere notities aanwezig.',
    heeftPrikbord: true,
  },
  prullenmand: {
    titel: 'Zone 7  -  Prullenmand',
    tekst: 'Prullenmand onder het bureau. Bovenop ligt een verfrommeld vervoersbewijs van De Lijn.',
    heeftDagpas: true,
  },
};

export const AANTAL_ZONES = Object.keys(ZONES).length;

const el = (id: string) => document.getElementById(id);

function updateZoneTeller(): void {
  const aantal = document.querySelectorAll('.kamer-zone.zone-bekeken').length;
  const teller = el('zone-teller');
  if (!teller) return;
  teller.textContent = String(aantal);
  teller.parentElement?.classList.toggle('zv-klaar', aantal === AANTAL_ZONES);
}

function modalOpen(): boolean {
  return el('zone-modal')?.style.display === 'block';
}

let laatsteZone: HTMLElement | null = null;

export function openZone(zone: HTMLElement): void {
  const data = ZONES[zone.dataset['zone'] ?? ''];
  const modal = el('zone-modal');
  if (!data || !modal) return;
  laatsteZone = zone;

  const titel = el('zone-modal-titel');
  const tekst = el('zone-modal-tekst');
  if (titel) titel.textContent = data.titel;
  if (tekst) tekst.textContent = data.tekst;
  const prikbord = el('zone-prikbord-inhoud');
  const dagpas = el('zone-prullenmand-inhoud');
  if (prikbord) prikbord.style.display = data.heeftPrikbord ? 'block' : 'none';
  if (dagpas) dagpas.style.display = data.heeftDagpas ? 'block' : 'none';

  modal.style.display = 'block';
  zone.classList.add('zone-bekeken');
  updateZoneTeller();
  // Toetsenbord: focus in het venster, terug naar de zone bij sluiten.
  modal.querySelector<HTMLElement>('.modal-sluit-btn')?.focus();
}

export function sluitZone(): void {
  const modal = el('zone-modal');
  if (!modal || !modalOpen()) return;
  modal.style.display = 'none';
  laatsteZone?.focus();
}

/** Houdt de focus binnen het venster zolang het open is (Tab en Shift+Tab). */
function houdFocusBinnen(e: KeyboardEvent): void {
  const focusbaar = [
    ...document.querySelectorAll<HTMLElement>(
      '#zone-modal-inhoud button, #zone-modal-inhoud [tabindex="0"]',
    ),
  ].filter(f => f.offsetParent !== null);
  const eerste = focusbaar[0];
  const laatste = focusbaar[focusbaar.length - 1];
  if (!eerste || !laatste) return;
  if (e.shiftKey && document.activeElement === eerste) {
    e.preventDefault();
    laatste.focus();
  } else if (!e.shiftKey && document.activeElement === laatste) {
    e.preventDefault();
    eerste.focus();
  }
}

/** Koppelt de zones, de sluitknoppen en het toetsenbord. */
export function initKamerinspectie(): void {
  document.querySelectorAll<HTMLElement>('.kamer-zone').forEach(zone => {
    zone.addEventListener('click', () => openZone(zone));
    zone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openZone(zone);
      }
    });
  });

  el('zone-modal-backdrop')?.addEventListener('click', sluitZone);
  document
    .querySelectorAll<HTMLElement>('#zone-modal .modal-sluit-btn')
    .forEach(knop => knop.addEventListener('click', sluitZone));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') sluitZone();
    if (e.key === 'Tab' && modalOpen()) houdFocusBinnen(e);
  });
}
