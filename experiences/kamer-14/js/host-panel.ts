/**
 * host-panel.ts (Kamer 14) — operator-paneel.
 *
 * Sessies worden aangemaakt via het gedeelde maakSessie() (atomisch, met
 * ervaringsId) en de lijst komt rechtstreeks uit Firebase, gefilterd op
 * ervaringsId. Sessies van vóór die migratie hebben geen ervaringsId en
 * tellen als Kamer 14.
 */
import '../../../shared/js/sentry.ts';
import { maakSessie } from '../../../shared/js/session.ts';
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
import { requireEl } from '../../../shared/js/utils.ts';

declare global {
  interface Window {
    genereerCode: () => void;
    maakSessieAan: () => void;
    verversLijst: () => void;
    laadLijst: () => void;
    kopieer: (tekst: string, knop?: HTMLElement) => void;
    deactiveer: (code: string) => void;
  }
}

koppelHostAuth(() => {
  void laadLijst();
});

const PUZZELS = ['p1', 'p2', 'p3', 'p4', 'p5'];
const LOBBY_PAD = '/experiences/kamer-14/';

function nieuweCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const cijfers = '23456789';
  const deel1 = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const deel2 = Array.from({ length: 3 }, () => cijfers[Math.floor(Math.random() * cijfers.length)]).join('');
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
    const aangemaakt = await maakSessie(code, { ervaringsId: 'kamer-14' });
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
    const rijen = await haalSessies((d) => (d.ervaringsId ?? 'kamer-14') === 'kamer-14');
    laden.style.display = 'none';

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
            ${veiligeCode}
            <button class="kopieer-knop" title="Kopieer" onclick="kopieer('${veiligeCode}', this)">
              <i class="bi bi-copy"></i>
            </button>
          </td>
          <td style="color:#666; font-size:0.8rem;">${datumHtml(data)}</td>
          <td>
            <div class="puzzel-bollen">${puzzelBollenHtml(data, PUZZELS)}</div>
            <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/${PUZZELS.length}</span>
          </td>
          <td>${rapportBadge}</td>
          <td>${statusBadgeHtml(data, aantalKlaar, PUZZELS.length)}</td>
          <td>${lobbyLinkHtml(LOBBY_PAD, code)}</td>
          <td>
            ${
              data.actief
                ? `<button class="kopieer-knop" title="Deactiveer sessie" onclick="deactiveer('${veiligeCode}')" style="color:#555;">
                    <i class="bi bi-x-circle"></i>
                  </button>`
                : ''
            }
          </td>
        </tr>`;
      })
      .join('');

    tabel.style.display = 'table';
  } catch (err) {
    console.error(err);
    laden.textContent = 'Fout bij laden.';
  }
}

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

window.laadLijst = function () {
  void laadLijst();
};

// Init
window.genereerCode();
// laadLijst() loopt pas via de onIngelogd-callback hierboven, zodra er
// echt een ingelogde host is (zie koppelHostAuth-aanroep).
