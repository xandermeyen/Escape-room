/**
 * meet.ts: GA4 key events voor Bureau X.
 *
 * Events worden alleen verstuurd als de bezoeker analytische cookies
 * accepteerde (zie cookies.ts). Op de spelpagina's staat geen banner: wie
 * eerder op de site "Accepteren" koos, wordt gemeten, de rest niet.
 *
 * Events (markeer ze in GA4 als belangrijke gebeurtenis):
 *  - reservation_submit  boekingsformulier verstuurd
 *  - game_start          speler opent zijn spelpagina
 *  - game_complete       spel opgelost (rapport aanvaard / einde bereikt)
 *  - game_fail           tijd om, of Kamer 14 twee keer fout (politie)
 */
import { laadAnalytics, leesKeuze } from './cookies.ts';
import { isDemoCode } from './demo.ts';

export type Experience = 'kamer_14' | 'dua';

export type MeetEvent = 'reservation_submit' | 'game_start' | 'game_complete' | 'game_fail';

export type MeetParams = Record<string, string | number | boolean | undefined>;

const EENMALIG_PREFIX = 'bureaux-gemeten:';

/** Leidt de experience af uit het pad (/kamer-14/..., /dua/..., /experiences/dua/...). */
export function experienceUitPad(pad: string = location.pathname): Experience | undefined {
  if (/\/kamer-14(\/|$)/.test(pad)) return 'kamer_14';
  if (/\/dua(\/|$)/.test(pad)) return 'dua';
  return undefined;
}

/** Stuurt een event naar GA4, enkel met toestemming. Geeft terug of het verstuurd werd. */
export function meetEvent(naam: MeetEvent, params: MeetParams = {}): boolean {
  if (!leesKeuze()?.analytics) return false;
  laadAnalytics();
  const schoon = Object.fromEntries(Object.entries(params).filter(([, w]) => w !== undefined));
  window.gtag?.('event', naam, schoon);
  return true;
}

/**
 * Zelfde als meetEvent, maar maximaal één keer per sleutel op dit toestel
 * (bv. per sessiecode en rol), zodat herladen geen dubbele events geeft.
 */
export function meetEenmalig(naam: MeetEvent, sleutel: string, params: MeetParams = {}): boolean {
  const opslag = `${EENMALIG_PREFIX}${naam}:${sleutel}`;
  try {
    if (localStorage.getItem(opslag)) return false;
  } catch {
    // Opslag geblokkeerd: dan maar zonder ontdubbeling.
  }
  const verstuurd = meetEvent(naam, params);
  if (verstuurd) {
    try {
      localStorage.setItem(opslag, String(Date.now()));
    } catch {
      // negeren
    }
  }
  return verstuurd;
}

/**
 * Spel-event voor een sessie: één keer per sessie op dit toestel, met de
 * experience uit het pad. Demo-sessies tellen niet mee.
 */
export function meetSpel(naam: MeetEvent, sessie: string | null, params: MeetParams = {}): boolean {
  if (!sessie || isDemoCode(sessie)) return false;
  return meetEenmalig(naam, sessie, { experience: experienceUitPad(), ...params });
}
