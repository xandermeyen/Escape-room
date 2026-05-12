import { valideerSessie, claimRol, luisterNaarRollen } from '../../../shared/js/session.js';

let rollenUnsubscribe = null;

// ── Scherm wisselen ──────────────────────────────────────────────────────────
function toonScherm(id) {
  document.querySelectorAll('.scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Start of stop de live rol-listener afhankelijk van het actieve scherm
  if (id === 'scherm-rol') {
    // Duw een history-entry zodat de browserterugknop niet van de pagina navigeert
    history.pushState({ scherm: 'rol' }, '');
    startRolListener();
  } else {
    stopRolListener();
  }
}
window.toonScherm = toonScherm;

// Onderschep de browserterugknop / muisknop terug
window.addEventListener('popstate', () => {
  const actief = document.querySelector('.scherm.actief');
  if (actief && actief.id === 'scherm-rol') {
    // Duw opnieuw zodat de speler op het rolscherm blijft
    history.pushState({ scherm: 'rol' }, '');
  }
});

// ── Rol-listener ─────────────────────────────────────────────────────────────
function startRolListener() {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) return;
  stopRolListener();
  rollenUnsubscribe = luisterNaarRollen(code, (spelers) => {
    setRolStatus('rol-kaart-a', 'a', spelers.a === 'bezet');
    setRolStatus('rol-kaart-b', 'b', spelers.b === 'bezet');
  });
}

function stopRolListener() {
  if (rollenUnsubscribe) {
    rollenUnsubscribe();
    rollenUnsubscribe = null;
  }
}

function setRolStatus(kaartId, rol, bezet) {
  const kaart      = document.getElementById(kaartId);
  if (!kaart) return;
  const bezetLabel = kaart.querySelector('.rol-bezet-label');
  const kiesKnop   = kaart.querySelector('.rol-knop');

  if (bezet) {
    kaart.classList.add('rol-bezet');
    kaart.onclick = null;
    if (bezetLabel) bezetLabel.classList.remove('verborgen');
    if (kiesKnop)   kiesKnop.classList.add('verborgen');
  } else {
    kaart.classList.remove('rol-bezet');
    kaart.onclick = () => kiesRol(rol);
    if (bezetLabel) bezetLabel.classList.add('verborgen');
    if (kiesKnop)   kiesKnop.classList.remove('verborgen');
  }
}

// ── Sessiecode valideren ──────────────────────────────────────────────────────
async function valideerCode() {
  const input = document.getElementById('sessieCodeInput');
  const fout  = document.querySelector('#scherm-code .code-fout');
  const knop  = document.querySelector('#scherm-code .btn-game');
  const code  = input.value.trim().toUpperCase();

  if (code.length < 3) {
    input.classList.add('invoer-fout');
    fout.textContent = 'Voer een geldige sessiecode in.';
    fout.classList.remove('verborgen');
    return;
  }

  knop.disabled = true;
  knop.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Controleren…';

  try {
    const geldig = await valideerSessie(code);

    if (!geldig) {
      input.classList.add('invoer-fout');
      fout.textContent = 'Ongeldige of inactieve code. Controleer je e-mail.';
      fout.classList.remove('verborgen');
      return;
    }

    sessionStorage.setItem('sessieCode', code);
    input.classList.remove('invoer-fout');
    fout.classList.add('verborgen');
    toonScherm('scherm-rol');

  } catch (err) {
    console.error('Firebase fout:', err);
    fout.textContent = 'Verbindingsfout. Controleer je internetverbinding.';
    fout.classList.remove('verborgen');
  } finally {
    knop.disabled = false;
    knop.innerHTML = '<i class="bi bi-arrow-right me-2"></i>Verder';
  }
}
window.valideerCode = valideerCode;

document.getElementById('sessieCodeInput').addEventListener('input', () => {
  document.getElementById('sessieCodeInput').classList.remove('invoer-fout');
  document.querySelector('#scherm-code .code-fout').classList.add('verborgen');
});

document.getElementById('sessieCodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') valideerCode();
});

// ── Rol kiezen ───────────────────────────────────────────────────────────────
async function kiesRol(rol) {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) { toonScherm('scherm-code'); return; }

  const kaartId = rol === 'a' ? 'rol-kaart-a' : 'rol-kaart-b';
  const kaart   = document.getElementById(kaartId);
  const rolFout = document.getElementById('rol-fout');

  if (kaart) kaart.classList.add('rol-laden');
  if (rolFout) rolFout.classList.add('verborgen');

  try {
    const succes = await claimRol(code, rol);

    if (succes) {
      window.location.href = rol === 'a'
        ? `speler-a.html?sessie=${code}`
        : `speler-b.html?sessie=${code}`;
    } else {
      if (rolFout) {
        rolFout.textContent = 'Deze rol is al bezet. Kies de andere rol.';
        rolFout.classList.remove('verborgen');
      }
    }
  } catch (err) {
    console.error('Fout bij claimen van rol:', err);
    if (rolFout) {
      rolFout.textContent = 'Verbindingsfout. Probeer opnieuw.';
      rolFout.classList.remove('verborgen');
    }
  } finally {
    if (kaart) kaart.classList.remove('rol-laden');
  }
}
window.kiesRol = kiesRol;
