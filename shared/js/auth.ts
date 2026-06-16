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

export const authReady: Promise<void> = signInAnonymously(auth)
  .then(() => {
    authGelukt = true;
  })
  .catch((err: unknown) => {
    console.error('Anonieme login mislukt:', err);
    Sentry.captureException(err, { tags: { context: 'anonieme-login' } });
  });
