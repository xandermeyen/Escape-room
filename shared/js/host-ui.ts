/**
 * host-ui.ts — gedeelde UI-helpers voor de host-panels.
 */

/** Escapet tekst voor veilige interpolatie in innerHTML. */
export function escHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/** Toont een tijdelijk statusbericht. ok = groen, anders rood. */
export function toonStatus(el: HTMLElement, tekst: string, ok: boolean, ms = 4000): void {
  el.textContent = tekst;
  el.className = 'status-bericht ' + (ok ? 'status-ok' : 'status-fout');
  el.style.display = 'block';
  setTimeout(() => {
    el.style.display = 'none';
  }, ms);
}

/** Foutmelding leesbaar maken zonder `any`. */
export function foutTekst(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Kopieert tekst naar het klembord, met optionele knop-feedback (vinkje).
 * Wisselt alleen de icoon-klasse i.p.v. innerHTML, zodat er geen onveilige
 * markup-toewijzing nodig is.
 */
export async function kopieerNaarKlembord(tekst: string, knop?: HTMLElement): Promise<void> {
  await navigator.clipboard.writeText(tekst).catch(() => {});
  if (!knop) return;
  const icoon = knop.querySelector('i');
  if (!icoon) return;
  const oudeKlasse = icoon.className;
  icoon.className = 'bi bi-check2';
  knop.style.color = '#7dc47d';
  setTimeout(() => {
    icoon.className = oudeKlasse;
    knop.style.color = '';
  }, 1800);
}
