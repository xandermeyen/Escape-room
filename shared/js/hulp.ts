/**
 * hulp.ts — voorkomen dat een groep vastloopt.
 *
 * - Na twee foute of bijna-pogingen op dezelfde puzzel licht de hintknop
 *   van die puzzel op, met een korte zin. De hints gaan niet vanzelf open.
 * - Na lange inactiviteit (standaard 8 minuten zonder poging, hint, invoer
 *   of opgeloste puzzel) verschijnt een korte verhaalmelding die richting
 *   geeft voor de puzzel waar de groep op zit.
 * - Na elke opgeloste puzzel: wat er vrijkwam en wat de andere speler nu doet.
 * - Een discrete knop "Hulp nodig?" met uitleg en een contactlink.
 */
import type { Beoordeling } from './utils.ts';
import type { Vrijgave } from './speldata.ts';

export const POGINGEN_VOOR_HINTTIP = 2;
export const INACTIEF_NA_MS = 8 * 60 * 1000;
export const HINTTIP_TEKST = 'Zit je vast? Hieronder liggen hints klaar, stap voor stap.';

export interface Melding {
  titel: string;
  tekst: string;
}

export interface HulpConfig {
  /** id van het hint-blok van een puzzel op deze pagina, of null. */
  hintBlokVoor: (puzzel: string) => string | null;
  /** Wanneer komt welke puzzel vrij (zelfde als voor de speldata). */
  vrijgave: Vrijgave;
  /** Verhaalmelding per puzzel bij inactiviteit. */
  inactiefMeldingen: Record<string, Melding>;
  /** Melding na een statuswijziging (oud → nieuw), of null. */
  vrijgaveMelding?: (
    oud: Record<string, boolean>,
    nieuw: Record<string, boolean>,
  ) => Melding | null;
  /** Inhoud van het hulpvenster (vaste HTML uit de eigen code). */
  hulpHtml: string;
  inactiefNaMs?: number;
}

// ── Pure logica (testbaar) ─────────────────────────────────

/** Puzzels die vrij zijn maar nog niet opgelost, in volgorde van de config. */
export function openPuzzels(status: Record<string, boolean>, vrijgave: Vrijgave): string[] {
  return Object.entries(vrijgave)
    .filter(([p, vereist]) => !status[p] && vereist.every(v => status[v]))
    .map(([p]) => p);
}

/** Houdt pogingen per puzzel bij en zegt wanneer de hint-tip moet verschijnen. */
export class PogingTeller {
  private aantallen = new Map<string, number>();
  private getoond = new Set<string>();

  /** Geeft true terug op het moment dat de tip voor het eerst getoond moet worden. */
  tel(puzzel: string, oordeel: Beoordeling): boolean {
    if (oordeel === 'juist') return false;
    const n = (this.aantallen.get(puzzel) ?? 0) + 1;
    this.aantallen.set(puzzel, n);
    if (n >= POGINGEN_VOOR_HINTTIP && !this.getoond.has(puzzel)) {
      this.getoond.add(puzzel);
      return true;
    }
    return false;
  }
}

/**
 * Kiest de inactiviteitsmelding: de eerste open puzzel die nog geen melding
 * kreeg. Geeft null als er niets (nieuws) te melden is.
 */
export function kiesInactiefMelding(
  open: string[],
  meldingen: Record<string, Melding>,
  alGetoond: Set<string>,
): { puzzel: string; melding: Melding } | null {
  for (const puzzel of open) {
    const melding = meldingen[puzzel];
    if (melding && !alGetoond.has(puzzel)) return { puzzel, melding };
  }
  return null;
}

// ── DOM ────────────────────────────────────────────────────

/** Toont een melding onderaan het scherm (verdwijnt niet vanzelf). */
export function toonHulpMelding(m: Melding): void {
  document.getElementById('hulp-melding')?.remove();
  const balk = document.createElement('div');
  balk.id = 'hulp-melding';
  balk.className = 'hulp-melding';
  balk.setAttribute('role', 'status');

  const inhoud = document.createElement('div');
  inhoud.className = 'hulp-melding-inhoud';
  const titel = document.createElement('div');
  titel.className = 'hulp-melding-titel';
  titel.textContent = m.titel;
  const tekst = document.createElement('div');
  tekst.textContent = m.tekst;
  inhoud.append(titel, tekst);

  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.className = 'hulp-melding-sluit';
  sluit.setAttribute('aria-label', 'Melding sluiten');
  sluit.textContent = '×';
  sluit.addEventListener('click', () => balk.remove());

  balk.append(inhoud, sluit);
  document.body.appendChild(balk);
}

/** Laat de hintknop van een puzzel oplichten, met een korte zin. */
export function toonHintTip(blokId: string): void {
  const blok = document.getElementById(blokId);
  if (!blok || blok.classList.contains('hint-tip-actief')) return;
  blok.classList.add('hint-tip-actief');
  const tip = document.createElement('p');
  tip.className = 'hint-tip';
  tip.setAttribute('role', 'status');
  tip.textContent = HINTTIP_TEKST;
  blok.insertBefore(tip, blok.firstChild);
}

/** Sluit een <dialog>, ook in browsers zonder dialog.close(). */
function sluitDialoog(d: HTMLDialogElement): void {
  if (typeof d.close === 'function') {
    d.close();
  } else {
    d.removeAttribute('open');
    d.dispatchEvent(new Event('close'));
  }
}

/** Bouwt de knop "Hulp nodig?" en het hulpvenster. */
export function bouwHulpKnop(hulpHtml: string): HTMLDialogElement {
  const knop = document.createElement('button');
  knop.type = 'button';
  knop.id = 'hulp-knop';
  knop.className = 'hulp-knop';
  knop.setAttribute('aria-haspopup', 'dialog');
  knop.textContent = 'Hulp nodig?';

  const dialoog = document.createElement('dialog');
  dialoog.id = 'hulp-dialoog';
  dialoog.className = 'hulp-dialoog';
  dialoog.setAttribute('aria-labelledby', 'hulp-titel');
  // Veilig: hulpHtml is een vaste tekst uit de eigen configuratie.
  // eslint-disable-next-line no-unsanitized/property
  dialoog.innerHTML = hulpHtml;
  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.className = 'hulp-sluit';
  sluit.textContent = 'Sluiten';
  sluit.addEventListener('click', () => sluitDialoog(dialoog));
  dialoog.appendChild(sluit);
  // Klik op de achtergrond sluit ook (Escape doet <dialog> zelf).
  dialoog.addEventListener('click', e => {
    if (e.target === dialoog) sluitDialoog(dialoog);
  });

  knop.addEventListener('click', () => {
    if (typeof dialoog.showModal === 'function') dialoog.showModal();
    else dialoog.setAttribute('open', '');
    sluit.focus();
  });
  dialoog.addEventListener('close', () => knop.focus());

  document.body.append(knop, dialoog);
  return dialoog;
}

export interface Hulp {
  /** Na elke beoordeelde poging. */
  poging: (puzzel: string, oordeel: Beoordeling) => void;
  /** Bij elke statusupdate uit Firebase. */
  status: (status: Record<string, boolean>) => void;
  /** Stopt de inactiviteitscontrole. */
  stop: () => void;
}

/**
 * Koppelt alle hulp aan de pagina. `nu` en de interval-functies zijn
 * injecteerbaar voor de tests.
 */
export function initHulp(cfg: HulpConfig, nu: () => number = Date.now): Hulp {
  const teller = new PogingTeller();
  const inactiefGetoond = new Set<string>();
  const naMs = cfg.inactiefNaMs ?? INACTIEF_NA_MS;
  let laatsteActiviteit = nu();
  let huidigeStatus: Record<string, boolean> | null = null;

  const activiteit = () => {
    laatsteActiviteit = nu();
  };

  bouwHulpKnop(cfg.hulpHtml);
  document.addEventListener('hint-geopend', activiteit);
  document.addEventListener('input', activiteit);

  const controle = setInterval(() => {
    if (!huidigeStatus || nu() - laatsteActiviteit < naMs) return;
    const keuze = kiesInactiefMelding(
      openPuzzels(huidigeStatus, cfg.vrijgave),
      cfg.inactiefMeldingen,
      inactiefGetoond,
    );
    // Volgende melding pas na een nieuwe periode zonder activiteit.
    laatsteActiviteit = nu();
    if (!keuze) return;
    inactiefGetoond.add(keuze.puzzel);
    toonHulpMelding(keuze.melding);
  }, 15_000);

  return {
    poging(puzzel, oordeel) {
      activiteit();
      if (teller.tel(puzzel, oordeel)) {
        const blok = cfg.hintBlokVoor(puzzel);
        if (blok) toonHintTip(blok);
      }
    },
    status(nieuw) {
      const oud = huidigeStatus;
      huidigeStatus = { ...nieuw };
      if (!oud) return; // eerste snapshot bij het laden: niets melden
      const veranderd = Object.keys(nieuw).some(k => !!nieuw[k] !== !!oud[k]);
      if (!veranderd) return;
      activiteit();
      const m = cfg.vrijgaveMelding?.(oud, nieuw);
      if (m) toonHulpMelding(m);
    },
    stop() {
      clearInterval(controle);
      document.removeEventListener('hint-geopend', activiteit);
      document.removeEventListener('input', activiteit);
    },
  };
}
