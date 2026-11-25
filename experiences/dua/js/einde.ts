/**
 * einde.ts (D.U.A.) — de cirkel sluit zich.
 * Toont brief 14 (1934) en het rapport (2034) naast elkaar zodra beide klaar zijn,
 * plus de eindstatistieken: resttijd, hints, verdenking en insignes.
 */
import '../../../shared/js/sentry.ts';
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, onValue } from 'firebase/database';
import { formateerTijd, TIJDSLIMIET_MS } from '../../../shared/js/timer.ts';
import { escHtml, requireEl, sessieUitUrl } from '../../../shared/js/utils.ts';
import { koppelReviewFormulier } from '../../../shared/js/review-form.ts';
import { koppelDeelKnop } from '../../../shared/js/deel.ts';
import { haalEinde } from './dua-session.ts';
import { fx } from './dua-audio.ts';
import { speelStem } from './dua-stemmen.ts';
import { haalDuren, percentielSneller, prestatieTekst } from '../../../shared/js/verdeling.ts';
import { meetSpel } from '../../../shared/js/meet.ts';
import { startDua } from './dua-start.ts';
import { tekst, vul } from './dua-tekst.ts';

// Eerst de taal van de sessie en de vertaalde pagina, dan pas de rest (ADR-001, G1).
await startDua();

/** Zo lang wachten we op de andere kant voor we de review toch tonen. */
const MAX_WACHT_MS = 3 * 60 * 1000;
let wachtVerlopen = false;
setTimeout(() => {
  wachtVerlopen = true;
  void vernieuw();
}, MAX_WACHT_MS);

const AANTAL_EGGS = 6;

const sessie = sessieUitUrl();
meetSpel('game_complete', sessie);

const T = tekst().einde;
requireEl('sys-case').textContent = vul(tekst().kop.eindCase, { sessie });

document.getElementById('btn-terug')?.addEventListener('click', () => {
  window.location.href = '../../index.html';
});

// ── Review achterlaten (gedeeld formulier) ──
koppelReviewFormulier('dua', sessie);

// ── Resultaat delen ──
let deelResttijd: string | null = null;
let deelBadges = 0;

koppelDeelKnop('btn-deel-resultaat', () =>
  deelResttijd
    ? vul(T.deelMetTijd, {
        tijd: deelResttijd,
        badges: deelBadges,
        totaal: AANTAL_EGGS,
        url: T.url,
      })
    : vul(T.deel, { url: T.url }),
);

let klokGeluid = false;
let statsGetoond = false;

async function vernieuw(): Promise<void> {
  const data = await haalEinde(sessie);

  // Beide teksten (live bijgewerkt)
  const briefEl = requireEl('einde-brief');
  const rapportEl = requireEl('einde-rapport');
  if (data.brief14Klaar) {
    briefEl.textContent = data.brief14Tekst;
    briefEl.classList.remove('hintje');
  }
  if (data.rapportIngediend) {
    rapportEl.textContent = data.rapportTekst;
    rapportEl.classList.remove('hintje');
  }

  const wacht = requireEl('wacht-status');
  if (!data.brief14Klaar || !data.rapportIngediend) {
    if (wachtVerlopen) {
      // De andere kant haakte af of is nog bezig: niemand blijft eindeloos
      // wachten. De teksten verschijnen alsnog zodra ze binnenkomen.
      wacht.textContent = T.nogBezig;
      document.getElementById('einde-onthulling')?.classList.remove('verborgen');
      document.getElementById('einde-review')?.classList.remove('verborgen');
      return;
    }
    wacht.textContent = !data.brief14Klaar ? T.wacht1934 : T.wacht2034;
    return;
  }

  // Beide klaar → onthulling + stats + reviewformulier
  wacht.textContent = T.samen;
  document.getElementById('einde-onthulling')?.classList.remove('verborgen');
  document.getElementById('einde-review')?.classList.remove('verborgen');

  if (!klokGeluid) {
    klokGeluid = true;
    fx.kerkklok(5, true);
    // Na de klokslagen: Bureau X legt de twee brieven naast elkaar.
    setTimeout(() => speelStem('finale-2034', { eenmalig: `${sessie}:finale-2034` }), 7500);
  }
  if (statsGetoond) return;
  statsGetoond = true;

  const statsEl = requireEl('einde-stats');
  let resttijd = '--:--';
  if (data.timerGestart && data.rapportTijdstip) {
    const duur = Math.max(0, data.rapportTijdstip - data.timerGestart);
    resttijd = formateerTijd(Math.max(0, TIJDSLIMIET_MS - (data.meta.strafMs || 0) - duur));
    // "Sneller dan X% van de groepen", als er genoeg afgeronde sessies zijn.
    const tekst = prestatieTekst(percentielSneller(duur, await haalDuren('dua')));
    const prestatie = document.getElementById('einde-prestatie');
    if (tekst && prestatie) {
      prestatie.textContent = tekst;
      prestatie.hidden = false;
    }
  }
  // Veilig: de interpolaties zijn numerieke spelstatus, geformatteerde tijd of
  // ge-escapete labels uit ons woordenboek, geen vrije spelertekst.
  // eslint-disable-next-line no-unsanitized/property
  statsEl.innerHTML =
    `<div class="d-stat"><b>${resttijd}</b><span>${escHtml(T.resttijd)}</span></div>` +
    `<div class="d-stat"><b>${data.meta.hints || 0}</b><span>${escHtml(T.hints)}</span></div>` +
    `<div class="d-stat"><b>${data.meta.verdenking || 0}%</b><span>${escHtml(T.verdenking)}</span></div>` +
    `<div class="d-stat"><b>${data.badges}/${AANTAL_EGGS}</b><span>${escHtml(T.insignes)}</span></div>`;
  statsEl.style.display = 'flex';

  deelResttijd = resttijd;
  deelBadges = data.badges;
  document.getElementById('btn-deel-resultaat')?.classList.remove('verborgen');
}

// Live: vernieuw zodra brief14 of rapport binnenkomt
onValue(ref(db, `sessions/${sessie}/dua/brief14`), () => {
  vernieuw();
});
onValue(ref(db, `sessions/${sessie}/rapport/ingediend`), () => {
  vernieuw();
});
