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

/** 754000 → "12:34", null → "—". */
export function formateerDuur(ms: number | null): string {
  if (ms === null) return '—';
  const sec = Math.round(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

function hintsTekst(stat: PuzzelStat | undefined, rollen: Record<string, string>): string {
  const hints = stat?.hints ?? {};
  const delen = Object.entries(rollen)
    .filter(([rol]) => hints[rol])
    .map(([rol, label]) => `${escHtml(label)} ${hints[rol]}`);
  return delen.length ? delen.join(' · ') : '—';
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
        <td>${s?.fout ?? 0}</td>
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
