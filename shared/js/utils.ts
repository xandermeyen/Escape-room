/**
 * sha256Hex: SHA-256 hash van een string als hex.
 */
export async function sha256Hex(waarde: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(waarde));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * antwoordKlopt: hasht `waarde` en kijkt of die voorkomt in `hashes`.
 * Plain-text antwoorden hoeven zo nooit in de broncode te staan.
 */
export async function antwoordKlopt(waarde: string, hashes: string[]): Promise<boolean> {
  const hex = await sha256Hex(waarde);
  return hashes.includes(hex);
}

/**
 * controleerAntwoordHash
 * ──────────────────────────────────────────────────────────────────────────
 * Checks a puzzle answer by SHA-256 hashing the player's input and comparing
 * it against a set of pre-computed hashes. Plain-text answers are never stored
 * in the source — a player opening DevTools sees only hashes.
 *
 * @param puzzelNr   - Key into `hashes` (e.g. 'p1')
 * @param inputId    - ID of the <input> element
 * @param feedbackId - ID of the feedback element
 * @param btnId      - ID of the submit button
 * @param hashes     - Map of puzzelNr → string[] of SHA-256 hex hashes
 * @param onJuist    - Called when the answer is correct
 * @param foutTekst  - Feedback text shown on a wrong answer
 */
export async function controleerAntwoordHash(
  puzzelNr: string,
  inputId: string,
  feedbackId: string,
  btnId: string,
  hashes: Record<string, string[]>,
  onJuist: () => void,
  foutTekst: string,
): Promise<void> {
  const input    = document.getElementById(inputId) as HTMLInputElement;
  const feedback = document.getElementById(feedbackId) as HTMLElement;
  const btn      = document.getElementById(btnId) as HTMLButtonElement;
  const waarde   = input.value.trim().toLowerCase();
  if (!waarde) return;

  if (await antwoordKlopt(waarde, hashes[puzzelNr] || [])) {
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

export function volgendHint(blokId: string): void {
  const blok = document.getElementById(blokId);
  if (!blok) return;

  const stappen  = blok.querySelectorAll<HTMLElement>('.hint-stap');
  const knopMeer = blok.querySelector<HTMLElement>('.hint-verder');
  const knopOpen = blok.querySelector<HTMLElement>('.hint-knop');

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
declare global {
  interface Window {
    volgendHint: typeof volgendHint;
  }
}

window.volgendHint = volgendHint;
