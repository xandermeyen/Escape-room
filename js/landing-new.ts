import '../shared/js/sentry.ts';

// ── DATUM MINIMUM ──────────────────────────────────────────────
const datumInput = document.getElementById('datum') as HTMLInputElement | null;
if (datumInput) {
  datumInput.min = new Date().toISOString().split('T')[0]!;
}

// ── FORMSPREE AJAX ─────────────────────────────────────────────
const form = document.getElementById('reserveerForm') as HTMLFormElement | null;

if (form) {
  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    const knop = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const orig = knop.innerHTML;
    knop.disabled = true;
    knop.textContent = 'Bezig met verzenden…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        form.innerHTML = `
          <div class="form-bevestiging">
            <p class="form-bevestiging__check">✓</p>
            <p class="form-bevestiging__titel">Reservering ontvangen</p>
            <p class="form-bevestiging__sub">
              Je ontvangt binnen 24 uur een bevestigingsmail
              met jullie persoonlijke spellink.
            </p>
          </div>`;
      } else {
        throw new Error('Formspree fout');
      }
    } catch {
      knop.disabled = false;
      knop.innerHTML = orig;

      if (!form.querySelector('.form-err')) {
        const p = document.createElement('p');
        p.className = 'form-err';
        p.textContent = 'Er ging iets mis. Probeer opnieuw of stuur een mail.';
        form.appendChild(p);
      }
    }
  });
}

// ── MODAL OPEN / SLUITEN ────────────────────────────────────────
const overlay  = document.getElementById('modal-overlay');

function openModal(): void {
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(): void {
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// Boek-knoppen
document.querySelectorAll<HTMLElement>('[data-modal="boek"]').forEach(btn => {
  btn.addEventListener('click', openModal);
});

// Klik buiten modal
overlay?.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});

// Sluit-knop in modal
document.getElementById('modal-sluit')?.addEventListener('click', closeModal);

// Escape-toets
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── EASTER EGG ─────────────────────────────────────────────────
console.log(
  '%cBUREAU X — INTERN ARCHIEF',
  'font-family: monospace; font-size: 14px; letter-spacing: 2px; color: #c8a96e;',
  '\n\nJe zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.' +
  '\nHet archief reageert op haar naam. Typ die maar eens.'
);

let buf = '';
const SECRET = 'lena';

document.addEventListener('keydown', (e: KeyboardEvent) => {
  const t = e.target as HTMLElement;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
  if (e.key.length !== 1) return;

  buf = (buf + e.key.toLowerCase()).slice(-SECRET.length);

  if (buf === SECRET) {
    buf = '';
    if (document.querySelector('.easter-overlay')) return;

    const el = document.createElement('div');
    el.className = 'easter-overlay';
    el.innerHTML = `
      <div class="easter-kaart">
        <p class="easter-stempel">Vermist</p>
        <p class="easter-label">Archiefstuk B-X/14 · niet voor publicatie</p>
        <h2>Gezocht: Lena Bogaert</h2>
        <p>Laatst gezien op een dinsdagochtend in mei, Geel.</p>
        <p>Bed opgemaakt. Jas weg. Geen briefje.</p>
        <p>Wie iets weet, opent dossier 14. Wie niets weet ook.</p>
        <p class="easter-sluiten">Klik om dit archiefstuk terug te leggen.</p>
      </div>`;

    const sluit = () => { el.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') sluit(); };

    el.addEventListener('click', sluit);
    document.addEventListener('keydown', onEsc);
    document.body.appendChild(el);
  }
});
