import { luisterNaarStatus, puzzelVoltooid } from './session.js';
import { volgendHint } from './utils.js';

// Sessie ophalen uit URL
const params  = new URLSearchParams(window.location.search);
const sessie  = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// Casenummer tonen in systeembalk
document.getElementById('sys-case').textContent =
  `Intern dossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


// ── Tabnavigatie ──────────────────────────────────────────
document.querySelectorAll('.tab:not(.slot)').forEach(tab => {
  tab.addEventListener('click', () => {
    const doel = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(`panel-${doel}`)?.classList.add('actief');
  });
});


// ── Voortgangsbalk bijwerken ──────────────────────────────
function updateVoortgang(p) {
  const stappen = ['vp1','vp2','vp3','vp4','vp5'];
  const voltooid = [p.p1, p.p2, p.p3, p.p4, p.p5];
  const aantalKlaar = voltooid.filter(Boolean).length;

  stappen.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'vp-stap';
    if (voltooid[i]) {
      el.classList.add('vp-klaar');
    } else if (i === aantalKlaar) {
      el.classList.add('vp-bezig');
    } else {
      el.classList.add('vp-open');
    }
  });
}


// ── Tabs vrijgeven op basis van Firebase status ───────────
function updateTabs(p) {
  const tabAtelier    = document.getElementById('tab-atelier');
  const tabIntakefiche = document.getElementById('tab-intakefiche');
  const tabBijlage    = document.getElementById('tab-bijlage');

  // Atelier: vrijgegeven na P1
  if (p.p1 && tabAtelier.classList.contains('slot')) {
    tabAtelier.classList.remove('slot');
    tabAtelier.textContent = 'Atelier';
    tabAtelier.classList.add('nieuw-doc');
    tabAtelier.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabAtelier.classList.add('actief');
      document.getElementById('panel-atelier').classList.add('actief');
    });
  }

  // Intakefiche: vrijgegeven na P2 én P3
  if (p.p2 && p.p3 && tabIntakefiche.classList.contains('slot')) {
    tabIntakefiche.classList.remove('slot');
    tabIntakefiche.textContent = 'Intakefiche';
    tabIntakefiche.classList.add('nieuw-doc');
    tabIntakefiche.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabIntakefiche.classList.add('actief');
      document.getElementById('panel-intakefiche').classList.add('actief');
    });
  }

  // Bijlage D: vrijgegeven na P4
  if (p.p4 && tabBijlage.classList.contains('slot')) {
    tabBijlage.classList.remove('slot');
    tabBijlage.textContent = 'Bijlage D';
    tabBijlage.classList.add('nieuw-doc');
    tabBijlage.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabBijlage.classList.add('actief');
      document.getElementById('panel-bijlage').classList.add('actief');
    });
  }

  // Voltooide puzzels markeren
  if (p.p1) markeerVoltooid('puzzel-1');
  if (p.p2) markeerVoltooid('puzzel-2');
  if (p.p3) markeerVoltooid('puzzel-3');
  if (p.p4) markeerVoltooid('puzzel-4');
  if (p.p5) markeerVoltooid('puzzel-5');
}

function markeerVoltooid(id) {
  const blok = document.getElementById(id);
  if (!blok) return;
  blok.innerHTML = `<div class="puzzel-voltooid">
    <i class="bi bi-check2-circle me-1"></i>Bevestigd — opgenomen in dossier
  </div>`;
}


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
    feedback.className = 'puzzel-feedback correct';
    feedback.textContent = 'Correct — Firebase wordt bijgewerkt…';
    btn.disabled = true;
    puzzelVoltooid(sessie, parseInt(puzzelNr.replace('p', '')));
  } else {
    input.classList.add('fout');
    feedback.className = 'puzzel-feedback fout';
    feedback.textContent = 'Niet correct. Overleg opnieuw met Speler B.';
    setTimeout(() => input.classList.remove('fout'), 1500);
  }
}

document.getElementById('btn-p1').addEventListener('click', () =>
  controleerAntwoord('p1', 'input-p1', 'feedback-p1', 'btn-p1'));
document.getElementById('btn-p2').addEventListener('click', () =>
  controleerAntwoord('p2', 'input-p2', 'feedback-p2', 'btn-p2'));
document.getElementById('btn-p3').addEventListener('click', () =>
  controleerAntwoord('p3', 'input-p3', 'feedback-p3', 'btn-p3'));
document.getElementById('btn-p4').addEventListener('click', () =>
  controleerAntwoord('p4', 'input-p4', 'feedback-p4', 'btn-p4'));
document.getElementById('btn-p5').addEventListener('click', () =>
  controleerAntwoord('p5', 'input-p5', 'feedback-p5', 'btn-p5'));

// Enter werkt ook op alle inputvelden
['p1','p2','p3','p4','p5'].forEach(nr => {
  document.getElementById(`input-${nr}`)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(`btn-${nr}`).click();
  });
});


// ── Firebase live luisteren ───────────────────────────────
luisterNaarStatus(sessie, (puzzels) => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
});