import '../../../shared/js/sentry.ts';
import { luisterNaarRapport, diendRapportIn, type RapportInhoud } from '../../../shared/js/session.ts';
import { speelStem } from './audio.ts';

// ── Sessie ophalen ────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// Sessie tonen in systeembalk en meta
const sysCaseRapport = document.getElementById('sys-case-rapport');
if (sysCaseRapport) sysCaseRapport.textContent =
  `Intern rapport · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;

const rapportSessieLabel = document.getElementById('rapport-sessie-label');
if (rapportSessieLabel) rapportSessieLabel.textContent = sessie;


// ── Scherm-overgangen ─────────────────────────────────────
function toonScherm(id: string): void {
  document.querySelectorAll('.einde-scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}


// ── Validatie helpers ─────────────────────────────────────
const goedeAntwoorden: Record<string, (v: string) => boolean> = {
  bestemming: (v) => v.includes('diest'),
  wie:        (v) => v.includes('marie'),
  tijdstip:   (v) => {
    // Normaliseer: verwijder spaties, vervang 'u' en '.' door ':'
    const n = v.replace(/\s/g, '').replace(/[u.]/g, ':');
    return n.includes('07:35') || n.includes('7:35');
  },
};

function resetVeld(id: string): void {
  const input    = document.getElementById(`r-${id}`);
  const foutMsg  = document.getElementById(`fout-${id}`);
  if (input)   input.classList.remove('fout');
  if (foutMsg) foutMsg.style.display = 'none';
}

function markeerFout(id: string): void {
  const input    = document.getElementById(`r-${id}`);
  const foutMsg  = document.getElementById(`fout-${id}`);
  if (input)   input.classList.add('fout');
  if (foutMsg) foutMsg.style.display = 'block';
}


// ── Rapport indienen ──────────────────────────────────────
async function diendIn(): Promise<void> {
  const bestemming = (document.getElementById('r-bestemming') as HTMLInputElement).value.trim().toLowerCase();
  const wie        = (document.getElementById('r-wie') as HTMLInputElement).value.trim().toLowerCase();
  const vervoer    = (document.getElementById('r-vervoer') as HTMLInputElement).value.trim();
  const tijdstip   = (document.getElementById('r-tijdstip') as HTMLInputElement).value.trim().toLowerCase();

  // Reset
  ['bestemming', 'wie', 'vervoer', 'tijdstip'].forEach(resetVeld);
  const validatieBericht = document.getElementById('rapport-validatie-bericht');
  if (validatieBericht) validatieBericht.style.display = 'none';

  let geldig = true;

  if (!goedeAntwoorden['bestemming']!(bestemming)) { markeerFout('bestemming'); geldig = false; }
  if (!goedeAntwoorden['wie']!(wie))               { markeerFout('wie');        geldig = false; }
  if (!vervoer)                                     { markeerFout('vervoer');    geldig = false; }
  if (!goedeAntwoorden['tijdstip']!(tijdstip))      { markeerFout('tijdstip');   geldig = false; }

  if (!geldig) {
    if (validatieBericht) validatieBericht.style.display = 'block';
    return;
  }

  // Indienen
  const btn = document.getElementById('btn-indienen') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Indienen…';

  const inhoud: RapportInhoud = {
    bestemming: (document.getElementById('r-bestemming') as HTMLInputElement).value.trim(),
    wie:        (document.getElementById('r-wie') as HTMLInputElement).value.trim(),
    vervoer,
    tijdstip:   (document.getElementById('r-tijdstip') as HTMLInputElement).value.trim(),
  };

  try {
    await diendRapportIn(sessie!, inhoud);
    // luisterNaarRapport vangt de statuswijziging op en activeert het briefkaartscherm
  } catch (err) {
    console.error('Firebase fout bij indienen rapport:', err);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-square me-2"></i>Rapport indienen';
    if (validatieBericht) {
      validatieBericht.textContent = 'Verbindingsfout — probeer opnieuw.';
      validatieBericht.style.display = 'block';
    }
  }
}

document.getElementById('btn-indienen')?.addEventListener('click', diendIn);

// Enter werkt op alle inputvelden
['r-bestemming', 'r-wie', 'r-vervoer', 'r-tijdstip'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') diendIn();
  });
});


// ── Postkaart omdraaien ───────────────────────────────────
let omgedraaid: boolean = false;

document.getElementById('postkaart')?.addEventListener('click', () => {
  omgedraaid = !omgedraaid;
  document.getElementById('postkaart')?.classList.toggle('omgedraaid', omgedraaid);

  if (omgedraaid) {
    speelStem('lena', 'briefkaart');
  }

  const hint = document.getElementById('briefkaart-hint');
  const btn  = document.getElementById('btn-sluit-dossier') as HTMLButtonElement | null;

  if (omgedraaid) {
    if (hint) hint.textContent = 'Klik opnieuw om de voorkant te zien';
    setTimeout(() => { if (btn) btn.style.display = 'inline-block'; }, 750);
  } else {
    if (hint) hint.textContent = 'Klik op de briefkaart om ze om te draaien';
  }
});

document.getElementById('btn-sluit-dossier')?.addEventListener('click', () => {
  toonScherm('scherm-slot');
});

document.getElementById('btn-terug-lobby')?.addEventListener('click', () => {
  window.location.href = '../../index.html';
});


// ── Firebase: luisteren naar rapport-status ───────────────
luisterNaarRapport(sessie!, (rapport) => {
  if (rapport?.ingediend) {
    toonScherm('scherm-briefkaart');
  }
});
