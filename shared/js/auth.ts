import { app } from './firebase-config.ts';
import { getAuth, signInAnonymously } from 'firebase/auth';
import * as Sentry from '@sentry/browser';

/**
 * Anonieme login voor spelers.
 *
 * `authReady` start meteen een anonieme login en is bedoeld om te awaiten
 * vóór elke Firebase-schrijfactie. De promise resolveert ALTIJD — ook als de
 * login mislukt — zodat het spel blijft werken zolang de database-rules nog
 * soepel staan. Pas wanneer de rules `auth != null` eisen, is een werkende
 * Anonymous-provider in Firebase noodzakelijk.
 *
 * Faalt de login, dan melden we dat naar Sentry (niet alleen de console) en
 * blijft `authGelukt` op false staan. De eerste geweigerde schrijfactie toont
 * dan via verbinding.ts een zichtbare balk aan de speler.
 *
 * De host-panels gebruiken hun eigen e-mail/wachtwoord-login en raken dit niet.
 */
const auth = getAuth(app);

export let authGelukt = false;

/** Fouten die door een tijdelijk netwerkprobleem komen en dus opnieuw geprobeerd mogen worden. */
const TIJDELIJKE_FOUTEN = new Set([
  'auth/network-request-failed',
  'auth/timeout',
  'auth/internal-error',
]);

function isTijdelijkeFout(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return typeof code === 'string' && TIJDELIJKE_FOUTEN.has(code);
}

const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Probeert anoniem in te loggen, met enkele herpogingen bij tijdelijke
 * netwerkfouten. Mobiele verbindingen vallen soms even weg; een eenmalige
 * poging mislukt dan onnodig. Een echte configfout (geen tijdelijke code)
 * faalt meteen, zonder te wachten.
 */
async function logInMetHerpoging(maxPogingen = 3): Promise<void> {
  for (let poging = 1; poging <= maxPogingen; poging++) {
    try {
      await signInAnonymously(auth);
      authGelukt = true;
      return;
    } catch (err) {
      const laatstePoging = poging === maxPogingen;
      if (laatstePoging || !isTijdelijkeFout(err)) throw err;
      // Korte oplopende backoff: 400ms, 800ms, ...
      await wacht(400 * poging);
    }
  }
}

export const authReady: Promise<void> = logInMetHerpoging()
  .catch((err: unknown) => {
    console.error('Anonieme login mislukt:', err);
    Sentry.captureException(err, { tags: { context: 'anonieme-login' } });
  });
