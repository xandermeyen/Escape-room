/**
 * host-panel.ts (D.U.A.) — operator-paneel.
 *
 * Codes lopen op als DUA-<jaar>-<volgnr>. Sessies worden aangemaakt via het
 * gedeelde maakSessie() (atomisch) en de lijst komt uit de gedeelde
 * host-sessies-helpers, gefilterd op ervaringsId 'dua'.
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
    maakSessieAan: () => void;
    laadLijst: () => void;
    kopieer: (tekst: string, knop?: HTMLElement) => void;
    deactiveer: (code: string) => void;
  }
}

koppelHostAuth(() => {
  void verversCode();
  void laadLijst();
});

const JAAR = new Date().getFullYear();
const LOBBY_PAD = '/experiences/dua/';
const PUZZELS = ['p1', 'p2', 'p3', 'p4', 'p5'];

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
window.maakSessieAan = async function () {
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
      puzzelIds: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'],
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
};

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
    const rijen = await haalSessies((d) => d.ervaringsId === 'dua');
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

        const bezet = Object.keys((data.spelers as Record<string, unknown>) || {}).length;
        const max = (data.aantalSpelers as number) ?? '?';

        return `<tr>
          <td class="code-cel">
            ${veiligeCode}
            <button class="kopieer-knop" title="Kopieer code" onclick="kopieer('${veiligeCode}', this)">
              <i class="bi bi-copy"></i>
            </button>
          </td>
          <td style="color:#666; font-size:0.8rem;">${datumHtml(data)}</td>
          <td style="font-size:0.82rem; color:#888;">${bezet} / ${escHtml(String(max))}</td>
          <td>
            <div class="puzzel-bollen">${puzzelBollenHtml(data, PUZZELS)}</div>
            <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/${PUZZELS.length}</span>
          </td>
          <td>${statusBadgeHtml(data, aantalKlaar, PUZZELS.length)}</td>
          <td>${lobbyLinkHtml(LOBBY_PAD, code)}</td>
          <td>
            ${
              data.actief
                ? `<button class="kopieer-knop" title="Deactiveer sessie" onclick="deactiveer('${veiligeCode}')" style="color:#666;">
                  <i class="bi bi-stop-circle"></i>
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

// ── Deactiveer ──
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

// ── Kopieer naar klembord ──
window.kopieer = function (tekst, knop) {
  void kopieerNaarKlembord(tekst, knop);
};

window.laadLijst = function () {
  void laadLijst();
};

// ── Init ──
// verversCode()/laadLijst() lopen pas via de onIngelogd-callback hierboven,
// zodra er echt een ingelogde host is (zie koppelHostAuth-aanroep).
