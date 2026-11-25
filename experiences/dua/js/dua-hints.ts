/**
 * dua-hints.ts: de hintteksten van D.U.A., per hint-blok.
 *
 * Ze staan hier en niet in de HTML: wie de paginabron opent, ziet ze zo niet
 * meteen staan (vroeger stond de laatste stap, met het antwoord, gewoon in de
 * bron). De HTML bevat per blok enkel lege stappen. Een stap krijgt zijn tekst
 * pas als hij zichtbaar wordt, via de hintknop of het herstel na een herlaad.
 */
import { tekst } from './dua-tekst.ts';
import { nl } from './teksten/nl.ts';

/** De hints in het Nederlands (de bron). In de game: tekst().hints, in de speltaal. */
export const DUA_HINTS: Record<string, readonly string[]> = nl.hints;

/** Geeft elke zichtbare, nog lege hintstap zijn tekst. */
export function vulZichtbareHints(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.hint-blok[id]').forEach(blok => {
    const teksten = (tekst().hints as Record<string, readonly string[]>)[blok.id];
    if (!teksten) return;
    blok.querySelectorAll<HTMLElement>('.hint-stap').forEach((stap, i) => {
      if (stap.classList.contains('verborgen') || stap.textContent?.trim()) return;
      stap.textContent = teksten[i] ?? '';
    });
  });
}

/** Vult een stap zodra hij zichtbaar wordt, langs welke weg ook. */
export function bewaakHints(root: HTMLElement = document.body): MutationObserver {
  vulZichtbareHints(root);
  const kijker = new MutationObserver(() => vulZichtbareHints(root));
  kijker.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
  return kijker;
}
