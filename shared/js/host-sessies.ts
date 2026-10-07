/**
 * host-sessies.ts — gedeelde sessielijst-logica voor de host-panels.
 * Beide panels lezen alle sessies uit Firebase en filteren op ervaringsId;
 * de tabelopbouw (bolletjes, statusbadge, datum) stond eerder dubbel in
 * kamer-14/host-panel.ts en dua/host-panel.ts.
 *
 * Let op: het lezen van de volledige sessielijst mag alleen een beheerder
 * (`beheerders/<uid>` in firebase/database.rules.json).
 */
import { db } from './firebase-config.ts';
import { ref, get } from 'firebase/database';
import { escHtml } from './utils.ts';

export interface SessieRij {
  code: string;
  data: Record<string, unknown>;
}

/** Haalt alle sessies op die aan `filter` voldoen, nieuwste eerst. */
export async function haalSessies(
  filter: (data: Record<string, unknown>) => boolean,
): Promise<SessieRij[]> {
  const snap = await get(ref(db, 'sessions'));
  const rijen: SessieRij[] = [];
  if (snap.exists()) {
    snap.forEach(kind => {
      const d = kind.val();
      if (d && typeof d === 'object' && filter(d as Record<string, unknown>)) {
        rijen.push({ code: kind.key ?? '', data: d as Record<string, unknown> });
      }
    });
  }
  rijen.sort((a, b) => ((b.data.aangemaakt as number) ?? 0) - ((a.data.aangemaakt as number) ?? 0));
  return rijen;
}

/** Aantal opgeloste puzzels binnen `ids`. */
export function aantalOpgelost(data: Record<string, unknown>, ids: string[]): number {
  const p = (data.puzzels as Record<string, unknown>) || {};
  return ids.filter(id => p[id]).length;
}

/** Voortgangsbolletjes als HTML (alleen vaste markup). */
export function puzzelBollenHtml(data: Record<string, unknown>, ids: string[]): string {
  const p = (data.puzzels as Record<string, unknown>) || {};
  return ids.map(id => `<div class="bol ${p[id] ? 'klaar' : 'open'}"></div>`).join('');
}

/** Na hoeveel tijd een sessie die nog op actief staat als verlopen telt. */
export const VERLOOPT_NA_MS = 24 * 60 * 60 * 1000;

/**
 * isVerlopen: actief, nog geen rapport ingediend en meer dan `naMs` geleden
 * aangemaakt. Puur weergave in het host-paneel: de sessie zelf blijft in
 * Firebase actief (automatisch sluiten vraagt een geplande Cloud Function).
 */
export function isVerlopen(
  data: Record<string, unknown>,
  nu: number = Date.now(),
  naMs: number = VERLOOPT_NA_MS,
): boolean {
  if (data.actief !== true) return false;
  const rapport = data.rapport as { ingediend?: boolean } | undefined;
  if (rapport?.ingediend) return false;
  const aangemaakt = data.aangemaakt;
  return typeof aangemaakt === 'number' && nu - aangemaakt > naMs;
}

export interface StatusOpties {
  /** Toon 'Verlopen' voor actieve sessies ouder dan 24 uur. */
  toonVerlopen?: boolean;
  /** Huidig tijdstip (voor tests). */
  nu?: number;
}

/** Statusbadge als HTML (alleen vaste markup). */
export function statusBadgeHtml(
  data: Record<string, unknown>,
  aantalKlaar: number,
  totaal: number,
  opties: StatusOpties = {},
): string {
  if (!data.actief) return '<span class="badge-inactief">Inactief</span>';
  if (aantalKlaar === totaal) return '<span class="badge-klaar">Voltooid</span>';
  if (opties.toonVerlopen && isVerlopen(data, opties.nu)) {
    return '<span class="badge-verlopen" title="Meer dan 24 uur oud en nog actief">Verlopen</span>';
  }
  if (data.timerGestart) return '<span class="badge-bezig">Bezig</span>';
  return '<span class="badge-actief">Actief</span>';
}

/** Aanmaakdatum leesbaar (nl-BE), ge-escaped voor innerHTML. */
export function datumHtml(data: Record<string, unknown>): string {
  return tijdstipHtml(data.aangemaakt);
}

/** Moment waarop de code de lobby voor het eerst opende, of '—'. */
export function geopendHtml(data: Record<string, unknown>): string {
  return tijdstipHtml(data.geopendOp);
}

/** Firebase-tijdstip (ms) leesbaar (nl-BE), ge-escaped voor innerHTML. */
export function tijdstipHtml(waarde: unknown): string {
  if (typeof waarde !== 'number' || !waarde) return '—';
  const datum = new Date(waarde).toLocaleString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return escHtml(datum);
}

/** Lobby-link-cel met kopieerknop en open-knop (code/URL ge-escaped). */
export function lobbyLinkHtml(lobbyPad: string, code: string): string {
  const url = `${window.location.origin}${lobbyPad}?sessie=${encodeURIComponent(code)}`;
  const veiligeUrl = escHtml(url);
  return `
    <input class="link-input" readonly value="${veiligeUrl}" />
    <button class="kopieer-knop" title="Kopieer lobby-link" onclick="kopieer('${veiligeUrl}', this)">
      <i class="bi bi-clipboard"></i>
    </button>
    <a href="${veiligeUrl}" target="_blank" rel="noopener noreferrer" class="kopieer-knop" title="Open lobby">
      <i class="bi bi-box-arrow-up-right"></i>
    </a>`;
}
