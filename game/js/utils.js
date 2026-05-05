export function volgendHint(blokId) {
  const blok = document.getElementById(blokId);
  if (!blok) return;

  const stappen  = blok.querySelectorAll('.hint-stap');
  const knopMeer = blok.querySelector('.hint-verder');
  const knopOpen = blok.querySelector('.hint-knop');

  for (const stap of stappen) {
    if (stap.classList.contains('verborgen')) {
      stap.classList.remove('verborgen');

      // Verberg de initiële "Hint aanvragen"-knop
      knopOpen?.classList.add('verborgen');

      // Toon of verberg de "Volgende aanwijzing"-knop
      const nogMeer = [...stappen].some(s => s.classList.contains('verborgen'));
      if (knopMeer) {
        nogMeer
          ? knopMeer.classList.remove('verborgen')
          : knopMeer.classList.add('verborgen');
      }
      return;
    }
  }
}

// Globaal beschikbaar voor onclick-attributen in HTML
window.volgendHint = volgendHint;