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
export function sessieDuurHtml(data: Record<string, unknown>): string {
  const speeltijd = onderzoekstijd(data);
  if (speeltijd === null) {
    const label = typeof data.timerGestart === 'number' ? 'niet afgerond' : 'niet gestart';
    return `<p class="stats-duur">Speeltijd: <strong>-</strong> <span class="stats-sub">(${label})</span></p>`;
  }
  const rapport = data.rapport as { tijdstip?: unknown } | undefined;
  const geopend = data.geopendOp;
  const metLobby =
    typeof geopend === 'number' && typeof rapport?.tijdstip === 'number' && rapport.tijdstip > geopend
      ? ` · lobby tot einde: <strong>${formateerDuur(rapport.tijdstip - geopend)}</strong>`
      : '';
  return `<p class="stats-duur">Speeltijd: <strong>${formateerDuur(speeltijd)}</strong>${metLobby}</p>`;
}

/** Aantal spelers in een sessie: wie een rol claimde, anders het geboekte aantal. */
export function aantalSpelers(data: Record<string, unknown>): number | null {
  const bezet = Object.keys((data.spelers as Record<string, unknown>) ?? {}).length;
  if (bezet > 0) return bezet;
  return typeof data.aantalSpelers === 'number' ? data.aantalSpelers : null;
}

function speeltijdRegel(label: string, duren: number[]): string {
  const gem = duren.reduce((a, b) => a + b, 0) / duren.length;
  return `<p class="stats-duur">${label}: <strong>${formateerDuur(gem)}</strong>
    · snelste ${formateerDuur(Math.min(...duren))}
    · traagste ${formateerDuur(Math.max(...duren))}
    <span class="stats-sub">(${duren.length} afgerond)</span></p>`;
}

/**
 * Speeltijd over alle afgeronde sessies (gemiddelde, snelste, traagste),
 * totaal en per aantal spelers.
 */
export function speeltijdOverzichtHtml(sessies: Record<string, unknown>[]): string {
  const metDuur = sessies
    .map(d => ({ duur: onderzoekstijd(d), spelers: aantalSpelers(d) }))
    .filter((x): x is { duur: number; spelers: number | null } => x.duur !== null);
  if (metDuur.length === 0) {
    return '<p class="stats-duur">Gem. speeltijd: <strong>-</strong> <span class="stats-sub">(nog geen afgeronde sessies)</span></p>';
  }
  const perAantal = new Map<number, number[]>();
  for (const { duur, spelers } of metDuur) {
    if (spelers === null) continue;
    perAantal.set(spelers, [...(perAantal.get(spelers) ?? []), duur]);
  }
  const groepen = [...perAantal.entries()]
    .sort(([a], [b]) => a - b)
    .map(([n, duren]) => speeltijdRegel(`Met ${n} ${n === 1 ? 'speler' : 'spelers'}`, duren))
    .join('');
  return speeltijdRegel('Gem. speeltijd', metDuur.map(x => x.duur)) + groepen;
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
