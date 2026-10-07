import { describe, it, expect, vi } from 'vitest';
import { maakKlikbaar, maakTabsToegankelijk } from '../shared/js/toegankelijk.ts';

describe('maakKlikbaar', () => {
  it('maakt een div focusbaar en klikbaar met Enter en spatie', () => {
    document.body.innerHTML = '<div id="kaart"></div>';
    const kaart = document.getElementById('kaart')!;
    const klik = vi.fn();
    kaart.addEventListener('click', klik);
    maakKlikbaar(kaart, 'Kies Speler A');
    maakKlikbaar(kaart); // tweede keer: geen dubbele handler
    expect(kaart.getAttribute('role')).toBe('button');
    expect(kaart.getAttribute('tabindex')).toBe('0');
    expect(kaart.getAttribute('aria-label')).toBe('Kies Speler A');
    kaart.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    kaart.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    kaart.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(klik).toHaveBeenCalledTimes(2);
  });
});

describe('maakTabsToegankelijk', () => {
  const opbouw = () => {
    document.body.innerHTML = `
      <div class="tabs">
        <div class="tab actief" data-tab="rooster">Weekrooster</div>
        <div class="tab" data-tab="notities">Notities</div>
        <div class="tab slot" data-tab="atelier">Atelier</div>
      </div>`;
    const tabs = [...document.querySelectorAll<HTMLElement>('.tab')];
    maakTabsToegankelijk(document.querySelector('.tabs'));
    return tabs;
  };

  it('zet de rollen en de toestand voor schermlezers', () => {
    const [a, b, c] = opbouw();
    expect(document.querySelector('.tabs')!.getAttribute('role')).toBe('tablist');
    expect(a!.getAttribute('aria-selected')).toBe('true');
    expect(b!.getAttribute('aria-selected')).toBe('false');
    expect(c!.getAttribute('aria-disabled')).toBe('true');
    expect(a!.getAttribute('aria-controls')).toBe('panel-rooster');
    expect(a!.getAttribute('tabindex')).toBe('0');
    expect(b!.getAttribute('tabindex')).toBe('-1');
  });

  it('pijltje rechts verplaatst de focus, Enter activeert', () => {
    const [a, b] = opbouw();
    const klik = vi.fn();
    b!.addEventListener('click', klik);
    a!.focus();
    a!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(b);
    b!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(klik).toHaveBeenCalledOnce();
  });

  it('volgt een vrijgegeven tab', async () => {
    const [, , c] = opbouw();
    c!.classList.remove('slot');
    await new Promise(r => setTimeout(r, 0));
    expect(c!.hasAttribute('aria-disabled')).toBe(false);
  });
});
