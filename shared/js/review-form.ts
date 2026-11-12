/**
 * review-form.ts — gedeeld reviewformulier voor de eindschermen.
 * Verwacht in de HTML: #review-sterren met .ster-knoppen (data-waarde 1–5),
 * #review-tekst, #review-naam, #review-fout, #review-dank en
 * #btn-review-verstuur. Ontbreken die elementen, dan doet dit niets.
 *
 * Bij een lage score (1 tot 3 sterren) verschijnt een extra, optioneel veld
 * "Wat kan beter?". Dat komt enkel in het host-paneel, nooit op de site. De
 * review zelf wordt gewoon bewaard, ook als ze laag is.
 *
 * Onder het formulier staat een uitnodiging om ook op escapetalk.nl een review
 * te schrijven. Bewust voor iedereen, ongeacht de score: alleen tevreden
 * spelers doorsturen ("review gating") maakt de score daar minder geloofwaardig.
 * Na het versturen gaat de reviewtekst naar het klembord, zodat plakken volstaat.
 */
import { schrijfReview } from './reviews.ts';
import { isDemoCode } from './demo.ts';

/** Tot en met deze score vragen we wat er beter kan. */
export const LAGE_SCORE = 3;

/** De pagina van elke experience op escapetalk.nl. */
export const ESCAPETALK: Record<string, string> = {
  'kamer-14': 'https://escapetalk.nl/games/bureau-x/kamer-14/',
  dua: 'https://escapetalk.nl/games/bureau-x/dua/',
};

/** Maakt de uitnodiging voor escapetalk onder het formulier (één keer). */
function bouwEscapetalk(ervaring: string): HTMLParagraphElement | null {
  const url = ESCAPETALK[ervaring];
  const dank = document.getElementById('review-dank');
  if (!url || !dank) return null;
  const bestaand = document.getElementById('review-escapetalk') as HTMLParagraphElement | null;
  if (bestaand) return bestaand;
  const blok = document.createElement('p');
  blok.id = 'review-escapetalk';
  blok.className = 'review-escapetalk';
  const tekst = document.createElement('span');
  tekst.textContent = 'Een review op escapetalk.nl helpt andere spelers ons te vinden. ';
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Review op escapetalk';
  blok.append(tekst, link);
  dank.insertAdjacentElement('afterend', blok);
  return blok;
}

/** Na het versturen: de tekst naar het klembord en de uitnodiging iets duidelijker. */
async function nodigUitNaVersturen(
  blok: HTMLParagraphElement | null,
  tekst: string,
): Promise<void> {
  const zin = blok?.querySelector('span');
  if (!blok || !zin) return;
  let gekopieerd: boolean;
  try {
    await navigator.clipboard?.writeText(tekst);
    gekopieerd = Boolean(navigator.clipboard);
  } catch {
    gekopieerd = false;
  }
  zin.textContent = gekopieerd
    ? 'Wil je hem ook op escapetalk.nl zetten? Je tekst staat al op je klembord, plakken volstaat. '
    : 'Wil je hem ook op escapetalk.nl zetten? Dat helpt andere spelers ons te vinden. ';
}

/** Maakt het verbeterveld aan onder het reviewtekstveld (één keer). */
function bouwVerbeterVeld(): HTMLTextAreaElement | null {
  const bestaand = document.getElementById('review-verbeter') as HTMLTextAreaElement | null;
  if (bestaand) return bestaand;
  const tekstVeld = document.getElementById('review-tekst');
  if (!tekstVeld) return null;
  const blok = document.createElement('div');
  blok.id = 'review-verbeter-blok';
  blok.hidden = true;
  const label = document.createElement('label');
  label.htmlFor = 'review-verbeter';
  label.className = 'review-verbeter-label';
  label.textContent = 'Wat kan beter? Optioneel, dit lezen enkel wij.';
  const veld = document.createElement('textarea');
  veld.id = 'review-verbeter';
  veld.rows = 3;
  veld.maxLength = 500;
  veld.className = tekstVeld.className;
  veld.placeholder = 'Bv. een puzzel die onduidelijk was, of iets dat niet werkte';
  blok.append(label, veld);
  tekstVeld.insertAdjacentElement('afterend', blok);
  return veld;
}

export function koppelReviewFormulier(ervaring: string, sessie?: string | null): void {
  const reviewBtn = document.getElementById('btn-review-verstuur') as HTMLButtonElement | null;
  const sterKnoppen = Array.from(
    document.querySelectorAll<HTMLButtonElement>('#review-sterren .ster'),
  );
  if (!reviewBtn || sterKnoppen.length === 0) return;

  // Demo-sessies: reviews tellen niet mee en worden niet bewaard.
  if (isDemoCode(sessie)) {
    sterKnoppen.forEach(k => (k.disabled = true));
    reviewBtn.disabled = true;
    const melding = document.createElement('p');
    melding.className = 'review-demo';
    melding.textContent = 'Demomodus: reviews worden niet bewaard.';
    reviewBtn.insertAdjacentElement('beforebegin', melding);
    return;
  }

  let reviewRating = 0;
  const verbeterVeld = bouwVerbeterVeld();
  const escapetalk = bouwEscapetalk(ervaring);

  function tekenSterren(): void {
    sterKnoppen.forEach((knop, i) => {
      const actief = i < reviewRating;
      knop.textContent = actief ? '★' : '☆';
      knop.classList.toggle('actief', actief);
      knop.setAttribute('aria-checked', String(i + 1 === reviewRating));
    });
    const blok = document.getElementById('review-verbeter-blok');
    if (blok) blok.hidden = !(reviewRating > 0 && reviewRating <= LAGE_SCORE);
  }

  sterKnoppen.forEach(knop => {
    knop.setAttribute('role', 'radio');
    knop.setAttribute('aria-checked', 'false');
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
    const verbeter = reviewRating <= LAGE_SCORE ? (verbeterVeld?.value.trim() ?? '') : '';

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
        verbeter: verbeter || undefined,
        ervaring,
      });

      sterKnoppen.forEach(k => (k.disabled = true));
      if (tekstVeld) tekstVeld.disabled = true;
      if (naamVeld) naamVeld.disabled = true;
      if (verbeterVeld) verbeterVeld.disabled = true;
      reviewBtn.style.display = 'none';

      const dank = document.getElementById('review-dank');
      if (dank) dank.style.display = 'block';
      await nodigUitNaVersturen(escapetalk, tekst);
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
