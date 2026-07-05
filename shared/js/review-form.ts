/**
 * review-form.ts — gedeeld reviewformulier voor de eindschermen.
 * Verwacht in de HTML: #review-sterren met .ster-knoppen (data-waarde 1–5),
 * #review-tekst, #review-naam, #review-fout, #review-dank en
 * #btn-review-verstuur. Ontbreken die elementen, dan doet dit niets.
 */
import { schrijfReview } from './reviews.ts';

export function koppelReviewFormulier(ervaring: string): void {
  const reviewBtn = document.getElementById('btn-review-verstuur') as HTMLButtonElement | null;
  const sterKnoppen = Array.from(
    document.querySelectorAll<HTMLButtonElement>('#review-sterren .ster'),
  );
  if (!reviewBtn || sterKnoppen.length === 0) return;

  let reviewRating = 0;

  function tekenSterren(): void {
    sterKnoppen.forEach((knop, i) => {
      const actief = i < reviewRating;
      knop.textContent = actief ? '★' : '☆';
      knop.classList.toggle('actief', actief);
    });
  }

  sterKnoppen.forEach((knop) => {
    knop.addEventListener('click', () => {
      reviewRating = Number(knop.dataset.waarde);
      tekenSterren();
    });
  });

  reviewBtn.addEventListener('click', async () => {
    const tekstVeld = document.getElementById('review-tekst') as HTMLTextAreaElement | null;
    const naamVeld = document.getElementById('review-naam') as HTMLInputElement | null;
    const fout = document.getElementById('review-fout');
    const tekst = tekstVeld?.value.trim() ?? '';
    const naam = naamVeld?.value.trim() ?? '';

    if (reviewRating < 1 || tekst.length < 3) {
      if (fout) {
        fout.textContent = 'Kies een aantal sterren en schrijf een korte review.';
        fout.style.display = 'block';
      }
      return;
    }
    if (fout) fout.style.display = 'none';

    reviewBtn.disabled = true;
    reviewBtn.textContent = 'Versturen…';

    try {
      await schrijfReview({
        rating: reviewRating,
        tekst,
        naam: naam || undefined,
        ervaring,
      });

      sterKnoppen.forEach((k) => (k.disabled = true));
      if (tekstVeld) tekstVeld.disabled = true;
      if (naamVeld) naamVeld.disabled = true;
      reviewBtn.style.display = 'none';

      const dank = document.getElementById('review-dank');
      if (dank) dank.style.display = 'block';
    } catch (err) {
      console.error('Review versturen mislukt:', err);
      reviewBtn.disabled = false;
      reviewBtn.textContent = 'Review versturen';
      if (fout) {
        fout.textContent = 'Versturen mislukt. Probeer opnieuw.';
        fout.style.display = 'block';
      }
    }
  });
}
