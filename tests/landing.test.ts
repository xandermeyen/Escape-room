import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  koppelBoekformulier,
  koppelFaq,
  koppelGsmMenu,
  vandaagIso,
  BOEK_FOUT_TEKST,
  datumAlsTekst,
  leesBoekAntwoord,
} from '../js/landing.ts';

const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

const HOOK = 'https://hook.eu1.make.com/test';
const FORM = `
  <form id="boekForm" action="${HOOK}">
    <input type="hidden" name="experience" value="kamer-14" />
    <input name="email_speler_1" value=" a@b.be " />
    <input name="datum" type="date" />
    <button type="submit">Start de sessie</button>
  </form>
  <div id="boek-ok" style="display:none">
    <strong data-boek="code"></strong>
    <a data-boek="link" href="#">Open</a>
    <button type="button" data-boek="kopieer">Kopieer link</button>
  </div>
  <p id="boek-fout" hidden></p>`;

const GOED = {
  sessieCode: 'AB12CD34',
  link: 'https://bureau-x.be/experiences/kamer-14/?sessie=AB12CD34',
};
const antwoord = (body: unknown, status = 200) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));

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

  it('gelukt: formulier weg, code en link meteen zichtbaar', async () => {
    const fetcher = antwoord(GOED);
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    await vi.waitFor(() => expect(document.getElementById('boek-ok')!.style.display).toBe('block'));
    expect(document.getElementById('boekForm')!.style.display).toBe('none');
    expect(document.querySelector('[data-boek="code"]')!.textContent).toBe('AB12CD34');
    expect(document.querySelector<HTMLAnchorElement>('[data-boek="link"]')!.href).toBe(GOED.link);
  });

  it('stuurt een simple request (form-urlencoded) naar de webhook, met getrimde velden', async () => {
    const fetcher = antwoord(GOED);
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalled());
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(HOOK);
    expect(init.headers).toBeUndefined();
    const body = init.body as URLSearchParams;
    expect(body.get('experience')).toBe('kamer-14');
    expect(body.get('email_speler_1')).toBe('a@b.be');
    expect(body.get('datumTekst')).toBe('');
  });

  it('antwoord zonder geldige code of met een vreemde link telt als mislukt', async () => {
    const fetcher = antwoord({ sessieCode: 'x', link: 'https://elders.be' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    await vi.waitFor(() => expect(document.getElementById('boek-fout')!.hidden).toBe(false));
    expect(document.getElementById('boek-ok')!.style.display).toBe('none');
  });

  it('mislukt: formulier blijft, knop opnieuw bruikbaar, en een zichtbare foutmelding', async () => {
    const fetcher = antwoord({}, 500);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    koppelBoekformulier(fetcher as unknown as typeof fetch);
    verstuur();
    const fout = document.getElementById('boek-fout')!;
    await vi.waitFor(() => expect(fout.hidden).toBe(false));
    expect(fout.textContent).toBe(BOEK_FOUT_TEKST);
    const knop = document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(knop.disabled).toBe(false);
    expect(knop.textContent).toBe('Start de sessie');
    expect(document.getElementById('boek-ok')!.style.display).toBe('none');
  });
});

describe('boekingshulpjes', () => {
  it('leesBoekAntwoord aanvaardt enkel onze eigen links', () => {
    expect(leesBoekAntwoord(GOED)).toEqual(GOED);
    expect(() => leesBoekAntwoord('Accepted')).toThrow();
    expect(() => leesBoekAntwoord({ ...GOED, link: 'javascript:alert(1)' })).toThrow();
  });

  it('datumAlsTekst geeft een leesbare datum of leeg', () => {
    expect(datumAlsTekst('2026-11-20')).toMatch(/vrijdag 20 november/);
    expect(datumAlsTekst('')).toBe('');
    expect(datumAlsTekst('onzin')).toBe('');
  });

  it.each(['kamer-14/index.html', 'dua/index.html'])('%s post naar de Make-webhook', pad => {
    const html = lees(pad);
    expect(html).toContain('action="https://hook.eu1.make.com/');
    expect(html).not.toContain('formspree');
    expect(html).toMatch(/name="experience" value="(kamer-14|dua)"/);
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
