import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/tijd-voorbij.ts', () => ({ sluitSessieUitUrl: vi.fn() }));
vi.mock('../shared/js/review-form.ts', () => ({ koppelReviewFormulier: vi.fn() }));

import {
  ZONES,
  AANTAL_ZONES,
  initKamerinspectie,
} from '../experiences/kamer-14/js/kamerinspectie.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');
const body = (bestand: string) =>
  (lees(bestand).match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '').replace(
    /<script[\s\S]*?<\/script>/g,
    '',
  );

describe("geen inline scripts meer in de Kamer 14-pagina's", () => {
  it.each(['speler-a.html', 'speler-b.html', 'einde.html', 'tijd-voorbij.html', 'index.html'])(
    '%s heeft enkel <script type="module" src>',
    bestand => {
      const scripts = lees(bestand).match(/<script\b[^>]*>/g) ?? [];
      scripts.forEach(tag => expect(tag).toMatch(/type="module"[^>]*src=|src=[^>]*type="module"/));
    },
  );
});

describe('kamerinspectie', () => {
  beforeEach(() => {
    document.body.innerHTML = body('speler-b.html');
    initKamerinspectie();
  });

  it('elke zone op de foto heeft een bevinding, en omgekeerd', () => {
    const opFoto = [...document.querySelectorAll<HTMLElement>('.kamer-zone')].map(
      z => z.dataset['zone'],
    );
    expect(opFoto.sort()).toEqual(Object.keys(ZONES).sort());
    expect(AANTAL_ZONES).toBe(7);
  });

  it('een zone openen toont de bevinding en telt mee; sluiten met de knop', () => {
    const prikbord = document.querySelector<HTMLElement>('[data-zone="prikbord"]')!;
    prikbord.click();
    const modal = document.getElementById('zone-modal')!;
    expect(modal.style.display).toBe('block');
    expect(document.getElementById('zone-modal-titel')!.textContent).toBe(ZONES['prikbord']!.titel);
    expect(document.getElementById('zone-prikbord-inhoud')!.style.display).toBe('block');
    expect(document.getElementById('zone-prullenmand-inhoud')!.style.display).toBe('none');
    expect(document.getElementById('zone-teller')!.textContent).toBe('1');
    document.querySelector<HTMLElement>('#zone-modal .modal-sluit-btn')!.click();
    expect(modal.style.display).toBe('none');
  });

  it('Escape en de achtergrond sluiten het venster', () => {
    document.querySelector<HTMLElement>('[data-zone="bed"]')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('zone-modal')!.style.display).toBe('none');
    document.querySelector<HTMLElement>('[data-zone="raam"]')!.click();
    document.getElementById('zone-modal-backdrop')!.click();
    expect(document.getElementById('zone-modal')!.style.display).toBe('none');
  });

  it('alle zeven bekeken: de teller staat op klaar', () => {
    document.querySelectorAll<HTMLElement>('.kamer-zone').forEach(z => z.click());
    const teller = document.getElementById('zone-teller')!;
    expect(teller.textContent).toBe('7');
    expect(teller.parentElement!.classList).toContain('zv-klaar');
  });
});

describe('tijd voorbij: nieuwe post', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    window.history.replaceState({}, '', '/experiences/kamer-14/tijd-voorbij.html');
    document.body.innerHTML = body('tijd-voorbij.html');
    Element.prototype.scrollIntoView = () => {};
  });
  afterEach(() => vi.useRealTimers());

  it('verschijnt na 4 seconden en opent de briefkaart met een klik of Enter', async () => {
    await import('../experiences/kamer-14/js/tijd-voorbij.ts');
    const notif = document.getElementById('nieuwe-post-notif')!;
    expect(notif.classList).toContain('verborgen');
    vi.advanceTimersByTime(4000);
    expect(notif.classList).not.toContain('verborgen');
    notif.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(document.getElementById('briefkaart-blok')!.classList).not.toContain('verborgen');
    expect(notif.style.display).toBe('none');
  });
});
