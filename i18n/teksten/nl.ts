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
  /** Teller op de homepage: [vetgedrukt deel, rest]. */
  tellerGroepen: (n: number): [string, string] => [`${n} groepen`, ' losten al een dossier op'],

  // ── Gedeelde game-onderdelen (hulp, lobby, review, delen). Op een gamepagina
  // volgt de taal de speltaal (<html lang>, gezet door shared/js/spelvertaling.ts).
  spelHintTip: 'Zit je vast? Hieronder liggen hints klaar, stap voor stap.',
  spelMeldingSluiten: 'Melding sluiten',
  spelHulpKnop: 'Hulp nodig?',
  spelSluiten: 'Sluiten',
  spelVerbinding: 'Verbinding mislukt. Herlaad de pagina om verder te spelen.',
  demoAria: 'Demomodus: wissel van rol',
  demoLabel: (rol: string): string => `Demomodus · ${rol}`,
  demoWissel: (rol: string): string => `Wissel naar ${rol}`,
  lobbyEerdereRol: (rol: string): string => `Je koos eerder de rol ${rol}.`,
  lobbyVerder: 'Ga verder met deze rol →',
  lobbyGeenCode: 'Voer een geldige sessiecode in.',
  lobbyControleren: 'Controleren…',
  lobbyOngeldig: 'Ongeldige of inactieve code. Controleer je e-mail.',
  lobbyVerbinding: 'Verbindingsfout. Controleer je internetverbinding.',
  lobbyRolBezet: 'Deze rol is al bezet. Kies een andere.',
  lobbyRolVerbinding: 'Verbindingsfout. Probeer opnieuw.',
  reviewEscapetalk: 'Een review op escapetalk.nl helpt andere spelers ons te vinden. ',
  reviewEscapetalkLink: 'Review op escapetalk',
  reviewOokEscapetalkKlembord:
    'Wil je hem ook op escapetalk.nl zetten? Je tekst staat al op je klembord, plakken volstaat. ',
  reviewOokEscapetalk:
    'Wil je hem ook op escapetalk.nl zetten? Dat helpt andere spelers ons te vinden. ',
  reviewBeterLabel: 'Wat kan beter? Optioneel, dit lezen enkel wij.',
  reviewBeterPlaceholder: 'Bv. een puzzel die onduidelijk was, of iets dat niet werkte',
  reviewDemo: 'Demomodus: reviews worden niet bewaard.',
  reviewOnvolledig: 'Kies een aantal sterren en schrijf een korte review.',
  reviewBezig: 'Versturen…',
  reviewVersturen: 'Review versturen',
  reviewMislukt: 'Versturen mislukt. Probeer opnieuw.',
  deelGekopieerd: 'Gekopieerd. Plak het in je groepschat!',
  prestatieSneller: (p: number): string => `Sneller dan ${p}% van de groepen.`,
  prestatieBinnenUur: 'Jullie haalden het einde binnen het uur. Dat lukt niet elke groep.',
};

export type Teksten = typeof nl;
