import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  koppelBoekformulier,
  koppelFaq,
  koppelGsmMenu,
  vandaagIso,
  BOEK_FOUT_TEKST,
} from '../js/landing.ts';

const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

const FORM = `
  <form id="boekForm" action="https://formspree.io/f/test">
    <input name="datum" type="date" />
    <button type="submit">Sessie aanvragen</button>
  </form>
  <p id="boek-ok" style="display:none"></p>
  <p id="boek-fout" hidden></p>`;

const verstuur = () =>
  document.getElementById('boekForm')!.dispatchEvent(new Event('submit', { cancelable: true }));

describe("landingspagina's: geen inline JavaScript meer", () => {
  it.each(['index.html', 'kamer-14/index.html', 'dua/index.html', 'privacy.html'])('%s', pad => {
    const tags = lees(pad).match(/<script\b[^>]*>/g) ?? [];
    for (const tag of tags) {
      expect(tag).toMatch(/type="(module|application\/ld\+json)"/);
    }
    expect(lees(pad)).not.toContain('cdnjs.cloudflare.com/ajax/libs/three.js');
  });

  it.each(['kamer-14/index.html', 'dua/index.html'])(
    '%s heeft een plek voor de foutmelding',
    pad => {
      expect(lees(pad)).toContain('id="boek-fout"');
    },
  );
});

describe('boekingsformulier', () => {
  beforeEach(() => {
    document.body.innerHTML = FORM;
  });

  it('datum kan niet in het verleden', () => {
    koppelBoekformulier(vi.fn());
    const datum = document.querySelector<HTMLInputElement>('input[name="datum"]')!;
    expect(datum.min).toBe(vandaagIso());
  });

  it('gelukt: formulier weg, bevestiging zichtbaar', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    await vi.waitFor(() => expect(document.getElementById('boek-ok')!.style.display).toBe('block'));
    expect(fetcher).toHaveBeenCalledWith('https://formspree.io/f/test', expect.anything());
    expect(document.getElementById('boekForm')!.style.display).toBe('none');
  });

  it('mislukt: formulier blijft, knop opnieuw bruikbaar, en een zichtbare foutmelding', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('{}', { status: 500 })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    const fout = document.getElementById('boek-fout')!;
    await vi.waitFor(() => expect(fout.hidden).toBe(false));
    expect(fout.textContent).toBe(BOEK_FOUT_TEKST);
    const knop = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(knop.disabled).toBe(false);
    expect(knop.textContent).toBe('Sessie aanvragen');
    expect(document.getElementById('boek-ok')!.style.display).toBe('none');
  });
});

describe('menu en FAQ', () => {
  it('gsm-menu opent en sluit na een klik op een link', () => {
    document.body.innerHTML = `
      <button id="navToggle" aria-expanded="false"></button>
      <ul id="navLinks"><li><a href="#x">x</a></li></ul>`;
    koppelGsmMenu();
    const knop = document.getElementById('navToggle')!;
    knop.click();
    expect(knop.getAttribute('aria-expanded')).toBe('true');
    document.querySelector('a')!.click();
    expect(knop.getAttribute('aria-expanded')).toBe('false');
  });

  it('FAQ: één vraag tegelijk open', () => {
    document.body.innerHTML = `
      <div class="faq-item"><button class="faq-q">1</button></div>
      <div class="faq-item"><button class="faq-q">2</button></div>`;
    koppelFaq();
    const [een, twee] = document.querySelectorAll<HTMLElement>('.faq-q');
    een!.click();
    twee!.click();
    const open = document.querySelectorAll('.faq-item.open');
    expect(open).toHaveLength(1);
    expect(open[0]!.contains(twee!)).toBe(true);
    twee!.click();
    expect(document.querySelectorAll('.faq-item.open')).toHaveLength(0);
  });
});
