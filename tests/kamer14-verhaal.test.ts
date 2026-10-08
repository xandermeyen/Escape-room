import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  RAPPORT_VRAGEN,
  initRapportDoel,
  updateRapportDoel,
} from '../experiences/kamer-14/js/rapport-doel.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');

const tekst = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

/** Het rapport-doel-blok uit een spelerpagina. */
const doelHtml = (bestand: string) =>
  /<details class="rapport-doel"[\s\S]*?<\/details>/.exec(lees(bestand))?.[0] ?? '';

// ── Briefing ──────────────────────────────────────────────────────────────────

describe('Kamer 14: briefing van An Vermeersch', () => {
  const lobby = lees('index.html');
  const briefing = tekst(
    lobby.split('id="scherm-briefing"')[1]?.split('id="scherm-code"')[0] ?? '',
  );

  it('komt na het intro over Geel en voor de sessiecode', () => {
    const intro = lobby.indexOf('id="scherm-intro"');
    const brief = lobby.indexOf('id="scherm-briefing"');
    const code = lobby.indexOf('id="scherm-code"');
    expect(intro).toBeLessThan(brief);
    expect(brief).toBeLessThan(code);
    // de Begin-knop van het intro opent de briefing, de briefing start de lobbyflow
    expect(lobby).toMatch(
      /id="btn-naar-briefing"\s+data-actie="scherm"\s+data-doel="scherm-briefing"/,
    );
    expect(lobby.split('id="scherm-briefing"')[1]).toContain('id="btn-begin"');
  });

  it('vertelt wie verdwenen is, de deadline en wat het rapport moet bevatten', () => {
    expect(briefing).toContain('Lena Bogaert is vanmorgen vertrokken');
    expect(briefing).toContain('60 minuten');
    expect(briefing).toContain('17u00');
    expect(briefing).toMatch(/politie/);
    expect(briefing).toMatch(/waar ze naartoe is, bij wie, hoe ze er geraakt is en wanneer/);
  });

  it('legt de rollen uit en dat spelers moeten praten', () => {
    expect(briefing).toMatch(/Speler A krijgt het dossier van het OPZ/);
    expect(briefing).toMatch(/Speler B krijgt het dossier van het gastgezin/);
    expect(briefing).toMatch(/Bel met elkaar/);
  });

  it('de deadline klopt met de timermelding', () => {
    const config = readFileSync(
      resolve(__dirname, '../experiences/kamer-14/js/kamer14-config.ts'),
      'utf8',
    );
    expect(config).toContain('sluit om 17u00');
  });

  it('verklapt geen antwoord', () => {
    expect(briefing).not.toMatch(/Diest|Marie|Stas|07:35|bus|dinsdag en donderdag/i);
  });

  it('geen gedachtestreepjes in spelersteksten', () => {
    expect(briefing).not.toMatch(/[—–]/);
  });
});

// ── Doel op de spelerpagina's ─────────────────────────────────────────────────

describe('Kamer 14: rapportvragen op de spelerpagina', () => {
  it.each(['speler-a.html', 'speler-b.html'])('%s toont dezelfde vier vragen', bestand => {
    const html = doelHtml(bestand);
    for (const v of RAPPORT_VRAGEN) expect(html).toContain(v.tekst);
    expect(html.match(/<li data-puzzel=/g)).toHaveLength(4);
    expect(doelHtml('speler-a.html')).toBe(doelHtml('speler-b.html'));
  });

  describe('gedrag', () => {
    beforeEach(() => {
      document.body.innerHTML = doelHtml('speler-a.html');
    });
    afterEach(() => vi.unstubAllGlobals());

    const el = () => document.getElementById('rapport-doel') as HTMLDetailsElement;
    const gevonden = () =>
      [...el().querySelectorAll('li.gevonden')].map(li => li.firstChild?.textContent?.trim());

    it('vinkt een vraag aan zodra de puzzel opgelost is, zonder antwoord', () => {
      updateRapportDoel({ p1: true, p2: true });
      expect(gevonden()).toEqual(['Waar is Lena naartoe?']);
      expect(el().querySelector('.doel-teller')?.textContent).toBe('1/4');

      updateRapportDoel({ p1: true, p2: true, p3: true, p4: true, p5: true });
      expect(gevonden()).toHaveLength(4);
      expect(el().textContent).not.toMatch(/Diest|Marie|07:35/);
      expect(el().querySelector('li .doel-status')?.textContent).toBe(' (gevonden)');
    });

    it('staat open op een breed scherm', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      el().open = false;
      initRapportDoel();
      expect(el().open).toBe(true);
    });

    it('staat dicht op gsm-breedte', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      initRapportDoel();
      expect(el().open).toBe(false);
    });
  });
});
