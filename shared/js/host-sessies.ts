/**
 * host-sessies.ts — gedeelde sessielijst-logica voor de host-panels.
 * Beide panels lezen alle sessies uit Firebase en filteren op ervaringsId;
 * de tabelopbouw (bolletjes, statusbadge, datum) stond eerder dubbel in
 * kamer-14/host-panel.ts en dua/host-panel.ts.
 *
 * Let op: het lezen van de volledige sessielijst vereist de host-leesregel
 * (`auth.provider === 'password'`) in firebase/database.rules.json.
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
    snap.forEach((kind) => {
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
  return ids.filter((id) => p[id]).length;
}

/** Voortgangsbolletjes als HTML (alleen vaste markup). */
export function puzzelBollenHtml(data: Record<string, unknown>, ids: string[]): string {
  const p = (data.puzzels as Record<string, unknown>) || {};
  return ids.map((id) => `<div class="bol ${p[id] ? 'klaar' : 'open'}"></div>`).join('');
}

/** Statusbadge als HTML (alleen vaste markup). */
export function statusBadgeHtml(data: Record<string, unknown>, aantalKlaar: number, totaal: number): string {
  if (!data.actief) return '<span class="badge-inactief">Inactief</span>';
  if (aantalKlaar === totaal) return '<span class="badge-klaar">Voltooid</span>';
  if (data.timerGestart) return '<span class="badge-bezig">Bezig</span>';
  return '<span class="badge-actief">Actief</span>';
}

/** Aanmaakdatum leesbaar (nl-BE), ge-escaped voor innerHTML. */
export function datumHtml(data: Record<string, unknown>): string {
  if (!data.aangemaakt) return '—';
  const datum = new Date(data.aangemaakt as number).toLocaleString('nl-BE', {
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
