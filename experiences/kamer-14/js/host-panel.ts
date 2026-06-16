/**
 * host-panel.ts (Kamer 14) — operator-paneel.
 * Voorheen inline in host-panel.html; nu een getypte module zodat de login en
 * het sessiebeheer onder de compiler en linter vallen.
 *
 * Bewaart aangemaakte codes lokaal (localStorage) en leest hun status live
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
    genereerCode: () => void;
    maakSessieAan: () => void;
    verversLijst: () => void;
    laadLijst: () => void;
    kopieer: (tekst: string, knop?: HTMLElement) => void;
    verwijderUitLijst: (code: string) => void;
    deactiveer: (code: string) => void;
  }
}

koppelHostAuth();

const STORAGE_KEY = 'kamer14_admin_sessies';

function getSessies(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

function saveSessie(code: string): void {
  const lijst = getSessies();
  if (!lijst.includes(code)) {
    lijst.unshift(code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lijst));
  }
}

function verwijderLokaal(code: string): void {
  const lijst = getSessies().filter((c) => c !== code);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lijst));
}

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
    const snap = await get(ref(db, `sessions/${code}`));
    if (snap.exists()) {
      toonStatus(status, `Code "${code}" bestaat al. Kies een andere.`, false);
      return;
    }

    await set(ref(db, `sessions/${code}`), {
      aangemaakt: serverTimestamp(),
      actief: true,
      puzzels: { p1: false, p2: false, p3: false, p4: false, p5: false },
      rapport: { ingediend: false, inhoud: {} },
    });

    saveSessie(code);
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
  const codes = getSessies();

  laden.style.display = 'block';
  tabel.style.display = 'none';
  geenMsg.style.display = 'none';

  if (codes.length === 0) {
    laden.style.display = 'none';
    geenMsg.style.display = 'block';
    return;
  }

  const resultaten = await Promise.all(
    codes.map(async (code) => {
      try {
        const snap = await get(ref(db, `sessions/${code}`));
        return { code, data: snap.exists() ? snap.val() : null };
      } catch {
        return { code, data: null };
      }
    }),
  );

  laden.style.display = 'none';
  tabel.style.display = 'table';

  // Veilig: `code` wordt door escHtml gehaald; de overige waarden zijn cijfers
  // of vaste markup.
  // eslint-disable-next-line no-unsanitized/property
  tbody.innerHTML = resultaten
    .map(({ code, data }) => {
      const veiligeCode = escHtml(code);
      if (!data) {
        return `<tr>
          <td class="code-cel">${veiligeCode}</td>
          <td colspan="3" style="color:#555; font-size:0.8rem;">Niet gevonden in Firebase</td>
          <td>
            <button class="kopieer-knop" title="Verwijder uit lijst" onclick="verwijderUitLijst('${veiligeCode}')">
              <i class="bi bi-x-circle"></i>
            </button>
          </td>
        </tr>`;
      }

      const p = data.puzzels || {};
      const bollen = [p.p1, p.p2, p.p3, p.p4, p.p5]
        .map((v: unknown) => `<div class="bol ${v ? 'klaar' : 'open'}"></div>`)
        .join('');
      const aantalKlaar = [p.p1, p.p2, p.p3, p.p4, p.p5].filter(Boolean).length;

      const rapportBadge = data.rapport?.ingediend
        ? '<span class="badge-klaar"><i class="bi bi-check2 me-1"></i>Ingediend</span>'
        : '<span style="color:#555; font-size:0.8rem;"> - </span>';

      let statusBadge: string;
      if (!data.actief) {
        statusBadge = '<span class="badge-inactief">Inactief</span>';
      } else if (aantalKlaar === 5) {
        statusBadge = '<span class="badge-klaar">Voltooid</span>';
      } else {
        statusBadge = '<span class="badge-actief">Actief</span>';
      }

      return `<tr>
        <td class="code-cel">
          ${veiligeCode}
          <button class="kopieer-knop" title="Kopieer" onclick="kopieer('${veiligeCode}')">
            <i class="bi bi-copy"></i>
          </button>
        </td>
        <td>
          <div class="puzzel-bollen">${bollen}</div>
          <span style="color:#666; font-size:0.75rem;">${aantalKlaar}/5</span>
        </td>
        <td>${rapportBadge}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="kopieer-knop" title="Deactiveer" onclick="deactiveer('${veiligeCode}')" style="color:#555;">
            <i class="bi bi-x-circle"></i>
          </button>
        </td>
      </tr>`;
    })
    .join('');
}

window.verversLijst = function () {
  void laadLijst();
};

window.kopieer = function (code) {
  void kopieerNaarKlembord(code);
};

window.verwijderUitLijst = function (code) {
  verwijderLokaal(code);
  void laadLijst();
};

window.deactiveer = async function (code) {
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
void laadLijst();
