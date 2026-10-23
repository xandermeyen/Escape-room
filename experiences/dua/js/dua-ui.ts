/**
 * dua-ui.ts — gedeelde paginalogica voor speler-1934 en speler-2034:
 * timer met tijdstraf, verdenkingsmeter, voortgang, meldingen,
 * hints en de tijdperk-overschrijdende easter eggs.
 */
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, onValue } from 'firebase/database';
import {
  formateerTijd,
  TIJDSLIMIET_MS,
  zorgStartTijd,
  serverNu,
} from '../../../shared/js/timer.ts';
import { volgendHint, sessieUitUrl } from '../../../shared/js/utils.ts';
import { valideerSessie } from '../../../shared/js/session.ts';
import { telHint, zetBadge, type DuaMeta } from './dua-session.ts';
import { fx, isGedempt, wisselGeluid } from './dua-audio.ts';
import { DUA_VRIJGAVE } from './dua-config.ts';

// ── Melding (toast) ─────────────────────────────────────────
let meldingTimer: ReturnType<typeof setTimeout> | null = null;

export function melding(tekst: string): void {
  const m = document.getElementById('dua-melding');
  if (!m) return;
  m.textContent = tekst;
  m.style.display = 'block';
  if (meldingTimer) clearTimeout(meldingTimer);
  meldingTimer = setTimeout(() => {
    m.style.display = 'none';
  }, 4800);
}

// ── Timer met tijdstraf uit dua/meta/strafMs ────────────────
let strafMs = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let w10 = false;

export async function startDuaTimer(code: string): Promise<void> {
  // zorgStartTijd wacht op de anonieme login en maakt een geweigerde
  // schrijfactie zichtbaar (verbinding.ts), in plaats van stil te falen.
  const start = await zorgStartTijd(code);
  if (!start) return;

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const rest = TIJDSLIMIET_MS - strafMs - (serverNu() - start);
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
      if (timerInterval) clearInterval(timerInterval);
      window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(code)}`;
    }
  }, 1000);
}

// ── Verdenking & meta (live) ────────────────────────────────
// Callback zodat pagina's kunnen reageren (bv. snellere wachter).
export function koppelMeta(code: string, callback?: (meta: DuaMeta) => void): void {
  onValue(ref(db, `sessions/${code}/dua/meta`), snap => {
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

/** Is puzzel i (1 tot 5) vrij? Volgt DUA_VRIJGAVE uit dua-config.ts. */
export function ontgrendeld(p: PuzzelStatus, i: number): boolean {
  if (i < 1 || i > 5) return false;
  const nodig = DUA_VRIJGAVE[`p${i}`];
  return !!nodig && nodig.every(v => !!p[v]);
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
// Geopende hintstappen worden per toestel bewaard, zodat een herlaad ze niet
// verbergt en dezelfde stap niet opnieuw in de eindstats meetelt.
const hintSleutel = (code: string, blokId: string): string => `dua-hint:${code}:${blokId}`;

function leesGeopend(code: string, blokId: string): number {
  try {
    return Number(localStorage.getItem(hintSleutel(code, blokId))) || 0;
  } catch {
    return 0;
  }
}

function bewaarGeopend(code: string, blokId: string, n: number): void {
  try {
    localStorage.setItem(hintSleutel(code, blokId), String(n));
  } catch {
    /* opslag niet beschikbaar: dan blijft het bij de oude werking */
  }
}

function aantalGeopend(blokId: string): number {
  const stappen = document.querySelectorAll(`#${CSS.escape(blokId)} .hint-stap`);
  return [...stappen].filter(s => !s.classList.contains('verborgen')).length;
}

/** Zet eerder geopende hintstappen terug, zonder events of tellers. */
export function herstelHints(code: string): void {
  document.querySelectorAll<HTMLElement>('.hint-blok[id]').forEach(blok => {
    const n = leesGeopend(code, blok.id);
    if (n <= 0) return;
    const stappen = blok.querySelectorAll<HTMLElement>('.hint-stap');
    stappen.forEach((stap, i) => stap.classList.toggle('verborgen', i >= n));
    blok.querySelector('.hint-knop')?.classList.add('verborgen');
    blok.querySelector('.hint-verder')?.classList.toggle('verborgen', n >= stappen.length);
  });
}

export function duaHint(code: string, blokId: string): void {
  const eerder = leesGeopend(code, blokId);
  volgendHint(blokId);
  fx.fluister();
  const nu = aantalGeopend(blokId);
  // Alleen een stap die nog nooit geopend werd telt mee.
  if (nu <= eerder) return;
  bewaarGeopend(code, blokId, nu);
  telHint(code).catch(() => {
    /* teller is nice-to-have */
  });
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
  const KONAMI = [
    'ARROWUP',
    'ARROWUP',
    'ARROWDOWN',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'ARROWLEFT',
    'ARROWRIGHT',
    'B',
    'A',
  ];
  let kPos = 0;

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).matches?.('input, textarea')) return;

    buffer = (buffer + e.key.toUpperCase()).slice(-3);
    if (buffer === 'DUA') {
      const s = document.getElementById('dua-schaduw');
      if (s) {
        s.style.display = 'flex';
        fx.fluister();
        setTimeout(() => {
          s.style.display = 'none';
        }, 900);
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
      setTimeout(
        () =>
          melding('Een krakende stem: "De Rechters reizen niet. Zij kijken al jaren op u neer."'),
        1300,
      );
      zetBadge(code, 'gent-1180');
    }
  });
}

// ── Klikbare SVG-plekken bedienbaar met het toetsenbord ─────
const PLEK_NAMEN: Record<string, string> = {
  kast: 'Kast',
  bureau: 'Bureau',
  vensterbank: 'Vensterbank',
  schouw: 'Schouw',
  boekenrek: 'Boekenrek',
  vloerplank: 'Losse vloerplank',
  sintbaafs: 'Sint-Baafskathedraal',
  belfort: 'Belfort',
  station: 'Sint-Pietersstation',
  gravensteen: 'Gravensteen',
};

/** Tab-focus, een naam voor schermlezers en Enter/spatie als klik. */
export function maakSvgToegankelijk(selector: string): void {
  document.querySelectorAll<SVGElement>(selector).forEach(el => {
    const plek = el.getAttribute('data-plek') ?? '';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', PLEK_NAMEN[plek] ?? plek);
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  });
}

// ── Sessiecode uit de URL (zoals kamer-14) ──────────────────
// Redirect naar de lobby en gooit als de code ontbreekt, zodat de rest van
// de pagina niet verder draait tegen een niet-bestaande sessie.
export function leesSessie(): string {
  return sessieUitUrl();
}

/**
 * Een spelerpagina met een onbekende of gesloten sessiecode hoort niet te
 * draaien (anders start ze een klok en schrijft ze naar een sessie die er niet is).
 * Terug naar de lobby, waar de code opnieuw ingevoerd kan worden.
 */
export function controleerSessie(code: string): void {
  valideerSessie(code)
    .then(geldig => {
      if (!geldig) window.location.href = 'index.html';
    })
    .catch(() => {
      /* bij een netwerkfout laten we de speler gewoon doorspelen */
    });
}
