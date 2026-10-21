/**
 * kamer14-speler.ts: alles wat Speler A (het bureau van An) en Speler B (de
 * kamer van Lena) gemeen hebben. speler-a.ts en speler-b.ts geven enkel nog
 * hun rol en eigen extra's mee (bij B de voicemail).
 *
 * De pagina is een tekening met klikbare voorwerpen. Een voorwerp opent een
 * close-up (<dialog class="closeup">) met documenten en soms een slot.
 * Wat pas later vrijkomt, draagt data-na="p1 p3": het blijft verborgen tot
 * al die puzzels opgelost zijn. data-weg-na="p2" verdwijnt juist zodra p2
 * opgelost is. Zo staat de hele vrijgave in de HTML en niet verspreid in code.
 */
import '../../../shared/js/sentry.ts';
import {
  luisterNaarStatus,
  puzzelVoltooid,
  bewaakSessieGesloten,
} from '../../../shared/js/session.ts';
import { controleerAntwoordHash, koppelHints, sessieUitUrl } from '../../../shared/js/utils.ts';
import { installeerNavigatieGuard } from '../../../shared/js/game.ts';
import {
  KAMER14_ANTWOORD_HASHES,
  KAMER14_ANTWOORD_REGELS,
  KAMER14_TIMER_WAARSCHUWINGEN,
  KAMER14_VRIJGAVE,
  KAMER14_LAATSTE,
  KAMER14_SLOT_PUZZELS,
} from './kamer14-config.ts';
import { initBladzijde, toonVolledigeBladzijde } from './bladzijde.ts';
import {
  registreerPoging,
  registreerOpgelost,
  registreerVrijgaves,
  luisterNaarHints,
  puzzelUitHintBlok,
} from '../../../shared/js/speldata.ts';
import { initHulp } from '../../../shared/js/hulp.ts';
import { meetSpel } from '../../../shared/js/meet.ts';
import { koppelDemoModus } from '../../../shared/js/demo.ts';
import {
  KAMER14_INACTIEF,
  KAMER14_HULP_HTML,
  kamer14VrijgaveMelding,
  type Kamer14Rol,
} from './kamer14-hulp.ts';
import {
  startAchtergrond,
  speelUnlock,
  speelFout,
  speelKlik,
  speelEnvelopGeluid,
  speelFragment,
  hervatAudio,
  FRAGMENT_NA_PUZZEL,
  type FragmentId,
} from './audio.ts';
import { initialiseerTimer } from '../../../shared/js/timer.ts';
import { initRapportDoel, updateRapportDoel } from './rapport-doel.ts';
import {
  toonBerichten,
  toonOndertitel,
  toonGeluidsmelding,
  FRAGMENT_TEKST,
  SPREKER,
} from './berichten.ts';
import { hintBlokId, initHints, updateHints } from './hints.ts';
import { initSloten } from './sloten.ts';

type Status = Record<string, boolean>;

export interface SpelerConfig {
  rol: Kamer14Rol;
  /** Eigen extra's van deze speler. */
  extra?: (ctx: SpelerContext) => void;
}

export interface SpelerContext {
  sessie: string;
  zorgVoorAudio: () => void;
}

const ANDER: Record<Kamer14Rol, { naam: string; pagina: string }> = {
  a: { naam: 'Speler B', pagina: 'speler-b.html' },
  b: { naam: 'Speler A', pagina: 'speler-a.html' },
};
const NAAM: Record<Kamer14Rol, string> = { a: 'Speler A', b: 'Speler B' };

/** Zijn alle puzzels in de lijst opgelost? Een lege lijst is altijd vrij. */
export function isVrij(p: Status, na: string[]): boolean {
  return na.every(nr => !!p[nr]);
}

/** Leest data-na / data-weg-na ("p1 p3") als lijst. */
export function puzzelLijst(waarde: string | undefined): string[] {
  return (waarde ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Past de zichtbaarheid toe volgens data-na en data-weg-na. Geeft de
 * elementen terug die net zichtbaar werden (voor de gele "nieuw"-gloed).
 */
export function pasZichtbaarheidToe(p: Status, root: ParentNode = document): Element[] {
  const nieuw: Element[] = [];
  root.querySelectorAll('[data-na]').forEach(el => {
    const zichtbaar = isVrij(p, puzzelLijst((el as HTMLElement).dataset['na']));
    if (zichtbaar && el.hasAttribute('hidden')) nieuw.push(el);
    el.toggleAttribute('hidden', !zichtbaar);
  });
  root.querySelectorAll('[data-weg-na]').forEach(el => {
    el.toggleAttribute('hidden', isVrij(p, puzzelLijst((el as HTMLElement).dataset['wegNa'])));
  });
  return nieuw;
}

/** Een fragment pas afspelen als de puzzel opgelost wordt terwijl de pagina open is. */
const WACHT_NA_LADEN = 4000; // ms; de eerste snapshot van Firebase duurt doorgaans < 2 s
const BRIEFING_SLEUTEL = 'kamer14-briefing-gehoord';

export function startSpelerPagina(config: SpelerConfig): void {
  const { rol } = config;
  const ander = ANDER[rol];
  const paginaLaadtijd = Date.now();
  const fragmentenAfgespeeld = new Set<string>();
  let eersteStatus = true;

  // ── Audio ──
  let audioGestart = false;
  const zorgVoorAudio = (): void => {
    hervatAudio();
    if (audioGestart) return;
    audioGestart = true;
    startAchtergrond(rol);
  };

  const speelMetOndertitel = (id: FragmentId, wacht?: number): void => {
    zorgVoorAudio();
    speelFragment(id, {
      wacht,
      bijStart: audio => toonOndertitel(SPREKER[id], FRAGMENT_TEKST[id], audio),
      bijFout: () => toonGeluidsmelding(zetGeluidAan),
    });
  };

  /** "Geluid aan": start de sfeer en (één keer per toestel) de briefing van An. */
  function zetGeluidAan(): void {
    zorgVoorAudio();
    speelUnlock();
    let gehoord = false;
    try {
      gehoord = sessionStorage.getItem(BRIEFING_SLEUTEL) === sessie;
      sessionStorage.setItem(BRIEFING_SLEUTEL, sessie);
    } catch {
      /* geen opslag: de briefing speelt gewoon */
    }
    if (!gehoord) speelMetOndertitel('briefing', 900);
  }

  // ── Sessie, navigatie, demo, timer ──
  const sessie = sessieUitUrl();
  meetSpel('game_start', sessie, { rol });
  const schakelGuardUit = installeerNavigatieGuard();
  koppelDemoModus(
    sessie,
    NAAM[rol],
    [{ label: ander.naam, href: `${ander.pagina}?sessie=${encodeURIComponent(sessie)}` }],
    schakelGuardUit,
  );
  initialiseerTimer(sessie, {
    waarschuwingen: KAMER14_TIMER_WAARSCHUWINGEN,
    voorRedirect: schakelGuardUit,
  });
  bewaakSessieGesloten(sessie, () => {
    schakelGuardUit();
    window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(sessie)}`;
  });

  const sysCase = document.getElementById('sys-case');
  if (sysCase) sysCase.textContent = `Sessie ${sessie}`;

  // ── Hints en hulp ──
  initHints(rol);
  const hulp = initHulp({
    hintBlokVoor: puzzel => hintBlokId(rol, puzzel),
    vrijgave: KAMER14_VRIJGAVE,
    inactiefMeldingen: KAMER14_INACTIEF[rol],
    vrijgaveMelding: (oud, nieuw) => kamer14VrijgaveMelding(rol, oud, nieuw),
    hulpHtml: KAMER14_HULP_HTML,
  });

  // ── Close-ups ──
  const openCloseup = (id: string, opener: HTMLElement): void => {
    const dialoog = document.getElementById(id) as HTMLDialogElement | null;
    if (!dialoog || dialoog.open) return;
    zorgVoorAudio();
    speelEnvelopGeluid();
    document.querySelectorAll(`[data-open="${id}"]`).forEach(el => {
      el.classList.remove('nieuw');
      el.classList.add('gezien');
    });
    dialoog.showModal();
    dialoog.addEventListener('close', () => opener.focus(), { once: true });
  };
  document.addEventListener('click', e => {
    const doel = e.target instanceof Element ? e.target : null;
    const opener = doel?.closest<HTMLElement>('[data-open]');
    if (opener) {
      openCloseup(opener.dataset['open'] ?? '', opener);
      return;
    }
    const sluit = doel?.closest<HTMLElement>('[data-sluit]');
    if (sluit) sluit.closest('dialog')?.close();
  });
  // Klik naast het papier (op de achtergrond van de dialoog) sluit ook.
  document.querySelectorAll<HTMLDialogElement>('dialog.closeup').forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d) d.close();
    });
  });

  // ── Sloten ──
  initSloten(speelKlik);
  KAMER14_SLOT_PUZZELS.forEach(nr => {
    const knop = document.getElementById(`btn-${nr}`);
    if (!knop) return; // dit slot staat bij de andere speler
    const puzzelNr = parseInt(nr.slice(1), 10);
    knop.addEventListener('click', () =>
      controleerAntwoordHash(
        nr,
        `input-${nr}`,
        `feedback-${nr}`,
        `btn-${nr}`,
        KAMER14_ANTWOORD_HASHES,
        () => {
          void puzzelVoltooid(sessie, puzzelNr);
          void registreerOpgelost(sessie, nr);
        },
        `Dat klopt niet. Overleg met ${ander.naam}.`,
        KAMER14_ANTWOORD_REGELS,
        oordeel => {
          hulp.poging(nr, oordeel);
          if (oordeel !== 'juist') {
            speelFout();
            void registreerPoging(sessie, nr, oordeel);
            knop.closest('.slot-paneel')?.classList.add('schud');
            setTimeout(() => knop.closest('.slot-paneel')?.classList.remove('schud'), 500);
          }
        },
      ),
    );
    document.getElementById(`input-${nr}`)?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') knop.click();
    });
  });

  // ── P6: de uitgescheurde bladzijde ──
  const strokenLijst = document.getElementById('stroken-lijst');
  const btnP6 = document.getElementById('btn-p6') as HTMLButtonElement | null;
  const feedbackP6 = document.getElementById('feedback-p6');
  if (strokenLijst && btnP6 && feedbackP6) {
    initBladzijde({
      rol,
      lijst: strokenLijst,
      knop: btnP6,
      feedback: feedbackP6,
      bijJuist: () => {
        void puzzelVoltooid(sessie, 6);
        void registreerOpgelost(sessie, 'p6');
      },
      bijFout: () => {
        speelFout();
        hulp.poging('p6', 'fout');
        void registreerPoging(sessie, 'p6', 'fout');
      },
    });
  }

  const toonRapportKnop = (): void => {
    // In de zijbalk én onder de volledige bladzijde, waar de spelers dan kijken.
    document.querySelectorAll('[data-rapport-knop]').forEach(plek => {
      if (plek.childElementCount > 0) return;
      const link = document.createElement('a');
      link.href = `einde.html?sessie=${encodeURIComponent(sessie)}`;
      link.className = 'rapport-knop';
      link.textContent = 'Schrijf het rapport voor An';
      link.addEventListener('click', () => schakelGuardUit());
      plek.append(link);
    });
  };

  // ── Alles bijwerken na een statuswijziging ──
  const update = (p: Status): void => {
    document.body.dataset['opgelost'] = Object.keys(p)
      .filter(k => p[k])
      .join(' ');

    const nieuw = pasZichtbaarheidToe(p);
    if (!eersteStatus) {
      let geluid = false;
      for (const el of nieuw) {
        if (el.matches('.voorwerp')) {
          el.classList.add('nieuw');
          geluid = true;
        } else if (el.matches('li')) {
          el.querySelector('[data-open]')?.classList.add('nieuw');
        }
      }
      if (geluid) speelUnlock();
    }

    // Opgeloste sloten tonen als open
    document.querySelectorAll<HTMLElement>('.slot-paneel[data-puzzel]').forEach(paneel => {
      const klaar = !!p[paneel.dataset['puzzel'] ?? ''];
      paneel.classList.toggle('opgelost', klaar);
      paneel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach(el => {
        if (klaar) el.disabled = true;
      });
    });

    // Verhaalfragment na een puzzel die nu opgelost wordt
    for (const [puzzel, id] of Object.entries(FRAGMENT_NA_PUZZEL)) {
      if (!p[puzzel] || fragmentenAfgespeeld.has(puzzel)) continue;
      fragmentenAfgespeeld.add(puzzel);
      if (Date.now() - paginaLaadtijd <= WACHT_NA_LADEN) continue;
      speelUnlock();
      speelMetOndertitel(id);
    }

    if (p['p6']) {
      const volledig = document.getElementById('bladzijde-volledig');
      if (volledig) toonVolledigeBladzijde(volledig);
    }
    if (p[KAMER14_LAATSTE]) toonRapportKnop();
    updateHints(p);
    updateRapportDoel(p);
    toonBerichten(p, undefined, id => speelMetOndertitel(id, 0));
    eersteStatus = false;
  };

  koppelHints();
  config.extra?.({ sessie, zorgVoorAudio });
  initRapportDoel();
  toonGeluidsmelding(zetGeluidAan);

  // ── Firebase live luisteren ──
  const stop = luisterNaarStatus(sessie, puzzels => {
    const p = puzzels || {};
    update(p);
    registreerVrijgaves(sessie, p, KAMER14_VRIJGAVE);
    hulp.status(p);
  });

  // ── Speldata: geopende hintstappen ──
  luisterNaarHints(sessie, blokId => {
    const puzzel = puzzelUitHintBlok(blokId);
    return puzzel ? { puzzel, rol } : null;
  });
  window.addEventListener('pagehide', stop);
}
