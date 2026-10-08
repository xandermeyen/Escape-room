/** Landingspagina D.U.A. (/dua/): dossier, aantal spelers en de easter egg. */
import { initLanding } from './landing.ts';

initLanding({ drempel: 0.1 });

// ── Dossier openklappen ──
const dossierKnop = document.getElementById('dossierToggle');
const dossier = document.getElementById('dossierBody');
if (dossierKnop && dossier) {
  dossierKnop.addEventListener('click', () => {
    const open = dossier.classList.toggle('open');
    dossierKnop.classList.toggle('open', open);
    const label = dossierKnop.querySelector('.label-text');
    if (label) label.textContent = open ? 'Verberg het dossier' : 'Lees het volledige dossier';
  });
}

// ── Aantal spelers: extra e-mailvelden tonen of verbergen ──
/** Toont een veld (en maakt het verplicht) of verbergt en leegt het. */
function zetExtraVeld(el: HTMLElement, zichtbaar: boolean): void {
  const input = el.querySelector('input');
  el.style.display = zichtbaar ? 'flex' : 'none';
  if (!input) return;
  input.required = zichtbaar;
  if (!zichtbaar) input.value = '';
}

export function kiesAantalSpelers(n: number): void {
  document.querySelectorAll<HTMLElement>('.speler-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset['n']) === n);
  });
  const veld = document.getElementById('aantalSpelers') as HTMLInputElement | null;
  if (veld) veld.value = String(n);
  document.querySelectorAll<HTMLElement>('.email-extra').forEach(el => zetExtraVeld(el, n >= 3));
  document.querySelectorAll<HTMLElement>('.email-extra-4').forEach(el => zetExtraVeld(el, n >= 4));
}

document.querySelectorAll<HTMLElement>('.speler-btn').forEach(knop => {
  knop.addEventListener('click', () => kiesAantalSpelers(parseInt(knop.dataset['n'] ?? '2', 10)));
});

// ── Easter egg: typ "goedertier" op de pagina ──
const WOORD = 'goedertier';
let buffer = '';
const toast = document.createElement('div');
toast.className = 'goedertier-toast';
toast.setAttribute('role', 'status');
const bron = document.createElement('span');
bron.className = 'goedertier-bron';
bron.textContent = '- Arsène Goedertier, november 1934';
toast.append(
  '"Ik alleen weet waar de Rechtvaardige Rechters rusten.',
  document.createElement('br'),
  'Dit geheim zal met mij sterven."',
  bron,
);
document.body.appendChild(toast);

document.addEventListener('keydown', e => {
  buffer = (buffer + e.key).toLowerCase().slice(-WOORD.length);
  if (buffer !== WOORD) return;
  toast.classList.add('zichtbaar');
  setTimeout(() => toast.classList.remove('zichtbaar'), 5000);
});
