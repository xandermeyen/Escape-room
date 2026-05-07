import { luisterNaarStatus, puzzelVoltooid } from './session.js';
import { volgendHint } from './utils.js';
import { startAchtergrond, speelUnlock, speelVerhaalFragment, speelBriefkaartStem } from './audio.js';
import { initialiseerTimer } from './timer.js';

let _audioGestart = false;

// Bijhouden welke puzzels al een fragment getriggerd hebben
const _fragmentenAfgespeeld = new Set();

// Fragmenten alleen spelen voor puzzels die tijdens DEZE sessie opgelost worden,
// niet voor puzzels die al opgelost waren vóór het laden van de pagina.
const _paginaLaadtijd = Date.now();
const WACHT_NA_LADEN  = 4000; // ms

function zorgVoorAudio() {
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

// Timer starten (na sessie-definitie)
initialiseerTimer(sessie);

// Casenummer tonen in systeembalk
document.getElementById('sys-case').textContent =
  `Buurtdossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


// ── Tabnavigatie ──────────────────────────────────────────
document.querySelectorAll('.tab:not(.slot)').forEach(tab => {
  tab.addEventListener('click', () => {
    zorgVoorAudio();
    const doel = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(`panel-${doel}`)?.classList.add('actief');
  });
});


// ── Voortgangsbalk bijwerken ──────────────────────────────
function updateVoortgang(p) {
  const stappen  = ['vp1','vp2','vp3','vp4','vp5'];
  const voltooid = [p.p1, p.p2, p.p3, p.p4, p.p5];
  const aantalKlaar = voltooid.filter(Boolean).length;

  stappen.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'vp-stap';
    if (voltooid[i])            el.classList.add('vp-klaar');
    else if (i === aantalKlaar) el.classList.add('vp-bezig');
    else                        el.classList.add('vp-open');
  });
}


// ── Tab vrijgeven op basis van Firebase-status ────────────
function updateTabs(p) {
  const tabKamer = document.getElementById('tab-kamer');

  // Kamerinspectie: vrijgegeven na P2 én P3
  if (p.p2 && p.p3 && tabKamer.classList.contains('slot')) {
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
      document.getElementById('panel-kamer').classList.add('actief');
    });
  }

  // Puzzels vrijgeven op basis van voortgang
  if (p.p1) {
    document.getElementById('puzzel-2')?.classList.remove('verborgen');
    document.getElementById('puzzel-3')?.classList.remove('verborgen');
  }
  if (p.p4) {
    document.getElementById('puzzel-5')?.classList.remove('verborgen');
  }

  // ── Verhaalfragmenten na puzzeloplossing ─────────────────
  // Speelt een random fragment van Katrijn na elke nieuw opgeloste puzzel.
  // Alleen voor puzzels die tijdens DEZE sessie opgelost werden (niet bij pagina laden).
  ['p1','p2','p3','p4','p5'].forEach(nr => {
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
  if (p.p5 && !document.getElementById('einde-link')) {
    const balk     = document.createElement('a');
    balk.id        = 'einde-link';
    balk.href      = `einde.html?sessie=${sessie}`;
    balk.className = 'einde-link-balk';
    balk.innerHTML = '<i class="bi bi-arrow-right-circle me-2"></i>Alle puzzels opgelost — dien het rapport in';
    document.querySelector('.tabs').insertAdjacentElement('afterend', balk);
  }
}

function markeerVoltooid(id) {
  const blok = document.getElementById(id);
  if (!blok) return;
  blok.classList.add('verborgen');
}


// ── Prikbord: brief omdraaien ─────────────────────────────
function draaiOm() {
  const kaart = document.getElementById('brief-kaart');
  if (!kaart) return;
  kaart.classList.toggle('omgedraaid');
}
window.draaiOm = draaiOm;


// ── Puzzel-antwoorden controleren ─────────────────────────
const antwoorden = {
  p1: ['dinsdag donderdag', 'dinsdag en donderdag'],
  p2: ['diest'],
  p3: ['8', 'acht', '8 weken', 'acht weken'],
  p4: ['marie stas', 'marie'],
  p5: ['07:35', '7:35'],
};

function controleerAntwoord(puzzelNr, inputId, feedbackId, btnId) {
  const input    = document.getElementById(inputId);
  const feedback = document.getElementById(feedbackId);
  const btn      = document.getElementById(btnId);
  const waarde   = input.value.trim().toLowerCase();

  if (!waarde) return;

  if (antwoorden[puzzelNr].includes(waarde)) {
    input.classList.remove('fout');
    feedback.className   = 'puzzel-feedback correct';
    feedback.textContent = 'Correct — Firebase wordt bijgewerkt…';
    btn.disabled = true;
    puzzelVoltooid(sessie, parseInt(puzzelNr.replace('p', '')));
  } else {
    input.classList.add('fout');
    feedback.className   = 'puzzel-feedback fout';
    feedback.textContent = 'Niet correct. Overleg opnieuw met Speler A.';
    setTimeout(() => input.classList.remove('fout'), 1500);
  }
}

['p1','p2','p3','p4','p5'].forEach(nr => {
  document.getElementById(`btn-${nr}`)?.addEventListener('click', () =>
    controleerAntwoord(nr, `input-${nr}`, `feedback-${nr}`, `btn-${nr}`));

  document.getElementById(`input-${nr}`)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(`btn-${nr}`)?.click();
  });
});


// ── Firebase live luisteren ───────────────────────────────
luisterNaarStatus(sessie, (puzzels) => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
});
