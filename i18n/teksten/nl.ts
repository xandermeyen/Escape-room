/**
 * Teksten die JavaScript op de publieke pagina's toont (cookiebanner,
 * boekingsformulier, reviews, easter eggs). Nederlands bepaalt de vorm:
 * elke andere taal moet exact dezelfde sleutels hebben (zie Teksten).
 */
export const nl = {
  cookieTitel: 'Mogen we meten hoe je de site gebruikt?',
  cookieTekst:
    'We willen met Google Analytics zien welke pagina’s bezocht worden en hoe mensen bij ons terechtkomen. ' +
    'Dat helpt ons de escape rooms en de site beter te maken. Zonder jouw toestemming plaatsen we geen analytische cookies. Meer info in ons ',
  cookieLink: 'privacybeleid',
  cookieWeigeren: 'Weigeren',
  cookieAccepteren: 'Accepteren',

  boekFout: 'Versturen lukte niet. Probeer het opnieuw of mail naar info@bureau-x.be.',
  boekBezig: 'Bezig…',
  boekStart: 'Start de sessie',
  linkGekopieerd: 'Gekopieerd',

  dossierOpen: 'Lees het volledige dossier',
  dossierDicht: 'Verberg het dossier',

  anoniemeSpeler: 'Anonieme speler',
  sterrenLabel: (n: number): string => `${n} van 5 sterren`,
  reviewsGemiddelde: (aantal: number): string => `gemiddelde van ${aantal} reviews`,

  goedertierCitaat: [
    '"Ik alleen weet waar de Rechtvaardige Rechters rusten.',
    'Dit geheim zal met mij sterven."',
  ] as [string, string],
  goedertierBron: '- Arsène Goedertier, november 1934',

  archiefConsole:
    '\n\nJe zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.' +
    '\nHet archief reageert op haar naam. Typ die maar eens.',
  lenaStempel: 'Vermist',
  lenaLabel: 'Archiefstuk B-X/14 · niet voor publicatie',
  lenaTitel: 'Gezocht: Lena Bogaert',
  lenaRegels: [
    'Laatst gezien op een dinsdagochtend in mei, Geel.',
    'Bed opgemaakt. Jas weg. Geen briefje.',
    'Wie iets weet, opent dossier 14. Wie niets weet ook.',
  ],
  lenaSluiten: 'Klik om dit archiefstuk terug te leggen.',

  nfTitelPagina: 'Dossier niet gevonden | Bureau X',
  nfStempel: 'Niet gevonden',
  nfLabel: 'Fout 404 · Archief Bureau X',
  nfTitel: 'Dit dossier bestaat niet.',
  nfTekst:
    'Of het is nooit aangemaakt, of iemand heeft het laten verdwijnen. Het adres dat je zocht, leidt nergens heen. De echte zaken liggen gelukkig nog klaar.',
  nfHome: 'Naar Bureau X',
  nfAndereTaal: 'Pagina niet gevonden.',
  nfAndereTaalLink: 'Naar de Nederlandse homepage',

  taalSuggestie: 'Deze pagina bestaat ook in het Nederlands.',
  taalSuggestieLink: 'Naar de Nederlandse versie',
  taalSuggestieSluiten: 'Sluiten',
};

export type Teksten = typeof nl;
