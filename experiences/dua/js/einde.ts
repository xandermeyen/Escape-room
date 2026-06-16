/**
 * einde.ts (D.U.A.) — de cirkel sluit zich.
 * Toont brief 14 (1934) en het rapport (2034) naast elkaar zodra beide klaar zijn,
 * plus de eindstatistieken: resttijd, hints, verdenking en insignes.
 */
import '../../../shared/js/sentry.ts';
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, onValue } from 'firebase/database';
import { formateerTijd, TIJDSLIMIET_MS } from '../../../shared/js/timer.ts';
import { haalEinde } from './dua-session.ts';
import { fx } from './dua-audio.ts';

const AANTAL_EGGS = 6;

const sessie = new URLSearchParams(window.location.search).get('sessie');
if (!sessie) window.location.href = 'index.html';

document.getElementById('sys-case')!.textContent = `D.U.A. · eindrapport · Sessie ${sessie}`;

document.getElementById('btn-terug')?.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

let klokGeluid = false;
let statsGetoond = false;

async function vernieuw(): Promise<void> {
  const data = await haalEinde(sessie!);

  // Beide teksten (live bijgewerkt)
  const briefEl = document.getElementById('einde-brief')!;
  const rapportEl = document.getElementById('einde-rapport')!;
  if (data.brief14Klaar) {
    briefEl.textContent = data.brief14Tekst;
    briefEl.classList.remove('hintje');
  }
  if (data.rapportIngediend) {
    rapportEl.textContent = data.rapportTekst;
    rapportEl.classList.remove('hintje');
  }

  const wacht = document.getElementById('wacht-status')!;
  if (!data.brief14Klaar || !data.rapportIngediend) {
    wacht.textContent = !data.brief14Klaar
      ? 'Wachten op 1934: de veertiende brief is nog niet verzegeld…'
      : 'Wachten op 2034: het rapport is nog niet ingediend…';
    return;
  }

  // Beide klaar → onthulling + stats
  wacht.textContent = 'De brief uit 1934 en het rapport uit 2034 liggen naast elkaar. Jullie waren D.U.A. Allebei. Altijd al.';
  document.getElementById('einde-onthulling')?.classList.remove('verborgen');

  if (!klokGeluid) { klokGeluid = true; fx.kerkklok(5, true); }
  if (statsGetoond) return;
  statsGetoond = true;

  const statsEl = document.getElementById('einde-stats')!;
  let resttijd = '--:--';
  if (data.timerGestart && data.rapportTijdstip) {
    const duur = Math.max(0, data.rapportTijdstip - data.timerGestart);
    resttijd = formateerTijd(Math.max(0, TIJDSLIMIET_MS - (data.meta.strafMs || 0) - duur));
  }
  // Veilig: alle interpolaties zijn numerieke spelstatus of geformatteerde tijd,
  // geen vrije spelertekst.
  // eslint-disable-next-line no-unsanitized/property
  statsEl.innerHTML =
    `<div class="d-stat"><b>${resttijd}</b><span>Resttijd</span></div>` +
    `<div class="d-stat"><b>${data.meta.hints || 0}</b><span>Hints gebruikt</span></div>` +
    `<div class="d-stat"><b>${data.meta.verdenking || 0}%</b><span>Eindverdenking</span></div>` +
    `<div class="d-stat"><b>${data.badges}/${AANTAL_EGGS}</b><span>Insignes</span></div>`;
  statsEl.style.display = 'flex';
}

// Live: vernieuw zodra brief14 of rapport binnenkomt
onValue(ref(db, `sessions/${sessie}/dua/brief14`), () => { vernieuw(); });
onValue(ref(db, `sessions/${sessie}/rapport/ingediend`), () => { vernieuw(); });
