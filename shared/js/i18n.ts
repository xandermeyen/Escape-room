/**
 * i18n.ts: taal van de huidige pagina en de teksten die JavaScript toont.
 *
 * De taal volgt uit <html lang>, die de generator per taal zet
 * (zie docs/adr/001-meertaligheid.md). Onbekend of ontbrekend: Nederlands.
 */
import { BRONTAAL, LOCALE, TALEN, padVoorTaal, type Taal } from '../../i18n/config.ts';
import { en } from '../../i18n/teksten/en.ts';
import { nl, type Teksten } from '../../i18n/teksten/nl.ts';

export type { Taal, Teksten };

const WOORDENBOEKEN: Record<Taal, Teksten> = { nl, en };

export function isTaal(waarde: string): waarde is Taal {
  return (TALEN as readonly string[]).includes(waarde);
}

export function huidigeTaal(doc: Document = document): Taal {
  const lang = doc.documentElement.lang.slice(0, 2).toLowerCase();
  return isTaal(lang) ? lang : BRONTAAL;
}

export function teksten(taal: Taal = huidigeTaal()): Teksten {
  return WOORDENBOEKEN[taal];
}

/** Locale voor datums en getallen, bv. "en-GB". */
export function locale(taal: Taal = huidigeTaal()): string {
  return LOCALE[taal];
}

/**
 * Pad naar een publieke pagina in de huidige taal: "/privacy.html" wordt
 * "/en/privacy.html" op een Engelse pagina. Pagina's die niet vertaald zijn,
 * blijven ongewijzigd.
 */
export function lokaalPad(pad: string, taal: Taal = huidigeTaal()): string {
  const [, basis = pad, rest = ''] = /^([^?#]*)(.*)$/.exec(pad) ?? [];
  return (padVoorTaal(basis, taal) ?? basis) + rest;
}
