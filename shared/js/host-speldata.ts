/**
 * host-speldata.ts — de speldata-kaart van beide host-panels: versiekeuze,
 * samenvatting (tegels + per aantal spelers) en de tabel per puzzel.
 *
 * Standaard staat de nieuwste versie geselecteerd, zodat oude sessies de
 * cijfers niet vertroebelen. "Alle versies" blijft één klik weg.
 */
import { requireEl, escHtml } from './utils.ts';
import { gemiddeldenHtml, speeltijdOverzichtHtml } from './host-stats.ts';
import type { SessieStats } from './speldata.ts';
import {
  ALLE_VERSIES,
  filterOpVersie,
  huidigeVersie,
  versieVan,
  type Versie,
  type VersieKeuze,
} from './versies.ts';

type Rij = { code: string; data: Record<string, unknown> };

function datumKort(ms: number): string {
  return new Date(ms).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' });
}

/** Tekst onder de keuzelijst: wat er in die versie veranderde. */
export function versieUitleg(versies: Versie[], keuze: VersieKeuze): string {
  if (keuze === ALLE_VERSIES) return 'Alle sessies, over alle versies heen.';
  const v = versies.find(x => x.id === keuze);
  return v ? `Sinds ${datumKort(v.vanaf)}: ${v.wat}` : '';
}

export function koppelSpeldata(versies: Versie[], puzzels: string[]) {
  const keuzeEl = requireEl<HTMLSelectElement>('versie-keuze');
  const huidige = huidigeVersie(versies);
  let keuze: VersieKeuze = huidige?.id ?? ALLE_VERSIES;
  let rijen: Rij[] = [];

  // Veilig: id's en datums komen uit de eigen config en gaan door escHtml.
  // eslint-disable-next-line no-unsanitized/property
  keuzeEl.innerHTML =
    [...versies]
      .sort((a, b) => b.vanaf - a.vanaf)
      .map(
        v =>
          `<option value="${escHtml(v.id)}">${escHtml(v.id)} · sinds ${datumKort(v.vanaf)}${
            v.id === huidige?.id ? ' (huidig)' : ''
          }</option>`,
      )
      .join('') + `<option value="${ALLE_VERSIES}">Alle versies</option>`;
  keuzeEl.value = keuze;
  keuzeEl.addEventListener('change', () => {
    keuze = keuzeEl.value;
    toon();
  });

  function toon(): void {
    const gekozen = filterOpVersie(rijen, versies, keuze);
    requireEl('versie-uitleg').textContent = versieUitleg(versies, keuze);
    const stats = gekozen
      .map(({ data }) => data.stats as SessieStats | undefined)
      .filter((st): st is SessieStats => !!st);
    // Veilig: enkel getallen en vaste markup.
    // eslint-disable-next-line no-unsanitized/property
    requireEl('stats-samenvatting').innerHTML = speeltijdOverzichtHtml(gekozen.map(r => r.data));
    // eslint-disable-next-line no-unsanitized/property
    requireEl('stats-overzicht').innerHTML = gemiddeldenHtml(stats, puzzels);
  }

  return {
    /** Nieuwe sessielijst (zonder demo's) tonen met de huidige keuze. */
    toon(nieuw: Rij[]): void {
      rijen = nieuw;
      toon();
    },
    /** Versielabel voor één sessie, voor in de details. */
    label(data: Record<string, unknown>): string | undefined {
      return versieVan(data, versies)?.id;
    },
    /** Sessies van de huidige versie, voor "sneller dan X%" op het eindscherm. */
    vanHuidigeVersie(alle: Rij[]): Rij[] {
      return huidige ? filterOpVersie(alle, versies, huidige.id) : alle;
    },
  };
}
