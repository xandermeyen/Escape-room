import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beoordeelAntwoord } from '../shared/js/utils.ts';
import {
  KAMER14_ANTWOORD_HASHES,
  KAMER14_ANTWOORD_REGELS,
} from '../experiences/kamer-14/js/kamer14-config.ts';
import { KAMER14_HINTS } from '../experiences/kamer-14/js/hints.ts';
import { FRAGMENT_TEKST } from '../experiences/kamer-14/js/berichten.ts';
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

/** De inhoud van één close-up (dialog) uit een spelerpagina. */
const closeup = (bestand: string, id: string) =>
  new RegExp(`<dialog[^>]*id="${id}"[\\s\\S]*?</dialog>`).exec(lees(bestand))?.[0] ?? '';

const doelHtml = (bestand: string) =>
  /<section class="rapport-doel"[\s\S]*?<\/section>/.exec(lees(bestand))?.[0] ?? '';

const beoordeel = (puzzel: string, invoer: string) =>
  beoordeelAntwoord(invoer, KAMER14_ANTWOORD_HASHES[puzzel] ?? [], KAMER14_ANTWOORD_REGELS[puzzel]);

const MAANDEN: Record<string, number> = { feb: 1, mrt: 2, apr: 3, mei: 4 };
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const weekdag = (dag: number, maand: string) =>
  DAGEN[new Date(Date.UTC(2025, MAANDEN[maand]!, dag)).getUTCDay()]!;
const minuten = (u: string) => {
  const [h, m] = u.split(/[u:]/).map(Number);
  return h! * 60 + (m ?? 0);
};

// ── Briefing ──────────────────────────────────────────────────────────────────

describe('Kamer 14: briefing van An Vermeersch', () => {
  const lobby = lees('index.html');
  const briefing = tekst(
    lobby.split('id="scherm-briefing"')[1]?.split('id="scherm-code"')[0] ?? '',
  );

  it('komt na het intro en voor de sessiecode', () => {
    const intro = lobby.indexOf('id="scherm-intro"');
    const brief = lobby.indexOf('id="scherm-briefing"');
    const code = lobby.indexOf('id="scherm-code"');
    expect(intro).toBeLessThan(brief);
    expect(brief).toBeLessThan(code);
    expect(lobby.split('id="scherm-briefing"')[1]).toContain('id="btn-begin"');
  });

  it('vertelt wie verdwenen is, de deadline en wat het rapport moet bevatten', () => {
    expect(briefing).toContain('Lena Bogaert is vanmorgen vertrokken');
    expect(briefing).toContain('60 minuten');
    expect(briefing).toContain('17u00');
    expect(briefing).toMatch(/politie/);
    expect(briefing).toMatch(
      /waar ze naartoe is, bij wie, hoe ze er geraakt is en wanneer ze terugkomt/,
    );
  });

  it('de gesproken briefing zegt hetzelfde en past bij het uur van de mail', () => {
    expect(briefing).toContain('16u00');
    expect(FRAGMENT_TEKST.briefing).toMatch(/^Goeiemiddag/);
    expect(FRAGMENT_TEKST.briefing).toContain('vijf uur');
    expect(FRAGMENT_TEKST.briefing).toMatch(/wanneer ze terugkomt/);
  });

  it('legt de rollen uit en dat spelers moeten praten', () => {
    expect(briefing).toMatch(/Speler A zit aan het bureau van An/);
    expect(briefing).toMatch(/Speler B staat in de kamer van Lena/);
    expect(briefing).toMatch(/Bel met elkaar/);
  });

  it('de deadline klopt met de timermelding', () => {
    const config = lees('js/kamer14-config.ts');
    expect(config).toContain('Om vijf uur beslist An');
  });

  it('verklapt geen antwoord', () => {
    expect(briefing).not.toMatch(/Diest|Marie|Noor|dochter|07:35|bus|fiets/i);
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

    const el = () => document.getElementById('rapport-doel')!;
    const gevonden = () =>
      [...el().querySelectorAll('li.gevonden')].map(li => li.firstChild?.textContent?.trim());

    it('vinkt een vraag aan zodra de puzzel opgelost is, zonder antwoord', () => {
      updateRapportDoel({ p0: true, p1: true, p2: true });
      expect(gevonden()).toEqual(['Waar is Lena?']);
      expect(el().querySelector('.doel-teller')?.textContent).toBe('1/4');

      updateRapportDoel({ p2: true, p4: true, p5: true, p6: true });
      expect(gevonden()).toHaveLength(4);
      expect(el().textContent).not.toMatch(/Diest|Marie|Noor|17:05/);
      expect(el().querySelector('li .doel-status')?.textContent).toBe(' (gevonden)');
    });

    it('een gewone sectie (geen details) blijft gewoon staan', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      expect(() => initRapportDoel()).not.toThrow();
    });
  });
});

// ── De puzzels kloppen met wat er in de kamers ligt ───────────────────────────

describe('Kamer 14: puzzels volgen uit de voorwerpen', () => {
  it('P0: de welkomstkaart in de kast geeft de toegangscode', async () => {
    const kast = tekst(closeup('speler-b.html', 'cu-kast'));
    const [, dag, jaar] = /Welkom bij ons, Lena![\s\S]*?(\d+) april (\d{4})/.exec(kast) ?? [];
    expect(jaar).toBe('2023');
    const code = `${dag!.padStart(2, '0')}04`;
    expect(await beoordeel('p0', code)).toBe('juist');
    // de terminal vraagt ernaar, maar noemt de datum niet
    expect(tekst(closeup('speler-a.html', 'cu-terminal'))).not.toMatch(/3 april|0304/);
  });

  it('P1: enkel op dinsdag en donderdag kwam Lena ruim te laat thuis', async () => {
    const rooster = tekst(closeup('speler-a.html', 'cu-rooster'));
    const voor: Record<string, number> = {};
    for (const [, dag, uur] of rooster.matchAll(/(\w+dag) [^]*?(\d+u\d\d)/g)) {
      voor[dag!.toLowerCase()] ??= minuten(uur!);
    }
    expect(Object.keys(voor)).toEqual(['maandag', 'dinsdag', 'woensdag', 'donderdag']);

    const logboek = tekst(closeup('speler-b.html', 'cu-schriften'));
    const laat = new Set<string>();
    let rijen = 0;
    for (const [, d, m, u] of logboek.matchAll(
      /(\d+) (feb|mrt|apr|mei) · [^·]+ · terug om (\d+u\d\d)/g,
    )) {
      rijen++;
      const dag = weekdag(Number(d), m!);
      if (minuten(u!) - (voor[dag] ?? Infinity) > 30) laat.add(dag);
    }
    expect(rijen).toBeGreaterThan(8);
    expect([...laat].sort()).toEqual(['dinsdag', 'donderdag']);
    expect(await beoordeel('p1', [...laat].sort().join(' '))).toBe('juist');
  });

  it('P2: de vier gele ramen staan op de kaart als 7, 3, 9 en 4', async () => {
    const legende = tekst(closeup('speler-b.html', 'cu-prikbord'));
    const nummer = (kenmerk: RegExp) => {
      for (const [, nr, rest] of legende.matchAll(/(\d) ([^\d]+)/g)) {
        if (kenmerk.test(rest!)) return nr;
      }
      return undefined;
    };
    const pin = [/kroon/i, /erker/i, /zonnewijzer/i, /groene luiken/i].map(nummer).join('');
    expect(pin).toBe('7394');
    expect(await beoordeel('p2', pin)).toBe('juist');
    expect(KAMER14_HINTS.a.p2.join(' ')).toMatch(/kroon.*erker.*zonnewijzer.*groene luiken/);
  });

  it('P3: om 10 uur speelt de beiaard Kortjakje, de voicemail noemt het uur niet', async () => {
    const folder = tekst(closeup('speler-a.html', 'cu-ateliermap'));
    expect(folder).toMatch(/10u Altijd is Kortjakje ziek/);
    expect(await beoordeel('p3', '10:00')).toBe('juist');
  });

  it('P4: zeven weken zonder bijdrage plus de €40 van Rita is de prijs van de fiets', async () => {
    const kasboek = tekst(closeup('speler-b.html', 'cu-schriften'));
    const nul = kasboek.match(/\d+ (feb|mrt|apr|mei) €0\b/g) ?? [];
    const kwitanties = tekst(closeup('speler-a.html', 'cu-ateliermap'));
    const getekend = kwitanties.match(/\d+ (feb|mrt|apr|mei) K\. Peeters/g) ?? [];
    expect(nul).toHaveLength(7);
    expect(getekend).toHaveLength(14);
    expect(kwitanties).toContain('Hier zijn je €40');

    const totaal = nul.length * 35 + 40;
    expect(tekst(closeup('speler-b.html', 'cu-kast'))).toContain(
      `TOTAAL EUR ............... ${totaal},00`,
    );
    expect(await beoordeel('p4', String(totaal))).toBe('juist');
  });

  it('P5: 7u35 op de Markt plus een kwartier wandelen is na 07u45', async () => {
    const telefoon = tekst(closeup('speler-a.html', 'cu-telefoon'));
    expect(telefoon).toContain('Rond 7u35');
    expect(telefoon).toContain('een kwartier wandelen');
    const thuis = minuten('7u35') + 15;
    expect(thuis).toBeGreaterThan(minuten('7u45'));
    const uur = `0${Math.floor(thuis / 60)}:${thuis % 60}`;
    expect(await beoordeel('p5', uur)).toBe('juist');
    expect(tekst(closeup('speler-b.html', 'cu-schriften'))).toContain(
      'Om 07u45 haar kamer leeg gevonden.',
    );
  });
});

describe('Kamer 14: één verhaal', () => {
  it('Lena verdween op dinsdag 6 mei 2025, de dag dat Noor tien werd', () => {
    expect(weekdag(6, 'mei')).toBe('dinsdag');
    expect(lees('index.html')).toContain('Dinsdag 6 mei 2025');
    expect(FRAGMENT_TEKST.dagboek).toMatch(/^Zes mei\. Vandaag word je tien\./);
  });

  it('de bakkerij was dicht op paasmaandag', () => {
    expect(weekdag(21, 'apr')).toBe('maandag');
    expect(tekst(closeup('speler-b.html', 'cu-schriften'))).toContain('21 apr · bakkerij dicht');
  });

  it('elke week in het logboek begint op een maandag', () => {
    const logboek = tekst(closeup('speler-b.html', 'cu-schriften'));
    const weken = [...logboek.matchAll(/Week van (\d+) (feb|mrt|apr|mei)/g)];
    expect(weken.length).toBeGreaterThan(1);
    for (const [, d, m] of weken) expect(weekdag(Number(d), m!)).toBe('maandag');
  });

  it('het gastgezin heet overal Martens-Peeters', () => {
    expect(lees('index.html')).toContain('Martens-Peeters');
    expect(FRAGMENT_TEKST.briefing).toContain('Martens-Peeters');
    expect(lees('speler-a.html')).toContain('Katrijn Peeters en Luc Martens');
  });

  it('de terugbus van vijf over vijf staat in het dagboek', () => {
    expect(FRAGMENT_TEKST.dagboek).toContain('vijf over vijf');
  });
});
