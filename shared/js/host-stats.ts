/**
 * host-stats.ts — speldata tonen in de host-panels: details per sessie en
 * gemiddelden per puzzel over alle sessies. Alleen vaste markup en getallen;
 * puzzel- en rolnamen komen uit de eigen configuratie, maar gaan toch door
 * escHtml.
 */
import { escHtml } from './utils.ts';
import {
  puzzelDuur,
  berekenGemiddelden,
  moeilijkstePuzzel,
  type SessieStats,
  type PuzzelStat,
} from './speldata.ts';
import { onderzoekstijd } from './verdeling.ts';

/** 754000 → "12:34", null → "-". */
export function formateerDuur(ms: number | null): string {
  if (ms === null) return '-';
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Tijd sinds de start van de puzzel, bv. "4:12", of null zonder start. */
function naStart(stat: PuzzelStat | undefined, tijd: number | undefined): string | null {
  if (typeof stat?.start !== 'number' || typeof tijd !== 'number') return null;
  return formateerDuur(Math.max(0, tijd - stat.start));
}

/**
 * Per rol de hoogste hintstap, met daaronder wanneer elke stap opende
 * (gerekend vanaf de start van de puzzel). Bv. "1934: stap 3" + "na 2:10 · 5:30 · 9:00".
 */
function hintsTekst(stat: PuzzelStat | undefined, rollen: Record<string, string>): string {
  const hints = stat?.hints ?? {};
  const delen = Object.entries(rollen)
    .filter(([rol]) => hints[rol])
    .map(([rol, label]) => {
      const stappen = Object.entries(stat?.hintTijd?.[rol] ?? {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, t]) => naStart(stat, t))
        .filter((t): t is string => t !== null);
      const wanneer = stappen.length
        ? `<br><span class="stats-sub">na ${stappen.join(' · ')}</span>`
        : '';
      return `${escHtml(label)}: stap ${hints[rol]}${wanneer}`;
    });
  return delen.length ? delen.join('<br>') : '-';
}

/** Aantal foute pogingen, met daaronder wat er geprobeerd werd. */
function foutTekst(stat: PuzzelStat | undefined): string {
  const pogingen = Object.values(stat?.invoer ?? {})
    .sort((a, b) => a.t - b.t)
    .map(i => `${escHtml(i.w)}${i.o === 'bijna' ? ' (bijna)' : ''}`);
  const lijst = pogingen.length ? `<br><span class="stats-sub">${pogingen.join(', ')}</span>` : '';
  return `${stat?.fout ?? 0}${lijst}`;
}

/**
 * Totale duur van één sessie: speeltijd (timer tot rapport) en, als de
 * lobby-tijd gekend is, de duur vanaf het openen van de lobby.
 */
export function sessieDuurHtml(data: Record<string, unknown>, versie?: string): string {
  const v = versie ? ` <span class="stats-versie">${escHtml(versie)}</span>` : '';
  const speeltijd = onderzoekstijd(data);
  if (speeltijd === null) {
    const label = typeof data.timerGestart === 'number' ? 'niet afgerond' : 'niet gestart';
    return `<p class="stats-duur">Speeltijd: <strong>-</strong> <span class="stats-sub">(${label})</span>${v}</p>`;
  }
  const rapport = data.rapport as { tijdstip?: unknown } | undefined;
  const geopend = data.geopendOp;
  const metLobby =
    typeof geopend === 'number' &&
    typeof rapport?.tijdstip === 'number' &&
    rapport.tijdstip > geopend
      ? ` · lobby tot einde: <strong>${formateerDuur(rapport.tijdstip - geopend)}</strong>`
      : '';
  return `<p class="stats-duur">Speeltijd: <strong>${formateerDuur(speeltijd)}</strong>${metLobby}${v}</p>`;
}

/** Aantal spelers in een sessie: wie een rol claimde, anders het geboekte aantal. */
export function aantalSpelers(data: Record<string, unknown>): number | null {
  const bezet = Object.keys((data.spelers as Record<string, unknown>) ?? {}).length;
  if (bezet > 0) return bezet;
  return typeof data.aantalSpelers === 'number' ? data.aantalSpelers : null;
}

/** Onder dit aantal sessies tonen we cijfers gedimd, met "weinig data". */
export const WEINIG_DATA = 5;

/** Streefduur: een sessie hoort minstens zo lang te duren. */
export const DOEL_SPEELTIJD_MS = 30 * 60 * 1000;

/** Mediaan van een niet-lege lijst. */
export function mediaan(waarden: number[]): number {
  const s = [...waarden].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
}

function tegel(label: string, waarde: string, sub: string): string {
  return `<div class="stats-tegel">
    <div class="stats-tegel-label">${label}</div>
    <div class="stats-tegel-waarde">${waarde}</div>
    <div class="stats-sub">${sub}</div>
  </div>`;
}

/**
 * Samenvatting bovenaan de speldata: vier tegels (afgerond, mediaan,
 * bereik, streefduur gehaald) en een kleine tabel per aantal spelers.
 * Mediaan in plaats van gemiddelde: één uitschieter (iemand die de
 * oplossingen kende) trekt het gemiddelde bij zo weinig sessies scheef.
 */
export function speeltijdOverzichtHtml(sessies: Record<string, unknown>[]): string {
  const gestart = sessies.filter(d => typeof d.timerGestart === 'number').length;
  const metDuur = sessies
    .map(d => ({ duur: onderzoekstijd(d), spelers: aantalSpelers(d) }))
    .filter((x): x is { duur: number; spelers: number | null } => x.duur !== null);
  if (metDuur.length === 0) {
    return `<p class="stats-leeg">Nog geen afgeronde sessies in deze selectie${
      gestart ? ` (${gestart} gestart)` : ''
    }.</p>`;
  }
  const duren = metDuur.map(x => x.duur);
  const n = duren.length;
  const gehaald = duren.filter(d => d >= DOEL_SPEELTIJD_MS).length;
  const weinig = n < WEINIG_DATA;
  const tegels = [
    tegel('Afgerond', String(n), `van ${gestart} gestart`),
    tegel(
      'Mediaan speeltijd',
      formateerDuur(mediaan(duren)),
      `gem. ${formateerDuur(duren.reduce((a, b) => a + b, 0) / n)}`,
    ),
    tegel(
      'Snelste – traagste',
      `${formateerDuur(Math.min(...duren))} – ${formateerDuur(Math.max(...duren))}`,
      'speeltijd',
    ),
    tegel(
      `Minstens ${DOEL_SPEELTIJD_MS / 60_000} min`,
      `${gehaald} / ${n}`,
      `${Math.round((gehaald / n) * 100)}% van de groepen`,
    ),
  ].join('');

  const perAantal = new Map<number, number[]>();
  for (const { duur, spelers } of metDuur) {
    if (spelers === null) continue;
    perAantal.set(spelers, [...(perAantal.get(spelers) ?? []), duur]);
  }
  const rijen = [...perAantal.entries()]
    .sort(([a], [b]) => a - b)
    .map(([aantal, d]) => {
      const klein = d.length < WEINIG_DATA;
      return `<tr${klein ? ' class="stats-weinig"' : ''}>
        <td>${aantal}${klein ? ' <span class="stats-sub">weinig data</span>' : ''}</td>
        <td>${d.length}</td>
        <td>${formateerDuur(mediaan(d))}</td>
        <td>${formateerDuur(Math.min(...d))}</td>
        <td>${formateerDuur(Math.max(...d))}</td>
      </tr>`;
    })
    .join('');
  const tabel = rijen
    ? `<table class="stats-tabel stats-spelers">
        <thead><tr><th>Spelers</th><th>Sessies</th><th>Mediaan</th><th>Snelste</th><th>Traagste</th></tr></thead>
        <tbody>${rijen}</tbody>
      </table>`
    : '';
  const melding = weinig
    ? `<p class="stats-sub stats-melding">Nog maar ${n} afgeronde ${
        n === 1 ? 'sessie' : 'sessies'
      }: zie dit als een eerste indruk, niet als conclusie.</p>`
    : '';
  return `<div class="stats-tegels${weinig ? ' stats-weinig' : ''}">${tegels}</div>${melding}${tabel}`;
}

/**
 * Details van één sessie: per puzzel de oplostijd, foute en bijna-pogingen
 * en de hoogste hintstap per rol. `rollen` = { sleutel: label }, bv.
 * { a: 'A', b: 'B' }.
 */
export function statsDetailHtml(
  stats: SessieStats | undefined,
  puzzels: string[],
  rollen: Record<string, string>,
): string {
  if (!stats || Object.keys(stats).length === 0) {
    return '<p class="stats-leeg">Nog geen speldata voor deze sessie.</p>';
  }
  const rijen = puzzels
    .map(p => {
      const s = stats[p];
      const status = s?.opgelost ? '' : s?.start ? ' <span class="stats-bezig">bezig</span>' : '';
      return `<tr>
        <td>${escHtml(p.toUpperCase())}${status}</td>
        <td>${formateerDuur(puzzelDuur(s))}</td>
        <td>${foutTekst(s)}</td>
        <td>${s?.bijna ?? 0}</td>
        <td>${hintsTekst(s, rollen)}</td>
      </tr>`;
    })
    .join('');
  return `<table class="stats-tabel">
    <thead><tr><th>Puzzel</th><th>Tijd</th><th>Fout</th><th>Bijna</th><th>Hints</th></tr></thead>
    <tbody>${rijen}</tbody>
  </table>`;
}

/**
 * Overzicht over alle sessies: gemiddelde oplostijd, pogingen en hoe vaak
 * een hint nodig was. De puzzel met de langste gemiddelde tijd krijgt een
 * markering.
 */
export function gemiddeldenHtml(alle: SessieStats[], puzzels: string[]): string {
  const gem = berekenGemiddelden(alle, puzzels);
  if (gem.every(g => g.aantal === 0 && g.gemFout === 0 && g.aandeelHint === 0)) {
    return '<p class="stats-leeg">Nog geen speldata. Die verschijnt na de eerste gespeelde sessie.</p>';
  }
  const zwaarste = moeilijkstePuzzel(gem);
  const rijen = gem
    .map(g => {
      const markering =
        g.puzzel === zwaarste ? ' <span class="stats-zwaarste">moeilijkst</span>' : '';
      return `<tr${g.puzzel === zwaarste ? ' class="stats-rij-zwaarste"' : ''}>
        <td>${escHtml(g.puzzel.toUpperCase())}${markering}</td>
        <td>${formateerDuur(g.gemDuurMs)}</td>
        <td>${g.gemFout.toFixed(1)}</td>
        <td>${g.gemBijna.toFixed(1)}</td>
        <td>${Math.round(g.aandeelHint * 100)}%</td>
        <td>${g.aantal}</td>
      </tr>`;
    })
    .join('');
  return `<table class="stats-tabel">
    <thead><tr>
      <th>Puzzel</th><th>Gem. tijd</th><th>Gem. fout</th><th>Gem. bijna</th>
      <th>Met hint</th><th>Sessies</th>
    </tr></thead>
    <tbody>${rijen}</tbody>
  </table>`;
}

/** CSS voor beide host-panels (één keer in de pagina zetten). */
