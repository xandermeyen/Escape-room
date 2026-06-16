/**
 * tijd-voorbij.ts (gedeeld) — sluit de sessie zodra de tijd om is.
 * De logica was identiek voor kamer-14 en D.U.A.; nu staat ze hier één keer.
 */
import './sentry.ts';
import { sluitSessie } from './session.ts';

/** Leest ?sessie= uit de URL en deactiveert die sessie (faalt stil met log). */
export function sluitSessieUitUrl(): void {
  const sessie = new URLSearchParams(window.location.search).get('sessie');
  if (!sessie) return;
  sluitSessie(sessie).catch((err: unknown) => {
    console.error('Sessie sluiten mislukt:', err);
  });
}
