/**
 * dua-ui.ts — gedeelde paginalogica voor speler-1934 en speler-2034:
 * timer met tijdstraf, verdenkingsmeter, voortgang, meldingen,
 * hints en de tijdperk-overschrijdende easter eggs.
 */
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, get, set, serverTimestamp, onValue } from 'firebase/database';
import { formateerTijd, TIJDSLIMIET_MS } from '../../../shared/js/timer.ts';
import { volgendHint } from '../../../shared/js/utils.ts';
import { telHint, zetBadge, type DuaMeta } from './dua-session.ts';
import { fx, isGedempt, wisselGeluid } from './dua-audio.ts';

// ── Melding (toast) ─────────────────────────────────────────
let meldingTimer: ReturnType<typeof setTimeout> | null = null;

export function melding(tekst: string): void {
  const m = document.getElementById('dua-melding');
  if (!m) return;
  m.textContent = tekst;
  m.style.display = 'block';
  if (meldingTimer) clearTimeout(meldingTimer);
  meldingTimer = setTimeout(() => { m.style.display = 'none'; }, 4800);
}

// ── Timer met tijdstraf uit dua/meta/strafMs ────────────────
let strafMs = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let w10 = false;

export async function startDuaTimer(code: string): Promise<void> {
  const timerRef = ref(db, `sessions/${code}/timerGestart`);
  const snap = await get(timerRef);
  if (!snap.exists() || snap.val() === null) {
    await set(timerRef, serverTimestamp());
  }
  const start: number = (await get(timerRef)).val();
  if (!start) return;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const rest = TIJDSLIMIET_MS - strafMs - (Date.now() - start);
    const el = document.getElementById('dua-timer');
    if (el) el.textContent = formateerTijd(Math.max(0, rest));

    if (rest <= 10 * 60 * 1000) {
      el?.classList.add('alarm');
      if (!w10) {
        w10 = true;
        melding('Nog 10 minuten. De lijn tussen 1934 en 2034 wordt zwakker.');
      }
      const sec = Math.floor(rest / 1000);
      if (sec >= 0 && sec % (rest < 2 * 60 * 1000 ? 1 : 3) === 0) fx.hartslag();
    }
    if (rest <= 0) {
      clearInterval(timerInterval!);
      window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(code)}`;
    }
  }, 1000);
}

// ── Verdenking & meta (live) ────────────────────────────────
// Callback zodat pagina's kunnen reageren (bv. snellere wachter).
export function koppelMeta(code: string, callback?: (meta: DuaMeta) => void): void {
  onValue(ref(db, `sessions/${code}/dua/meta`), (snap) => {
    const meta: DuaMeta = snap.val() ?? { verdenking: 0, strafMs: 0, hints: 0 };
    const vorigeStraf = strafMs;
    strafMs = meta.strafMs || 0;

    const vul = document.getElementById('verdenking-vul');
    const pct = document.getElementById('verdenking-pct');
    if (vul) vul.style.width = `${meta.verdenking || 0}%`;
    if (pct) pct.textContent = `${meta.verdenking || 0}%`;

    if (strafMs > vorigeStraf) {
      fx.fluitje();
      melding('De politie greep bijna in. Jullie doken onder: 5 MINUTEN verloren.');
    }
    callback?.(meta);
  });
}

// ── Voortgang P1-P5 ─────────────────────────────────────────
export type PuzzelStatus = Record<string, boolean>;

export function ontgrendeld(p: PuzzelStatus, i: number): boolean {
  if (i === 1) return !!p['p0'];
  if (i === 2 || i === 3) return !!p['p1'];
  if (i === 4) return !!p['p2'] && !!p['p3'];
  if (i === 5) return !!p['p4'];
  return false;
}

export function tekenVoortgang(p: PuzzelStatus): void {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`pz${i}`);
    if (!el) continue;
    el.classList.toggle('af', !!p[`p${i}`]);
    el.classList.toggle('open', !p[`p${i}`] && ontgrendeld(p, i));
  }
}

// ── Hints: kamer-14-patroon + teller voor de eindstats ──────
export function duaHint(code: string, blokId: string): void {
  volgendHint(blokId);
  fx.fluister();
  telHint(code).catch(() => { /* teller is nice-to-have */ });
}

// ── Geluidsknop ─────────────────────────────────────────────
export function koppelMuteKnop(): void {
  const knop = document.getElementById('muteknop');
  if (!knop) return;
  knop.textContent = isGedempt() ? '♪ uit' : '♪ aan';
  knop.addEventListener('click', () => {
    knop.textContent = wisselGeluid() ? '♪ uit' : '♪ aan';
  });
}

// ── Easter eggs die op beide pagina's leven ─────────────────
// "DUA" typen → schaduwflits · Konami-code → tijdperkfilter wisselt
export function koppelEasterEggs(code: string): void {
  let buffer = '';
  let telBuffer = '';
  const KONAMI = ['ARROWUP','ARROWUP','ARROWDOWN','ARROWDOWN','ARROWLEFT','ARROWRIGHT','ARROWLEFT','ARROWRIGHT','B','A'];
  let kPos = 0;

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).matches?.('input, textarea')) return;

    buffer = (buffer + e.key.toUpperCase()).slice(-3);
    if (buffer === 'DUA') {
      const s = document.getElementById('dua-schaduw');
      if (s) {
        s.style.display = 'flex';
        fx.fluister();
        setTimeout(() => { s.style.display = 'none'; }, 900);
      }
      zetBadge(code, 'door-u-aangesteld');
      melding('Insigne gevonden: Door U Aangesteld');
    }

    if (e.key.toUpperCase() === KONAMI[kPos]) {
      kPos++;
      if (kPos === KONAMI.length) {
        document.body.classList.toggle('era-1934');
        document.body.classList.toggle('era-2034');
        fx.lade();
        zetBadge(code, 'anno-verwisseld');
        melding('Insigne gevonden: Anno Verwisseld');
        kPos = 0;
      }
    } else {
      kPos = 0;
    }

    telBuffer = (telBuffer + e.key).slice(-4);
    if (telBuffer === '1180') {
      fx.telefoon();
      setTimeout(() => melding('Een krakende stem: "De Rechters reizen niet. Zij kijken al jaren op u neer."'), 1300);
      zetBadge(code, 'gent-1180');
    }
  });
}

// ── Sessiecode uit de URL (zoals kamer-14) ──────────────────
export function leesSessie(): string | null {
  const sessie = new URLSearchParams(window.location.search).get('sessie');
  if (!sessie) window.location.href = 'index.html';
  return sessie;
}
