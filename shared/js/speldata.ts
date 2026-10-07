/**
 * speldata.ts — anonieme speldata per sessie, voor het host-paneel.
 *
 * sessions/<code>/stats/<puzzel>:
 *   start:     servertijd waarop de puzzel vrijkwam voor de groep
 *   opgelost:  servertijd waarop de puzzel opgelost werd
 *   fout:      aantal foute pogingen
 *   bijna:     aantal bijna-juiste pogingen
 *   hints:     { <rol>: hoogste geopende hintstap }   (bv. a, b, 1934, 2034)
 *
 * Geen persoonsgegevens: alles hangt enkel aan de sessiecode. Elke
 * schrijfactie faalt stil: speldata mag een groep nooit blokkeren.
 * database.rules.json laat start/opgelost één keer toe (servertijd),
 * tellers alleen +1 en hintstappen alleen stijgend.
 */
import { db } from './firebase-config.ts';
import { ref, get, set, runTransaction, serverTimestamp, increment } from 'firebase/database';
import { authReady } from './auth.ts';

export interface PuzzelStat {
  start?: number;
  opgelost?: number;
  fout?: number;
  bijna?: number;
  hints?: Record<string, number>;
}

export type SessieStats = Record<string, PuzzelStat>;

/** Welke puzzels moeten opgelost zijn voor een puzzel vrijkomt. */
export type Vrijgave = Record<string, string[]>;

const statRef = (code: string, pad: string) => ref(db, `sessions/${code}/stats/${pad}`);

async function stil(taak: () => Promise<unknown>): Promise<void> {
  try {
    await authReady;
    await taak();
  } catch (err) {
    console.warn('Speldata bewaren mislukt:', err);
  }
}

/** Zet een tijdstip één keer (start of opgelost). */
async function zetEenmalig(code: string, pad: string): Promise<void> {
  const r = statRef(code, pad);
  const snap = await get(r);
  if (snap.exists()) return;
  await set(r, serverTimestamp());
}

/** Een foute of bijna-juiste poging tellen. */
export function registreerPoging(
  code: string,
  puzzel: string,
  soort: 'fout' | 'bijna',
): Promise<void> {
  return stil(() => set(statRef(code, `${puzzel}/${soort}`), increment(1)));
}

/** Een geopende hintstap bewaren (alleen de hoogste stap per rol telt). */
export function registreerHint(
  code: string,
  puzzel: string,
  rol: string,
  stap: number,
): Promise<void> {
  return stil(() =>
    runTransaction(statRef(code, `${puzzel}/hints/${rol}`), (huidig: number | null) =>
      typeof huidig === 'number' && huidig >= stap ? undefined : stap,
    ),
  );
}

/** Moment waarop een puzzel opgelost werd. */
export function registreerOpgelost(code: string, puzzel: string): Promise<void> {
  return stil(() => zetEenmalig(code, `${puzzel}/opgelost`));
}

const startGezet = new Set<string>();

/**
 * Zet de starttijd van elke puzzel die net vrijkwam (alle vereiste puzzels
 * opgelost, zelf nog niet). Roep aan bij elke statuswijziging.
 */
export function registreerVrijgaves(
  code: string,
  status: Record<string, boolean>,
  vrijgave: Vrijgave,
): void {
  for (const [puzzel, vereist] of Object.entries(vrijgave)) {
    const sleutel = `${code}/${puzzel}`;
    if (startGezet.has(sleutel)) continue;
    if (!vereist.every(v => status[v])) continue;
    startGezet.add(sleutel);
    void stil(() => zetEenmalig(code, `${puzzel}/start`));
  }
}

/** Haalt uit een hint-blok-id de puzzel, bv. 'hint-p3-b' → 'p3', 'hint-p4a' → 'p4'. */
export function puzzelUitHintBlok(blokId: string): string | null {
  const m = /^hint-(p\d)/.exec(blokId);
  return m ? (m[1] ?? null) : null;
}

/** Vertaalt een hint-blok naar puzzel + rol, voor `luisterNaarHints`. */
export type HintKoppeling = (blokId: string) => { puzzel: string; rol: string } | null;

/**
 * Luistert naar `hint-geopend` (zie volgendHint in utils.ts) en bewaart de
 * stap in de speldata. Geeft een functie terug om te stoppen.
 */
export function luisterNaarHints(code: string, koppel: HintKoppeling): () => void {
  const opHint = (e: Event) => {
    const { blokId, stap } = (e as CustomEvent<{ blokId: string; stap: number }>).detail;
    const k = koppel(blokId);
    if (k) void registreerHint(code, k.puzzel, k.rol, stap);
  };
  document.addEventListener('hint-geopend', opHint);
  return () => document.removeEventListener('hint-geopend', opHint);
}

// ── Berekeningen voor het host-paneel (puur, testbaar) ─────

/** Tijd tot oplossing in ms, of null als die niet te berekenen is. */
export function puzzelDuur(stat: PuzzelStat | undefined): number | null {
  if (!stat || typeof stat.start !== 'number' || typeof stat.opgelost !== 'number') return null;
  return Math.max(0, stat.opgelost - stat.start);
}

/** Hoogste hintstap over alle rollen heen (0 = geen hint). */
export function hoogsteHint(stat: PuzzelStat | undefined): number {
  return Math.max(0, ...Object.values(stat?.hints ?? {}));
}

export interface PuzzelGemiddelde {
  puzzel: string;
  /** Aantal sessies waarin de puzzel opgelost werd met gekende duur. */
  aantal: number;
  gemDuurMs: number | null;
  gemFout: number;
  gemBijna: number;
  /** Aandeel sessies (0-1) waarin minstens één hint geopend werd. */
  aandeelHint: number;
}

/**
 * Gemiddelden per puzzel over alle sessies die die puzzel bereikten
 * (een starttijd hebben). Duur enkel over opgeloste puzzels.
 */
export function berekenGemiddelden(alle: SessieStats[], puzzels: string[]): PuzzelGemiddelde[] {
  return puzzels.map(puzzel => {
    const bereikt = alle
      .map(s => s[puzzel])
      .filter((s): s is PuzzelStat => typeof s?.start === 'number');
    const duren = bereikt.map(puzzelDuur).filter((d): d is number => d !== null);
    const n = bereikt.length;
    const som = (f: (s: PuzzelStat) => number) => bereikt.reduce((t, s) => t + f(s), 0);
    return {
      puzzel,
      aantal: duren.length,
      gemDuurMs: duren.length ? duren.reduce((a, b) => a + b, 0) / duren.length : null,
      gemFout: n ? som(s => s.fout ?? 0) / n : 0,
      gemBijna: n ? som(s => s.bijna ?? 0) / n : 0,
      aandeelHint: n ? bereikt.filter(s => hoogsteHint(s) > 0).length / n : 0,
    };
  });
}

/** De puzzel met de langste gemiddelde oplostijd (minstens `min` metingen). */
export function moeilijkstePuzzel(gem: PuzzelGemiddelde[], min = 1): string | null {
  const kandidaten = gem.filter(g => g.gemDuurMs !== null && g.aantal >= min);
  if (!kandidaten.length) return null;
  return kandidaten.reduce((a, b) => ((b.gemDuurMs ?? 0) > (a.gemDuurMs ?? 0) ? b : a)).puzzel;
}
