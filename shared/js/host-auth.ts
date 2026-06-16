/**
 * host-auth.ts — gedeelde e-mail/wachtwoord-login voor de host-panels.
 *
 * Dit was de gevoeligste client-code van het project en stond eerder als
 * ongetypt inline script in beide host-panel.html-bestanden. Nu één getypte,
 * gedeelde implementatie.
 *
 * Verwacht in de HTML: #login-scherm, #admin-inhoud, #email-invoer,
 * #ww-invoer, #login-knop, #login-fout.
 */
import { app } from './firebase-config.ts';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { requireEl } from './utils.ts';

declare global {
  interface Window {
    login: () => void;
    uitloggen: () => void;
  }
}

/** Koppelt login/logout en wisselt tussen loginscherm en admin-inhoud. */
export function koppelHostAuth(): void {
  const auth = getAuth(app);
  const loginScherm = requireEl('login-scherm');
  const adminInhoud = requireEl('admin-inhoud');

  onAuthStateChanged(auth, (user) => {
    loginScherm.style.display = user ? 'none' : 'flex';
    adminInhoud.style.display = user ? 'block' : 'none';
  });

  async function login(): Promise<void> {
    const email = requireEl<HTMLInputElement>('email-invoer').value.trim();
    const ww = requireEl<HTMLInputElement>('ww-invoer').value;
    const knop = requireEl<HTMLButtonElement>('login-knop');
    const fout = requireEl('login-fout');
    knop.disabled = true;
    fout.style.display = 'none';
    try {
      await signInWithEmailAndPassword(auth, email, ww);
    } catch {
      // Geen detail tonen: ongeldige login mag niet verklappen wat er misging.
      fout.style.display = 'block';
      knop.disabled = false;
    }
  }

  window.login = () => {
    void login();
  };
  window.uitloggen = () => {
    void signOut(auth);
  };
}
