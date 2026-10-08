/**
 * kamer14-speler.ts: alles wat Speler A en Speler B van Kamer 14 gemeen
 * hebben. speler-a.ts en speler-b.ts geven enkel nog door wat verschilt:
 * welke tabs en vragen wanneer vrijkomen, en eigen extra's (de
 * kamerinspectie en de brief bij B).
 *
 * Vroeger stond dit twee keer, bijna regel voor regel gelijk. Een wijziging
 * (zoals P6) moest dan op twee plaatsen, en dat ging een keer mis: de vraag
 * van P4 bleef bij Speler B maandenlang verborgen.
 */
import '../../../shared/js/sentry.ts';
import {
  luisterNaarStatus,
  puzzelVoltooid,
  bewaakSessieGesloten,
} from '../../../shared/js/session.ts';
import { controleerAntwoordHash, koppelHints, sessieUitUrl } from '../../../shared/js/utils.ts';
import {
  updateVoortgang,
  markeerVoltooid,
  installeerNavigatieGuard,
} from '../../../shared/js/game.ts';
import {
  KAMER14_ANTWOORD_HASHES,
  KAMER14_ANTWOORD_REGELS,
  KAMER14_TIMER_WAARSCHUWINGEN,
  KAMER14_VRIJGAVE,
  KAMER14_LAATSTE,
  KAMER14_PUZZELS,
  KAMER14_TEKST_PUZZELS,
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
import { koppelDemoModus } from '../../../shared/js/demo.ts';
import { maakTabsToegankelijk } from '../../../shared/js/toegankelijk.ts';
import {
  KAMER14_INACTIEF,
  KAMER14_HULP_HTML,
  kamer14VrijgaveMelding,
  type Kamer14Rol,
} from './kamer14-hulp.ts';
import { startAchtergrond, speelUnlock, speelVerhaalFragment, hervatAudio } from './audio.ts';
import { initialiseerTimer } from '../../../shared/js/timer.ts';
import { initRapportDoel, updateRapportDoel } from './rapport-doel.ts';
import { heeftBerichten, toonBerichten, toonOndertitel, toonGeluidsmelding } from './berichten.ts';

type Status = Record<string, boolean>;

/**
 * Een tab die op slot staat tot bepaalde puzzels opgelost zijn. Het paneel is
 * `panel-<data-tab>`, zoals bij elke tab.
 */
export interface TabVrijgave {
  tab: string;
  label: string;
  na: string[];
}

export interface SpelerConfig {
  rol: Kamer14Rol;
  /** Voor de systeembalk, bv. "Intern dossier". */
  dossier: string;
  /** Tabs die vrijkomen (de Bladzijde na P5 komt er voor beiden bij). */
  tabs: TabVrijgave[];
  /** Vragen die verborgen starten: puzzelblok-id → nodig. */
  vragen?: Record<string, string[]>;
  /** Eigen extra's van deze speler. Krijgt zorgVoorAudio mee. */
  extra?: (ctx: { zorgVoorAudio: () => void }) => void;
}

const ANDER: Record<Kamer14Rol, { naam: string; pagina: string }> = {
  a: { naam: 'Speler B', pagina: 'speler-b.html' },
  b: { naam: 'Speler A', pagina: 'speler-a.html' },
};
const NAAM: Record<Kamer14Rol, string> = { a: 'Speler A', b: 'Speler B' };

const BLADZIJDE: TabVrijgave = { tab: 'tab-bladzijde', label: 'Bladzijde', na: ['p5'] };

/** Zijn alle puzzels in `na` opgelost? */
export function isVrij(p: Status, na: string[]): boolean {
  return na.every(nr => !!p[nr]);
}

/** Fragmenten enkel voor puzzels die opgelost worden terwijl de pagina open is. */
const WACHT_NA_LADEN = 4000; // ms; de eerste snapshot van Firebase duurt doorgaans < 2 s

export function startSpelerPagina(config: SpelerConfig): void {
  const { rol } = config;
  const ander = ANDER[rol];
  const hintSuffix = rol === 'a' ? '' : `-${rol}`;
  const paginaLaadtijd = Date.now();
  const fragmentenAfgespeeld = new Set<string>();

  // ── Audio ──
  let audioGestart = false;
  const zorgVoorAudio = (): void => {
    hervatAudio();
    if (audioGestart) return;
    audioGestart = true;
    startAchtergrond(rol);
  };
  /** Knop "Geluid aan" in de geluidsmelding: start de audio en speelt een testtoon. */
  const zetGeluidAan = (): void => {
    zorgVoorAudio();
    speelUnlock();
  };

  // ── Sessie, navigatie, demo, timer ──
  const sessie = sessieUitUrl();
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
  // Host kan de sessie deactiveren → naar het tijd-voorbij-scherm
  bewaakSessieGesloten(sessie, () => {
    schakelGuardUit();
    window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(sessie)}`;
  });

  const sysCase = document.getElementById('sys-case');
  if (sysCase) sysCase.textContent = `${config.dossier} · Ref. OPZ-2025-0506-LB · Sessie ${sessie}`;

  // ── Hulp: hint-tip, verhaalmeldingen, vrijgave en "Hulp nodig?" ──
  const hulp = initHulp({
    hintBlokVoor: puzzel => `hint-${puzzel}${hintSuffix}`,
    vrijgave: KAMER14_VRIJGAVE,
    inactiefMeldingen: KAMER14_INACTIEF[rol],
    vrijgaveMelding: (oud, nieuw) => kamer14VrijgaveMelding(rol, oud, nieuw),
    hulpHtml: KAMER14_HULP_HTML,
  });

  // ── Tabs: één klikhandler; tabs op slot doen niets ──
  const tabs = document.querySelector<HTMLElement>('.tabs');
  tabs?.addEventListener('click', e => {
    const tab = e.target instanceof Element ? e.target.closest<HTMLElement>('.tab') : null;
    if (!tab || tab.classList.contains('slot')) return;
    zorgVoorAudio();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(`panel-${tab.dataset['tab']}`)?.classList.add('actief');
  });

  const ontgrendel = ({ tab: id, label }: TabVrijgave): void => {
    const tab = document.getElementById(id);
    if (!tab?.classList.contains('slot')) return;
    zorgVoorAudio();
    speelUnlock();
    tab.classList.remove('slot');
    tab.textContent = label;
    tab.classList.add('nieuw-doc');
  };

  const toonEindeLink = (): void => {
    if (document.getElementById('einde-link')) return;
    const balk = document.createElement('a');
    balk.id = 'einde-link';
    balk.href = `einde.html?sessie=${encodeURIComponent(sessie)}`;
    balk.className = 'einde-link-balk';
    const icoon = document.createElement('i');
    icoon.className = 'bi bi-arrow-right-circle me-2';
    balk.append(icoon, 'Alle puzzels opgelost. Dien samen het rapport in');
    balk.addEventListener('click', () => schakelGuardUit());
    tabs?.insertAdjacentElement('afterend', balk);
  };

  // ── Alles bijwerken na een statuswijziging ──
  const update = (p: Status): void => {
    [...config.tabs, BLADZIJDE].forEach(t => {
      if (isVrij(p, t.na)) ontgrendel(t);
    });
    for (const [blok, na] of Object.entries(config.vragen ?? {})) {
      if (isVrij(p, na)) document.getElementById(blok)?.classList.remove('verborgen');
    }

    // Verhaalfragment na elke opgeloste tekstpuzzel
    KAMER14_TEKST_PUZZELS.forEach(nr => {
      if (!p[nr] || fragmentenAfgespeeld.has(nr)) return;
      fragmentenAfgespeeld.add(nr);
      if (Date.now() - paginaLaadtijd <= WACHT_NA_LADEN) return;
      zorgVoorAudio();
      speelVerhaalFragment(rol, nr, {
        bijStart: audio => toonOndertitel(rol, nr, audio),
        bijFout: () => toonGeluidsmelding(rol, zetGeluidAan),
      });
    });

    // Opgeloste puzzels verbergen
    KAMER14_PUZZELS.forEach(nr => {
      if (p[nr]) markeerVoltooid(`puzzel-${nr.slice(1)}`);
    });

    if (p['p6']) {
      const volledig = document.getElementById('bladzijde-volledig');
      if (volledig) toonVolledigeBladzijde(volledig);
    }
    if (p[KAMER14_LAATSTE]) toonEindeLink();
  };

  // ── Tekstpuzzels (P6 heeft een eigen aanpak, zie bladzijde.ts) ──
  KAMER14_TEKST_PUZZELS.forEach(nr => {
    const puzzelNr = parseInt(nr.slice(1), 10);
    document.getElementById(`btn-${nr}`)?.addEventListener('click', () =>
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
        `Niet correct. Overleg opnieuw met ${ander.naam}.`,
        KAMER14_ANTWOORD_REGELS,
        oordeel => {
          hulp.poging(nr, oordeel);
          if (oordeel !== 'juist') void registreerPoging(sessie, nr, oordeel);
        },
      ),
    );
    document.getElementById(`input-${nr}`)?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') document.getElementById(`btn-${nr}`)?.click();
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
        hulp.poging('p6', 'fout');
        void registreerPoging(sessie, 'p6', 'fout');
      },
    });
  }

  koppelHints();
  config.extra?.({ zorgVoorAudio });
  maakTabsToegankelijk(tabs);
  initRapportDoel();

  // ── Audio volgbaar: tab Berichten en melding over het geluid ──
  if (heeftBerichten(rol)) document.getElementById('tab-berichten')?.removeAttribute('hidden');
  toonGeluidsmelding(rol, zetGeluidAan);

  // ── Firebase live luisteren ──
  const stop = luisterNaarStatus(sessie, puzzels => {
    const p = puzzels || {};
    updateVoortgang(p);
    update(p);
    updateRapportDoel(p);
    toonBerichten(rol, p);
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
