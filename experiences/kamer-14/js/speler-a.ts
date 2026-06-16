import '../../../shared/js/sentry.ts';
import { luisterNaarStatus, puzzelVoltooid } from '../../../shared/js/session.ts';
import { controleerAntwoordHash } from '../../../shared/js/utils.ts';
import {
  updateVoortgang,
  markeerVoltooid,
  installeerNavigatieGuard,
  KAMER14_ANTWOORD_HASHES,
} from '../../../shared/js/game.ts';
import { startAchtergrond, speelUnlock, speelVerhaalFragment } from './audio.ts';
import { initialiseerTimer } from '../../../shared/js/timer.ts';

let _audioGestart: boolean = false;

// Bijhouden welke puzzels al een fragment getriggerd hebben
const _fragmentenAfgespeeld: Set<string> = new Set();

// Fragmenten alleen spelen voor puzzels die tijdens DEZE sessie opgelost worden,
// niet voor puzzels die al opgelost waren vóór het laden van de pagina.
const _paginaLaadtijd: number = Date.now();
const WACHT_NA_LADEN: number  = 4000; // ms — Firebase-initiële snapshot duurt doorgaans < 2 s

function zorgVoorAudio(): void {
  if (_audioGestart) return;
  _audioGestart = true;
  startAchtergrond('a');
}

// Sessie ophalen uit URL
const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// ── Browsernavigatie blokkeren ────────────────────────────
// Wordt uitgeschakeld zodra de speler bewust naar einde.html gaat.
const schakelGuardUit = installeerNavigatieGuard();

// Timer starten (na sessie-definitie)
initialiseerTimer(sessie!);

// Casenummer tonen in systeembalk
const sysCase = document.getElementById('sys-case');
if (sysCase) sysCase.textContent = `Intern dossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


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

// ── Tabs vrijgeven op basis van Firebase-status ───────────
function updateTabs(p: Record<string, boolean>): void {
  const tabAtelier     = document.getElementById('tab-atelier');
  const tabIntakefiche = document.getElementById('tab-intakefiche');
  const tabBijlage     = document.getElementById('tab-bijlage');

  // Atelier: vrijgegeven na P1
  if (p['p1'] && tabAtelier?.classList.contains('slot')) {
    ontgrendelTab(tabAtelier, 'Atelier', 'panel-atelier');
  }

  // Intakefiche: vrijgegeven na P2 én P3
  if (p['p2'] && p['p3'] && tabIntakefiche?.classList.contains('slot')) {
    ontgrendelTab(tabIntakefiche, 'Intakefiche', 'panel-intakefiche');
  }

  // Bijlage D: vrijgegeven na P4
  if (p['p4'] && tabBijlage?.classList.contains('slot')) {
    ontgrendelTab(tabBijlage, 'Bijlage D', 'panel-bijlage');
  }

  // ── Verhaalfragmenten na puzzeloplossing ─────────────────
  (['p1','p2','p3','p4','p5'] as const).forEach(nr => {
    if (p[nr] && !_fragmentenAfgespeeld.has(nr)) {
      _fragmentenAfgespeeld.add(nr);
      if (Date.now() - _paginaLaadtijd > WACHT_NA_LADEN) {
        zorgVoorAudio();
        speelVerhaalFragment('a', nr);
      }
    }
  });

  // Voltooide puzzels markeren als verborgen
  ['p1','p2','p3','p4','p5'].forEach((nr, i) => {
    if (p[nr]) markeerVoltooid(`puzzel-${i + 1}`);
  });

  // Eindelink tonen als alle puzzels opgelost zijn
  if (p['p5'] && !document.getElementById('einde-link')) {
    const balk     = document.createElement('a');
    balk.id        = 'einde-link';
    balk.href      = `einde.html?sessie=${sessie}`;
    balk.className = 'einde-link-balk';
    balk.innerHTML = '<i class="bi bi-arrow-right-circle me-2"></i>Alle puzzels opgelost — dien het rapport in';
    balk.addEventListener('click', () => { schakelGuardUit(); });
    document.querySelector('.tabs')?.insertAdjacentElement('afterend', balk);
  }
}


['p1','p2','p3','p4','p5'].forEach(nr => {
  const puzzelNr = parseInt(nr.replace('p', ''));
  document.getElementById(`btn-${nr}`)?.addEventListener('click', () =>
    controleerAntwoordHash(
      nr, `input-${nr}`, `feedback-${nr}`, `btn-${nr}`,
      KAMER14_ANTWOORD_HASHES,
      () => puzzelVoltooid(sessie!, puzzelNr),
      'Niet correct. Overleg opnieuw met Speler B.'
    )
  );
  document.getElementById(`input-${nr}`)?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') document.getElementById(`btn-${nr}`)?.click();
  });
});


// ── Firebase live luisteren ───────────────────────────────
const unsubscribe = luisterNaarStatus(sessie!, (puzzels) => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
});
window.addEventListener('pagehide', unsubscribe);
