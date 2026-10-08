import '../../../shared/js/sentry.ts';
import {
  luisterNaarStatus,
  puzzelVoltooid,
  bewaakSessieGesloten,
} from '../../../shared/js/session.ts';
import { controleerAntwoordHash, koppelHints, sessieUitUrl } from '../../../shared/js/utils.ts';
import { koppelActies } from '../../../shared/js/acties.ts';
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
import { initKamerinspectie } from './kamerinspectie.ts';
import {
  registreerPoging,
  registreerOpgelost,
  registreerVrijgaves,
  luisterNaarHints,
  puzzelUitHintBlok,
} from '../../../shared/js/speldata.ts';
import { initHulp } from '../../../shared/js/hulp.ts';
import { koppelDemoModus } from '../../../shared/js/demo.ts';
import { maakTabsToegankelijk, maakKlikbaar } from '../../../shared/js/toegankelijk.ts';
import { KAMER14_INACTIEF, KAMER14_HULP_HTML, kamer14VrijgaveMelding } from './kamer14-hulp.ts';
import {
  startAchtergrond,
  speelUnlock,
  speelVerhaalFragment,
  speelEnvelopGeluid,
  hervatAudio,
} from './audio.ts';
import { initialiseerTimer } from '../../../shared/js/timer.ts';
import { initRapportDoel, updateRapportDoel } from './rapport-doel.ts';
import { heeftBerichten, toonBerichten, toonOndertitel, toonGeluidsmelding } from './berichten.ts';

let _audioGestart: boolean = false;

// Bijhouden welke puzzels al een fragment getriggerd hebben
const _fragmentenAfgespeeld: Set<string> = new Set();

// Fragmenten alleen spelen voor puzzels die tijdens DEZE sessie opgelost worden,
// niet voor puzzels die al opgelost waren vóór het laden van de pagina.
const _paginaLaadtijd: number = Date.now();
const WACHT_NA_LADEN: number = 4000; // ms

function zorgVoorAudio(): void {
  hervatAudio();
  if (_audioGestart) return;
  _audioGestart = true;
  startAchtergrond('b');
}

/** Knop "Geluid aan" in de geluidsmelding: start de audio en speelt een testtoon. */
function zetGeluidAan(): void {
  zorgVoorAudio();
  speelUnlock();
}

// Sessie ophalen uit URL (redirect + stop als die ontbreekt)
const sessie = sessieUitUrl();

// ── Browsernavigatie blokkeren ────────────────────────────
// Wordt uitgeschakeld zodra de speler bewust naar einde.html gaat.
const schakelGuardUit = installeerNavigatieGuard();

// Demomodus: wisselen naar de andere speler zonder lobby (zie demo.ts).
koppelDemoModus(
  sessie,
  'Speler B',
  [{ label: 'Speler A', href: `speler-a.html?sessie=${encodeURIComponent(sessie)}` }],
  schakelGuardUit,
);

// Timer starten (na sessie-definitie)
initialiseerTimer(sessie, {
  waarschuwingen: KAMER14_TIMER_WAARSCHUWINGEN,
  voorRedirect: schakelGuardUit,
});

// Host kan de sessie deactiveren → naar het tijd-voorbij-scherm
bewaakSessieGesloten(sessie, () => {
  schakelGuardUit();
  window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(sessie)}`;
});

// Casenummer tonen in systeembalk
const sysCase = document.getElementById('sys-case');
if (sysCase) sysCase.textContent = `Buurtdossier · Ref. OPZ-2025-0506-LB · Sessie ${sessie}`;

// ── Hulp: hint-tip, verhaalmeldingen, vrijgave en "Hulp nodig?" ──
const hulp = initHulp({
  hintBlokVoor: puzzel => `hint-${puzzel}-b`,
  vrijgave: KAMER14_VRIJGAVE,
  inactiefMeldingen: KAMER14_INACTIEF.b,
  vrijgaveMelding: (oud, nieuw) => kamer14VrijgaveMelding('b', oud, nieuw),
  hulpHtml: KAMER14_HULP_HTML,
});

// ── Tabnavigatie ──────────────────────────────────────────
document.querySelectorAll('.tab:not(.slot)').forEach(tab => {
  tab.addEventListener('click', () => {
    zorgVoorAudio();
    const doel = (tab as HTMLElement).dataset['tab'];
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(`panel-${doel}`)?.classList.add('actief');
  });
});

// Geeft een vergrendelde tab vrij: speelt het unlock-geluid, toont het label
// en koppelt de klik die deze tab plus zijn paneel activeert.
function ontgrendelTab(tab: HTMLElement, label: string, panelId: string): void {
  zorgVoorAudio();
  speelUnlock();
  tab.classList.remove('slot');
  tab.textContent = label;
  tab.classList.add('nieuw-doc');
  tab.addEventListener('click', () => {
    zorgVoorAudio();
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(panelId)?.classList.add('actief');
  });
}

// ── Tab vrijgeven op basis van Firebase-status ────────────
function updateTabs(p: Record<string, boolean>): void {
  const tabKamer = document.getElementById('tab-kamer');

  // Kamerinspectie: vrijgegeven na P2 én P3
  if (p['p2'] && p['p3'] && tabKamer?.classList.contains('slot')) {
    ontgrendelTab(tabKamer, 'Kamerinspectie', 'panel-kamer');
  }

  // Puzzels vrijgeven op basis van voortgang
  if (p['p1']) {
    document.getElementById('puzzel-2')?.classList.remove('verborgen');
    document.getElementById('puzzel-3')?.classList.remove('verborgen');
  }
  // P4 (wie ging ze opzoeken) staat in de kamerinspectie: samen met die tab vrij.
  if (p['p2'] && p['p3']) {
    document.getElementById('puzzel-4')?.classList.remove('verborgen');
  }
  if (p['p4']) {
    document.getElementById('puzzel-5')?.classList.remove('verborgen');
  }

  // ── Verhaalfragmenten na puzzeloplossing ─────────────────
  KAMER14_TEKST_PUZZELS.forEach(nr => {
    if (p[nr] && !_fragmentenAfgespeeld.has(nr)) {
      _fragmentenAfgespeeld.add(nr);
      if (Date.now() - _paginaLaadtijd > WACHT_NA_LADEN) {
        zorgVoorAudio();
        speelVerhaalFragment('b', nr, {
          bijStart: audio => toonOndertitel('b', nr, audio),
          bijFout: () => toonGeluidsmelding('b', zetGeluidAan),
        });
      }
    }
  });

  // Voltooide puzzels markeren als verborgen
  KAMER14_PUZZELS.forEach(nr => {
    if (p[nr]) markeerVoltooid(`puzzel-${nr.slice(1)}`);
  });

  // Bladzijde (P6): vrijgegeven na P5, na het oplossen de hele bladzijde tonen
  const tabBladzijde = document.getElementById('tab-bladzijde');
  if (p['p5'] && tabBladzijde?.classList.contains('slot')) {
    ontgrendelTab(tabBladzijde, 'Bladzijde', 'panel-bladzijde');
  }
  if (p['p6']) {
    const volledig = document.getElementById('bladzijde-volledig');
    if (volledig) toonVolledigeBladzijde(volledig);
  }

  // Eindelink tonen als alle puzzels opgelost zijn
  if (p[KAMER14_LAATSTE] && !document.getElementById('einde-link')) {
    const balk = document.createElement('a');
    balk.id = 'einde-link';
    balk.href = `einde.html?sessie=${sessie}`;
    balk.className = 'einde-link-balk';
    balk.innerHTML =
      '<i class="bi bi-arrow-right-circle me-2"></i>Alle puzzels opgelost. Dien samen het rapport in';
    balk.addEventListener('click', () => {
      schakelGuardUit();
    });
    document.querySelector('.tabs')?.insertAdjacentElement('afterend', balk);
  }
}

// ── Prikbord: brief omdraaien ─────────────────────────────
function draaiOm(): void {
  const kaart = document.getElementById('brief-kaart');
  if (!kaart) return;
  zorgVoorAudio();
  speelEnvelopGeluid();
  kaart.classList.toggle('omgedraaid');
}

koppelActies({ 'draai-om': () => draaiOm() });
koppelHints();

// Tekstpuzzels: antwoord invullen en controleren (P6 heeft een eigen aanpak, zie bladzijde.ts)
KAMER14_TEKST_PUZZELS.forEach(nr => {
  const puzzelNr = parseInt(nr.slice(1));
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
      'Niet correct. Overleg opnieuw met Speler A.',
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

// ── P6: de uitgescheurde bladzijde ────────────────────────
const strokenLijst = document.getElementById('stroken-lijst');
const btnP6 = document.getElementById('btn-p6') as HTMLButtonElement | null;
const feedbackP6 = document.getElementById('feedback-p6');
if (strokenLijst && btnP6 && feedbackP6) {
  initBladzijde({
    rol: 'b',
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

// ── Kamerinspectie: zones op de foto ───────────────────────
initKamerinspectie();

// ── Toetsenbord: tabs en klikbare documenten ──────────────
maakTabsToegankelijk(document.querySelector<HTMLElement>('.tabs'));
const briefKaart = document.getElementById('brief-kaart');
if (briefKaart) maakKlikbaar(briefKaart, 'Envelop omdraaien en de brief lezen');

// ── Doel: rapportvragen (dicht op gsm) ─────────────────────
initRapportDoel();

// ── Audio volgbaar: tab Berichten en melding over het geluid ──
if (heeftBerichten('b')) document.getElementById('tab-berichten')?.removeAttribute('hidden');
toonGeluidsmelding('b', zetGeluidAan);

// ── Firebase live luisteren ───────────────────────────────
const unsubscribe = luisterNaarStatus(sessie, puzzels => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
  updateRapportDoel(p);
  toonBerichten('b', p);
  registreerVrijgaves(sessie, p, KAMER14_VRIJGAVE);
  hulp.status(p);
});

// ── Speldata: geopende hintstappen (Speler B) ──────────────
luisterNaarHints(sessie, blokId => {
  const puzzel = puzzelUitHintBlok(blokId);
  return puzzel ? { puzzel, rol: 'b' } : null;
});
window.addEventListener('pagehide', unsubscribe);
