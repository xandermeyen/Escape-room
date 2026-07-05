/**
 * deel.ts — "deel je resultaat"-knop op de eindschermen.
 * Mobiel opent het native deelvenster; desktop kopieert de tekst naar het
 * klembord. Spelers die hun score delen zijn de goedkoopste marketing.
 */
export function koppelDeelKnop(knopId: string, maakTekst: () => string): void {
  const knop = document.getElementById(knopId) as HTMLButtonElement | null;
  if (!knop) return;

  const origineleTekst = knop.textContent ?? '';

  knop.addEventListener('click', async () => {
    const tekst = maakTekst();

    if (navigator.share) {
      try {
        await navigator.share({ text: tekst });
      } catch {
        // Deelvenster geannuleerd — geen fallback nodig.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(tekst);
      knop.textContent = 'Gekopieerd — plak het in je groepschat!';
    } catch {
      return; // klembord geweigerd; knop ongemoeid laten
    }
    setTimeout(() => {
      knop.textContent = origineleTekst;
    }, 4000);
  });
}
