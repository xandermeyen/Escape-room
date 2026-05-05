/* ── Scherm wisselen ── */
function toonScherm(id) {
  document.querySelectorAll('.scherm').forEach(s => s.classList.remove('actief'));
  const doel = document.getElementById(id);
  if (doel) {
    doel.classList.add('actief');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


/* ── Sessiecode valideren ── */
function valideerCode() {
  const input = document.getElementById('sessieCodeInput');
  const fout  = document.getElementById('code-fout');
  const code  = input.value.trim().toUpperCase();

  // Tijdelijk: elke code van minstens 3 tekens is geldig
  // Later vervangen door Firebase-check
  if (code.length < 3) {
    input.classList.add('invoer-fout');
    fout.classList.remove('verborgen');
    return;
  }

  input.classList.remove('invoer-fout');
  fout.classList.add('verborgen');

  // Sla de code op voor gebruik in de volgende stap
  sessionStorage.setItem('sessieCode', code);

  toonScherm('scherm-rol');
}

// Foutmelding verbergen zodra gebruiker begint te typen
document.getElementById('sessieCodeInput').addEventListener('input', () => {
  document.getElementById('sessieCodeInput').classList.remove('invoer-fout');
  document.getElementById('code-fout').classList.add('verborgen');
});

// Enter-toets werkt ook op het invoerveld
document.getElementById('sessieCodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') valideerCode();
});


/* ── Rol kiezen ── */
function kiesRol(rol) {
  const code = sessionStorage.getItem('sessieCode');

  if (rol === 'a') {
    window.location.href = `speler-a.html?sessie=${code}`;
  } else {
    window.location.href = `speler-b.html?sessie=${code}`;
  }
}