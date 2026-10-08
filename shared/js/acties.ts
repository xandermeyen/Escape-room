/**
 * acties.ts: één klik-afhandeling per pagina in plaats van onclick="..."
 * in de HTML en functies op window.
 *
 * In de HTML: <button data-actie="hint">, <div data-actie="kies-rol" data-rol="a">.
 * In de code:  koppelActies({ hint: el => ..., 'kies-rol': el => ... });
 *
 * Voordelen: geen globale functies, gegevens als data-attributen in plaats van
 * JavaScript-strings in attributen (veiliger bij gegenereerde HTML zoals het
 * host-paneel), en het werkt ook voor knoppen die later in de pagina komen.
 */
export type ActieHandler = (el: HTMLElement, e: Event) => void;

export function koppelActies(
  handlers: Record<string, ActieHandler>,
  root: Document | HTMLElement = document,
): () => void {
  const opKlik = (e: Event) => {
    const doel = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-actie]') : null;
    if (!doel || !root.contains(doel)) return;
    const handler = handlers[doel.dataset['actie'] ?? ''];
    if (!handler) return;
    handler(doel, e);
  };
  root.addEventListener('click', opKlik);
  return () => root.removeEventListener('click', opKlik);
}

/** Het hint-blok waar een hintknop in zit (voor data-actie="hint"). */
export function hintBlokVan(el: HTMLElement): string | null {
  return el.closest<HTMLElement>('.hint-blok')?.id ?? null;
}
