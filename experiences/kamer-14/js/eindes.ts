/**
 * eindes.ts: de vier eindes van Kamer 14. Welk einde spelers krijgen, hangt af
 * van hun keuze in het rapport (conclusie) of van een fout rapport (vermist).
 * Elk einde heeft een opname (audio/<karakter>/<bestand>.mp3) en dezelfde
 * tekst op het scherm, voor wie zonder geluid speelt.
 */
export type Keuze = 'alles' | 'morgen' | 'niets';
export type EindeId = Keuze | 'vermist';

export interface Einde {
  titel: string;
  tijd: string;
  alineas: string[];
  /** Opnames na elkaar, met wie spreekt. */
  audio: { karakter: string; bestand: string }[];
}

export const KEUZES: readonly Keuze[] = ['alles', 'morgen', 'niets'];

export function isKeuze(waarde: unknown): waarde is Keuze {
  return typeof waarde === 'string' && (KEUZES as readonly string[]).includes(waarde);
}

export const EINDES: Record<EindeId, Einde> = {
  alles: {
    titel: 'De volledige waarheid',
    tijd: 'Dinsdag 6 mei, 17u00',
    alineas: [
      'Ik heb Pleegzorg gebeld. Ze waren kwaad. En daarna heel stil.',
      'Volgende maand komt er een eerste begeleid bezoek. Officieel, in Diest.',
      'Katrijn moet op gesprek. Ik weet niet of ze gastgezin mag blijven. Ze zei alleen: "Het was het waard."',
      'Lena stapte om negen voor zes uit de bus. Ze lachte. Dat had ik haar nog nooit zien doen.',
    ],
    audio: [{ karakter: 'an', bestand: 'einde-alles' }],
  },
  morgen: {
    titel: 'Morgen praten we',
    tijd: 'Dinsdag 6 mei, 17u00',
    alineas: [
      'In mijn melding staat: veilig, in Diest, terug met de bus van vijf over vijf. Geen vermissing.',
      'De rest schrijf ik niet op. Nog niet. Morgen om tien uur zitten we samen. Lena, Katrijn, Marie en ik. En iemand van Pleegzorg.',
      'Als we het goed doen, hoeft Lena nooit meer stiekem de bus te nemen.',
    ],
    audio: [{ karakter: 'an', bestand: 'einde-morgen' }],
  },
  niets: {
    titel: 'Een dag voor Lena',
    tijd: 'Dinsdag 6 mei, 17u07',
    alineas: [
      'An? Ik zit op de bus. Ze heeft me herkend. Ze zei niks, ze heeft me gewoon vastgepakt.',
      'De fiets is groen, hé. Ik ben om tien voor zes thuis. Ik ga het je allemaal vertellen. Morgen. Dat beloof ik.',
      'In de melding van An staat: bij een kennis in Diest, terug met de bus van vijf over vijf. Het is niet gelogen. Het is ook niet alles.',
    ],
    audio: [
      { karakter: 'lena', bestand: 'einde-niets' },
      { karakter: 'an', bestand: 'einde-niets' },
    ],
  },
  vermist: {
    titel: 'Vermist',
    tijd: 'Dinsdag 6 mei, 17u00',
    alineas: [
      'Om vijf uur heb ik de vermissing doorgegeven.',
      'Een patrouille vond haar om half zes op de Grote Markt in Diest. Op een bankje, naast een groene kinderfiets. Er stond een meisje naast haar. Ze begreep niet waarom die agenten haar mama meenamen.',
      'Het rapport kwam te laat. Of het was niet volledig. Ik kan het niet meer terugdraaien.',
    ],
    audio: [{ karakter: 'an', bestand: 'einde-vermist' }],
  },
};
