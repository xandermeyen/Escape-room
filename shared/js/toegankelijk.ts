/**
 * toegankelijk.ts — kleine helpers zodat klikbare elementen die geen
 * <button> zijn (kaarten, tabs, zones) ook met het toetsenbord werken.
 */

/** Focus, rol "button" en Enter/spatie als klik. Idempotent. */
export function maakKlikbaar(el: HTMLElement | SVGElement, label?: string): void {
  if (el.dataset.klikbaar === '1') return;
  el.dataset.klikbaar = '1';
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  if (label && !el.hasAttribute('aria-label')) el.setAttribute('aria-label', label);
  el.addEventListener('keydown', (e: Event) => {
    const toets = (e as KeyboardEvent).key;
    if (toets !== 'Enter' && toets !== ' ') return;
    e.preventDefault();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

/**
 * Tabs (div.tab in .tabs) als toegankelijke tablist: Tab/Enter/spatie,
 * pijltjes links/rechts, aria-selected en aria-disabled voor vergrendelde
 * tabs. Volgt de bestaande klassen 'actief' en 'slot'.
 */
export function maakTabsToegankelijk(container: HTMLElement | null): void {
  if (!container) return;
  container.setAttribute('role', 'tablist');
  const tabs = () => [...container.querySelectorAll<HTMLElement>('.tab')];

  const sync = () => {
    for (const tab of tabs()) {
      const slot = tab.classList.contains('slot');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', tab.classList.contains('actief') ? '0' : '-1');
      tab.setAttribute('aria-selected', String(tab.classList.contains('actief')));
      if (slot) tab.setAttribute('aria-disabled', 'true');
      else tab.removeAttribute('aria-disabled');
      const doel = tab.dataset.tab;
      if (doel) tab.setAttribute('aria-controls', `panel-${doel}`);
    }
  };
  sync();

  container.addEventListener('keydown', (e: KeyboardEvent) => {
    const lijst = tabs();
    const i = lijst.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      lijst[i]?.click();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const volgende = lijst[(i + (e.key === 'ArrowRight' ? 1 : -1) + lijst.length) % lijst.length];
      volgende?.setAttribute('tabindex', '0');
      volgende?.focus();
    }
  });
  // Na elke klik (ook vrijgave van een tab) de ARIA-toestand bijwerken.
  container.addEventListener('click', () => queueMicrotask(sync));
  new MutationObserver(sync).observe(container, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}
