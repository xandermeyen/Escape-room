import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { KAMER14_ANTWOORD_HASHES } from '../experiences/kamer-14/js/kamer14-config.ts';

// ── Datumcontrole Kamer 14 ────────────────────────────────────────────────────
// Het verhaal speelt in 2025: dinsdag 6 mei bestond in 2025, niet in 2026.
// Deze test leest alle verhaalbestanden en controleert dat elke vermelde
// weekdag + datum echt klopt, zodat een latere tekstwijziging het verhaal
// niet stilletjes weer scheef trekt.

const JAAR = 2025;
const MAP = resolve(__dirname, '../experiences/kamer-14');
const BESTANDEN = [
  'speler-a.html',
  'speler-b.html',
  'einde.html',
  'tijd-voorbij.html',
  'host-panel.html',
  'js/speler-a.ts',
  'js/speler-b.ts',
  'js/einde.ts',
];

const MAANDEN: Record<string, number> = {
  jan: 0, feb: 1, mrt: 2, maa: 2, apr: 3, mei: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11,
};

// getDay(): 0 = zondag
const WEEKDAG_NR: Record<string, number> = {
  zo: 0, ma: 1, di: 2, wo: 3, do: 4, vr: 5, za: 6,
};

function leesTekst(bestand: string): string {
  return readFileSync(resolve(MAP, bestand), 'utf8')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

function maandNr(woord: string): number {
  const nr = MAANDEN[woord.toLowerCase().slice(0, 3)];
  if (nr === undefined) throw new Error(`Onbekende maand: ${woord}`);
  return nr;
}

const WEEKDAG_DATUM =
  /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|ma|di|wo|do|vr|za|zo)(?:ochtend|voormiddag|middag|namiddag|avond)?\.?\s+(\d{1,2})\s+(jan|feb|mrt|maart|apr|april|mei|jun|juni|jul|juli|aug|sep|okt|nov|dec)[a-z]*\.?(?:\s+(20\d\d))?/gi;

describe('Kamer 14: datums in het verhaal', () => {
  const vondsten: { bestand: string; tekst: string; ok: boolean }[] = [];

  for (const bestand of BESTANDEN) {
    const tekst = leesTekst(bestand);
    for (const m of tekst.matchAll(WEEKDAG_DATUM)) {
      const dag = (m[1] ?? '').toLowerCase().slice(0, 2);
      const jaar = m[4] ? parseInt(m[4], 10) : JAAR;
      const datum = new Date(jaar, maandNr(m[3] ?? ''), parseInt(m[2] ?? '', 10));
      vondsten.push({ bestand, tekst: m[0], ok: datum.getDay() === WEEKDAG_NR[dag] });
    }
  }

  it('vindt de gekende weekdag-datums (sanity check op de regex)', () => {
    expect(vondsten.length).toBeGreaterThanOrEqual(10);
  });

  it('elke vermelde weekdag + datum bestaat echt in 2025', () => {
    const fout = vondsten.filter(v => !v.ok).map(v => `${v.bestand}: "${v.tekst}"`);
    expect(fout).toEqual([]);
  });

  it('weken in het huishoudlogboek lopen van maandag tot vrijdag', () => {
    const tekst = leesTekst('speler-b.html');
    const weken = [...tekst.matchAll(/Week (\d{1,2})(?: (\w+))? tot (\d{1,2}) (\w+)/g)];
    expect(weken.length).toBeGreaterThanOrEqual(4);
    for (const w of weken) {
      const eindMaand = maandNr(w[4] ?? '');
      const beginMaand = w[2] ? maandNr(w[2]) : eindMaand;
      expect(new Date(JAAR, beginMaand, parseInt(w[1] ?? '', 10)).getDay(), w[0]).toBe(1);
      expect(new Date(JAAR, eindMaand, parseInt(w[3] ?? '', 10)).getDay(), w[0]).toBe(5);
    }
  });

  it('geen enkel jaartal bij een datum ligt na 2025', () => {
    // Oudere datums mogen (bv. startdatum plaatsing 2023), latere niet.
    for (const bestand of BESTANDEN) {
      const tekst = leesTekst(bestand);
      const jaren = [...tekst.matchAll(/\d{1,2}(?: \w+|\/\d{2})[ /](20\d\d)/g)].map(m => m[1]);
      for (const jaar of jaren) expect(Number(jaar), bestand).toBeLessThanOrEqual(JAAR);
      expect(tekst.includes('2026'), `${bestand} bevat nog 2026`).toBe(false);
    }
  });
});

describe('Kamer 14: kasoverzicht en P3', () => {
  const html = readFileSync(resolve(MAP, 'speler-b.html'), 'utf8');
  const kas = html.slice(html.indexOf('id="panel-kas"'), html.indexOf('<!-- Puzzel 3 -->'));
  const rijen = [...kas.matchAll(/<tr[^>]*><td>(\d{1,2}) (\w+)<\/td><td>€(\d+)<\/td>/g)];

  it('heeft geen rijen op of na de dag van de verdwijning (6 mei)', () => {
    expect(rijen.length).toBeGreaterThan(0);
    const verdwijning = new Date(JAAR, 4, 6);
    for (const r of rijen) {
      const datum = new Date(JAAR, maandNr(r[2] ?? ''), parseInt(r[1] ?? '', 10));
      expect(datum < verdwijning, r[0]).toBe(true);
    }
  });

  it('alle kasrijen vallen op dezelfde weekdag (wekelijkse bijdrage)', () => {
    const dagen = new Set(
      rijen.map(r => new Date(JAAR, maandNr(r[2] ?? ''), parseInt(r[1] ?? '', 10)).getDay()),
    );
    expect(dagen.size).toBe(1);
  });

  it('de P3-hash is de hash van het aantal €0-weken', () => {
    const nulWeken = rijen.filter(r => r[3] === '0').length;
    const hash = createHash('sha256').update(String(nulWeken)).digest('hex');
    expect(KAMER14_ANTWOORD_HASHES['p3']).toContain(hash);
  });

  it('de dagpas staat in de kamerinspectie, niet meer bij Kas & Bonnen', () => {
    expect(kas.includes('DAGPAS')).toBe(false);
    const kamer = html.slice(html.indexOf('id="panel-kamer"'));
    expect(kamer.includes('id="zone-prullenmand-inhoud"')).toBe(true);
    expect(kamer.includes('DAGPAS')).toBe(true);
  });
});
