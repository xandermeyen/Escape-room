import { sluitSessieUitUrl } from '../../../shared/js/tijd-voorbij.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { kamer14Oplossing } from './kamer14-oplossing.ts';

sluitSessieUitUrl();

// ── Nieuwe post: na 4 seconden verschijnt de briefkaart van Lena ──
export const WACHT_OP_POST_MS = 4000;

export function toonBriefkaart(): void {
  const notif = document.getElementById('nieuwe-post-notif');
  const blok = document.getElementById('briefkaart-blok');
  if (notif) notif.style.display = 'none';
  if (!blok) return;
  blok.classList.remove('verborgen');
  setTimeout(() => blok.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

const notif = document.getElementById('nieuwe-post-notif');
if (notif) {
  notif.addEventListener('click', toonBriefkaart);
  // Ook toegankelijk via toetsenbord (role="button")
  notif.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toonBriefkaart();
    }
  });
  setTimeout(() => notif.classList.remove('verborgen'), WACHT_OP_POST_MS);
}

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
koppelReviewFormulier('kamer-14', new URLSearchParams(window.location.search).get('sessie'));
