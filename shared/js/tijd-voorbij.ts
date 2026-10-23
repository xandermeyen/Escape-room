/**
 * tijd-voorbij.ts (gedeeld) — sluit de sessie zodra de tijd om is.
 * De logica was identiek voor kamer-14 en D.U.A.; nu staat ze hier één keer.
 *
 * Een ?sessie= in de URL is geen bewijs dat de tijd om is: wie de code kent
 * mag daarmee geen oplossingen zien of andermans sessie sluiten. We controleren
 * daarom eerst of de klok echt verlopen is (of de sessie al gesloten werd).
 */
import './sentry.ts';
import { db } from './firebase-config.ts';
import { ref, get } from 'firebase/database';
import { authReady } from './auth.ts';
import { sluitSessie } from './session.ts';
import { meetSpel } from './meet.ts';
import { TIJDSLIMIET_MS, koppelServerTijd, serverNu } from './timer.ts';

export type SessieEinde = 'verlopen' | 'gesloten' | 'bezig' | 'onbekend';

/** Speling voor klokverschillen tussen het moment van redirecten en nu. */
const TOLERANTIE_MS = 5000;

/**
 * Bepaalt of een sessie echt afgelopen is:
 *  - 'gesloten': al inactief (host, of de spelers rondden af);
 *  - 'verlopen': 60 min + opgebouwde tijdstraf is voorbij;
 *  - 'bezig': de klok loopt nog;
 *  - 'onbekend': de sessie bestaat niet.
 */
export async function beoordeelSessieEinde(sessie: string): Promise<SessieEinde> {
  await authReady;
  await koppelServerTijd();
  const snap = await get(ref(db, `sessions/${sessie}`));
  const data = snap.val() as {
    actief?: boolean;
    timerGestart?: number;
    dua?: { meta?: { strafMs?: number } };
  } | null;
  if (!data) return 'onbekend';
  if (data.actief === false) return 'gesloten';
  if (typeof data.timerGestart !== 'number') return 'bezig';
  const straf = data.dua?.meta?.strafMs ?? 0;
  const einde = data.timerGestart + TIJDSLIMIET_MS + straf;
  return serverNu() >= einde - TOLERANTIE_MS ? 'verlopen' : 'bezig';
}

/**
 * Leest ?sessie= uit de URL en deactiveert die sessie, maar alleen als de tijd
 * echt om is. Geeft true als de oplossing getoond mag worden (verlopen of al
 * gesloten). Faalt stil met log.
 */
export async function sluitSessieUitUrl(): Promise<boolean> {
  const sessie = new URLSearchParams(window.location.search).get('sessie');
  if (!sessie) return false;
  try {
    const einde = await beoordeelSessieEinde(sessie);
    if (einde === 'verlopen') {
      meetSpel('game_fail', sessie, { reden: 'tijd' });
      await sluitSessie(sessie).catch((err: unknown) => {
        console.error('Sessie sluiten mislukt:', err);
      });
    }
    return einde === 'verlopen' || einde === 'gesloten';
  } catch (err) {
    console.error('Sessie controleren mislukt:', err);
    return false;
  }
}
