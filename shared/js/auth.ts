import { app } from './firebase-config.ts';
import { getAuth, signInAnonymously } from 'firebase/auth';

/**
 * Anonieme login voor spelers.
 *
 * `authReady` start meteen een anonieme login en is bedoeld om te awaiten
 * vóór elke Firebase-schrijfactie. De promise resolveert ALTIJD — ook als de
 * login mislukt — zodat het spel blijft werken zolang de database-rules nog
 * soepel staan. Pas wanneer de rules `auth != null` eisen, is een werkende
 * Anonymous-provider in Firebase noodzakelijk.
 *
 * De host-panels gebruiken hun eigen e-mail/wachtwoord-login en raken dit niet.
 */
const auth = getAuth(app);

export const authReady: Promise<void> = signInAnonymously(auth)
  .then(() => undefined)
  .catch((err: unknown) => {
    console.error('Anonieme login mislukt:', err);
  });
