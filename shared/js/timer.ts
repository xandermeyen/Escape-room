/**
 * timer.ts — Shared timer module
 * 60 minuten aftellen. Verborgen tenzij opgevraagd.
 * Waarschuwingsteksten zijn per experience instelbaar (opties.waarschuwingen).
 * Bij tijdoverschrijding → tijd-voorbij.html (relatief aan de pagina).
 *
 * De resterende tijd wordt berekend met de servertijd (via
 * `.info/serverTimeOffset`), zodat een scheve apparaatklok het spel niet
 * korter of langer maakt.
 */

import { db } from './firebase-config.ts';
import {
  ref,
  get,
  set,
  onValue,
  serverTimestamp,
} from "firebase/database";
import { authReady } from './auth.ts';
import { schrijf } from './verbinding.ts';

// Gedeelde tijdslimiet voor het hele spel — ook gebruikt door de eindschermen.
export const TIJDSLIMIET_MS = 60 * 60 * 1000; // 60 minuten

export interface TimerWaarschuwing {
  minuten: number;   // toon zodra er ≤ dit aantal minuten rest
  titel: string;
  tekst: string;
  urgent: boolean;
}

export interface TimerOpties {
  waarschuwingen?: TimerWaarschuwing[];
  /** Aangeroepen vlak vóór de redirect naar tijd-voorbij.html
   *  (bv. om de navigatie-guard uit te schakelen). */
  voorRedirect?: () => void;
}

const STANDAARD_WAARSCHUWINGEN: TimerWaarschuwing[] = [
  {
    minuten: 30,
    titel: 'Melding — halftime',
    tekst: 'De helft van de tijd is voorbij. U heeft nog 30 minuten.',
    urgent: false,
  },
  {
    minuten: 10,
    titel: '⚠ Dringend — nog 10 minuten',
    tekst: 'Nog 10 minuten. Rond het onderzoek af.',
    urgent: true,
  },
];

let timerInterval: ReturnType<typeof setInterval> | null = null;
let huidigeCode: string | null = null;
let huidigeOpties: TimerOpties = {};
const waarschuwingGetoond = new Set<number>();

// ─────────────────────────────────────────────
// Servertijd
// ─────────────────────────────────────────────

let serverOffsetMs = 0;
let offsetGekoppeld = false;

/** Houdt het verschil tussen apparaatklok en servertijd bij. */
export function koppelServerTijd(): void {
  if (offsetGekoppeld) return;
  offsetGekoppeld = true;
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    serverOffsetMs = typeof snap.val() === 'number' ? snap.val() : 0;
  });
}

/** Huidige tijd volgens de server (valt terug op de apparaatklok). */
export function serverNu(): number {
  return Date.now() + serverOffsetMs;
}

// ─────────────────────────────────────────────
// Publieke API
// ─────────────────────────────────────────────

/**
 * Zorgt dat sessions/{code}/timerGestart bestaat (idempotent) en geeft de
 * starttijd terug. Wacht op de anonieme login en maakt een geweigerde
 * schrijfactie zichtbaar via verbinding.ts, in plaats van stil te falen.
 */
export async function zorgStartTijd(sessieCode: string): Promise<number | null> {
  await authReady;
  koppelServerTijd();

  const timerRef = ref(db, `sessions/${sessieCode}/timerGestart`);
  const snapshot = await get(timerRef);
  if (!snapshot.exists() || snapshot.val() === null) {
    // schrijf() toont de balk + meldt aan Sentry; we slikken het opnieuw
    // gooien zodat de pagina verder laadt.
    await schrijf('timerGestart', set(timerRef, serverTimestamp())).catch(() => {});
  }

  // Lees de (eventueel net aangemaakte) starttijd
  const startSnapshot = await get(timerRef);
  const startTijd: number | null = startSnapshot.val();
  return typeof startTijd === 'number' ? startTijd : null;
}

/**
 * Roep aan bij het laden van de spelerpagina's.
 * Zet de starttijd in Firebase (enkel als die er nog niet is)
 * en start de lokale aftelling.
 */
export async function initialiseerTimer(sessieCode: string, opties: TimerOpties = {}): Promise<void> {
  huidigeCode = sessieCode;
  huidigeOpties = opties;
  waarschuwingGetoond.clear();

  const startTijd = await zorgStartTijd(sessieCode);
  if (!startTijd) return; // schrijven mislukt; de verbindingsbalk is al zichtbaar

  // Bouw de klokknop + popup in de pagina
  bouwTimerUI();

  // Eerste tick meteen, daarna elke seconde
  tick(startTijd);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => tick(startTijd), 1000);
}

// ─────────────────────────────────────────────
// Interne functies
// ─────────────────────────────────────────────

function tick(startTijd: number): void {
  const resterend = TIJDSLIMIET_MS - (serverNu() - startTijd);

  if (resterend <= 0) {
    if (timerInterval) clearInterval(timerInterval);
    navigeerNaarTijdVoorbij();
    return;
  }

  const minuten = Math.floor(resterend / 60000);

  const waarschuwingen = huidigeOpties.waarschuwingen ?? STANDAARD_WAARSCHUWINGEN;
  for (const w of waarschuwingen) {
    if (minuten <= w.minuten && !waarschuwingGetoond.has(w.minuten)) {
      waarschuwingGetoond.add(w.minuten);
      toonWaarschuwing(w);
    }
  }

  // Update tijdsweergave in popup als die open is
  const display = document.getElementById('timer-tijd-display');
  if (display) display.textContent = formateerTijd(resterend);
}

export function formateerTijd(ms: number): string {
  const totaalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totaalSec / 60);
  const sec = totaalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Timer UI — klokknop + popup
// ─────────────────────────────────────────────

function bouwTimerUI(): void {
  // Klokknop (rechtsonder, altijd zichtbaar)
  const knop = document.createElement('button');
  knop.id = 'timer-klok-knop';
  knop.className = 'timer-klok-knop';
  knop.setAttribute('title', 'Bekijk resterende onderzoekstijd');
  knop.setAttribute('aria-label', 'Resterende onderzoekstijd');
  knop.innerHTML = '<i class="bi bi-clock"></i>';
  knop.addEventListener('click', toggleTimerPopup);

  // Popup
  const popup = document.createElement('div');
  popup.id = 'timer-popup';
  popup.className = 'timer-popup verborgen';

  const kop = document.createElement('div');
  kop.className = 'timer-popup-kop';

  const label = document.createElement('span');
  label.className = 'timer-popup-label';
  label.textContent = 'Onderzoekstijd';

  const sluitKnop = document.createElement('button');
  sluitKnop.className = 'timer-popup-sluit';
  sluitKnop.setAttribute('aria-label', 'Sluit');
  sluitKnop.innerHTML = '<i class="bi bi-x"></i>';
  sluitKnop.addEventListener('click', () => popup.classList.add('verborgen'));

  kop.appendChild(label);
  kop.appendChild(sluitKnop);

  const display = document.createElement('div');
  display.id = 'timer-tijd-display';
  display.className = 'timer-tijd-display';
  display.textContent = '--:--';

  const sub = document.createElement('p');
  sub.className = 'timer-popup-sub';
  sub.innerHTML = 'Het intern dossier sluit na 60&nbsp;minuten.';

  popup.appendChild(kop);
  popup.appendChild(display);
  popup.appendChild(sub);

  document.body.appendChild(knop);
  document.body.appendChild(popup);
}

function toggleTimerPopup(): void {
  document.getElementById('timer-popup')?.classList.toggle('verborgen');
}

// ─────────────────────────────────────────────
// Waarschuwingsbalken
// ─────────────────────────────────────────────

function toonWaarschuwing(w: TimerWaarschuwing): void {
  // Verwijder eventuele vorige melding
  document.getElementById('timer-waarschuwing')?.remove();

  const balk = document.createElement('div');
  balk.id = 'timer-waarschuwing';
  balk.className = `timer-waarschuwing${w.urgent ? ' timer-waarschuwing-urgent' : ''}`;

  const inhoud = document.createElement('div');
  inhoud.className = 'timer-waarschuwing-inhoud';

  const titelEl = document.createElement('div');
  titelEl.className = 'timer-waarschuwing-titel';
  titelEl.textContent = w.titel;

  const tekstEl = document.createElement('div');
  tekstEl.className = 'timer-waarschuwing-tekst';
  tekstEl.textContent = w.tekst;

  inhoud.appendChild(titelEl);
  inhoud.appendChild(tekstEl);

  const sluitKnop = document.createElement('button');
  sluitKnop.className = 'timer-waarschuwing-sluit';
  sluitKnop.setAttribute('aria-label', 'Sluit melding');
  sluitKnop.innerHTML = '<i class="bi bi-x"></i>';
  sluitKnop.addEventListener('click', () => balk.remove());

  balk.appendChild(inhoud);
  balk.appendChild(sluitKnop);

  document.body.appendChild(balk);

  // Auto-verdwijnen
  const vertraging = w.urgent ? 25_000 : 20_000;
  setTimeout(() => {
    if (balk.isConnected) {
      balk.classList.add('timer-waarschuwing-verdwijnen');
      setTimeout(() => balk.remove(), 500);
    }
  }, vertraging);
}

// ─────────────────────────────────────────────
// Tijdoverschrijding
// ─────────────────────────────────────────────

function navigeerNaarTijdVoorbij(): void {
  huidigeOpties.voorRedirect?.();
  const code = huidigeCode ? encodeURIComponent(huidigeCode) : '';
  window.location.href = `tijd-voorbij.html?sessie=${code}`;
}
