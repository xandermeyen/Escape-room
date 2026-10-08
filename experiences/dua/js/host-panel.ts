/**
 * host-panel.ts (D.U.A.) — operator-paneel.
 *
 * Codes lopen op als DUA-<jaar>-<volgnr>. Sessies worden aangemaakt via het
 * gedeelde maakSessie() (atomisch) en de lijst komt uit de gedeelde
 * host-sessies-helpers, gefilterd op ervaringsId 'dua'.
 */
import '../../../shared/js/sentry.ts';
import { maakSessie, resetDemo } from '../../../shared/js/session.ts';
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
  lobbyLinkHtml,
} from '../../../shared/js/host-sessies.ts';
import { maakVerlopenKnop } from '../../../shared/js/host-verlopen.ts';
import {
  haalReviews,
  keurReviewGoed,
  reviewKaartHtml,
  reviewSamenvattingHtml,
} from '../../../shared/js/host-reviews.ts';
import { statsDetailHtml, gemiddeldenHtml, HOST_STATS_CSS } from '../../../shared/js/host-stats.ts';
import type { SessieStats } from '../../../shared/js/speldata.ts';
import { werkVerdelingBij } from '../../../shared/js/verdeling.ts';
import { DEMO_CODES, isDemoCode } from '../../../shared/js/demo.ts';
import { DUA_PUZZELS } from './dua-config.ts';
import { requireEl } from '../../../shared/js/utils.ts';
import { koppelActies } from '../../../shared/js/acties.ts';

// Knop "Verlopen sessies sluiten (n)" (zie shared/js/host-verlopen.ts).
const verlopen = maakVerlopenKnop(() => void laadLijst());

// Stijl voor de speldata-tabellen (gedeeld met het Kamer 14-paneel).
const statsStijl = document.createElement('style');
statsStijl.textContent = HOST_STATS_CSS;
document.head.appendChild(statsStijl);

const ROLLEN = { '1934': '1934', '2034': '2034' };

koppelHostAuth(() => {
  void verversCode();
  void laadLijst();
  void laadReviews();
});

const JAAR = new Date().getFullYear();
const LOBBY_PAD = '/experiences/dua/';
// Voortgang in de lijst: P1 tot P5. P0 (het zegel) is de opwarmer en telt niet mee.
const PUZZELS = DUA_PUZZELS.filter(p => p !== 'p0');

// ── Volgende code berekenen ──
async function berekenVolgendeCode(): Promise<string> {
  const rijen = await haalSessies(() => true);
  let hoogste = 0;
  for (const { code } of rijen) {
    const match = code.match(/^DUA-(\d{4})-(\d{3,})$/);
    if (match && parseInt(match[1]) === JAAR) {
      const nr = parseInt(match[2]);
      if (nr > hoogste) hoogste = nr;
    }
  }
  return `DUA-${JAAR}-${String(hoogste + 1).padStart(3, '0')}`;
}

async function verversCode(): Promise<void> {
  const el = requireEl('volgende-code');
  el.textContent = 'Berekenen…';
  try {
    const code = await berekenVolgendeCode();
    el.textContent = code;
    el.dataset.code = code;
  } catch {
    el.textContent = 'Fout';
  }
}

// ── Sessie aanmaken ──
async function maakSessieAan() {
  const code = requireEl('volgende-code').dataset.code;
  const status = requireEl('status-aanmaken');
  const btn = requireEl<HTMLButtonElement>('btn-aanmaken');
  const spelers = parseInt(requireEl<HTMLSelectElement>('select-spelers').value);

  if (!code) {
    toonStatus(status, 'Code nog niet geladen, probeer opnieuw.', false);
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Aanmaken…';

  try {
    const aangemaakt = await maakSessie(code, {
      ervaringsId: 'dua',
      aantalSpelers: spelers,
      puzzelIds: DUA_PUZZELS,
    });
    if (!aangemaakt) {
      toonStatus(status, `${code} bestaat al. Ververs en probeer opnieuw.`, false);
      return;
    }

    toonStatus(status, `✓ Sessie "${code}" aangemaakt! Lobby-link staat in de tabel.`, true);
    await laadLijst();
    await verversCode();
  } catch (err) {
    console.error(err);
    toonStatus(status, 'Firebase-fout: ' + foutTekst(err), false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-database-add me-2"></i>Sessie aanmaken';
  }
}

// ── Sessie-overzicht laden ──
async function laadLijst(): Promise<void> {
  const laden = requireEl('laden-label');
  const tabel = requireEl('sessie-tabel');
  const geenMsg = requireEl('geen-sessies');
  const tbody = requireEl('sessie-tbody');

  laden.style.display = 'block';
  tabel.style.display = 'none';
  geenMsg.style.display = 'none';

  try {
    const rijen = await haalSessies(d => d.ervaringsId === 'dua');
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
    requireEl('stats-overzicht').innerHTML = gemiddeldenHtml(alleStats, DUA_PUZZELS);
    void werkVerdelingBij(
      'dua',
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

        const bezet = Object.keys((data.spelers as Record<string, unknown>) || {}).length;
        const max = (data.aantalSpelers as number) ?? '?';

        return `<tr>
          <td class="code-cel">
            ${veiligeCode}${isDemoCode(code) ? ' <span class="badge-bezig">demo</span>' : ''}
            <button class="kopieer-knop" title="Kopieer code" data-actie="kopieer" data-tekst="${veiligeCode}">
              <i class="bi bi-copy"></i>
            </button>
          </td>
          <td style="color:#666; font-size:0.8rem;">${datumHtml(data)}</td>
          <td style="font-size:0.82rem; color:#888;">${bezet} / ${escHtml(String(max))}</td>
          <td>
            <div class="puzzel-bollen">${puzzelBollenHtml(data, PUZZELS)}</div>
            <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/${PUZZELS.length}</span>
          </td>
          <td>${statusBadgeHtml(data, aantalKlaar, PUZZELS.length, { toonVerlopen: true })}</td>
          <td>${lobbyLinkHtml(LOBBY_PAD, code)}</td>
          <td>
            ${
              data.actief
                ? `<button class="kopieer-knop" title="Deactiveer sessie" data-actie="deactiveer" data-code="${veiligeCode}" style="color:#666;">
                  <i class="bi bi-stop-circle"></i>
                </button>`
                : ''
            }
            <button class="kopieer-knop" title="Speldata van deze sessie" aria-expanded="false"
              aria-controls="detail-${veiligeCode}" data-actie="toon-details" data-code="${veiligeCode}">
              <i class="bi bi-bar-chart"></i>
            </button>
          </td>
        </tr>
        <tr class="detail-rij" id="detail-${veiligeCode}" hidden>
          <td colspan="7">${statsDetailHtml(data.stats as SessieStats | undefined, DUA_PUZZELS, ROLLEN)}</td>
        </tr>`;
      })
      .join('');

    tabel.style.display = 'table';
  } catch (err) {
    console.error(err);
    laden.textContent = 'Fout bij laden.';
  }
}

// ── Reviews ──
async function laadReviews(): Promise<void> {
  const laden = requireEl('reviews-laden');
  const lijst = requireEl('reviews-lijst');
  const geenMsg = requireEl('geen-reviews');

  laden.style.display = 'block';
  lijst.style.display = 'none';
  geenMsg.style.display = 'none';

  try {
    const rijen = await haalReviews('dua');
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

async function keurGoed(id: string) {
  try {
    await keurReviewGoed(id);
    void laadReviews();
  } catch (err) {
    console.error('Goedkeuren mislukt:', err);
    alert('Goedkeuren mislukt: ' + foutTekst(err));
  }
}

async function resetDemoSessie() {
  const code = DEMO_CODES['dua'];
  const status = requireEl('status-demo');
  const knop = requireEl<HTMLButtonElement>('btn-demo-reset');
  if (!confirm(`Demo ${code} terugzetten naar het begin? Alle voortgang van de demo verdwijnt.`))
    return;
  knop.disabled = true;
  try {
    await resetDemo(code, {
      ervaringsId: 'dua',
      aantalSpelers: 4,
      puzzelIds: DUA_PUZZELS,
    });
    toonStatus(status, `✓ ${code} staat klaar. Open de spelerpagina's hieronder.`, true);
    void laadLijst();
  } catch (err) {
    console.error('Demo resetten mislukt:', err);
    toonStatus(status, 'Demo resetten mislukt: ' + foutTekst(err), false);
  } finally {
    knop.disabled = false;
  }
}

function toonDetails(code: string) {
  const rij = document.getElementById(`detail-${code}`);
  if (!rij) return;
  rij.hidden = !rij.hidden;
  document
    .querySelector(`[aria-controls="detail-${CSS.escape(code)}"]`)
    ?.setAttribute('aria-expanded', String(!rij.hidden));
}

// ── Deactiveer ──
async function deactiveer(code: string) {
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
}

function sluitVerlopen() {
  void verlopen.sluit();
}

// ── Kopieer naar klembord ──
function kopieer(tekst: string, knop?: HTMLElement) {
  void kopieerNaarKlembord(tekst, knop);
}

// ── Init ──
// verversCode()/laadLijst() lopen pas via de onIngelogd-callback hierboven,
// zodra er echt een ingelogde host is (zie koppelHostAuth-aanroep).

// ── Knoppen (data-actie in de HTML en in de gegenereerde rijen) ──
koppelActies({
  'ververs-lijst': () => void laadLijst(),
  'maak-sessie': () => void maakSessieAan(),
  'keur-goed': el => void keurGoed(el.dataset['id'] ?? ''),
  'reset-demo': () => void resetDemoSessie(),
  'toon-details': el => toonDetails(el.dataset['code'] ?? ''),
  deactiveer: el => void deactiveer(el.dataset['code'] ?? ''),
  'sluit-verlopen': () => sluitVerlopen(),
  kopieer: el => kopieer(el.dataset['tekst'] ?? '', el),
});
