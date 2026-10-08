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

  it('in de uitstaplijst springt geen bestemming in het oog', () => {
    const html = lees('speler-a.html');
    const lijst = /<ul class="uitstaplijst">([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
    const items = [...lijst.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m =>
      (m[1] ?? '').replace(/\s+/g, ' ').trim(),
    );
    expect(items).toHaveLength(3);
    expect(lijst).not.toMatch(/<img|<strong|style=/);
    const lengtes = items.map(i => i.length);
    expect(Math.max(...lengtes) / Math.min(...lengtes)).toBeLessThan(1.4);
    // Diest blijft te vinden: enkel die bestemming past bij de tekening
    const passend = items.filter(i => /achtzijdige spits/.test(i) && /vierkante toren/i.test(i));
    expect(passend).toHaveLength(1);
    expect(passend[0]).toMatch(/^Diest:/);
    expect(tekst('speler-a.html')).toMatch(/achtzijdige spits boven een vierkante toren/);
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

// ── P1 en P5: het antwoord volgt uit meerdere bronnen ─────────────────────────

describe('Kamer 14: P1 vraagt om het patroon zelf te zien', () => {
  const logboek = () =>
    tekst('speler-b.html').split('Huishoudlogboek - bijgehouden')[1]?.split('Overleg met')[0] ?? '';

  /** Rijen "Di 15 apr · ... verwacht (terug) 11u00 · teruggekeerd 14u15". */
  const retours = () =>
    [
      ...logboek().matchAll(
        /\b(Ma|Di|Wo|Do|Vr) \d+ \w+ · [^·]+ · verwacht (?:terug )?(\d+)u(\d\d) · teruggekeerd (\d+)u(\d\d)/g,
      ),
    ].map(m => ({
      dag: m[1] ?? '',
      verschil: Number(m[4]) * 60 + Number(m[5]) - (Number(m[2]) * 60 + Number(m[3])),
    }));

  it('het logboek bevat ook gewone dagen waarop Lena op tijd terug was', () => {
    const dagen = new Set(retours().map(r => r.dag));
    expect(dagen).toEqual(new Set(['Ma', 'Di', 'Wo', 'Do']));
    expect(retours().filter(r => r.dag === 'Ma' || r.dag === 'Wo').length).toBeGreaterThanOrEqual(
      4,
    );
  });

  it('enkel de dagen met een groot verschil vormen het juiste antwoord', async () => {
    const laat = [
      ...new Set(
        retours()
          .filter(r => r.verschil > 60)
          .map(r => r.dag),
      ),
    ];
    const volledig: Record<string, string> = { Di: 'dinsdag', Do: 'donderdag' };
    const invoer = laat.map(d => volledig[d] ?? d).join(' en ');
    expect(
      await beoordeelAntwoord(invoer, KAMER14_ANTWOORD_HASHES.p1 ?? [], KAMER14_ANTWOORD_REGELS.p1),
    ).toBe('juist');
  });
});

describe('Kamer 14: P5 volgt uit vertrek, wandeltijd en dienstregeling', () => {
  const p5 = (invoer: string) =>
    beoordeelAntwoord(invoer, KAMER14_ANTWOORD_HASHES.p5 ?? [], KAMER14_ANTWOORD_REGELS.p5);

  const minuten = (u: string) => {
    const [h, m] = u.split(':').map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  /** Vertrektijden Geel Markt uit Bijlage D. */
  const bussen = () =>
    [...lees('speler-a.html').matchAll(/<td>Geel Markt<\/td>\s*<td>(\d\d:\d\d)<\/td>/g)].map(
      m => m[1] ?? '',
    );

  it('de bronnen staan verspreid over beide spelers', () => {
    expect(tekst('speler-b.html')).toMatch(/Lena at mee om 07u00/);
    expect(tekst('speler-b.html')).toMatch(/kwart over zeven hoorde ik de voordeur/);
    expect(tekst('speler-b.html')).toContain('05:47');
    expect(tekst('speler-a.html')).toMatch(/kwartier wandelen van de Gasthuisstraat/);
    // Speler B ziet de dienstregeling niet
    expect(tekst('speler-b.html')).not.toMatch(/07:35|07:20/);
  });

  it('vertrek plus wandeltijd geeft de juiste bus', async () => {
    const aanDeHalte = minuten('07:15') + 15;
    const bus = bussen().find(b => minuten(b) >= aanDeHalte) ?? '';
    expect(await p5(bus)).toBe('juist');
  });

  it('zonder de wandeltijd kies je een andere bus', async () => {
    const bus = bussen().find(b => minuten(b) >= minuten('07:15')) ?? '';
    expect(await p5(bus)).not.toBe('juist');
  });

  it('de dagpas van 05:47 wijst naar een bus die het ontbijt uitsluit', async () => {
    const bus = bussen().find(b => minuten(b) >= minuten('05:47')) ?? '';
    expect(minuten(bus)).toBeLessThan(minuten('07:00'));
    expect(await p5(bus)).not.toBe('juist');
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

// ── Geen gedachtestreepjes of techniek in wat spelers lezen ──────────────────

describe('spelerteksten', () => {
  const bronnen = [
    '../shared/js/utils.ts',
    '../shared/js/deel.ts',
    '../shared/js/timer.ts',
    '../experiences/kamer-14/js/kamer14-config.ts',
    '../experiences/kamer-14/js/einde.ts',
    '../experiences/dua/js/dua-session.ts',
  ];

  it.each(bronnen)('%s: geen gedachtestreepje in een tekst tussen aanhalingstekens', pad => {
    const code = readFileSync(resolve(__dirname, pad), 'utf8')
      .split('\n')
      .filter(regel => !/^\s*(\/\/|\*|\/\*)/.test(regel))
      .join('\n');
    expect(code).not.toMatch(/['`][^'`\n]*[—–][^'`\n]*['`]/);
  });

  it('feedback bij een juist antwoord noemt Firebase niet', () => {
    const utils = readFileSync(resolve(__dirname, '../shared/js/utils.ts'), 'utf8');
    expect(utils).not.toMatch(/textContent = '[^']*Firebase/);
  });
});
