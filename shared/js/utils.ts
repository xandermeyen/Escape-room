import { koppelActies, hintBlokVan } from './acties.ts';

/**
 * requireEl: haalt een element op via id en gooit een duidelijke fout als het
 * niet bestaat. Vervangt de `getElementById(...)!`-patronen die met strict mode
 * een stille null-deref konden geven. Gebruik het type-argument voor de
 * concrete elementsoort, bijv. `requireEl<HTMLInputElement>('antwoord')`.
 */
export function requireEl<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Verwacht element #${id} bestaat niet in de DOM`);
  return el as T;
}

/**
 * sessieUitUrl: leest ?sessie= uit de URL. Ontbreekt de code, dan sturen we de
 * speler terug naar de lobby en gooien we, zodat de rest van de module niet
 * verder draait tegen een niet-bestaande sessie.
 */
export function sessieUitUrl(redirectNaar = 'index.html'): string {
  const sessie = new URLSearchParams(window.location.search).get('sessie');
  if (!sessie) {
    window.location.href = redirectNaar;
    throw new Error('Geen sessiecode in de URL');
  }
  return sessie;
}

/** escHtml: escapet tekst voor veilige interpolatie in innerHTML. */
export function escHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

/**
 * sha256Hex: SHA-256 hash van een string als hex.
 */
export async function sha256Hex(waarde: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(waarde));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * antwoordKlopt: hasht `waarde` en kijkt of die voorkomt in `hashes`.
 * Plain-text antwoorden hoeven zo nooit in de broncode te staan.
 */
export async function antwoordKlopt(waarde: string, hashes: string[]): Promise<boolean> {
  const hex = await sha256Hex(waarde);
  return hashes.includes(hex);
}

// ── Soepele antwoordcontrole ──────────────────────────────
// Elke invoer gaat eerst door normaliseerInvoer (basisvorm), daarna optioneel
// door een puzzel-eigen normaliseer() die er één vaste vorm van maakt. Pas
// die vaste vorm wordt gehasht. Zo volstaat één hash per puzzel en staan er
// nog steeds geen plain-text antwoorden in de broncode.

/**
 * normaliseerInvoer: basisvorm van een antwoord vóór het hashen.
 * Kleine letters, accenten weg, leestekens worden een spatie (zodat
 * "dinsdag,donderdag" twee woorden blijft), meerdere spaties worden één,
 * en trim.
 */
export function normaliseerInvoer(waarde: string): string {
  return waarde
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // accenten (combinerende tekens)
    .replace(/\p{Cf}/gu, '') // onzichtbare tekens (zero-width e.d.)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // leestekens → spatie
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Regels voor één puzzel. Alles is optioneel: zonder regel wordt enkel de
 * basisvorm uit normaliseerInvoer gehasht.
 */
export interface AntwoordRegel {
  /** Maakt van de basisvorm de vaste vorm die gehasht wordt (bv. "7u35" → "07:35"). */
  normaliseer?: (basis: string) => string;
  /**
   * Extra kandidaten naast de invoer zelf, bv. alle varianten met één
   * typfout. Elke kandidaat gaat nog door `normaliseer`.
   */
  varianten?: (basis: string) => string[];
  /**
   * Hashes van gedeeltelijke antwoorden (bv. één van de twee dagen, of het
   * juiste uur). Komt een deelvorm overeen, dan is het oordeel 'bijna'.
   */
  bijnaHashes?: string[];
  /** Delen van de vaste vorm die tegen bijnaHashes getoetst worden. Standaard: de vaste vorm zelf. */
  deelvormen?: (vasteVorm: string) => string[];
}

export type Beoordeling = 'juist' | 'bijna' | 'fout';

export const BIJNA_TEKST = 'Je zit dicht bij het antwoord. Overleg nog eens.';

/**
 * beoordeelAntwoord: normaliseert `waarde`, hasht de vaste vorm (en eventuele
 * varianten) en vergelijkt met `hashes`. Puur en zonder DOM, dus testbaar.
 */
export async function beoordeelAntwoord(
  waarde: string,
  hashes: string[],
  regel: AntwoordRegel = {},
): Promise<Beoordeling> {
  const basis = normaliseerInvoer(waarde);
  if (!basis) return 'fout';
  const vasteVorm = regel.normaliseer ?? ((s: string) => s);

  const kandidaten = new Set<string>([vasteVorm(basis)]);
  for (const v of regel.varianten?.(basis) ?? []) {
    const vorm = vasteVorm(normaliseerInvoer(v));
    if (vorm) kandidaten.add(vorm);
  }

  const kandidaatHashes = await Promise.all([...kandidaten].map(sha256Hex));
  if (kandidaatHashes.some(h => hashes.includes(h))) return 'juist';

  const bijna = regel.bijnaHashes ?? [];
  if (bijna.length) {
    const vorm = vasteVorm(basis);
    const delen = regel.deelvormen ? regel.deelvormen(vorm) : [vorm];
    const deelHashes = await Promise.all(delen.map(sha256Hex));
    if (deelHashes.some(h => bijna.includes(h))) return 'bijna';
  }
  return 'fout';
}

/**
 * eenTypfoutVarianten: alle schrijfwijzen die één bewerking van `woord`
 * verschillen (letter weg, letter erbij, letter vervangen, twee buurletters
 * omgewisseld). Zo kan "één letter verschil" aanvaard worden zonder het
 * antwoord zelf in de broncode te zetten: we hashen de varianten van wat de
 * speler typte en kijken of er één de juiste hash heeft.
 */
export function eenTypfoutVarianten(
  woord: string,
  alfabet = 'abcdefghijklmnopqrstuvwxyz ',
): string[] {
  const uit = new Set<string>();
  for (let i = 0; i <= woord.length; i++) {
    const links = woord.slice(0, i);
    const rechts = woord.slice(i);
    if (rechts) uit.add(links + rechts.slice(1)); // weglating
    if (rechts.length > 1) uit.add(links + rechts[1] + rechts[0] + rechts.slice(2)); // omwisseling
    for (const c of alfabet) {
      if (rechts) uit.add(links + c + rechts.slice(1)); // vervanging
      uit.add(links + c + rechts); // invoeging
    }
  }
  uit.delete(woord);
  return [...uit];
}

/**
 * controleerAntwoordHash
 * ──────────────────────────────────────────────────────────────────────────
 * Checks a puzzle answer by SHA-256 hashing the player's (normalised) input
 * and comparing it against a set of pre-computed hashes. Plain-text answers
 * are never stored in the source — a player opening DevTools sees only hashes.
 *
 * @param puzzelNr   - Key into `hashes` (e.g. 'p1')
 * @param inputId    - ID of the <input> element
 * @param feedbackId - ID of the feedback element
 * @param btnId      - ID of the submit button
 * @param hashes     - Map of puzzelNr → string[] of SHA-256 hex hashes
 * @param onJuist    - Called when the answer is correct
 * @param foutTekst  - Feedback text shown on a wrong answer
 * @param regels     - Optional per-puzzle normalisation rules
 * @param opOordeel  - Optional callback with the verdict (speldata, hulpmeldingen)
 */
export async function controleerAntwoordHash(
  puzzelNr: string,
  inputId: string,
  feedbackId: string,
  btnId: string,
  hashes: Record<string, string[]>,
  onJuist: () => void,
  foutTekst: string,
  regels: Record<string, AntwoordRegel> = {},
  opOordeel?: (oordeel: Beoordeling) => void,
): Promise<void> {
  const input = requireEl<HTMLInputElement>(inputId);
  const feedback = requireEl<HTMLElement>(feedbackId);
  const btn = requireEl<HTMLButtonElement>(btnId);
  if (!normaliseerInvoer(input.value)) return;

  const oordeel = await beoordeelAntwoord(input.value, hashes[puzzelNr] || [], regels[puzzelNr]);
  opOordeel?.(oordeel);
  if (oordeel === 'juist') {
    input.classList.remove('fout');
    feedback.className = 'puzzel-feedback correct';
    feedback.textContent = 'Juist! Even opslaan…';
    btn.disabled = true;
    onJuist();
  } else {
    input.classList.add('fout');
    feedback.className =
      oordeel === 'bijna' ? 'puzzel-feedback fout bijna' : 'puzzel-feedback fout';
    feedback.textContent = oordeel === 'bijna' ? BIJNA_TEKST : foutTekst || 'Niet correct.';
    setTimeout(() => input.classList.remove('fout'), 1500);
  }
}

export function volgendHint(blokId: string): void {
  const blok = document.getElementById(blokId);
  if (!blok) return;

  const stappen = blok.querySelectorAll<HTMLElement>('.hint-stap');
  const knopMeer = blok.querySelector<HTMLElement>('.hint-verder');
  const knopOpen = blok.querySelector<HTMLElement>('.hint-knop');

  for (const [i, stap] of [...stappen].entries()) {
    if (stap.classList.contains('verborgen')) {
      stap.classList.remove('verborgen');
      // Laat speldata en hulpmeldingen weten welke stap geopend werd.
      document.dispatchEvent(new CustomEvent('hint-geopend', { detail: { blokId, stap: i + 1 } }));

      // Verberg de initiële "Hint aanvragen"-knop
      knopOpen?.classList.add('verborgen');

      // Toon of verberg de "Volgende aanwijzing"-knop
      const nogMeer = [...stappen].some(s => s.classList.contains('verborgen'));
      knopMeer?.classList.toggle('verborgen', !nogMeer);
      return;
    }
  }
}

/** Koppelt alle hintknoppen (data-actie="hint") op de pagina aan een hint-functie. */
export function koppelHints(opHint: (blokId: string) => void = volgendHint): void {
  koppelActies({
    hint: el => {
      const blokId = hintBlokVan(el);
      if (blokId) opHint(blokId);
    },
  });
}
