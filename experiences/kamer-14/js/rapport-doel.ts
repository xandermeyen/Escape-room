/**
 * rapport-doel.ts: de vier vragen uit het rapport voor An Vermeersch, zichtbaar
 * op beide spelerpagina's. Een vraag krijgt een vinkje zodra de puzzel die
 * het antwoord oplevert opgelost is. Het antwoord zelf verschijnt nergens.
 */

/** Welke puzzel elke rapportvraag beantwoordt. */
export const RAPPORT_VRAGEN: { puzzel: string; tekst: string }[] = [
  { puzzel: 'p2', tekst: 'Waar is Lena naartoe?' },
  { puzzel: 'p4', tekst: 'Bij wie is ze?' },
  { puzzel: 'p5', tekst: 'Hoe geraakte ze er?' },
  { puzzel: 'p5', tekst: 'Wanneer vertrok ze?' },
];

/** Op gsm-breedte start de lijst dichtgeklapt. */
export const GSM_QUERY = '(max-width: 600px)';

/** Zet de lijst open of dicht naargelang de schermbreedte. */
export function initRapportDoel(el: HTMLDetailsElement | null = rapportDoel()): void {
  if (!el) return;
  const gsm = typeof window.matchMedia === 'function' && window.matchMedia(GSM_QUERY).matches;
  el.open = !gsm;
}

/** Vinkt de vragen aan waarvan de puzzel opgelost is. */
export function updateRapportDoel(
  puzzels: Record<string, boolean>,
  el: HTMLElement | null = rapportDoel(),
): void {
  if (!el) return;
  let aantal = 0;
  el.querySelectorAll<HTMLElement>('li[data-puzzel]').forEach(li => {
    const klaar = !!puzzels[li.dataset['puzzel'] ?? ''];
    if (klaar) aantal++;
    li.classList.toggle('gevonden', klaar);
    const status = li.querySelector('.doel-status');
    if (status) status.textContent = klaar ? ' (gevonden)' : '';
  });
  const teller = el.querySelector('.doel-teller');
  if (teller) teller.textContent = `${aantal}/${RAPPORT_VRAGEN.length}`;
}

function rapportDoel(): HTMLDetailsElement | null {
  return document.getElementById('rapport-doel') as HTMLDetailsElement | null;
}
