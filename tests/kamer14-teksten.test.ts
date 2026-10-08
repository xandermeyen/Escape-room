import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beoordeelAntwoord } from '../shared/js/utils.ts';
import {
  KAMER14_ANTWOORD_HASHES,
  KAMER14_ANTWOORD_REGELS,
  normaliseerVervoer,
} from '../experiences/kamer-14/js/kamer14-config.ts';

const lees = (bestand: string) =>
  readFileSync(resolve(__dirname, '../experiences/kamer-14', bestand), 'utf8');

/** Zichtbare tekst van een HTML-bestand, zonder tags en scripts. */
const tekst = (bestand: string) =>
  lees(bestand)
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

const vervoer = (invoer: string) =>
  beoordeelAntwoord(invoer, KAMER14_ANTWOORD_HASHES.vervoer ?? [], KAMER14_ANTWOORD_REGELS.vervoer);

// ── Eindrapport: vervoer ──────────────────────────────────────────────────────

describe('eindrapport: vervoer', () => {
  it.each([
    'bus',
    'Bus',
    'de bus',
    'met de bus',
    'autobus',
    'De Lijn',
    'lijn 19',
    'bus 19',
    'buslijn 19',
    'met de bus van De Lijn',
    'autbus',
    'de ljn',
  ])('"%s" is juist', async invoer => {
    expect(await vervoer(invoer)).toBe('juist');
  });

  it.each(['trein', 'auto', 'te voet', 'fiets', 'bus of trein', '', 'iets', 'Diest'])(
    '"%s" is niet juist',
    async invoer => {
      expect(await vervoer(invoer)).toBe('fout');
    },
  );

  it('de normalisatie verklapt niet welk vervoer juist is', () => {
    expect(normaliseerVervoer('trein')).toBe('trein');
    expect(normaliseerVervoer('met de fiets')).toBe('fiets');
  });
});

// ── Geen weggeefsels in teksten ───────────────────────────────────────────────

describe('Kamer 14: geen weggeefsels', () => {
  it('geen hint noemt het antwoord letterlijk', () => {
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      const t = tekst(bestand);
      expect(t).not.toMatch(/het antwoord is/i);
      expect(t).not.toMatch(/bus van 07:35/);
      expect(t).not.toMatch(/Marie Stas\. Dat is/);
      expect(t).not.toMatch(/De stad is Diest/);
    }
  });

  it('het tijdstipveld in het rapport toont het formaat, niet het antwoord', () => {
    expect(lees('einde.html')).toContain('id="r-tijdstip"');
    expect(lees('einde.html')).not.toContain('placeholder="07:35"');
  });

  it('de busrij van 07:35 valt niet op in de dienstregeling', () => {
    const rij = /<tr[^>]*>[^\n]*07:35[^\n]*<\/tr>/.exec(lees('speler-a.html'))?.[0] ?? '';
    expect(rij).not.toMatch(/style=|<strong>/);
  });
});

// ── Documenten markeren niet zelf wat belangrijk is ───────────────────────────

describe('Kamer 14: geen markeringen in de documenten', () => {
  /** Alle <strong>-teksten van een bestand, zonder extra witruimte. */
  const vet = (bestand: string) =>
    [...lees(bestand).matchAll(/<strong\s*>([\s\S]*?)<\/strong\s*>/g)].map(m =>
      (m[1] ?? '').replace(/\s+/g, ' ').trim(),
    );

  it('speler A heeft geen vette tekst in de dossierstukken', () => {
    expect(vet('speler-a.html')).toEqual([]);
  });

  it('speler B heeft enkel de klikinstructie van de kamerinspectie in het vet', () => {
    expect(vet('speler-b.html')).toEqual([
      'Klik op de gemarkeerde zones in de foto om de bevindingen per zone te lezen.',
    ]);
  });

  it('het kasoverzicht toont enkel datum en bedrag, zonder kleur of commentaar', () => {
    const kas = lees('speler-b.html').split('id="panel-kas"')[1]?.split('id="puzzel-3"')[0] ?? '';
    expect(kas).not.toMatch(/⚠|niet betaald|normaal/);
    expect(kas).not.toMatch(/<tr style=/);
    for (const rij of kas.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
      expect(rij.match(/<td>/g)).toHaveLength(2);
    }
  });

  it('het logboek kleurt geen enkele week anders', () => {
    const logboek =
      lees('speler-b.html').split('id="panel-logboek"')[1]?.split('id="puzzel-1"')[0] ?? '';
    expect(logboek).not.toMatch(/style=|Afwijkend/);
  });

  it('het prikbord springt niet meer in het oog dan de andere zones', () => {
    expect(lees('speler-b.html')).not.toContain('kamer-zone--uitgelicht');
  });

  it('geen hint verwijst naar een markering die er niet meer is', () => {
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      expect(tekst(bestand)).not.toMatch(/⚠|rode rij|vetgedrukt|dikgedrukt/i);
    }
  });
});

// ── Gelijke vragen en consistente feiten ──────────────────────────────────────

describe('Kamer 14: consistentie', () => {
  /** Vraagtekst van een puzzel zonder "Overleg met Speler X." */
  const vraag = (bestand: string, nr: number) => {
    const blok = lees(bestand).split(`id="puzzel-${nr}"`)[1] ?? '';
    const m = /<div class="puzzel-vraag">([\s\S]*?)<\/div>/.exec(blok);
    return (m?.[1] ?? '')
      .replace(/\s+/g, ' ')
      .replace(/Overleg met Speler [AB]\. /, '')
      .trim();
  };

  it.each([1, 2, 3, 4, 5])('P%i stelt bij beide spelers dezelfde vraag', nr => {
    expect(vraag('speler-a.html', nr)).toBe(vraag('speler-b.html', nr));
    expect(vraag('speler-a.html', nr)).not.toBe('');
  });

  it('de briefkaart komt overal op woensdag 7 mei aan', () => {
    expect(tekst('einde.html')).toContain('Woensdag 7 mei 2025');
    expect(tekst('tijd-voorbij.html')).toContain('Woensdag 7 mei');
    expect(tekst('einde.html') + tekst('tijd-voorbij.html')).not.toMatch(/8 mei|Dinsdag 6 mei ·/);
  });

  it('Lena vraagt naar het gemeentehuis vóór de brief van Marie (3 april)', () => {
    expect(tekst('speler-a.html')).not.toContain('28 april');
    expect(tekst('speler-a.html')).toMatch(/10 maart Lena vroeg of ze mij iets mocht vragen/);
  });

  it('het gastgezin heet overal Martens-Peeters in de spelerdossiers', () => {
    for (const bestand of ['speler-a.html', 'speler-b.html']) {
      expect(tekst(bestand)).not.toMatch(/Gastgezin Martens ·/);
    }
  });

  it('Katrijn wordt voorgesteld voor ze de briefkaart krijgt', () => {
    expect(tekst('speler-b.html')).toContain('Katrijn Peeters');
  });

  it('alle hintknoppen heten hetzelfde', () => {
    expect(lees('speler-b.html')).not.toContain('💡 Aanwijzing');
  });
});
