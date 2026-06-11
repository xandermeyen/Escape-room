import '../../../shared/js/sentry.ts';
import { luisterNaarRapport, diendRapportIn, sluitSessie, type RapportInhoud } from '../../../shared/js/session.ts';
import { antwoordKlopt } from '../../../shared/js/utils.ts';
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
// Antwoorden staan als SHA-256 hash in de bundle, niet als plain-text.
// Zelfde aanpak als de puzzels in speler-a.ts / speler-b.ts.
const GOEDE_HASHES: Record<string, string[]> = {
  bestemming: ['0ba7ea9cf252f255e39e41ea00307fe7995436e190d08bc4adf70da603d609e9'],
  wie:        ['c6d17a3613b9914e68707fcfac8410f097643bc5840681bb533030d73cbb18f8'],
  tijdstip: [
    // beide schrijfwijzen van het tijdstip zijn geldig
    '89f2a5f508866dcf1498b9e2059f33663672ddfc2a553f97bd17373545a43f82',
    '27d40a0e226fb1e8e4ab8ebac2cb17f8de544c733db677ce556d0c9144a1c82d',
  ],
};

// Tijdstip normaliseren: spaties weg, 'u' en '.' worden ':'
function normaliseerTijdstip(v: string): string {
  return v.replace(/\s/g, '').replace(/[u.]/g, ':');
}

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

  if (!(await antwoordKlopt(bestemming, GOEDE_HASHES['bestemming']!)))            { markeerFout('bestemming'); geldig = false; }
  if (!(await antwoordKlopt(wie, GOEDE_HASHES['wie']!)))                          { markeerFout('wie');        geldig = false; }
  if (!vervoer)                                                                   { markeerFout('vervoer');    geldig = false; }
  if (!(await antwoordKlopt(normaliseerTijdstip(tijdstip), GOEDE_HASHES['tijdstip']!))) { markeerFout('tijdstip'); geldig = false; }

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
    await sluitSessie(sessie!); // sessie deactiveren zodat ze niet eeuwig actief blijft
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
