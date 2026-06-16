import '../../../shared/js/sentry.ts';
import { valideerSessie, claimRol, luisterNaarRollen } from '../../../shared/js/session.ts';
import { activeerScherm, bewaakRolScherm, koppelCodeInvoer } from '../../../shared/js/lobby-ui.ts';

let rollenUnsubscribe: (() => void) | null = null;

// ── Sessiecode uit URL inlezen ────────────────────────────────────────────────
// Als de link ?sessie=CODE bevat, sla de code op zodat spelers hem niet
// handmatig hoeven in te voeren. De code wordt gevalideerd bij "Begin".
const _urlParams = new URLSearchParams(window.location.search);
const _urlSessie = _urlParams.get('sessie')?.toUpperCase() ?? null;
if (_urlSessie) {
  sessionStorage.setItem('sessieCode', _urlSessie);
}

// ── Scherm wisselen ──────────────────────────────────────────────────────────
function toonScherm(id: string): void {
  activeerScherm(id);
  // Start of stop de live rol-listener afhankelijk van het actieve scherm
  if (id === 'scherm-rol') {
    // Duw een history-entry zodat de browserterugknop niet van de pagina navigeert
    history.pushState({ scherm: 'rol' }, '');
    startRolListener();
  } else {
    stopRolListener();
  }
}

declare global {
  interface Window {
    toonScherm: typeof toonScherm;
    valideerCode: typeof valideerCode;
    kiesRol: typeof kiesRol;
  }
}

window.toonScherm = toonScherm;

// Onderschep de browserterugknop / muisknop terug
bewaakRolScherm();

// ── Rol-listener ─────────────────────────────────────────────────────────────
function startRolListener(): void {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) return;
  stopRolListener();
  rollenUnsubscribe = luisterNaarRollen(code, (spelers) => {
    setRolStatus('rol-kaart-a', 'a', spelers['a'] === 'bezet');
    setRolStatus('rol-kaart-b', 'b', spelers['b'] === 'bezet');
  });
}

function stopRolListener(): void {
  if (rollenUnsubscribe) {
    rollenUnsubscribe();
    rollenUnsubscribe = null;
  }
}

function setRolStatus(kaartId: string, rol: string, bezet: boolean): void {
  const kaart = document.getElementById(kaartId);
  if (!kaart) return;
  const bezetLabel = kaart.querySelector<HTMLElement>('.rol-bezet-label');
  const kiesKnop = kaart.querySelector<HTMLElement>('.rol-knop');

  if (bezet) {
    kaart.classList.add('rol-bezet');
    kaart.onclick = null;
    if (bezetLabel) bezetLabel.classList.remove('verborgen');
    if (kiesKnop) kiesKnop.classList.add('verborgen');
  } else {
    kaart.classList.remove('rol-bezet');
    kaart.onclick = () => kiesRol(rol);
    if (bezetLabel) bezetLabel.classList.add('verborgen');
    if (kiesKnop) kiesKnop.classList.remove('verborgen');
  }
}

// ── Sessiecode valideren ──────────────────────────────────────────────────────
async function valideerCode(): Promise<void> {
  const input = document.getElementById('sessieCodeInput') as HTMLInputElement;
  const fout = document.querySelector<HTMLElement>('#scherm-code .code-fout');
  const knop = document.querySelector<HTMLButtonElement>('#scherm-code .btn-game');
  const code = input.value.trim().toUpperCase();

  if (code.length < 3) {
    input.classList.add('invoer-fout');
    if (fout) fout.textContent = 'Voer een geldige sessiecode in.';
    fout?.classList.remove('verborgen');
    return;
  }

  if (knop) {
    knop.disabled = true;
    knop.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Controleren…';
  }

  try {
    const geldig = await valideerSessie(code);

    if (!geldig) {
      input.classList.add('invoer-fout');
      if (fout) fout.textContent = 'Ongeldige of inactieve code. Controleer je e-mail.';
      fout?.classList.remove('verborgen');
      return;
    }

    sessionStorage.setItem('sessieCode', code);
    input.classList.remove('invoer-fout');
    fout?.classList.add('verborgen');
    toonScherm('scherm-rol');
  } catch (err) {
    console.error('Firebase fout:', err);
    if (fout) fout.textContent = 'Verbindingsfout. Controleer je internetverbinding.';
    fout?.classList.remove('verborgen');
  } finally {
    if (knop) {
      knop.disabled = false;
      knop.innerHTML = '<i class="bi bi-arrow-right me-2"></i>Verder';
    }
  }
}
window.valideerCode = valideerCode;

koppelCodeInvoer(valideerCode);

// ── Rol kiezen ───────────────────────────────────────────────────────────────
async function kiesRol(rol: string): Promise<void> {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) {
    toonScherm('scherm-code');
    return;
  }

  const kaartId = rol === 'a' ? 'rol-kaart-a' : 'rol-kaart-b';
  const kaart = document.getElementById(kaartId);
  const rolFout = document.getElementById('rol-fout');

  if (kaart) kaart.classList.add('rol-laden');
  if (rolFout) rolFout.classList.add('verborgen');

  try {
    const succes = await claimRol(code, rol);

    if (succes) {
      window.location.href = rol === 'a' ? `speler-a.html?sessie=${code}` : `speler-b.html?sessie=${code}`;
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

// ── Begin-knop: sla over naar rolkeuze als code al in URL zat ─────────────────
document.getElementById('btn-begin')?.addEventListener('click', async () => {
  if (_urlSessie) {
    const geldig = await valideerSessie(_urlSessie);
    if (geldig) {
      toonScherm('scherm-rol');
      return;
    }
  }
  toonScherm('scherm-code');
});
