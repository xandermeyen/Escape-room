import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toonRecaptchaMeldingen } from '../shared/js/app-check-status.ts';

const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

describe('reCAPTCHA-melding', () => {
  it('verschijnt alleen als App Check actief is', () => {
    document.body.innerHTML = '<p class="recaptcha-melding" hidden>reCAPTCHA</p>';
    const el = document.querySelector<HTMLElement>('.recaptcha-melding')!;
    toonRecaptchaMeldingen(false);
    expect(el.hidden).toBe(true);
    toonRecaptchaMeldingen(true);
    expect(el.hidden).toBe(false);
    toonRecaptchaMeldingen(false);
    expect(el.hidden).toBe(true);
  });

  it.each(['experiences/kamer-14/index.html', 'experiences/dua/index.html', 'privacy.html'])(
    '%s: elke vermelding van reCAPTCHA staat standaard verborgen',
    pad => {
      const doc = new DOMParser().parseFromString(lees(pad), 'text/html');
      const meldingen = [...doc.querySelectorAll<HTMLElement>('.recaptcha-melding')];
      expect(meldingen.length).toBeGreaterThan(0);
      meldingen.forEach(m => expect(m.hidden).toBe(true));
      // Geen reCAPTCHA-tekst buiten die verborgen elementen.
      meldingen.forEach(m => m.remove());
      expect(doc.body.textContent).not.toMatch(/reCAPTCHA/);
    },
  );
});
