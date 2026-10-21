import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  normaliseerInvoer,
  beoordeelAntwoord,
  eenTypfoutVarianten,
  controleerAntwoordHash,
  BIJNA_TEKST,
} from '../shared/js/utils.ts';
import {
  KAMER14_ANTWOORD_HASHES,
  KAMER14_ANTWOORD_REGELS,
  normaliseerDagen,
  normaliseerCijfers,
  woordVarianten,
  normaliseerTijd,
} from '../experiences/kamer-14/js/kamer14-config.ts';

// ── Hulpfunctie ───────────────────────────────────────────────────────────────

function beoordeel(puzzel: string, invoer: string) {
  return beoordeelAntwoord(
    invoer,
    KAMER14_ANTWOORD_HASHES[puzzel] ?? [],
    KAMER14_ANTWOORD_REGELS[puzzel],
  );
}

/** Per puzzel of rapportveld: schrijfwijzen die juist moeten zijn, bijna, en fout. */
const GEVALLEN: Record<string, { juist: string[]; bijna: string[]; fout: string[] }> = {
  p0: {
    juist: ['0304', '03/04', '03 04', '03-04'],
    bijna: [],
    fout: ['0403', '3042023', '1403', 'april'],
  },
  p1: {
    juist: [
      'dinsdag donderdag',
      'Dinsdag Donderdag',
      'dinsdag en donderdag',
      'donderdag, dinsdag',
      'di do',
      'DI/DO',
      'dinsdagen en donderdagen',
      'elke dinsdag en donderdag',
      'dinsdag-donderdag',
    ],
    bijna: ['dinsdag', 'donderdag', 'dinsdag vrijdag', 'maandag donderdag', 'di'],
    fout: ['maandag woensdag', 'vrijdag', 'weekend'],
  },
  p2: {
    juist: ['7394', '7 3 9 4', '7-3-9-4'],
    bijna: [],
    fout: ['7349', '2154', '0000'],
  },
  p3: {
    juist: ['10', '10u', '10 uur', '10:00', 'om 10u', '10h'],
    bijna: [],
    fout: ['9', '11', '8u', '10:30'],
  },
  p4: {
    juist: ['285', '€285', '285 euro', '2 8 5'],
    bijna: [],
    fout: ['245', '280', '325'],
  },
  p5: {
    juist: ['07:50', '7u50', '7:50', '0750', 'om 7u50', '7.50 uur'],
    bijna: ['07:35', '07:45', '7u30', '7'],
    fout: ['08:30', '06:50'],
  },
  bestemming: {
    juist: ['Diest', 'diest', 'Grote Markt Diest', 'op de Grote Markt in Diest', 'Diëst', 'dist'],
    bijna: [],
    fout: ['Geel', 'Turnhout', 'Grote Markt', 'Hasselt'],
  },
  wie: {
    juist: ['haar dochter', 'Noor', 'bij Noor en Marie', 'dochter Noor', 'haar kind', 'dochtertje'],
    bijna: [],
    fout: ['Marie Stas', 'Katrijn', 'haar ouders'],
  },
  vervoer: {
    juist: ['bus', 'met de bus', 'lijn 19', 'De Lijn', 'autobus'],
    bijna: [],
    fout: ['trein', 'met de auto van Luc', 'bus of trein'],
  },
  terug: {
    juist: ['17:51', '17u51', '17:05', 'om 17u05', '1705'],
    bijna: [],
    fout: ['16:26', '18:32', '17u00', '5 uur'],
  },
};

// ── Per puzzel: alle schrijfwijzen ────────────────────────────────────────────

for (const [puzzel, { juist, bijna, fout }] of Object.entries(GEVALLEN)) {
  describe(`Kamer 14 ${puzzel.toUpperCase()}`, () => {
    it.each(juist)('aanvaardt "%s"', async invoer => {
      expect(await beoordeel(puzzel, invoer)).toBe('juist');
    });

    if (bijna.length) {
      it.each(bijna)('geeft "bijna" voor "%s"', async invoer => {
        expect(await beoordeel(puzzel, invoer)).toBe('bijna');
      });
    }

    it.each(fout)('weigert "%s"', async invoer => {
      expect(await beoordeel(puzzel, invoer)).toBe('fout');
    });

    it('weigert lege invoer en alleen leestekens', async () => {
      expect(await beoordeel(puzzel, '')).toBe('fout');
      expect(await beoordeel(puzzel, ' ?! ')).toBe('fout');
    });
  });
}

// ── Normalisatie ──────────────────────────────────────────────────────────────

describe('normaliseerInvoer', () => {
  it('maakt kleine letters, haalt accenten en leestekens weg en vat spaties samen', () => {
    expect(normaliseerInvoer('  Dinsdag,   DONDERDAG! ')).toBe('dinsdag donderdag');
    expect(normaliseerInvoer('Diëst')).toBe('diest');
    expect(normaliseerInvoer('7:35')).toBe('7 35');
  });

  it('negeert onzichtbare tekens en harde spaties', () => {
    expect(normaliseerInvoer('di​est')).toBe('diest');
    expect(normaliseerInvoer('marie stas')).toBe('marie stas');
  });
});

describe('normalizers per puzzel', () => {
  it('P1 sorteert dagen in weekvolgorde en laat onbekende woorden staan', () => {
    expect(normaliseerDagen('do en di')).toBe('dinsdag donderdag');
    expect(normaliseerDagen('donderdag dinsdag diest')).toBe('dinsdag donderdag diest');
  });

  it('cijfersloten houden enkel de cijfers', () => {
    expect(normaliseerCijfers('€ 285')).toBe('285');
    expect(normaliseerCijfers('03/04')).toBe('0304');
    expect(normaliseerCijfers('geen cijfers')).toBe('geen cijfers');
  });

  it('rapport: elk woord van de zin is een kandidaat, met typfouten vanaf vier letters', () => {
    const v = woordVarianten('bij de markt');
    expect(v).toContain('bij');
    expect(v).toContain('markt');
    expect(v).toContain('mark');
    expect(v).not.toContain('bi');
  });

  it('tijden worden uu:mm', () => {
    for (const t of ['7u50', '7 50', '0750', '750', '7h50', 'om 7u50']) {
      expect(normaliseerTijd(normaliseerInvoer(t))).toBe('07:50');
    }
    expect(normaliseerTijd('10')).toBe('10:00');
    expect(normaliseerTijd('25 99')).toBe('25 99');
  });
});

describe('eenTypfoutVarianten', () => {
  it('bevat weglating, invoeging, vervanging en omwisseling', () => {
    const v = eenTypfoutVarianten('abc', 'abcx');
    expect(v).toContain('ab'); // weglating
    expect(v).toContain('abxc'); // invoeging
    expect(v).toContain('axc'); // vervanging
    expect(v).toContain('bac'); // omwisseling
    expect(v).not.toContain('abc');
  });
});

// ── Geen antwoorden in de broncode ────────────────────────────────────────────

describe('broncode', () => {
  it('bevat geen plain-text antwoorden', () => {
    const bestanden = [
      '../experiences/kamer-14/js/kamer14-config.ts',
      '../experiences/kamer-14/js/einde.ts',
      '../experiences/kamer-14/js/speler-a.ts',
      '../experiences/kamer-14/js/speler-b.ts',
      '../experiences/kamer-14/js/kamer14-speler.ts',
    ];
    for (const bestand of bestanden) {
      const bron = readFileSync(resolve(__dirname, bestand), 'utf8').toLowerCase();
      for (const antwoord of [
        'diest',
        '0304',
        '7394',
        '285',
        '07:50',
        '7u50',
        'dinsdag donderdag',
      ]) {
        expect(bron.includes(antwoord), `${bestand} bevat "${antwoord}"`).toBe(false);
      }
    }
  });

  it('heeft één hash per puzzel; enkel de rapportvelden aanvaarden meerdere woorden', () => {
    const verwacht: Record<string, number> = { terug: 2, wie: 4 };
    for (const [sleutel, hashes] of Object.entries(KAMER14_ANTWOORD_HASHES)) {
      expect(hashes, sleutel).toHaveLength(verwacht[sleutel] ?? 1);
    }
  });
});

// ── Melding in de UI ──────────────────────────────────────────────────────────

describe('controleerAntwoordHash met regels', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input  id="inp" value="" />
      <div    id="fb"></div>
      <button id="btn"></button>
    `;
  });

  async function controleer(invoer: string, onJuist = vi.fn()) {
    (document.getElementById('inp') as HTMLInputElement).value = invoer;
    await controleerAntwoordHash(
      'p5',
      'inp',
      'fb',
      'btn',
      KAMER14_ANTWOORD_HASHES,
      onJuist,
      'Niet correct.',
      KAMER14_ANTWOORD_REGELS,
    );
    return onJuist;
  }

  it('aanvaardt een andere tijdnotatie', async () => {
    expect(await controleer('om 7u50')).toHaveBeenCalledOnce();
  });

  it('toont de bijna-melding bij het juiste uur met verkeerde minuten', async () => {
    const onJuist = await controleer('07:35');
    expect(onJuist).not.toHaveBeenCalled();
    expect(document.getElementById('fb')!.textContent).toBe(BIJNA_TEKST);
    expect(BIJNA_TEKST).toBe('Je zit dicht bij het antwoord. Overleg nog eens.');
  });

  it('toont de gewone fouttekst bij een duidelijk fout antwoord', async () => {
    await controleer('09:12');
    expect(document.getElementById('fb')!.textContent).toBe('Niet correct.');
  });
});
