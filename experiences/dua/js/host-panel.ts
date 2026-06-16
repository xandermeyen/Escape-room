/**
 * host-panel.ts (D.U.A.) — operator-paneel.
 * Voorheen inline in host-panel.html; nu een getypte module.
 *
 * Codes lopen op als DUA-<jaar>-<volgnr>; de lijst leest live alle dua-sessies
 * uit Firebase.
 */
import '../../../shared/js/sentry.ts';
import { db } from '../../../shared/js/firebase-config.ts';
import { ref, set, get, update, serverTimestamp } from 'firebase/database';
import { koppelHostAuth } from '../../../shared/js/host-auth.ts';
import { toonStatus, kopieerNaarKlembord, escHtml, foutTekst } from '../../../shared/js/host-ui.ts';
import { requireEl } from '../../../shared/js/utils.ts';

declare global {
  interface Window {
    maakSessieAan: () => void;
    laadLijst: () => void;
    kopieer: (tekst: string, knop?: HTMLElement) => void;
    deactiveer: (code: string) => void;
  }
}

koppelHostAuth();

const JAAR = new Date().getFullYear();
const BASIS_URL = window.location.origin;
const LOBBY_PAD = '/experiences/dua/';

// ── Volgende code berekenen ──
async function berekenVolgendeCode(): Promise<string> {
  const snap = await get(ref(db, 'sessions'));
  let hoogste = 0;
  if (snap.exists()) {
    snap.forEach((kind) => {
      const match = (kind.key ?? '').match(/^DUA-(\d{4})-(\d{3,})$/);
      if (match && parseInt(match[1]) === JAAR) {
        const nr = parseInt(match[2]);
        if (nr > hoogste) hoogste = nr;
      }
    });
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
    const snap = await get(ref(db, `sessions/${code}`));
    if (snap.exists()) {
      toonStatus(status, `${code} bestaat al. Ververs en probeer opnieuw.`, false);
      return;
    }

    await set(ref(db, `sessions/${code}`), {
      ervaringsId: 'dua',
      actief: true,
      aangemaakt: serverTimestamp(),
      aantalSpelers: spelers,
      puzzels: { p0: false, p1: false, p2: false, p3: false, p4: false, p5: false },
      rapport: { ingediend: false },
      timerGestart: null,
    });

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
    const snap = await get(ref(db, 'sessions'));
    laden.style.display = 'none';

    if (!snap.exists()) {
      geenMsg.style.display = 'block';
      return;
    }

    const rijen: { code: string; data: Record<string, unknown> }[] = [];
    snap.forEach((kind) => {
      const d = kind.val();
      if (d?.ervaringsId === 'dua') {
        rijen.push({ code: kind.key ?? '', data: d });
      }
    });

    if (rijen.length === 0) {
      geenMsg.style.display = 'block';
      return;
    }

    // Nieuwste eerst
    rijen.sort((a, b) => ((b.data.aangemaakt as number) ?? 0) - ((a.data.aangemaakt as number) ?? 0));

    // Veilig: `code` en `lobbyUrl` worden door escHtml gehaald; de rest is
    // cijfers, een geformatteerde datum of vaste markup.
    // eslint-disable-next-line no-unsanitized/property
    tbody.innerHTML = rijen
      .map(({ code, data }) => {
        const p = (data.puzzels as Record<string, unknown>) || {};
        const bollen = [p.p1, p.p2, p.p3, p.p4, p.p5]
          .map((v) => `<div class="bol ${v ? 'klaar' : 'open'}"></div>`)
          .join('');
        const aantalKlaar = [p.p1, p.p2, p.p3, p.p4, p.p5].filter(Boolean).length;

        const bezet = Object.keys((data.spelers as Record<string, unknown>) || {}).length;
        const max = (data.aantalSpelers as number) ?? '?';

        const datum = data.aangemaakt
          ? new Date(data.aangemaakt as number).toLocaleString('nl-BE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—';

        let statusBadge: string;
        if (!data.actief) {
          statusBadge = '<span class="badge-inactief">Inactief</span>';
        } else if (data.timerGestart) {
          statusBadge = '<span class="badge-bezig">Bezig</span>';
        } else if (aantalKlaar === 5) {
          statusBadge = '<span class="badge-klaar">Voltooid</span>';
        } else {
          statusBadge = '<span class="badge-actief">Actief</span>';
        }

        const veiligeCode = escHtml(code);
        const lobbyUrl = `${BASIS_URL}${LOBBY_PAD}?sessie=${code}`;
        const veiligeUrl = escHtml(lobbyUrl);

        return `<tr>
          <td class="code-cel">
            ${veiligeCode}
            <button class="kopieer-knop" title="Kopieer code" onclick="kopieer('${veiligeCode}', this)">
              <i class="bi bi-copy"></i>
            </button>
          </td>
          <td style="color:#666; font-size:0.8rem;">${escHtml(datum)}</td>
          <td style="font-size:0.82rem; color:#888;">${bezet} / ${escHtml(String(max))}</td>
          <td>
            <div class="puzzel-bollen">${bollen}</div>
            <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/5</span>
          </td>
          <td>${statusBadge}</td>
          <td>
            <input class="link-input" readonly value="${veiligeUrl}" />
            <button class="kopieer-knop" title="Kopieer lobby-link" onclick="kopieer('${veiligeUrl}', this)">
              <i class="bi bi-clipboard"></i>
            </button>
            <a href="${veiligeUrl}" target="_blank" rel="noopener noreferrer" class="kopieer-knop" title="Open lobby">
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </td>
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
void verversCode();
void laadLijst();
