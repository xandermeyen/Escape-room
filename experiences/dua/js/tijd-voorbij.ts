import { sluitSessieUitUrl } from '../../../shared/js/tijd-voorbij.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { duaOplossing } from './dua-oplossing.ts';

sluitSessieUitUrl();

// De oplossing, zodat ook groepen die niet klaar raakten het verhaal kennen.
const lijst = document.getElementById('oplossing-lijst');
const blok = document.getElementById('oplossing-blok');
if (new URLSearchParams(window.location.search).get('sessie') && lijst) {
  for (const zin of duaOplossing()) {
    const li = document.createElement('li');
    li.textContent = zin;
    lijst.appendChild(li);
  }
} else if (blok) {
  blok.hidden = true;
}

koppelReviewFormulier('dua');
