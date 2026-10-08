/**
 * host-auth.ts — gedeelde e-mail/wachtwoord-login voor de host-panels.
 *
 * Een host is niet zomaar "iemand met een wachtwoordaccount": dat kan in
 * principe iedereen aanmaken met de publieke API-key. Een host moet ook in
 * `beheerders/<uid>` staan (alleen via de Firebase-console te zetten).
 * database.rules.json dwingt hetzelfde af; deze check zorgt er enkel voor
 * dat een niet-beheerder een duidelijke melding krijgt in plaats van een
 * leeg paneel vol permission-denied-fouten.
 *
 * Verwacht in de HTML: #login-scherm, #admin-inhoud, #email-invoer,
 * #ww-invoer, #login-knop, #login-fout.
 */
import { app, db } from './firebase-config.ts';
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { requireEl } from './utils.ts';
import { koppelActies } from './acties.ts';

const FOUT_LOGIN = 'Ongeldig e-mailadres of wachtwoord.';
const FOUT_GEEN_BEHEERDER = 'Dit account heeft geen beheerdersrechten.';

/** Staat deze gebruiker in beheerders/? Faalt veilig naar false. */
export async function isBeheerder(uid: string): Promise<boolean> {
  try {
    const snap = await get(ref(db, `beheerders/${uid}`));
    return snap.val() === true;
  } catch {
    return false;
  }
}

/**
 * Bepaalt of `user` het paneel mag zien. Een anonieme speler (bv. iemand die
 * in dezelfde browser net Kamer 14 speelde) telt nooit als host.
 */
export async function magHostPaneelZien(user: User | null): Promise<boolean> {
  if (!user || user.isAnonymous) return false;
  return isBeheerder(user.uid);
}

/**
 * Koppelt login/logout en wisselt tussen loginscherm en admin-inhoud.
 * `onIngelogd` loopt pas zodra bevestigd is dat de gebruiker beheerder is.
 */
export function koppelHostAuth(onIngelogd?: () => void): void {
  const auth = getAuth(app);
  const loginScherm = requireEl('login-scherm');
  const adminInhoud = requireEl('admin-inhoud');
  const fout = requireEl('login-fout');

  function toonLogin(): void {
    loginScherm.style.display = 'flex';
    adminInhoud.style.display = 'none';
  }

  onAuthStateChanged(auth, async user => {
    const toegelaten = await magHostPaneelZien(user);
    if (!toegelaten) {
      toonLogin();
      if (user && !user.isAnonymous) {
        // Wel ingelogd, maar geen beheerder: uitloggen en zeggen waarom.
        fout.textContent = FOUT_GEEN_BEHEERDER;
        fout.style.display = 'block';
        requireEl<HTMLButtonElement>('login-knop').disabled = false;
        void signOut(auth);
      }
      return;
    }
    loginScherm.style.display = 'none';
    adminInhoud.style.display = 'block';
    onIngelogd?.();
  });

  async function login(): Promise<void> {
    const email = requireEl<HTMLInputElement>('email-invoer').value.trim();
    const ww = requireEl<HTMLInputElement>('ww-invoer').value;
    const knop = requireEl<HTMLButtonElement>('login-knop');
    knop.disabled = true;
    fout.style.display = 'none';
    try {
      await signInWithEmailAndPassword(auth, email, ww);
    } catch {
      // Geen detail tonen: ongeldige login mag niet verklappen wat er misging.
      fout.textContent = FOUT_LOGIN;
      fout.style.display = 'block';
      knop.disabled = false;
    }
  }

  koppelActies({
    login: () => void login(),
    uitloggen: () => void signOut(auth),
  });
}
