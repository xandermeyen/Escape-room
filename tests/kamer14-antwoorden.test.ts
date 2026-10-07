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
  normaliseerAantal,
  normaliseerNaam,
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

/** Per puzzel: schrijfwijzen die juist moeten zijn, bijna, en fout. */
const GEVALLEN: Record<string, { juist: string[]; bijna: string[]; fout: string[] }> = {
  p1: {
    juist: [
      'dinsdag donderdag',
      'Dinsdag Donderdag',
      'dinsdag en donderdag',
      'donderdag, dinsdag',
      'donderdag en dinsdag',
      'di do',
      'do di',
      'DI/DO',
      'di en do',
      'dinsdag & donderdag',
      'dinsdagen en donderdagen',
      'elke dinsdag en donderdag',
      '  dinsdag    donderdag  ',
      'dinsdag-donderdag',
    ],
    bijna: ['dinsdag', 'donderdag', 'dinsdag vrijdag', 'maandag donderdag', 'di'],
    fout: ['maandag woensdag', 'vrijdag', 'diest', 'weekend'],
  },
  p2: {
    juist: ['diest', 'Diest', 'DIEST', ' Diest. ', 'Diëst'],
    bijna: [],
    fout: ['geel', 'turnhout', 'hasselt', 'diest geel'],
  },
  p3: {
    juist: ['7', 'zeven', 'Zeven', '7 weken', 'zeven weken', '07', '7w', '7 wk', 'een week of zeven'],
    bijna: ['6', '8', 'acht', 'zes weken'],
    fout: ['5', '9', '70', 'tien', 'veel'],
  },
  p4: {
    juist: [
      'marie stas',
      'Marie Stas',
      'stas marie',
      'Stas, Marie',
      'marie-stas',
      'mariestas',
      'Marié Stas',
      // één letter verschil
      'mari stas',
      'marie stass',
      'maria stas',
      'marie stsa',
      'marei stas',
    ],
    bijna: ['marie', 'Stas', 'marie bogaert', 'lena stas'],
    fout: ['an vermeersch', 'lena bogaert', 'maria stass', 'katrijn'],
  },
  p5: {
    juist: [
      '07:35',
      '7:35',
      '7u35',
      '07u35',
      '7.35',
      '0735',
      '735',
      '7h35',
      'om 7u35',
      '7 35',
      '07.35 uur',
      '7u35 uur',
      '7 uur 35',
    ],
    bijna: ['07:28', '7u00', '7', '07:45'],
    fout: ['05:58', '9:12', '17:35', '11:35', 'bus'],
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

  it('P3 geeft alleen het cijfer terug', () => {
    expect(normaliseerAantal('zeven weken')).toBe('7');
    expect(normaliseerAantal('07')).toBe('7');
  });

  it('P4 zet voor- en achternaam in vaste volgorde', () => {
    expect(normaliseerNaam('stas marie')).toBe(normaliseerNaam('marie stas'));
  });

  it('P5 zet elke tijdnotatie om naar uu:mm', () => {
    for (const t of ['7u35', '7 35', '0735', '735', '7h35', 'om 7u35']) {
      expect(normaliseerTijd(normaliseerInvoer(t))).toBe('07:35');
    }
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
    ];
    for (const bestand of bestanden) {
      const bron = readFileSync(resolve(__dirname, bestand), 'utf8').toLowerCase();
      for (const antwoord of ['diest', 'marie', 'stas', '07:35', '7u35', 'dinsdag donderdag']) {
        expect(bron.includes(antwoord), `${bestand} bevat "${antwoord}"`).toBe(false);
      }
    }
  });

  it('heeft één hash per puzzel', () => {
    for (const hashes of Object.values(KAMER14_ANTWOORD_HASHES)) expect(hashes).toHaveLength(1);
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
    expect(await controleer('om 7u35')).toHaveBeenCalledOnce();
  });

  it('toont de bijna-melding bij het juiste uur met verkeerde minuten', async () => {
    const onJuist = await controleer('07:28');
    expect(onJuist).not.toHaveBeenCalled();
    expect(document.getElementById('fb')!.textContent).toBe(BIJNA_TEKST);
    expect(BIJNA_TEKST).toBe('Je zit dicht bij het antwoord. Overleg nog eens.');
  });

  it('toont de gewone fouttekst bij een duidelijk fout antwoord', async () => {
    await controleer('09:12');
    expect(document.getElementById('fb')!.textContent).toBe('Niet correct.');
  });
});
