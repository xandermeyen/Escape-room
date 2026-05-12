import { luisterNaarRapport, diendRapportIn } from '../../../shared/js/session.js';
import { speelStem } from './audio.js';

// ── Sessie ophalen ────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// Sessie tonen in systeembalk en meta
document.getElementById('sys-case-rapport').textContent =
  `Intern rapport · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;
document.getElementById('rapport-sessie-label').textContent = sessie;


// ── Scherm-overgangen ─────────────────────────────────────
function toonScherm(id) {
  document.querySelectorAll('.einde-scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}


// ── Validatie helpers ─────────────────────────────────────
const goedeAntwoorden = {
  bestemming: (v) => v.includes('diest'),
  wie:        (v) => v.includes('marie'),
  tijdstip:   (v) => {
    // Normaliseer: verwijder spaties, vervang 'u' en '.' door ':'
    const n = v.replace(/\s/g, '').replace(/[u.]/g, ':');
    return n.includes('07:35') || n.includes('7:35');
  },
};

function resetVeld(id) {
  document.getElementById(`r-${id}`).classList.remove('fout');
  document.getElementById(`fout-${id}`).style.display = 'none';
}

function markeerFout(id) {
  document.getElementById(`r-${id}`).classList.add('fout');
  document.getElementById(`fout-${id}`).style.display = 'block';
}


// ── Rapport indienen ──────────────────────────────────────
async function diendIn() {
  const bestemming = document.getElementById('r-bestemming').value.trim().toLowerCase();
  const wie        = document.getElementById('r-wie').value.trim().toLowerCase();
  const vervoer    = document.getElementById('r-vervoer').value.trim();
  const tijdstip   = document.getElementById('r-tijdstip').value.trim().toLowerCase();

  // Reset
  ['bestemming', 'wie', 'vervoer', 'tijdstip'].forEach(resetVeld);
  document.getElementById('rapport-validatie-bericht').style.display = 'none';

  let geldig = true;

  if (!goedeAntwoorden.bestemming(bestemming)) { markeerFout('bestemming'); geldig = false; }
  if (!goedeAntwoorden.wie(wie))               { markeerFout('wie');        geldig = false; }
  if (!vervoer)                                 { markeerFout('vervoer');    geldig = false; }
  if (!goedeAntwoorden.tijdstip(tijdstip))      { markeerFout('tijdstip');   geldig = false; }

  if (!geldig) {
    document.getElementById('rapport-validatie-bericht').style.display = 'block';
    return;
  }

  // Indienen
  const btn = document.getElementById('btn-indienen');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Indienen…';

  try {
    await diendRapportIn(sessie, {
      bestemming: document.getElementById('r-bestemming').value.trim(),
      wie:        document.getElementById('r-wie').value.trim(),
      vervoer,
      tijdstip:   document.getElementById('r-tijdstip').value.trim(),
    });
    // luisterNaarRapport vangt de statuswijziging op en activeert het briefkaartscherm
  } catch (err) {
    console.error('Firebase fout bij indienen rapport:', err);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-square me-2"></i>Rapport indienen';
    document.getElementById('rapport-validatie-bericht').textContent =
      'Verbindingsfout — probeer opnieuw.';
    document.getElementById('rapport-validatie-bericht').style.display = 'block';
  }
}

document.getElementById('btn-indienen').addEventListener('click', diendIn);

// Enter werkt op alle inputvelden
['r-bestemming', 'r-wie', 'r-vervoer', 'r-tijdstip'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') diendIn();
  });
});


// ── Postkaart omdraaien ───────────────────────────────────
let omgedraaid = false;

document.getElementById('postkaart').addEventListener('click', () => {
  omgedraaid = !omgedraaid;
  document.getElementById('postkaart').classList.toggle('omgedraaid', omgedraaid);

  if (omgedraaid) {
    speelStem('lena', 'briefkaart');
  }

  const hint = document.getElementById('briefkaart-hint');
  const btn  = document.getElementById('btn-sluit-dossier');

  if (omgedraaid) {
    hint.textContent = 'Klik opnieuw om de voorkant te zien';
    setTimeout(() => { btn.style.display = 'inline-block'; }, 750);
  } else {
    hint.textContent = 'Klik op de briefkaart om ze om te draaien';
  }
});

document.getElementById('btn-sluit-dossier').addEventListener('click', () => {
  toonScherm('scherm-slot');
});

document.getElementById('btn-terug-lobby').addEventListener('click', () => {
  window.location.href = '../../index.html';
});


// ── Firebase: luisteren naar rapport-status ───────────────
luisterNaarRapport(sessie, (rapport) => {
  if (rapport?.ingediend) {
    toonScherm('scherm-briefkaart');
  }
});
