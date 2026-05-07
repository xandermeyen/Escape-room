/**
 * timer.js — Kamer 14
 * 60 minuten aftellen. Verborgen tenzij opgevraagd.
 * Waarschuwingen op 30 en 10 minuten.
 * Bij tijdoverschrijding → tijd-voorbij.html
 */

import { db } from './firebase-config.js';
import {
  ref,
  get,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const TIJDSLIMIET_MS = 60 * 60 * 1000; // 60 minuten

let timerInterval       = null;
let huidigeCode         = null;
let waarschuwing30Klaar = false;
let waarschuwing10Klaar = false;

// ─────────────────────────────────────────────
// Publieke API
// ─────────────────────────────────────────────

/**
 * Roep aan bij het laden van speler-a.html / speler-b.html.
 * Zet de starttijd in Firebase (enkel als die er nog niet is)
 * en start de lokale aftelling.
 */
export async function initialiseerTimer(sessieCode) {
  huidigeCode = sessieCode;

  const timerRef = ref(db, `sessions/${sessieCode}/timerGestart`);

  // Zet starttijd enkel als die nog niet bestaat
  const snapshot = await get(timerRef);
  if (!snapshot.exists() || snapshot.val() === null) {
    await set(timerRef, serverTimestamp());
  }

  // Lees de (eventueel net aangemaakte) starttijd
  const startSnapshot = await get(timerRef);
  const startTijd = startSnapshot.val();
  if (!startTijd) return; // Zou niet mogen, maar veiligheidshalve

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

function tick(startTijd) {
  const resterend = TIJDSLIMIET_MS - (Date.now() - startTijd);

  if (resterend <= 0) {
    clearInterval(timerInterval);
    navigeerNaarTijdVoorbij();
    return;
  }

  const minuten = Math.floor(resterend / 60000);

  // 30-minuten melding
  if (minuten <= 30 && !waarschuwing30Klaar) {
    waarschuwing30Klaar = true;
    toonWaarschuwing(30);
  }

  // 10-minuten melding
  if (minuten <= 10 && !waarschuwing10Klaar) {
    waarschuwing10Klaar = true;
    toonWaarschuwing(10);
  }

  // Update tijdsweergave in popup als die open is
  const display = document.getElementById('timer-tijd-display');
  if (display) display.textContent = formateerTijd(resterend);
}

function formateerTijd(ms) {
  const totaalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totaalSec / 60);
  const sec = totaalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Timer UI — klokknop + popup
// ─────────────────────────────────────────────

function bouwTimerUI() {
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
  popup.innerHTML = `
    <div class="timer-popup-kop">
      <span class="timer-popup-label">Onderzoekstijd</span>
      <button
        class="timer-popup-sluit"
        onclick="document.getElementById('timer-popup').classList.add('verborgen')"
        aria-label="Sluit"
      ><i class="bi bi-x"></i></button>
    </div>
    <div id="timer-tijd-display" class="timer-tijd-display">--:--</div>
    <p class="timer-popup-sub">Het intern dossier sluit na 60&nbsp;minuten.</p>
  `;

  document.body.appendChild(knop);
  document.body.appendChild(popup);
}

function toggleTimerPopup() {
  document.getElementById('timer-popup')?.classList.toggle('verborgen');
}

// ─────────────────────────────────────────────
// Waarschuwingsbalken
// ─────────────────────────────────────────────

function toonWaarschuwing(minuten) {
  // Verwijder eventuele vorige melding
  document.getElementById('timer-waarschuwing')?.remove();

  const isUrgent = minuten <= 10;

  const titel = isUrgent
    ? '⚠ Dringend — nog 10 minuten'
    : 'Melding — halftime';

  const tekst = isUrgent
    ? 'Het intern dossier van Lena Bogaert wordt automatisch gesloten als er geen rapport is ingediend.'
    : 'Het kantoor van An Vermeersch sluit om 17u00. U heeft nog 30 minuten om uw rapport in te dienen.';

  const balk = document.createElement('div');
  balk.id = 'timer-waarschuwing';
  balk.className = `timer-waarschuwing${isUrgent ? ' timer-waarschuwing-urgent' : ''}`;
  balk.innerHTML = `
    <div class="timer-waarschuwing-inhoud">
      <div class="timer-waarschuwing-titel">${titel}</div>
      <div class="timer-waarschuwing-tekst">${tekst}</div>
    </div>
    <button
      class="timer-waarschuwing-sluit"
      onclick="this.closest('#timer-waarschuwing').remove()"
      aria-label="Sluit melding"
    ><i class="bi bi-x"></i></button>
  `;

  document.body.appendChild(balk);

  // Auto-verdwijnen
  const vertraging = isUrgent ? 25_000 : 20_000;
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

function navigeerNaarTijdVoorbij() {
  const code = huidigeCode ? encodeURIComponent(huidigeCode) : '';
  window.location.href = `tijd-voorbij.html?sessie=${code}`;
}
