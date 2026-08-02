import { app } from './firebase-config.ts';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import * as Sentry from '@sentry/browser';

/**
 * Anonieme login voor spelers.
 *
 * `authReady` wacht eerst op de eerste auth-statuscheck van Firebase. Is er
 * dan al een ingelogde gebruiker — bv. een host die via e-mail/wachtwoord is
 * ingelogd, of een speler met een eerdere anonieme sessie — dan laten we die
 * met rust. Pas als er niemand is ingelogd, start een anonieme login.
 *
 * Dit voorkomt dat deze module, die via session.ts ook door de host-panels
 * wordt geladen, een ingelogde host stilletjes vervangt door een anonieme
 * gebruiker. Beide lopen namelijk over dezelfde Firebase Auth-instance, en
 * die houdt maar één actieve gebruiker tegelijk bij: eerder loste dit zich
 * op als "moet steeds opnieuw inloggen" en af en toe een permission-denied
 * op het host-panel.
 *
 * De promise resolveert ALTIJD — ook als de login mislukt — zodat het spel
 * blijft werken zolang de database-rules nog soepel staan. Pas wanneer de
 * rules `auth != null` eisen, is een werkende Anonymous-provider in Firebase
 * noodzakelijk.
 *
 * Faalt de login, dan melden we dat naar Sentry (niet alleen de console) en
 * blijft `authGelukt` op false staan. De eerste geweigerde schrijfactie toont
 * dan via verbinding.ts een zichtbare balk aan de speler.
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

/** Wacht op de eerste (async) auth-statuscheck van Firebase en geeft de dan geldende gebruiker terug. */
function wachtOpEersteAuthState(): Promise<User | null> {
  return new Promise((resolve) => {
    let opgehaald = false;
    const stop = onAuthStateChanged(auth, (user) => {
      if (opgehaald) return;
      opgehaald = true;
      resolve(user);
      // Ontkoppelen via een microtask: als de callback toch synchroon vuurt
      // (bv. in tests) bestaat `stop` op dat moment nog niet.
      queueMicrotask(() => stop());
    });
  });
}

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

/** Start alleen een anonieme login als er nog niemand is ingelogd. */
async function initAuth(): Promise<void> {
  const bestaandeUser = await wachtOpEersteAuthState();
  if (bestaandeUser) {
    // Al ingelogd — host via e-mail/wachtwoord, of een eerdere anonieme
    // sessie die Firebase zelf al had onthouden. Niet overschrijven.
    authGelukt = true;
    return;
  }
  await logInMetHerpoging();
}

export const authReady: Promise<void> = initAuth().catch((err: unknown) => {
  console.error('Anonieme login mislukt:', err);
  Sentry.captureException(err, { tags: { context: 'anonieme-login' } });
});
