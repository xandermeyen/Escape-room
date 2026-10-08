/**
 * host-verlopen.ts: knop "Verlopen sessies sluiten (n)" in de host-panels.
 * Gedeeld door Kamer 14 en D.U.A. Welke sessies verlopen zijn en hoe ze
 * gesloten worden, staat in host-sessies.ts (verlopenCodes, sluitSessies).
 */
import { verlopenCodes, sluitSessies, type SessieRij } from './host-sessies.ts';
import { toonStatus, foutTekst } from './host-ui.ts';
import { requireEl } from './utils.ts';

export interface VerlopenKnop {
  /** Na elke lijstopbouw: telt de verlopen sessies en toont of verbergt de knop. */
  bijLijst: (rijen: SessieRij[]) => void;
  /** Klik op de knop: bevestigen, sluiten, lijst herladen. */
  sluit: () => Promise<void>;
}

export function maakVerlopenKnop(herlaad: () => void): VerlopenKnop {
  let teSluiten: string[] = [];

  function bijLijst(rijen: SessieRij[]): void {
    teSluiten = verlopenCodes(rijen);
    const knop = requireEl<HTMLButtonElement>('btn-sluit-verlopen');
    knop.hidden = teSluiten.length === 0;
    knop.textContent = `Verlopen sessies sluiten (${teSluiten.length})`;
  }

  async function sluit(): Promise<void> {
    const status = requireEl('status-verlopen');
    const knop = requireEl<HTMLButtonElement>('btn-sluit-verlopen');
    const codes = [...teSluiten];
    if (codes.length === 0) return;
    if (
      !confirm(
        `${codes.length} sessie(s) sluiten die meer dan 24 uur geleden geopend werden en geen rapport hebben?\n\n${codes.join(', ')}`,
      )
    )
      return;
    knop.disabled = true;
    try {
      const aantal = await sluitSessies(codes);
      toonStatus(status, `✓ ${aantal} verlopen sessie(s) gesloten.`, true);
      herlaad();
    } catch (err) {
      console.error('Verlopen sessies sluiten mislukt:', err);
      toonStatus(status, 'Sluiten mislukt: ' + foutTekst(err), false);
    } finally {
      knop.disabled = false;
    }
  }

  return { bijLijst, sluit };
}
