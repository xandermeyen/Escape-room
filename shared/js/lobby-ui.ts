/**
 * lobby-ui.ts — gedeelde lobbyflow voor beide experiences.
 * De rolset, de doelpagina's en experience-specifieke stappen (bv. initDua)
 * komen binnen via `LobbyConfig`; de rest van de flow — code valideren,
 * rollen live tonen, claimen, terugkeer-banner — is identiek en leeft hier.
 */
import { valideerSessie, claimRol, luisterNaarRollen } from './session.ts';

/** Wisselt het actieve .scherm naar `id` en scrollt naar boven. */
export function activeerScherm(id: string): void {
  document.querySelectorAll('.scherm').forEach((s) => s.classList.remove('actief'));
  document.getElementById(id)?.classList.add('actief');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Houdt de speler op het rolscherm bij gebruik van de browserterugknop. */
export function bewaakRolScherm(): void {
  window.addEventListener('popstate', () => {
    if (document.querySelector('.scherm.actief')?.id === 'scherm-rol') {
      history.pushState({ scherm: 'rol' }, '');
    }
  });
}

/** Koppelt het sessiecode-invoerveld: fout wissen bij typen, Enter = valideren. */
export function koppelCodeInvoer(valideer: () => void): void {
  const input = document.getElementById('sessieCodeInput') as HTMLInputElement | null;
  if (!input) return;
  input.addEventListener('input', () => {
    input.classList.remove('invoer-fout');
    document.querySelector('#scherm-code .code-fout')?.classList.add('verborgen');
  });
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') valideer();
  });
}

// ─────────────────────────────────────────────
// Volledige lobbyflow
// ─────────────────────────────────────────────

export interface RolConfig {
  /** Doelpagina van de rol, bv. 'speler-a.html'. */
  pagina: string;
  /** Weergavenaam, bv. 'Speler A' of 'De Schrijver'. */
  naam: string;
}

export interface LobbyConfig {
  rollen: Record<string, RolConfig>;
  /** Voeg &rol= toe aan de spelerpagina-URL (D.U.A.). */
  metRolParam?: boolean;
  /** Extra stap na een geldige code, bv. initDua (idempotent). */
  naValidatie?: (code: string) => Promise<void>;
  /**
   * Extra check vóór het claimen. Geeft een foutmelding terug om de claim te
   * blokkeren, of null om door te laten. `spelers` is de live rolstatus.
   */
  magClaimen?: (rol: string, spelers: Record<string, string>) => string | null;
}

declare global {
  interface Window {
    valideerCode: () => void;
    toonScherm: (id: string) => void;
    kiesRol: (rol: string) => void;
  }
}

const ROL_OPSLAG_PREFIX = 'bureaux-rol-';

export function initLobby(config: LobbyConfig): void {
  const rolNamen = Object.keys(config.rollen);
  let rollenUnsubscribe: (() => void) | null = null;
  let laatsteSpelers: Record<string, string> = {};

  // ── Sessiecode uit URL ──
  const urlSessie = new URLSearchParams(window.location.search).get('sessie')?.toUpperCase() ?? null;
  if (urlSessie) sessionStorage.setItem('sessieCode', urlSessie);

  // ── Schermen ──
  function toonScherm(id: string): void {
    activeerScherm(id);
    if (id === 'scherm-rol') {
      history.pushState({ scherm: 'rol' }, '');
      startRolListener();
      toonHervatBanner();
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
      laatsteSpelers = spelers;
      rolNamen.forEach((rol) => setRolStatus(rol, spelers[rol] === 'bezet'));
    });
  }

  function stopRolListener(): void {
    rollenUnsubscribe?.();
    rollenUnsubscribe = null;
  }

  function setRolStatus(rol: string, bezet: boolean): void {
    const kaart = document.getElementById(`rol-kaart-${rol}`);
    if (!kaart) return;
    const label = kaart.querySelector<HTMLElement>('.rol-bezet-label');
    const kiesKnop = kaart.querySelector<HTMLElement>('.rol-knop');

    kaart.classList.toggle('rol-bezet', bezet);
    if (bezet) {
      kaart.onclick = null;
      label?.classList.remove('verborgen');
      kiesKnop?.classList.add('verborgen');
    } else {
      kaart.onclick = () => kiesRol(rol);
      label?.classList.add('verborgen');
      kiesKnop?.classList.remove('verborgen');
    }
  }

  // ── Terugkeer: eerder geclaimde rol hervatten ──
  // De rol blijft in Firebase op 'bezet' staan; wie zijn tab verloor kan zo
  // toch verder zonder vast te lopen op "rol al bezet".
  function toonHervatBanner(): void {
    const code = sessionStorage.getItem('sessieCode');
    if (!code) return;
    const eerderGekozen = localStorage.getItem(ROL_OPSLAG_PREFIX + code);
    const rolConfig = eerderGekozen ? config.rollen[eerderGekozen] : undefined;
    if (!eerderGekozen || !rolConfig) return;

    let banner = document.getElementById('rol-hervat');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'rol-hervat';
      banner.className = 'rol-hervat';

      const tekst = document.createElement('span');
      tekst.className = 'rol-hervat-tekst';
      tekst.textContent = `Je koos eerder de rol ${rolConfig.naam}.`;

      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'rol-hervat-knop';
      knop.textContent = 'Ga verder met deze rol →';
      knop.addEventListener('click', () => {
        naarSpelerPagina(eerderGekozen, code);
      });

      banner.appendChild(tekst);
      banner.appendChild(knop);
      const scherm = document.getElementById('scherm-rol');
      scherm?.firstElementChild?.prepend(banner);
    }
  }

  function naarSpelerPagina(rol: string, code: string): void {
    const rolConfig = config.rollen[rol];
    if (!rolConfig) return;
    const rolParam = config.metRolParam ? `&rol=${encodeURIComponent(rol)}` : '';
    window.location.href = `${rolConfig.pagina}?sessie=${encodeURIComponent(code)}${rolParam}`;
  }

  // ── Sessiecode valideren ──
  async function valideerCode(): Promise<void> {
    const input = document.getElementById('sessieCodeInput') as HTMLInputElement;
    const fout = document.querySelector<HTMLElement>('#scherm-code .code-fout');
    const knop = document.querySelector<HTMLButtonElement>('#scherm-code .btn-game');
    const knopTekst = knop?.innerHTML ?? '';
    const code = input.value.trim().toUpperCase();

    function toonFout(tekst: string): void {
      input.classList.add('invoer-fout');
      if (fout) {
        fout.textContent = tekst;
        fout.classList.remove('verborgen');
      }
    }

    if (code.length < 3) {
      toonFout('Voer een geldige sessiecode in.');
      return;
    }

    if (knop) {
      knop.disabled = true;
      knop.textContent = 'Controleren…';
    }

    try {
      const geldig = await valideerSessie(code);
      if (!geldig) {
        toonFout('Ongeldige of inactieve code. Controleer je e-mail.');
        return;
      }
      sessionStorage.setItem('sessieCode', code);
      await config.naValidatie?.(code);
      input.classList.remove('invoer-fout');
      fout?.classList.add('verborgen');
      toonScherm('scherm-rol');
    } catch (err) {
      console.error('Firebase fout:', err);
      toonFout('Verbindingsfout. Controleer je internetverbinding.');
    } finally {
      if (knop) {
        knop.disabled = false;
        // Veilig: dit is de oorspronkelijke markup van de knop zelf.
        // eslint-disable-next-line no-unsanitized/property
        knop.innerHTML = knopTekst;
      }
    }
  }

  // ── Rol claimen ──
  async function kiesRol(rol: string): Promise<void> {
    const code = sessionStorage.getItem('sessieCode');
    if (!code) {
      toonScherm('scherm-code');
      return;
    }

    const kaart = document.getElementById(`rol-kaart-${rol}`);
    const rolFout = document.getElementById('rol-fout');

    function toonRolFout(tekst: string): void {
      if (rolFout) {
        rolFout.textContent = tekst;
        rolFout.classList.remove('verborgen');
      }
    }

    const blokkade = config.magClaimen?.(rol, laatsteSpelers) ?? null;
    if (blokkade) {
      toonRolFout(blokkade);
      return;
    }

    kaart?.classList.add('rol-laden');
    rolFout?.classList.add('verborgen');

    try {
      const succes = await claimRol(code, rol);
      if (succes) {
        localStorage.setItem(ROL_OPSLAG_PREFIX + code, rol);
        naarSpelerPagina(rol, code);
      } else {
        toonRolFout('Deze rol is al bezet. Kies een andere.');
      }
    } catch (err) {
      console.error('Fout bij claimen van rol:', err);
      toonRolFout('Verbindingsfout. Probeer opnieuw.');
    } finally {
      kaart?.classList.remove('rol-laden');
    }
  }

  // ── Globals voor onclick-attributen in de HTML ──
  window.valideerCode = () => {
    void valideerCode();
  };
  window.toonScherm = toonScherm;
  window.kiesRol = (rol: string) => {
    void kiesRol(rol);
  };

  koppelCodeInvoer(() => void valideerCode());

  // ── Begin-knop: sla over naar rolkeuze als code al in URL zat ──
  document.getElementById('btn-begin')?.addEventListener('click', async () => {
    if (urlSessie && (await valideerSessie(urlSessie))) {
      await config.naValidatie?.(urlSessie);
      toonScherm('scherm-rol');
      return;
    }
    toonScherm('scherm-code');
  });
}
