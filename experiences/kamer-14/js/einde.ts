import '../../../shared/js/sentry.ts';
import {
  luisterNaarRapport,
  diendRapportIn,
  sluitSessie,
  haalTijden,
  type RapportInhoud,
} from '../../../shared/js/session.ts';
import { beoordeelAntwoord, sessieUitUrl } from '../../../shared/js/utils.ts';
import { KAMER14_ANTWOORD_HASHES, KAMER14_ANTWOORD_REGELS } from './kamer14-config.ts';
import { formateerTijd, TIJDSLIMIET_MS } from '../../../shared/js/timer.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { koppelDeelKnop } from '../../../shared/js/deel.ts';
import { speelStem } from './audio.ts';
import { maakKlikbaar } from '../../../shared/js/toegankelijk.ts';
import { haalDuren, percentielSneller, prestatieTekst } from '../../../shared/js/verdeling.ts';
import {
  bewaarFoutePogingen,
  leesFoutePogingen,
  MAX_FOUTE_POGINGEN,
  volgendeStap,
} from './einde-verloop.ts';
import { koppelRouteKaart } from './route-kaart.ts';

// ── Sessie ophalen (redirect + stop als die ontbreekt) ────
const sessie = sessieUitUrl();

// Sessie tonen in systeembalk en meta
const sysCaseRapport = document.getElementById('sys-case-rapport');
if (sysCaseRapport)
  sysCaseRapport.textContent = `Intern rapport · Ref. OPZ-2025-0506-LB · Sessie ${sessie}`;

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
// Zelfde hashes en normalisatie als de puzzels in speler-a.ts / speler-b.ts:
// bestemming = P2, wie = P4, tijdstip = P5; vervoer heeft een eigen regel.
// De velden staan als route onder de kaart (zie route-kaart.ts).
const VELD_PUZZEL: Record<string, string> = {
  bestemming: 'p2',
  wie: 'p4',
  vervoer: 'vervoer',
  tijdstip: 'p5',
};

function veldKlopt(veld: string, waarde: string): Promise<boolean> {
  const puzzel = VELD_PUZZEL[veld] ?? '';
  return beoordeelAntwoord(
    waarde,
    KAMER14_ANTWOORD_HASHES[puzzel] ?? [],
    KAMER14_ANTWOORD_REGELS[puzzel],
  ).then(oordeel => oordeel === 'juist');
}

function resetVeld(id: string): void {
  const input = document.getElementById(`r-${id}`);
  const foutMsg = document.getElementById(`fout-${id}`);
  if (input) input.classList.remove('fout');
  if (foutMsg) foutMsg.style.display = 'none';
}

function markeerFout(id: string): void {
  const input = document.getElementById(`r-${id}`);
  const foutMsg = document.getElementById(`fout-${id}`);
  if (input) input.classList.add('fout');
  if (foutMsg) foutMsg.style.display = 'block';
}

// ── Rapport indienen ──────────────────────────────────────
async function diendIn(): Promise<void> {
  const bestemming = (document.getElementById('r-bestemming') as HTMLInputElement).value;
  const wie = (document.getElementById('r-wie') as HTMLInputElement).value;
  const vervoer = (document.getElementById('r-vervoer') as HTMLInputElement).value.trim();
  const tijdstip = (document.getElementById('r-tijdstip') as HTMLInputElement).value;

  // Reset
  ['bestemming', 'wie', 'vervoer', 'tijdstip'].forEach(resetVeld);
  const validatieBericht = document.getElementById('rapport-validatie-bericht');
  if (validatieBericht) validatieBericht.style.display = 'none';
  const waarschuwing = document.getElementById('an-waarschuwing');

  let geldig = true;

  if (!(await veldKlopt('bestemming', bestemming))) {
    markeerFout('bestemming');
    geldig = false;
  }
  if (!(await veldKlopt('wie', wie))) {
    markeerFout('wie');
    geldig = false;
  }
  if (!(await veldKlopt('vervoer', vervoer))) {
    markeerFout('vervoer');
    geldig = false;
  }
  if (!(await veldKlopt('tijdstip', tijdstip))) {
    markeerFout('tijdstip');
    geldig = false;
  }

  const fouteVoorDeze = leesFoutePogingen(sessie);
  const stap = volgendeStap(fouteVoorDeze, geldig);
  if (stap === 'waarschuwing') {
    bewaarFoutePogingen(sessie, fouteVoorDeze + 1);
    waarschuwing?.classList.add('zichtbaar');
    waarschuwing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (stap === 'politie') {
    bewaarFoutePogingen(sessie, fouteVoorDeze + 1);
    toonPolitie();
    return;
  }
  waarschuwing?.classList.remove('zichtbaar');

  // Indienen
  const btn = document.getElementById('btn-indienen') as HTMLButtonElement;
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Indienen…';

  const inhoud: RapportInhoud = {
    bestemming: (document.getElementById('r-bestemming') as HTMLInputElement).value.trim(),
    wie: (document.getElementById('r-wie') as HTMLInputElement).value.trim(),
    vervoer,
    tijdstip: (document.getElementById('r-tijdstip') as HTMLInputElement).value.trim(),
  };

  try {
    await diendRapportIn(sessie, inhoud);
    await sluitSessie(sessie); // sessie deactiveren zodat ze niet eeuwig actief blijft
    // luisterNaarRapport vangt de statuswijziging op en toont de mail van An
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

// Kaart tekent mee terwijl de route ingevuld wordt
koppelRouteKaart();

// Enter werkt op alle inputvelden
['r-bestemming', 'r-wie', 'r-vervoer', 'r-tijdstip'].forEach(id => {
  document.getElementById(id)?.addEventListener('keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') diendIn();
  });
});

// ── Postkaart omdraaien ───────────────────────────────────
const postkaartEl = document.getElementById('postkaart');
if (postkaartEl) maakKlikbaar(postkaartEl, 'Briefkaart omdraaien');
let omgedraaid: boolean = false;

document.getElementById('postkaart')?.addEventListener('click', () => {
  omgedraaid = !omgedraaid;
  document.getElementById('postkaart')?.classList.toggle('omgedraaid', omgedraaid);

  if (omgedraaid) {
    speelStem('lena', 'briefkaart');
  }

  const hint = document.getElementById('briefkaart-hint');
  const btn = document.getElementById('btn-sluit-dossier') as HTMLButtonElement | null;

  if (omgedraaid) {
    if (hint) hint.textContent = 'Klik opnieuw om de voorkant te zien';
    setTimeout(() => {
      if (btn) btn.style.display = 'inline-block';
    }, 750);
  } else {
    if (hint) hint.textContent = 'Klik op de briefkaart om ze om te draaien';
  }
});

// ── Verloop na het rapport ────────────────────────────────
// Klopt het rapport: mail van An → briefkaart → epiloog → slot.
// Twee keer fout: politie → slot (geen briefkaart, Lena is die avond al terug).
document.getElementById('btn-mail-verder')?.addEventListener('click', () => {
  toonScherm('scherm-briefkaart');
});

document.getElementById('btn-sluit-dossier')?.addEventListener('click', () => {
  toonScherm('scherm-epiloog');
});

document.getElementById('btn-epiloog-verder')?.addEventListener('click', () => {
  toonScherm('scherm-slot');
});

document.getElementById('btn-politie-verder')?.addEventListener('click', () => {
  toonScherm('scherm-slot');
});

let politieGetoond = false;
function toonPolitie(): void {
  if (politieGetoond) return;
  politieGetoond = true;
  toonScherm('scherm-politie');
  // Er komt geen rapport meer: de sessie sluiten zodat ze niet actief blijft.
  sluitSessie(sessie).catch((err: unknown) => console.error('Sessie sluiten mislukt:', err));
}

document.getElementById('btn-terug-lobby')?.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

// ── Eindstatistieken ──────────────────────────────────────
// Onderzoekstijd en marge worden berekend uit timerGestart en
// rapport.tijdstip (beide serverTimestamps in Firebase).
let statsGeladen = false;
let deelDuur: string | null = null; // gezet zodra de stats geladen zijn

async function vulStats(): Promise<void> {
  if (statsGeladen) return;
  statsGeladen = true;

  try {
    const { timerGestart, rapportTijdstip } = await haalTijden(sessie);
    if (!timerGestart || !rapportTijdstip) return; // geen data, blok blijft verborgen

    const duurMs = Math.max(0, rapportTijdstip - timerGestart);
    const margeMs = Math.max(0, TIJDSLIMIET_MS - duurMs);
    deelDuur = formateerTijd(duurMs);

    const duurEl = document.getElementById('stat-onderzoekstijd');
    const margeEl = document.getElementById('stat-resttijd');
    if (duurEl) duurEl.textContent = formateerTijd(duurMs);
    if (margeEl) margeEl.textContent = formateerTijd(margeMs);

    const blok = document.getElementById('slot-stats');
    if (blok) blok.style.display = 'flex';

    // "Sneller dan X% van de groepen", als er genoeg afgeronde sessies zijn.
    const tekst = prestatieTekst(percentielSneller(duurMs, await haalDuren('kamer-14')));
    const prestatie = document.getElementById('slot-prestatie');
    if (tekst && prestatie) {
      prestatie.textContent = tekst;
      prestatie.hidden = false;
    }
  } catch (err) {
    console.error('Eindstatistieken laden mislukt:', err);
  }
}

// ── Review achterlaten (gedeeld formulier) ────────────────
koppelReviewFormulier('kamer-14', sessie);

// ── Resultaat delen ───────────────────────────────────────
koppelDeelKnop('btn-deel-resultaat', () =>
  deelDuur
    ? `Wij losten Kamer 14 op in ${deelDuur} 🕵️ Gratis online escape room over de Geelse gezinsverpleging: https://bureau-x.be/kamer-14/`
    : 'Wij losten Kamer 14 op 🕵️ Gratis online escape room over de Geelse gezinsverpleging: https://bureau-x.be/kamer-14/',
);

// ── Firebase: luisteren naar rapport-status ───────────────
let mailGetoond = false;
luisterNaarRapport(sessie, rapport => {
  if (rapport?.ingediend && !mailGetoond && !politieGetoond) {
    mailGetoond = true;
    toonScherm('scherm-mail-an');
    vulStats();
  }
});

// Eerder twee keer fout ingediend op dit toestel (bv. na herladen): politie.
if (leesFoutePogingen(sessie) >= MAX_FOUTE_POGINGEN) toonPolitie();
