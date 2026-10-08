import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

/**
 * App Check met reCAPTCHA Enterprise (Fraud Defense): Firebase aanvaardt dan enkel verkeer dat van
 * deze site komt, niet van een los script met de (publieke) config.
 * Alleen actief als VITE_RECAPTCHA_SITE_KEY gezet is, zodat lokaal
 * ontwikkelen en de tests zonder sleutel blijven werken.
 *
 * Lokaal met enforcement aan: zet VITE_APPCHECK_DEBUG_TOKEN (of laat het leeg,
 * dan print de SDK een debugtoken in de console dat je in de Firebase-console
 * registreert onder App Check > Apps > Debugtokens beheren).
 */
const recaptchaSleutel = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (recaptchaSleutel && typeof window !== 'undefined') {
  if (import.meta.env.DEV) {
    (
      self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN =
      (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined) || true;
  }
  // De reCAPTCHA-badge zou over de timerknop rechtsonder vallen. Google laat
  // toe ze te verbergen zolang de reCAPTCHA-melding zichtbaar is in de flow:
  // die staat in de lobby's en in privacy.html.
  const stijl = document.createElement('style');
  stijl.textContent = '.grecaptcha-badge { visibility: hidden; }';
  document.head.appendChild(stijl);
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSleutel),
    isTokenAutoRefreshEnabled: true,
  });
}

export const db = getDatabase(app);
