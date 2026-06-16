/**
 * lobby.ts (D.U.A.) — sessiecode valideren en één van de vier rollen claimen.
 * Zelfde patroon als kamer-14: claims gebeuren atomisch via Firebase-transacties.
 */
import '../../../shared/js/sentry.ts';
import { valideerSessie, claimRol, luisterNaarRollen } from '../../../shared/js/session.ts';
import { activeerScherm, bewaakRolScherm, koppelCodeInvoer } from '../../../shared/js/lobby-ui.ts';
import { initDua } from './dua-session.ts';

type Rol = 'schrijver' | 'loper' | 'archivaris' | 'restaurateur';

const ROL_PAGINA: Record<Rol, string> = {
  schrijver: 'speler-1934.html',
  loper: 'speler-1934.html',
  archivaris: 'speler-2034.html',
  restaurateur: 'speler-2034.html',
};

const ROLLEN: Rol[] = ['schrijver', 'loper', 'archivaris', 'restaurateur'];

let rollenUnsubscribe: (() => void) | null = null;

// ── Sessiecode uit URL ──
const _urlSessie = new URLSearchParams(window.location.search).get('sessie')?.toUpperCase() ?? null;
if (_urlSessie) sessionStorage.setItem('sessieCode', _urlSessie);

// ── Schermen ──
function toonScherm(id: string): void {
  activeerScherm(id);
  if (id === 'scherm-rol') {
    history.pushState({ scherm: 'rol' }, '');
    startRolListener();
  } else {
    stopRolListener();
  }
}

bewaakRolScherm();

// ── Live rolstatus ──
function startRolListener(): void {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) return;
  stopRolListener();
  rollenUnsubscribe = luisterNaarRollen(code, (spelers) => {
    ROLLEN.forEach((rol) => setRolStatus(rol, spelers[rol] === 'bezet'));
  });
}

function stopRolListener(): void {
  rollenUnsubscribe?.();
  rollenUnsubscribe = null;
}

function setRolStatus(rol: Rol, bezet: boolean): void {
  const kaart = document.getElementById(`rol-kaart-${rol}`);
  if (!kaart) return;
  const label = kaart.querySelector<HTMLElement>('.rol-bezet-label');

  kaart.classList.toggle('rol-bezet', bezet);
  if (bezet) {
    kaart.onclick = null;
    label?.classList.remove('verborgen');
  } else {
    kaart.onclick = () => kiesRol(rol);
    label?.classList.add('verborgen');
  }
}

// ── Sessiecode valideren ──
async function valideerCode(): Promise<void> {
  const input = document.getElementById('sessieCodeInput') as HTMLInputElement;
  const fout = document.querySelector<HTMLElement>('#scherm-code .code-fout');
  const knop = document.querySelector<HTMLButtonElement>('#scherm-code .btn-game');
  const code = input.value.trim().toUpperCase();

  if (code.length < 3) {
    input.classList.add('invoer-fout');
    if (fout) {
      fout.textContent = 'Voer een geldige sessiecode in.';
      fout.classList.remove('verborgen');
    }
    return;
  }

  if (knop) {
    knop.disabled = true;
    knop.textContent = 'Controleren…';
  }

  try {
    const geldig = await valideerSessie(code);
    if (!geldig) {
      input.classList.add('invoer-fout');
      if (fout) {
        fout.textContent = 'Ongeldige of inactieve code. Controleer je e-mail.';
        fout.classList.remove('verborgen');
      }
      return;
    }
    sessionStorage.setItem('sessieCode', code);
    await initDua(code); // dua-node klaarzetten (idempotent)
    input.classList.remove('invoer-fout');
    fout?.classList.add('verborgen');
    toonScherm('scherm-rol');
  } catch (err) {
    console.error('Firebase fout:', err);
    if (fout) {
      fout.textContent = 'Verbindingsfout. Controleer je internetverbinding.';
      fout.classList.remove('verborgen');
    }
  } finally {
    if (knop) {
      knop.disabled = false;
      knop.textContent = 'Verder';
    }
  }
}

// ── Rol claimen ──
async function kiesRol(rol: Rol): Promise<void> {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) {
    toonScherm('scherm-code');
    return;
  }

  const kaart = document.getElementById(`rol-kaart-${rol}`);
  const rolFout = document.getElementById('rol-fout');
  kaart?.classList.add('rol-laden');
  rolFout?.classList.add('verborgen');

  try {
    const succes = await claimRol(code, rol);
    if (succes) {
      window.location.href = `${ROL_PAGINA[rol]}?sessie=${encodeURIComponent(code)}&rol=${rol}`;
    } else if (rolFout) {
      rolFout.textContent = 'Deze rol is al bezet. Kies een andere.';
      rolFout.classList.remove('verborgen');
    }
  } catch (err) {
    console.error('Fout bij claimen van rol:', err);
    if (rolFout) {
      rolFout.textContent = 'Verbindingsfout. Probeer opnieuw.';
      rolFout.classList.remove('verborgen');
    }
  } finally {
    kaart?.classList.remove('rol-laden');
  }
}

// ── Globals voor onclick in HTML ──
declare global {
  interface Window {
    valideerCode: typeof valideerCode;
  }
}
window.valideerCode = valideerCode;

koppelCodeInvoer(valideerCode);

// ── Begin-knop ──
document.getElementById('btn-begin')?.addEventListener('click', async () => {
  if (_urlSessie && (await valideerSessie(_urlSessie))) {
    await initDua(_urlSessie);
    toonScherm('scherm-rol');
    return;
  }
  toonScherm('scherm-code');
});
