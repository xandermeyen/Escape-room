/**
 * host-panel.ts (Kamer 14) — operator-paneel.
 *
 * Sessies worden aangemaakt via het gedeelde maakSessie() (atomisch, met
 * ervaringsId) en de lijst komt rechtstreeks uit Firebase, gefilterd op
 * ervaringsId. Sessies van vóór die migratie hebben geen ervaringsId en
 * tellen als Kamer 14.
 */
import '../../../shared/js/sentry.ts';
import { maakSessie, geefRollenVrij, resetDemo } from '../../../shared/js/session.ts';
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, update } from 'firebase/database';
import { koppelHostAuth } from '../../../shared/js/host-auth.ts';
import { toonStatus, kopieerNaarKlembord, escHtml, foutTekst } from '../../../shared/js/host-ui.ts';
import {
  haalSessies,
  aantalOpgelost,
  puzzelBollenHtml,
  statusBadgeHtml,
  datumHtml,
  geopendHtml,
  lobbyLinkHtml,
} from '../../../shared/js/host-sessies.ts';
import { maakVerlopenKnop } from '../../../shared/js/host-verlopen.ts';
import {
  haalReviews,
  keurReviewGoed,
  reviewKaartHtml,
  reviewSamenvattingHtml,
} from '../../../shared/js/host-reviews.ts';
import { werkVerdelingBij } from '../../../shared/js/verdeling.ts';
import { DEMO_CODES, isDemoCode } from '../../../shared/js/demo.ts';
import { KAMER14_PUZZELS } from './kamer14-config.ts';
import { requireEl } from '../../../shared/js/utils.ts';
import { statsDetailHtml, gemiddeldenHtml, HOST_STATS_CSS } from '../../../shared/js/host-stats.ts';
import type { SessieStats } from '../../../shared/js/speldata.ts';

declare global {
  interface Window {
    genereerCode: () => void;
    maakSessieAan: () => void;
    verversLijst: () => void;
    laadLijst: () => void;
    kopieer: (tekst: string, knop?: HTMLElement) => void;
    deactiveer: (code: string) => void;
    rollenVrij: (code: string) => void;
    keurGoed: (id: string) => void;
    toonDetails: (code: string) => void;
    resetDemoSessie: () => void;
    sluitVerlopen: () => void;
  }
}

// Stijl voor de speldata-tabellen (gedeeld met het D.U.A.-paneel).
const statsStijl = document.createElement('style');
statsStijl.textContent = HOST_STATS_CSS;
document.head.appendChild(statsStijl);

const ROLLEN = { a: 'A', b: 'B' };

koppelHostAuth(() => {
  void laadLijst();
  void laadReviews();
});

const PUZZELS = KAMER14_PUZZELS;

// Knop "Verlopen sessies sluiten (n)" (zie shared/js/host-verlopen.ts).
const verlopen = maakVerlopenKnop(() => void laadLijst());
const LOBBY_PAD = '/experiences/kamer-14/';

function nieuweCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const cijfers = '23456789';
  const deel1 = Array.from(
    { length: 3 },
    () => letters[Math.floor(Math.random() * letters.length)],
  ).join('');
  const deel2 = Array.from(
    { length: 3 },
    () => cijfers[Math.floor(Math.random() * cijfers.length)],
  ).join('');
  return `${deel1}-${deel2}`;
}

window.genereerCode = function () {
  requireEl('gegenereerde-code').textContent = nieuweCode();
  requireEl<HTMLInputElement>('eigen-code').value = '';
};

window.maakSessieAan = async function () {
  const eigenCode = requireEl<HTMLInputElement>('eigen-code').value.trim().toUpperCase();
  const code = eigenCode || requireEl('gegenereerde-code').textContent || '';
  const status = requireEl('status-aanmaken');
  const btn = requireEl<HTMLButtonElement>('btn-aanmaken');

  if (!code || code === '- - -') {
    toonStatus(status, 'Genereer eerst een code.', false);
    return;
  }
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) {
    toonStatus(status, 'Ongeldige code - gebruik enkel letters, cijfers en koppeltekens.', false);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Aanmaken…';

  try {
    const aangemaakt = await maakSessie(code, {
      ervaringsId: 'kamer-14',
      puzzelIds: KAMER14_PUZZELS,
    });
    if (!aangemaakt) {
      toonStatus(status, `Code "${code}" bestaat al. Kies een andere.`, false);
      return;
    }

    toonStatus(status, `✓ Sessie "${code}" aangemaakt!`, true);
    window.genereerCode();
    void laadLijst();
  } catch (err) {
    console.error(err);
    toonStatus(status, 'Firebase-fout: ' + foutTekst(err), false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2 me-2"></i>Sessie aanmaken';
  }
};

async function laadLijst(): Promise<void> {
  const laden = requireEl('laden-label');
  const tabel = requireEl('sessie-tabel');
  const geenMsg = requireEl('geen-sessies');
  const tbody = requireEl('sessie-tbody');

  laden.style.display = 'block';
  tabel.style.display = 'none';
  geenMsg.style.display = 'none';

  try {
    // Sessies zonder ervaringsId zijn oudere Kamer 14-sessies (o.a. Make.com).
    const rijen = await haalSessies(d => (d.ervaringsId ?? 'kamer-14') === 'kamer-14');
    laden.style.display = 'none';
    verlopen.bijLijst(rijen);

    // Gemiddelden per puzzel over alle sessies met speldata.
    // Demo-sessies tellen niet mee in de statistieken.
    const echteRijen = rijen.filter(r => !isDemoCode(r.code));
    const alleStats = echteRijen
      .map(({ data }) => data.stats as SessieStats | undefined)
      .filter((st): st is SessieStats => !!st);
    // Veilig: gemiddeldenHtml bevat enkel getallen en vaste markup.
    // eslint-disable-next-line no-unsanitized/property
    requireEl('stats-overzicht').innerHTML = gemiddeldenHtml(alleStats, PUZZELS);

    // Tijden van afgeronde sessies klaarzetten voor "sneller dan X%" op het
    // eindscherm (spelers kunnen de sessielijst zelf niet lezen).
    void werkVerdelingBij(
      'kamer-14',
      echteRijen.map(r => r.data),
    );

    if (rijen.length === 0) {
      geenMsg.style.display = 'block';
      return;
    }

    // Veilig: code, datum en lobby-link gaan door escHtml; de rest is
    // cijfers of vaste markup.
    // eslint-disable-next-line no-unsanitized/property
    tbody.innerHTML = rijen
      .map(({ code, data }) => {
        const veiligeCode = escHtml(code);
        const aantalKlaar = aantalOpgelost(data, PUZZELS);

        const rapport = data.rapport as { ingediend?: boolean } | undefined;
        const rapportBadge = rapport?.ingediend
          ? '<span class="badge-klaar"><i class="bi bi-check2 me-1"></i>Ingediend</span>'
          : '<span style="color:#555; font-size:0.8rem;"> - </span>';

        return `<tr>
          <td class="code-cel">
            ${veiligeCode}${isDemoCode(code) ? ' <span class="badge-bezig">demo</span>' : ''}
            <button class="kopieer-knop" title="Kopieer" onclick="kopieer('${veiligeCode}', this)">
              <i class="bi bi-copy"></i>
            </button>
          </td>
          <td style="color:#666; font-size:0.8rem;">${datumHtml(data)}</td>
          <td style="color:#666; font-size:0.8rem;">${geopendHtml(data)}</td>
          <td>
            <div class="puzzel-bollen">${puzzelBollenHtml(data, PUZZELS)}</div>
            <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/${PUZZELS.length}</span>
          </td>
          <td>${rapportBadge}</td>
          <td>${statusBadgeHtml(data, aantalKlaar, PUZZELS.length, { toonVerlopen: true })}</td>
          <td>${lobbyLinkHtml(LOBBY_PAD, code)}</td>
          <td>
            ${
              data.actief && data.spelers
                ? `<button class="kopieer-knop" title="Rollen vrijgeven (speler zit vast op 'rol al bezet')" onclick="rollenVrij('${veiligeCode}')" style="color:#555;">
                    <i class="bi bi-people"></i>
                  </button>`
                : ''
            }
            ${
              data.actief
                ? `<button class="kopieer-knop" title="Deactiveer sessie" onclick="deactiveer('${veiligeCode}')" style="color:#555;">
                    <i class="bi bi-x-circle"></i>
                  </button>`
                : ''
            }
            <button class="kopieer-knop" title="Speldata van deze sessie" aria-expanded="false"
              aria-controls="detail-${veiligeCode}" onclick="toonDetails('${veiligeCode}')">
              <i class="bi bi-bar-chart"></i>
            </button>
          </td>
        </tr>
        <tr class="detail-rij" id="detail-${veiligeCode}" hidden>
          <td colspan="8">${statsDetailHtml(data.stats as SessieStats | undefined, PUZZELS, ROLLEN)}</td>
        </tr>`;
      })
      .join('');

    tabel.style.display = 'table';
  } catch (err) {
    console.error(err);
    laden.textContent = 'Fout bij laden.';
  }
}

async function laadReviews(): Promise<void> {
  const laden = requireEl('reviews-laden');
  const lijst = requireEl('reviews-lijst');
  const geenMsg = requireEl('geen-reviews');

  laden.style.display = 'block';
  lijst.style.display = 'none';
  geenMsg.style.display = 'none';

  try {
    const rijen = await haalReviews('kamer-14');
    laden.style.display = 'none';

    if (rijen.length === 0) {
      geenMsg.style.display = 'block';
      return;
    }

    // Veilig: reviewKaartHtml escaped tekst/naam/verbeterpunt zelf; de
    // samenvatting bevat enkel getallen.
    // eslint-disable-next-line no-unsanitized/property
    lijst.innerHTML = reviewSamenvattingHtml(rijen) + rijen.map(reviewKaartHtml).join('');
    lijst.style.display = 'block';
  } catch (err) {
    console.error(err);
    laden.textContent = 'Fout bij laden.';
  }
}

window.keurGoed = async function (id) {
  try {
    await keurReviewGoed(id);
    void laadReviews();
  } catch (err) {
    console.error('Goedkeuren mislukt:', err);
    alert('Goedkeuren mislukt: ' + foutTekst(err));
  }
};

window.resetDemoSessie = async function () {
  const code = DEMO_CODES['kamer-14'];
  const status = requireEl('status-demo');
  const knop = requireEl<HTMLButtonElement>('btn-demo-reset');
  if (!confirm(`Demo ${code} terugzetten naar het begin? Alle voortgang van de demo verdwijnt.`))
    return;
  knop.disabled = true;
  try {
    await resetDemo(code, { ervaringsId: 'kamer-14', puzzelIds: KAMER14_PUZZELS });
    toonStatus(status, `✓ ${code} staat klaar. Open de spelerpagina's hieronder.`, true);
    void laadLijst();
  } catch (err) {
    console.error('Demo resetten mislukt:', err);
    toonStatus(status, 'Demo resetten mislukt: ' + foutTekst(err), false);
  } finally {
    knop.disabled = false;
  }
};

window.toonDetails = function (code) {
  const rij = document.getElementById(`detail-${code}`);
  if (!rij) return;
  rij.hidden = !rij.hidden;
  document
    .querySelector(`[aria-controls="detail-${CSS.escape(code)}"]`)
    ?.setAttribute('aria-expanded', String(!rij.hidden));
};

window.verversLijst = function () {
  void laadLijst();
};

window.kopieer = function (tekst, knop) {
  void kopieerNaarKlembord(tekst, knop);
};

window.deactiveer = async function (code) {
  if (
    !confirm(
      `Sessie ${code} deactiveren? Spelers die bezig zijn worden naar het tijdvoorbij-scherm gestuurd.`,
    )
  )
    return;
  try {
    await update(ref(db, `sessions/${code}`), { actief: false });
    void laadLijst();
  } catch (err) {
    console.error('Deactiveer mislukt:', err);
  }
};

window.sluitVerlopen = function () {
  void verlopen.sluit();
};

window.rollenVrij = async function (code) {
  if (
    !confirm(
      `Rollen van sessie ${code} vrijgeven? Gebruik dit als een speler op een ander toestel verder wil en "rol al bezet" ziet. Spelers die al in het spel zitten, blijven gewoon spelen.`,
    )
  )
    return;
  try {
    await geefRollenVrij(code);
    void laadLijst();
  } catch (err) {
    console.error('Rollen vrijgeven mislukt:', err);
    alert('Rollen vrijgeven mislukt: ' + foutTekst(err));
  }
};

window.laadLijst = function () {
  void laadLijst();
};

// Init
window.genereerCode();
// laadLijst() loopt pas via de onIngelogd-callback hierboven, zodra er
// echt een ingelogde host is (zie koppelHostAuth-aanroep).
