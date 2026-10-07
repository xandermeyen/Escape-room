import { sluitSessieUitUrl } from '../../../shared/js/tijd-voorbij.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { kamer14Oplossing } from './kamer14-oplossing.ts';

sluitSessieUitUrl();

// De oplossing, zodat ook groepen die niet klaar raakten het verhaal kennen.
// Alleen met een sessiecode in de URL (die sessie is nu gesloten).
const lijst = document.getElementById('oplossing-lijst');
const blok = document.getElementById('oplossing-blok');
if (new URLSearchParams(window.location.search).get('sessie') && lijst) {
  for (const zin of kamer14Oplossing()) {
    const li = document.createElement('li');
    li.textContent = zin;
    lijst.appendChild(li);
  }
} else if (blok) {
  blok.hidden = true;
}

// Review na de briefkaart, ook voor wie de tijd niet haalde.
koppelReviewFormulier('kamer-14');
