import { luisterNaarStatus, puzzelVoltooid } from './session.js';
import { volgendHint } from './utils.js';

// Sessie ophalen uit URL
const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// Casenummer tonen in systeembalk
document.getElementById('sys-case').textContent =
  `Buurtdossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


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
    if (voltooid[i])            el.classList.add('vp-klaar');
    else if (i === aantalKlaar) el.classList.add('vp-bezig');
    else                        el.classList.add('vp-open');
  });
}


// ── Tab vrijgeven op basis van Firebase status ────────────
function updateTabs(p) {
  const tabKamer = document.getElementById('tab-kamer');

  // Kamerinspectie: vrijgegeven na P2 én P3
  if (p.p2 && p.p3 && tabKamer.classList.contains('slot')) {
    tabKamer.classList.remove('slot');
    tabKamer.textContent = 'Kamerinspectie';
    tabKamer.classList.add('nieuw-doc');
    tabKamer.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabKamer.classList.add('actief');
      document.getElementById('panel-kamer').classList.add('actief');
    });
  }

  // Voltooide puzzels markeren
  ['p1','p2','p3','p4','p5'].forEach((nr, i) => {
    if (p[nr]) markeerVoltooid(`puzzel-${i + 1}`);
  });
}

function markeerVoltooid(id) {
  const blok = document.getElementById(id);
  if (!blok) return;
  blok.innerHTML = `<div class="puzzel-voltooid">
    <i class="bi bi-check2-circle me-1"></i>Bevestigd — opgenomen in dossier
  </div>`;
}


// ── Prikbord: brief omdraaien ─────────────────────────────
function draaiOm() {
  document.getElementById('brief-kaart')?.classList.toggle('omgedraaid');
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
    feedback.className = 'puzzel-feedback correct';
    feedback.textContent = 'Correct — Firebase wordt bijgewerkt…';
    btn.disabled = true;
    puzzelVoltooid(sessie, parseInt(puzzelNr.replace('p', '')));
  } else {
    input.classList.add('fout');
    feedback.className = 'puzzel-feedback fout';
    feedback.textContent = 'Niet correct. Overleg opnieuw met Speler A.';
    setTimeout(() => input.classList.remove('fout'), 1500);
  }
}

['p1','p2','p3','p4','p5'].forEach(nr => {
  document.getElementById(`btn-${nr}`)
    ?.addEventListener('click', () =>
      controleerAntwoord(nr, `input-${nr}`, `feedback-${nr}`, `btn-${nr}`));

  document.getElementById(`input-${nr}`)
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById(`btn-${nr}`)?.click();
    });
});


// ── Firebase live luisteren ───────────────────────────────
luisterNaarStatus(sessie, (puzzels) => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
});