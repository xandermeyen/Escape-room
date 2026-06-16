/**
 * dua-session.ts — Firebase-laag voor experience "D.U.A."
 * ──────────────────────────────────────────────────────────
 * Kernidee: team 1934 schrijft state, team 2034 leest die live.
 * Alles leeft onder sessions/${code}/dua naast de bestaande
 * puzzels/rapport/spelers-structuur van session.ts.
 *
 * sessions/${code}/dua:
 *   p0zegel:      boolean                 — handdruk gezet (1934)
 *   brief:        { letters: string, verstuurd: boolean }   — csv van indexen
 *   kluisNummer:  string | null           — door 1934 gekozen (2 cijfers)
 *   verstopPlek:  string | null           — werkkamer Wetteren
 *   pin1934:      string | null           — bergplaats op het stadsplan
 *   brief14:      { tekst: string, klaar: boolean }
 *   meta:         { verdenking: number, strafMs: number, hints: number }
 *   badges:       { [naam]: true }
 */
import { db } from '../../../shared/js/firebase-config.ts';
import {
  ref,
  get,
  set,
  update,
  onValue,
  runTransaction,
  serverTimestamp,
} from 'firebase/database';
import { authReady } from '../../../shared/js/auth.ts';
import { schrijf } from '../../../shared/js/verbinding.ts';

// De brief die de Schrijver typt — beide tijdperken lezen dezelfde tekst.
export const BRIEFTEKST =
  'MONSEIGNEUR. KIJK NIET LANGER WEG. UW AARZELING KOST U MEER DAN GELD. ' +
  'EEN LAATSTE TEKEN IS ONDERWEG: ZOEK WAAR REIZIGERS WACHTEN. ' +
  'HET NUMMER IS EEN MEER DAN HET AANTAL BRIEVEN DAT U TELT. — D.U.A.';

// Plekken die de politie in december 1934 doorzocht (huiszoekingsverslag).
export const DOORZOCHT = ['bureau', 'kast', 'boekenrek'];

export interface DuaMeta {
  verdenking: number;
  strafMs: number;
  hints: number;
}

export interface DuaState {
  p0zegel?: boolean;
  brief?: { letters?: string; verstuurd?: boolean };
  kluisNummer?: string | null;
  verstopPlek?: string | null;
  pin1934?: string | null;
  brief14?: { tekst?: string; klaar?: boolean };
  meta?: DuaMeta;
  badges?: Record<string, boolean>;
}

const duaRef  = (code: string) => ref(db, `sessions/${code}/dua`);
const metaRef = (code: string) => ref(db, `sessions/${code}/dua/meta`);

// ── Init: zorgt dat de dua-node en p0 bestaan (idempotent) ──
export async function initDua(code: string): Promise<void> {
  await authReady;
  const snap = await get(duaRef(code));
  if (!snap.exists()) {
    await schrijf('initDua', set(duaRef(code), {
      p0zegel: false,
      brief: { letters: '', verstuurd: false },
      kluisNummer: null,
      verstopPlek: null,
      pin1934: null,
      brief14: { tekst: '', klaar: false },
      meta: { verdenking: 0, strafMs: 0, hints: 0 },
    }));
  }
  const p0 = await get(ref(db, `sessions/${code}/puzzels/p0`));
  if (!p0.exists()) {
    await schrijf('initDua p0', set(ref(db, `sessions/${code}/puzzels/p0`), false));
  }
}

// ── Live luisteren naar de volledige dua-state ──
export function luisterDua(
  code: string,
  callback: (dua: DuaState) => void,
): () => void {
  return onValue(duaRef(code), (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// ── Acties 1934 ──
export async function zetZegel(code: string): Promise<void> {
  await authReady;
  await schrijf('zetZegel', update(duaRef(code), { p0zegel: true }));
}

export async function zetBrief(code: string, letters: number[]): Promise<void> {
  await authReady;
  await schrijf('zetBrief', update(duaRef(code), {
    brief: { letters: letters.join(','), verstuurd: true },
  }));
}

export async function gomBrief(code: string): Promise<void> {
  await authReady;
  await schrijf('gomBrief', update(duaRef(code), { brief: { letters: '', verstuurd: false } }));
  await schrijf('gomBrief p1', set(ref(db, `sessions/${code}/puzzels/p1`), false));
}

export async function zetKluisNummer(code: string, nummer: string): Promise<void> {
  await authReady;
  await schrijf('zetKluisNummer', update(duaRef(code), { kluisNummer: nummer }));
}

export async function zetVerstopPlek(code: string, plek: string | null): Promise<void> {
  await authReady;
  await schrijf('zetVerstopPlek', update(duaRef(code), { verstopPlek: plek }));
}

export async function zetPin1934(code: string, plek: string | null): Promise<void> {
  await authReady;
  await schrijf('zetPin1934', update(duaRef(code), { pin1934: plek }));
}

export async function zetBrief14(code: string, tekst: string): Promise<void> {
  await authReady;
  await schrijf('zetBrief14', update(duaRef(code), { brief14: { tekst, klaar: true } }));
}

// ── Verdenking (transactie: 100% → 5 min tijdstraf, terug naar 60%) ──
export const STRAF_BIJ_HONDERD_MS = 5 * 60 * 1000;

export async function verhoogVerdenking(code: string, plus: number): Promise<void> {
  await authReady;
  await schrijf('verhoogVerdenking', runTransaction(metaRef(code), (meta: DuaMeta | null) => {
    const m: DuaMeta = meta ?? { verdenking: 0, strafMs: 0, hints: 0 };
    m.verdenking = Math.min(100, (m.verdenking || 0) + plus);
    if (m.verdenking >= 100) {
      m.verdenking = 60;
      m.strafMs = (m.strafMs || 0) + STRAF_BIJ_HONDERD_MS;
    }
    return m;
  }));
}

// ── Hints tellen (voor de eindstatistieken) ──
export async function telHint(code: string): Promise<void> {
  await authReady;
  await schrijf('telHint', runTransaction(metaRef(code), (meta: DuaMeta | null) => {
    const m: DuaMeta = meta ?? { verdenking: 0, strafMs: 0, hints: 0 };
    m.hints = (m.hints || 0) + 1;
    return m;
  }));
}

// ── Insignes (easter eggs, teambreed) ──
export async function zetBadge(code: string, naam: string): Promise<void> {
  await authReady;
  await schrijf('zetBadge', set(ref(db, `sessions/${code}/dua/badges/${naam}`), true));
}

// ── Rapport 2034 (vrije conclusie, los van het kamer-14 formaat) ──
export async function dienDuaRapportIn(code: string, conclusie: string): Promise<void> {
  await authReady;
  await schrijf('dienDuaRapportIn', update(ref(db, `sessions/${code}/rapport`), {
    ingediend: true,
    inhoud: { conclusie },
    tijdstip: serverTimestamp(),
  }));
}

// ── Stats voor het eindscherm ──
export interface DuaStats {
  timerGestart: number | null;
  rapportTijdstip: number | null;
  meta: DuaMeta;
  badges: number;
}

export async function haalDuaStats(code: string): Promise<DuaStats> {
  const snap = await get(ref(db, `sessions/${code}`));
  const data = snap.val() || {};
  return {
    timerGestart: data.timerGestart ?? null,
    rapportTijdstip: data.rapport?.tijdstip ?? null,
    meta: data.dua?.meta ?? { verdenking: 0, strafMs: 0, hints: 0 },
    badges: Object.keys(data.dua?.badges ?? {}).length,
  };
}

// ── Alles voor het eindscherm in één keer ──
export interface DuaEinde extends DuaStats {
  brief14Tekst: string;
  brief14Klaar: boolean;
  rapportTekst: string;
  rapportIngediend: boolean;
}

export async function haalEinde(code: string): Promise<DuaEinde> {
  const snap = await get(ref(db, `sessions/${code}`));
  const data = snap.val() || {};
  return {
    timerGestart: data.timerGestart ?? null,
    rapportTijdstip: data.rapport?.tijdstip ?? null,
    meta: data.dua?.meta ?? { verdenking: 0, strafMs: 0, hints: 0 },
    badges: Object.keys(data.dua?.badges ?? {}).length,
    brief14Tekst: data.dua?.brief14?.tekst ?? '',
    brief14Klaar: !!data.dua?.brief14?.klaar,
    rapportTekst: data.rapport?.inhoud?.conclusie ?? '',
    rapportIngediend: !!data.rapport?.ingediend,
  };
}
