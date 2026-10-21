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
import { speelStem, hervatAudio } from './audio.ts';
import { haalDuren, percentielSneller, prestatieTekst } from '../../../shared/js/verdeling.ts';
import {
  bewaarFoutePogingen,
  leesFoutePogingen,
  MAX_FOUTE_POGINGEN,
  volgendeStap,
} from './einde-verloop.ts';
import { EINDES, isKeuze, type EindeId } from './eindes.ts';
import { meetSpel } from '../../../shared/js/meet.ts';

// ── Sessie ophalen (redirect + stop als die ontbreekt) ────
const sessie = sessieUitUrl();

const rapportSessieLabel = document.getElementById('rapport-sessie-label');
if (rapportSessieLabel) rapportSessieLabel.textContent = sessie;

const statPuzzels = document.getElementById('stat-puzzels');
if (statPuzzels) statPuzzels.textContent = '7/7';

// ── Scherm-overgangen ─────────────────────────────────────
function toonScherm(id: string): void {
  document.querySelectorAll('.einde-scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

// ── Validatie ─────────────────────────────────────────────
// Antwoorden staan als SHA-256 hash in de bundle, niet als plain-text.
// Het veld "tijdstip" bewaart wanneer Lena terugkomt (regel "terug").
const VELD_REGEL: Record<string, string> = {
  bestemming: 'bestemming',
  wie: 'wie',
  vervoer: 'vervoer',
  tijdstip: 'terug',
};
const VELDEN = Object.keys(VELD_REGEL);

function veldKlopt(veld: string, waarde: string): Promise<boolean> {
  const regel = VELD_REGEL[veld] ?? '';
  return beoordeelAntwoord(
    waarde,
    KAMER14_ANTWOORD_HASHES[regel] ?? [],
    KAMER14_ANTWOORD_REGELS[regel],
  ).then(oordeel => oordeel === 'juist');
}

const waarde = (veld: string) =>
  (document.getElementById(`r-${veld}`) as HTMLInputElement | null)?.value.trim() ?? '';

function markeer(veld: string, fout: boolean): void {
  document.getElementById(`r-${veld}`)?.classList.toggle('fout', fout);
  document.getElementById(`fout-${veld}`)?.classList.toggle('zichtbaar', fout);
}

function gekozen(): string | null {
  return document.querySelector<HTMLInputElement>('input[name="keuze"]:checked')?.value ?? null;
}

// ── Rapport indienen ──────────────────────────────────────
async function diendIn(): Promise<void> {
  const validatieBericht = document.getElementById('rapport-validatie-bericht');
  const waarschuwing = document.getElementById('an-waarschuwing');
  validatieBericht?.classList.remove('zichtbaar');

  // Zonder keuze sturen we niets: dat telt niet als foute poging.
  const keuze = gekozen();
  markeer('keuze', !keuze);
  if (!keuze) return;

  let geldig = true;
  for (const veld of VELDEN) {
    const ok = await veldKlopt(veld, waarde(veld));
    markeer(veld, !ok);
    if (!ok) geldig = false;
  }

  const fouteVoorDeze = leesFoutePogingen(sessie);
  const stap = volgendeStap(fouteVoorDeze, geldig);
  if (stap === 'waarschuwing') {
    bewaarFoutePogingen(sessie, fouteVoorDeze + 1);
    waarschuwing?.classList.add('zichtbaar');
    validatieBericht?.classList.add('zichtbaar');
    waarschuwing?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (stap === 'politie') {
    bewaarFoutePogingen(sessie, fouteVoorDeze + 1);
    toonVermist();
    return;
  }
  waarschuwing?.classList.remove('zichtbaar');

  const btn = document.getElementById('btn-indienen') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'An leest het rapport…';

  const inhoud: RapportInhoud = {
    bestemming: waarde('bestemming'),
    wie: waarde('wie'),
    vervoer: waarde('vervoer'),
    tijdstip: waarde('tijdstip'),
    conclusie: keuze,
  };

  try {
    await diendRapportIn(sessie, inhoud);
    await sluitSessie(sessie); // sessie deactiveren zodat ze niet eeuwig actief blijft
    // luisterNaarRapport vangt de statuswijziging op en toont het einde
  } catch (err) {
    console.error('Firebase fout bij indienen rapport:', err);
    btn.disabled = false;
    btn.textContent = 'Geef het rapport aan An';
    if (validatieBericht) {
      validatieBericht.textContent = 'Verbindingsfout. Probeer opnieuw.';
      validatieBericht.classList.add('zichtbaar');
    }
  }
}

document.getElementById('btn-indienen')?.addEventListener('click', () => void diendIn());
VELDEN.forEach(veld => {
  document.getElementById(`r-${veld}`)?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') void diendIn();
  });
});

// ── Het einde ─────────────────────────────────────────────
let eindeGetoond: EindeId | null = null;
let eindeAudio: HTMLAudioElement | null = null;

function speelEinde(id: EindeId): void {
  hervatAudio();
  eindeAudio?.pause();
  const delen = EINDES[id].audio;
  const speel = (i: number) => {
    const deel = delen[i];
    if (!deel) return;
    eindeAudio = speelStem(deel.karakter, deel.bestand);
    eindeAudio.addEventListener('ended', () => speel(i + 1), { once: true });
  };
  speel(0);
}

function toonEinde(id: EindeId): void {
  if (eindeGetoond) return;
  eindeGetoond = id;
  const einde = EINDES[id];
  const titel = document.getElementById('einde-titel');
  const tijd = document.getElementById('einde-tijd');
  const tekst = document.getElementById('einde-tekst');
  if (titel) titel.textContent = einde.titel;
  if (tijd) tijd.textContent = einde.tijd;
  if (tekst) {
    tekst.replaceChildren(
      ...einde.alineas.map(a => {
        const p = document.createElement('p');
        p.textContent = a;
        return p;
      }),
    );
  }
  document.getElementById('scherm-einde')?.setAttribute('data-einde', id);
  toonScherm('scherm-einde');
  // Wie net indiende, klikte al: dan mag het geluid meteen spelen.
  speelEinde(id);
}

document.getElementById('btn-einde-luister')?.addEventListener('click', () => {
  if (eindeGetoond) speelEinde(eindeGetoond);
});
document.getElementById('btn-einde-verder')?.addEventListener('click', () => {
  eindeAudio?.pause();
  toonScherm('scherm-slot');
});

function toonVermist(): void {
  if (eindeGetoond) return;
  toonEinde('vermist');
  meetSpel('game_fail', sessie, { reden: 'politie' });
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
luisterNaarRapport(sessie, rapport => {
  if (!rapport?.ingediend || eindeGetoond) return;
  const keuze = rapport.inhoud?.conclusie;
  toonEinde(isKeuze(keuze) ? keuze : 'morgen');
  meetSpel('game_complete', sessie, { keuze: isKeuze(keuze) ? keuze : 'onbekend' });
  void vulStats();
});

// Eerder twee keer fout ingediend op dit toestel (bv. na herladen): vermist.
if (leesFoutePogingen(sessie) >= MAX_FOUTE_POGINGEN) toonVermist();
