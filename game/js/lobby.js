import { valideerSessie } from './session.js';

function toonScherm(id) {
  document.querySelectorAll('.scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.toonScherm = toonScherm;

async function valideerCode() {
  const input = document.getElementById('sessieCodeInput');
  const fout  = document.querySelector('#scherm-code .code-fout');
  const knop  = document.querySelector('#scherm-code .btn-game');
  const code  = input.value.trim().toUpperCase();

  if (code.length < 3) {
    input.classList.add('invoer-fout');
    fout.textContent = 'Voer een geldige sessiecode in.';
    fout.classList.remove('verborgen');
    return;
  }

  knop.disabled = true;
  knop.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Controleren…';

  try {
    const geldig = await valideerSessie(code);

    if (!geldig) {
      input.classList.add('invoer-fout');
      fout.textContent = 'Ongeldige of inactieve code. Controleer je e-mail.';
      fout.classList.remove('verborgen');
      return;
    }

    sessionStorage.setItem('sessieCode', code);
    input.classList.remove('invoer-fout');
    fout.classList.add('verborgen');
    toonScherm('scherm-rol');

  } catch (err) {
    console.error('Firebase fout:', err);
    fout.textContent = 'Verbindingsfout. Controleer je internetverbinding.';
    fout.classList.remove('verborgen');
  } finally {
    knop.disabled = false;
    knop.innerHTML = '<i class="bi bi-arrow-right me-2"></i>Verder';
  }
}
window.valideerCode = valideerCode;

document.getElementById('sessieCodeInput').addEventListener('input', () => {
  document.getElementById('sessieCodeInput').classList.remove('invoer-fout');
  document.querySelector('#scherm-code .code-fout').classList.add('verborgen');
});

document.getElementById('sessieCodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') valideerCode();
});

function kiesRol(rol) {
  const code = sessionStorage.getItem('sessieCode');
  if (!code) { toonScherm('scherm-code'); return; }
  window.location.href = rol === 'a'
    ? `speler-a.html?sessie=${code}`
    : `speler-b.html?sessie=${code}`;
}
window.kiesRol = kiesRol;