import { sluitSessieUitUrl } from '../../../shared/js/tijd-voorbij.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { duaOplossing } from './dua-oplossing.ts';

// De oplossing, zodat ook groepen die niet klaar raakten het verhaal kennen.
// Verborgen tot vaststaat dat de tijd echt om is: een code in de URL volstaat niet.
const lijst = document.getElementById('oplossing-lijst');
const blok = document.getElementById('oplossing-blok');
if (blok) blok.hidden = true;
void sluitSessieUitUrl().then(mag => {
  if (!mag || !lijst || !blok) return;
  for (const zin of duaOplossing()) {
    const li = document.createElement('li');
    li.textContent = zin;
    lijst.appendChild(li);
  }
  blok.hidden = false;
});

koppelReviewFormulier('dua', new URLSearchParams(window.location.search).get('sessie'));
