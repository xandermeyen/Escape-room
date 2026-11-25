/**
 * dua-hulp.ts — hulp tijdens D.U.A. (zie shared/js/hulp.ts), in de speltaal.
 * De teksten zelf staan in teksten/<taal>.ts.
 */
import type { Melding } from '../../../shared/js/hulp.ts';
import { tekst } from './dua-tekst.ts';

export type Tijdperk = '1934' | '2034';

const PUZZELS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'] as const;

/** Verhaalmeldingen als een tijdperk lang niets doet, in de speltaal. */
export function duaInactief(tijdperk: Tijdperk): Record<string, Melding> {
  const h = tekst().hulp;
  const titel = tijdperk === '1934' ? h.stem1934 : h.notitie2034;
  return Object.fromEntries(PUZZELS.map(p => [p, { titel, tekst: h.inactief[tijdperk][p] }]));
}

/** Melding na een statuswijziging: wat is er nu open, en wat doet de andere kant. */
export function duaVrijgaveMelding(
  tijdperk: Tijdperk,
  oud: Record<string, boolean>,
  nieuw: Record<string, boolean>,
): Melding | null {
  const h = tekst().hulp;
  const net = (p: string) => !!nieuw[p] && !oud[p];
  const t1934 = tijdperk === '1934';

  if (net('p5')) {
    return { titel: h.gevondenTitel, tekst: t1934 ? h.gevonden1934 : h.gevonden2034 };
  }
  if (net('p4')) {
    return { titel: h.nieuw, tekst: t1934 ? h.p4_1934 : h.p4_2034 };
  }
  if ((net('p2') || net('p3')) && nieuw['p2'] && nieuw['p3']) {
    return { titel: h.nieuw, tekst: t1934 ? h.werkkamer1934 : h.werkkamer2034 };
  }
  if (net('p2') || net('p3')) {
    return { titel: h.goedBezig, tekst: nieuw['p2'] ? h.nogRoute : h.nogKluis };
  }
  if (net('p1')) {
    return { titel: h.nieuw, tekst: t1934 ? h.p1_1934 : h.p1_2034 };
  }
  if (net('p0')) {
    return { titel: h.handdrukTitel, tekst: t1934 ? h.p0_1934 : h.p0_2034 };
  }
  return null;
}

/** Inhoud van "Hulp nodig?", in de speltaal. */
export function duaHulpHtml(): string {
  return tekst().hulp.html;
}
