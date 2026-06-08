/**
 * controleerAntwoordHash
 * ──────────────────────────────────────────────────────────────────────────
 * Checks a puzzle answer by SHA-256 hashing the player's input and comparing
 * it against a set of pre-computed hashes. Plain-text answers are never stored
 * in the source — a player opening DevTools sees only hashes.
 *
 * @param {string}   puzzelNr   - Key into `hashes` (e.g. 'p1')
 * @param {string}   inputId    - ID of the <input> element
 * @param {string}   feedbackId - ID of the feedback element
 * @param {string}   btnId      - ID of the submit button
 * @param {Object}   hashes     - Map of puzzelNr → string[] of SHA-256 hex hashes
 * @param {Function} onJuist    - Called when the answer is correct
 * @param {string}   foutTekst  - Feedback text shown on a wrong answer
 */
export async function controleerAntwoordHash(
  puzzelNr, inputId, feedbackId, btnId, hashes, onJuist, foutTekst
) {
  const input    = document.getElementById(inputId);
  const feedback = document.getElementById(feedbackId);
  const btn      = document.getElementById(btnId);
  const waarde   = input.value.trim().toLowerCase();
  if (!waarde) return;

  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(waarde));
  const hex = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  if ((hashes[puzzelNr] || []).includes(hex)) {
    input.classList.remove('fout');
    feedback.className   = 'puzzel-feedback correct';
    feedback.textContent = 'Correct — Firebase wordt bijgewerkt…';
    btn.disabled = true;
    onJuist();
  } else {
    input.classList.add('fout');
    feedback.className   = 'puzzel-feedback fout';
    feedback.textContent = foutTekst || 'Niet correct.';
    setTimeout(() => input.classList.remove('fout'), 1500);
  }
}

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
