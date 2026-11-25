import { sluitSessieUitUrl } from '../../../shared/js/tijd-voorbij.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { duaOplossing } from './dua-oplossing.ts';
import { speelStem } from './dua-stemmen.ts';
import { startDua } from './dua-start.ts';
import { duaTaal } from './dua-tekst.ts';

// Eerst de taal van de sessie en de vertaalde pagina, dan pas de rest (ADR-001, G1).
await startDua();

// De oplossing, zodat ook groepen die niet klaar raakten het verhaal kennen.
// Verborgen tot vaststaat dat de tijd echt om is: een code in de URL volstaat niet.
const lijst = document.getElementById('oplossing-lijst');
const blok = document.getElementById('oplossing-blok');
if (blok) blok.hidden = true;
void sluitSessieUitUrl().then(mag => {
  if (!mag || !lijst || !blok) return;
  for (const zin of duaOplossing(duaTaal())) {
    const li = document.createElement('li');
    li.textContent = zin;
    lijst.appendChild(li);
  }
  blok.hidden = false;
});

koppelReviewFormulier('dua', new URLSearchParams(window.location.search).get('sessie'));

speelStem('tijd-voorbij');
