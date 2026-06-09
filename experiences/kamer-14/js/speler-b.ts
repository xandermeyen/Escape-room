import '../../../shared/js/sentry.ts';
import { luisterNaarStatus, puzzelVoltooid } from '../../../shared/js/session.ts';
import { controleerAntwoordHash } from '../../../shared/js/utils.ts';
import {
  updateVoortgang,
  markeerVoltooid,
  installeerNavigatieGuard,
  KAMER14_ANTWOORD_HASHES,
} from '../../../shared/js/game.ts';
import { startAchtergrond, speelUnlock, speelVerhaalFragment, speelEnvelopGeluid } from './audio.ts';
import { initialiseerTimer } from '../../../shared/js/timer.ts';

let _audioGestart: boolean = false;

// Bijhouden welke puzzels al een fragment getriggerd hebben
const _fragmentenAfgespeeld: Set<string> = new Set();

// Fragmenten alleen spelen voor puzzels die tijdens DEZE sessie opgelost worden,
// niet voor puzzels die al opgelost waren vóór het laden van de pagina.
const _paginaLaadtijd: number = Date.now();
const WACHT_NA_LADEN: number  = 4000; // ms

function zorgVoorAudio(): void {
  if (_audioGestart) return;
  _audioGestart = true;
  startAchtergrond('b');
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
if (sysCase) sysCase.textContent = `Buurtdossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


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


// ── Tab vrijgeven op basis van Firebase-status ────────────
function updateTabs(p: Record<string, boolean>): void {
  const tabKamer = document.getElementById('tab-kamer');

  // Kamerinspectie: vrijgegeven na P2 én P3
  if (p['p2'] && p['p3'] && tabKamer?.classList.contains('slot')) {
    zorgVoorAudio();
    speelUnlock();
    tabKamer.classList.remove('slot');
    tabKamer.textContent = 'Kamerinspectie';
    tabKamer.classList.add('nieuw-doc');
    tabKamer.addEventListener('click', () => {
      zorgVoorAudio();
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabKamer.classList.add('actief');
      document.getElementById('panel-kamer')?.classList.add('actief');
    });
  }

  // Puzzels vrijgeven op basis van voortgang
  if (p['p1']) {
    document.getElementById('puzzel-2')?.classList.remove('verborgen');
    document.getElementById('puzzel-3')?.classList.remove('verborgen');
  }
  if (p['p4']) {
    document.getElementById('puzzel-5')?.classList.remove('verborgen');
  }

  // ── Verhaalfragmenten na puzzeloplossing ─────────────────
  (['p1','p2','p3','p4','p5'] as const).forEach(nr => {
    if (p[nr] && !_fragmentenAfgespeeld.has(nr)) {
      _fragmentenAfgespeeld.add(nr);
      if (Date.now() - _paginaLaadtijd > WACHT_NA_LADEN) {
        zorgVoorAudio();
        speelVerhaalFragment('b', nr);
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


// ── Prikbord: brief omdraaien ─────────────────────────────
function draaiOm(): void {
  const kaart = document.getElementById('brief-kaart');
  if (!kaart) return;
  zorgVoorAudio();
  speelEnvelopGeluid();
  kaart.classList.toggle('omgedraaid');
}

declare global {
  interface Window {
    draaiOm: typeof draaiOm;
  }
}

window.draaiOm = draaiOm;


['p1','p2','p3','p4','p5'].forEach(nr => {
  const puzzelNr = parseInt(nr.replace('p', ''));
  document.getElementById(`btn-${nr}`)?.addEventListener('click', () =>
    controleerAntwoordHash(
      nr, `input-${nr}`, `feedback-${nr}`, `btn-${nr}`,
      KAMER14_ANTWOORD_HASHES,
      () => puzzelVoltooid(sessie!, puzzelNr),
      'Niet correct. Overleg opnieuw met Speler A.'
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
