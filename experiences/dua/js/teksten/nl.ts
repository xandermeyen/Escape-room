/**
 * Teksten die de D.U.A.-game in TypeScript toont, in het Nederlands (de bron).
 * De Engelse versie (en.ts) heeft exact dezelfde vorm; TypeScript bewaakt dat.
 * `{naam}` is een plek voor een waarde (vulIn in shared/js/speltaal.ts).
 * Lezen gaat via tekst() in dua-tekst.ts, nooit rechtstreeks.
 *
 * De HTML van de pagina's staat niet hier maar in i18n/spel/dua.<taal>.ts.
 */
export const nl = {
  kop: {
    sysCase: 'D.U.A. · Dossier 1934/RR · Sessie {sessie}',
    eindCase: 'D.U.A. · eindrapport · Sessie {sessie}',
    rol: {
      schrijver: 'De Schrijver',
      loper: 'De Loper',
      archivaris: 'De Archivaris',
      restaurateur: 'De Restaurateur',
    },
  },

  ui: {
    tienMinuten: 'Nog 10 minuten. De lijn tussen 1934 en 2034 wordt zwakker.',
    straf: 'De politie greep bijna in. Jullie doken onder: 5 MINUTEN verloren.',
    geluidAan: '♪ aan',
    geluidUit: '♪ uit',
    insigne: 'Insigne gevonden: {naam}',
    insignes: {
      'door-u-aangesteld': 'Door U Aangesteld',
      'anno-verwisseld': 'Anno Verwisseld',
      'de-dertiende-brief': 'De Dertiende Brief',
      'het-lam-waakt': 'Het Lam Waakt',
      'groeten-uit-geel': 'Groeten uit Geel',
    },
    telefoon: 'Een krakende stem: "De Rechters reizen niet. Zij kijken al jaren op u neer."',
  },

  /** Namen van de klikbare plekken (schermlezers en meldingen). */
  plekken: {
    kast: 'Kast',
    bureau: 'Bureau',
    vensterbank: 'Vensterbank',
    schouw: 'Schouw',
    boekenrek: 'Boekenrek',
    vloerplank: 'Losse vloerplank',
    sintbaafs: 'Sint-Baafskathedraal',
    belfort: 'Belfort',
    station: 'Sint-Pietersstation',
    gravensteen: 'Gravensteen',
    leie: 'De Leie',
  },

  s1934: {
    zegelGezet:
      'Het zegel staat. Vraag 2034 wat er zonet bij hen verscheen. Pas als zij het bevestigen, is de handdruk klaar.',
    hamerStatus: 'Pas als de machine hersteld is, kan brief XII getypt worden.',
    hamerHersteld: 'Mechaniek hersteld. De machine wacht op de Schrijver.',
    machineWeer: 'De typemachine doet het weer.',
    wachtOpBevestiging:
      'Wacht tot 2034 bevestigt dat ze het zegel zien (oefenronde ⓪). Pas dan werkt de machine.',
    eerstHanddruk: 'Doe eerst de handdruk (oefenronde ⓪): zo leren jullie hoe de tijd werkt.',
    vak: 'vak {nr}',
    hamerLabel: 'Hamer {letter} in vak {nr}',
    machineStuk: 'De typemachine is stuk. Herstel eerst de letterhamers.',
    briefVerstuurd: 'Doorslag verstuurd. In 2034 ligt er nu een brief in het archief.',
    nogLetters: 'Nog {aantal} letters te kiezen.',
    allesGekozen: '{Aantal} letters gekozen. Sla door wanneer je zeker bent.',
    eerstMachine: 'Eerst de machine herstellen.',
    precies: '{Aantal} letters. Niet meer, niet minder.',
    doorslagGemaakt: 'Doorslag gemaakt. In 2034 ligt er nu een brief in het archief.',
    doorslagFout:
      'De doorslag spelt "{woord}". Dat is niet wat de Loper vroeg. Neem een nieuw vel en vraag 2034 de code nog eens na.',
    briefGelezen: '2034 heeft de brief al gelezen. Een nieuw vel is niet meer nodig.',
    eerstBrief: 'Eerst de brief (P1): zonder belofte op papier heeft een kluis geen zin.',
    alInKluis: 'Het paneel ligt al in kluis {nummer}.',
    tweeCijfers: 'Twee cijfers.',
    kluisFout:
      'Dat nummer past niet bij de belofte in de brief. Lees ze nog eens: één meer dan het aantal brieven dat het bisdom telt.',
    betrapt: '⚠ De perronwachter zag je bij de kluizen rommelen. Verdenking +15%',
    betraptStatus: 'Betrapt. Wacht tot hij écht buiten zicht is (rechts op de baan).',
    gedeponeerd:
      'Paneel gedeponeerd in kluis {nummer}. Het ticket reist naar 2034, half onleesbaar.',
    kluisStatus: 'Paneel gedeponeerd in kluis {nummer}. Nu is het wachten op 2034.',
    kamerStatus: 'Vind eerst de sleutel.',
    alVerstopt: 'Het mapje is al verstopt ({plek}). Nu is het aan 2034.',
    sleutelGevonden:
      'De sleutel, in het late zonlicht. Kies nu de bergplaats voor het mapje. Kies goed: één kans.',
    niets: 'Niets. De seconden tikken. "Waar het licht valt..."',
    geenBergplaats: 'Daar lag de sleutel. Geen bergplaats.',
    kamerVerzegeld:
      'De werkkamer is verzegeld in de tijd. 2034 kan zoeken zodra P2 en P3 rond zijn.',
    mapjeVerstopt: 'Mapje verstopt: {plek}. Honderd jaar wachten maar.',
    nieuweRonde: 'Vind eerst de sleutel. "Waar het licht valt."',
    inBeslag:
      '2034 vond het mapje op een plek die de politie doorzocht: het is in beslag genomen. Ga opnieuw naar binnen en kies een veiligere plek.',
    politie:
      '⚠ De politie staat voor de deur. Wegwezen, zonder iets te verstoppen. Verdenking +10%',
    keuzeGemaakt: 'De keuze is gemaakt. Vraag 2034 om te zoeken.',
    nogNiet: 'Nog niet. Eerst moet het mapje (P4) veilig de eeuw door.',
    paneelVerstopt: 'Het paneel is verstopt. Spreek er met niemand over. Behalve in raadsels.',
    pinStatus:
      'Het paneel is verstopt. 2034 moet dezelfde plek aanduiden, zonder dat jullie ze noemen.',
    meerWoorden: 'Een brief die honderd jaar moet overleven, verdient meer woorden.',
    plekGevonden: '2034 heeft de plek gevonden. Schrijf de veertiende brief.',
  },

  s2034: {
    zegelTekst: 'Op het vergeelde vel staat plots, honderd jaar oud en toch kraakvers:',
    handdruk:
      'De handdruk is compleet. Zo werkt dit spel: wat 1934 doet, vinden jullie. Aan het werk.',
    nogNiets: 'Er ligt hier nog niets. In 1934 is de brief nog niet getypt…',
    geenDoorslag: 'Er is nog geen doorslag. 1934 moet eerst typen.',
    woordBijna: 'Je zit er vlak naast. Kijk letter per letter naar de doorgedrukte letters.',
    woordFout: 'Dat staat er niet. Kijk beter naar de doorgedrukte letters.',
    p1Opgelost: 'P1 opgelost: de brieven wijzen naar een KLUIS. P2 en P3 liggen open.',
    doorslagFout:
      'De doorslag spelt "{woord}". Dat is niet het woord uit het briefje van de Loper. Lees samen de code na op de codekaart (RR-12); 1934 neemt een nieuw vel.',
    geenTicket: 'Bewijsstuk 7 (kluisticket) is nog niet aangetroffen.',
    ticket: 'NOORDSTATION BRUSSEL · BAGAGEKLUIS Nr.',
    ticketUitleg:
      'Het tweede cijfer is vervaagd. De brief zegt: één meer dan het aantal brieven dat het bisdom telt. Hoeveel verstuurde 1934 er werkelijk?',
    p2Opgelost: 'P2 opgelost: de kluis zwaait open. Johannes de Doper, ongeschonden.',
    slotWeigert: 'Het slot weigert. Verkeerde kluis.',
    eerstP1: 'Eerst P1: zonder de brief weet niemand waarnaar te zoeken.',
    p3Opgelost: 'P3 opgelost: sacristie, kooromgang, Vijdkapel, zijdeur. De buurman loog.',
    routeFout: 'Die route klopt niet. Wie liegt er, en wat zag 1934 echt?',
    nietsVerstopt: '1934 heeft nog niets verstopt. Letterlijk niets te vinden.',
    nietsOnderStof: 'Niets onder het stof. Vraag 1934 waar ze het lieten.',
    inBeslag:
      'Het verslag loog niet: hier zocht de politie in december 1934. Het mapje is toen in beslag genomen. 1934 moet opnieuw, op een veiligere plek. Verdenking +15%',
    p4Opgelost:
      'P4 opgelost: het mapje overleefde de huiszoeking. Doorslagen van dertien brieven en een laatste notitie.',
    nogNietVerstopt: '1934 heeft het paneel nog niet verstopt. Er valt niets te vinden.',
    nietHier: 'Niet hier. Stel betere vragen aan 1934. Zonder de plek te laten verklappen.',
    verloren:
      'Jullie vonden de plek… maar daar bleef niets bewaard: alles werd in de loop van de eeuw gerestaureerd, ontruimd of verbouwd. Het paneel is verloren. 1934 moet een betere plek kiezen. Verdenking +15%',
    gevonden: 'Gevonden. Honderd jaar later, exact waar het hoorde te zijn. In het volle zicht.',
    meerZinnen: 'Een conclusie van Bureau X telt minstens een paar zinnen.',
    verbinding: 'Verbindingsfout. Probeer opnieuw.',
    codekaart: 'Stuk RR-12 gevonden: de codekaart van D.U.A.',
    geenCodekaart: 'Geen codekaart bij dit stuk: die hoort bij brief XII.',
    geenStuk: 'Geen stuk gevonden onder dat nummer.',
  },

  bijna: {
    route:
      'De juiste plekken, maar niet in de juiste volgorde. Vraag 1934 in welke volgorde ze het zagen.',
    kluis:
      'Je zit er vlak naast. Hoeveel brieven kreeg het bisdom echt? Brief XIII komt nooit aan.',
  },

  hints: {
    'hint-p1a': [
      '» Beide antwoorden liggen in 2034. Vraag hun restauratieverslag van de typemachine, en lees hen de getallen van het briefje voor: in hun archief ligt een kopie van de codekaart.',
      '» Elk getal is een rij en een kolom op de codekaart: eerst de rij, dan de kolom. Laat 2034 de letters opzoeken. Het woord past bij jullie volgende opdracht (②).',
      '» De hamers, van vak 1 tot 6: T, K, S, U, N, R. Het woord is KLUIS: klik K, L, U, I en S in leesvolgorde aan en verstuur.',
    ],
    'hint-p2a': [
      '» Kies eerst het nummer. Deponeer pas als de wachter rechts op de baan loopt, buiten zicht.',
      '» De brief belooft: één meer dan het aantal brieven dat het bisdom telt. Brief XII is de laatste die aankomt.',
      '» Twaalf brieven kwamen aan bij het bisdom. Tel er één bij op, en wacht tot de wachter helemaal rechts loopt.',
    ],
    'hint-p4a': [
      '» "Waar het licht valt." Waar valt licht een kamer binnen?',
      '» De sleutel ligt op de vensterbank. Verstop het mapje daarna NIET waar de politie gaat zoeken; 2034 heeft het verslag.',
      '» De sleutel ligt waar het zonlicht binnenvalt. Verstop het mapje op een plek die niet in het huiszoekingsverslag van 2034 staat.',
    ],
    'hint-p5a': [
      '» De zin zegt: een plek waar altijd publiek komt, zodat niemand er ongemerkt iets kan weghalen.',
      '» Vraag 2034 wat er in de twintigste eeuw met het Belfort, het Gravensteen en het station gebeurde.',
      '» Eén gebouw bleef honderd jaar open voor het publiek en werd nooit leeggehaald. Daar begon ook alles, in april 1934.',
    ],
    'hint-p1': [
      '» 1934 zit met een kapotte typemachine en een briefje in code. Jullie hebben het restauratieverslag, en het archief heeft de codekaart. Vertel hen wat jullie zien.',
      '» Zoek RR-12 in de archiefzoeker (12 is het nummer van de brief). Laat 1934 de getallen voorlezen en zoek elke letter op: eerst de rij, dan de kolom.',
      '» Het woord is KLUIS. Zodra 1934 die vijf letters dieper aanslaat en verstuurt, lees je het hier op de doorslag. Staat er iets anders, dan neemt 1934 een nieuw vel.',
    ],
    'hint-p2': [
      '» Het eerste cijfer staat nog op het ticket. Het tweede zit in de brief zelf.',
      '» "Eén meer dan het aantal brieven dat u telt." Het bisdom telde wat aankwam, en brief XIII kwam nooit aan.',
      '» Het bisdom ontving de brieven I tot en met XII. Tel er één bij op. Draai elk cijfer en bevestig het apart.',
    ],
    'hint-p3': [
      '» Vergelijk wat de buurman zegt met het weerbericht in de krant.',
      '» Volle maan bij zwaar bewolkt en aardedonker? De buurman liegt; schrap het westportaal. Vraag 1934 naar de echte volgorde.',
      '» Schrap de buurman. Neem de andere drie getuigen in volgorde van tijd en zoek bij elke plek het nummer op de plattegrond. Bij de laatste getuige horen twee plekken.',
    ],
    'hint-p4b': [
      '» Het verslag zegt waar de politie zocht. Daar ligt het dus niet (meer).',
      '» Vraag 1934 letterlijk waar ze het mapje lieten. Praten mag, dit is geen geheim.',
      '» Klik op dezelfde plek die 1934 koos. Koos 1934 een plek uit het huiszoekingsverslag, dan ligt het mapje er niet meer en moet 1934 opnieuw naar binnen.',
    ],
    'hint-p5': [
      '» Herlees de beroemde zin. Waar komt het publiek elke dag, zonder iets te zien?',
      '» Het stadsarchief vertelt welke gebouwen doorzocht of verbouwd werden. Eén plek bleef altijd open en werd nooit ontruimd.',
      '» De plek waar het allemaal begon. Verstopt in het volle zicht.',
    ],
  },

  hulp: {
    stem1934: 'Een stem uit de doos',
    notitie2034: 'Notitie Bureau X',
    inactief: {
      '1934': {
        p0: 'Druk het zegel. Meer hoeft er niet te gebeuren. Vraag 2034 dan wat zij zien.',
        p1: 'De vakken dragen alleen een nummer en het briefje van de Loper staat in code. Wat jullie missen, ligt in 2034: hun restauratieverslag en de codekaart in hun archief.',
        p2: 'Kies het nummer dat de brief belooft en wacht tot de perronwachter helemaal rechts loopt.',
        p3: '2034 heeft de plattegrond, jullie stonden erbij. Vertel hen in welke volgorde de dragers liepen.',
        p4: 'Ga pas naar binnen als je weet waar de politie in december zal zoeken. 2034 heeft het huiszoekingsverslag.',
        p5: 'Eén plek overleeft de eeuw. 2034 weet welke gebouwen verbouwd of ontruimd werden. Vraag het voor je klikt.',
      },
      '2034': {
        p0: 'Het vel blijft leeg zolang 1934 niets doet. Vraag hen het zegel te drukken.',
        p1: '1934 zit met een kapotte typemachine en een briefje in code. Jullie hebben het restauratieverslag, en de codekaart ligt in het archief bij brief XII.',
        p2: 'Het ticket is half onleesbaar. Het tweede cijfer staat in de brief: één meer dan het aantal brieven dat het bisdom telt.',
        p3: 'Eén getuige vertelt iets wat die nacht onmogelijk was. Leg zijn verhaal naast De Gentenaar, en vraag 1934 wat zij zagen.',
        p4: 'Waar liet 1934 het mapje? Vraag het gewoon. Ligt het op een plek uit het huiszoekingsverslag, zeg het hen dan.',
        p5: '1934 mag de plek niet noemen. Stel ja-neevragen en vertel hen wat de eeuw met elk gebouw deed.',
      },
    },
    nieuw: 'De lijn kraakt',
    gevondenTitel: 'Gevonden',
    gevonden1934: 'Schrijf nu de veertiende brief.',
    gevonden2034: 'Schrijf nu jullie eindrapport.',
    p4_1934: 'Het mapje overleefde de huiszoeking. Kies nu de bergplaats op het stadsplan (⑤).',
    p4_2034:
      'Het stadsplan is open (⑤). 1934 kiest de plek; jullie vinden ze zonder dat zij ze noemen.',
    werkkamer1934:
      '2034 kan nu de werkkamer in het museum doorzoeken (④). Verstop het mapje, als dat nog niet gebeurde.',
    werkkamer2034: 'De museale werkkamer is open (④). Vraag 1934 waar ze het mapje lieten.',
    goedBezig: 'Goed bezig',
    nogRoute: 'Nog de route (③), dan opent de werkkamer (④).',
    nogKluis: 'Nog de kluis (②), dan opent de werkkamer (④).',
    p1_1934:
      '2034 las de brief. Nu tegelijk: deponeer het paneel in de kluis (②) en vertel 2034 de route van de dragers (③).',
    p1_2034:
      'Nu open: de bagagekluis (②) en de getuigen (③). 1934 deponeert het paneel en kent de route.',
    handdrukTitel: 'De handdruk is gelukt',
    p0_1934: 'Herstel nu de typemachine en typ brief XII (①). Wat jullie niet weten, weet 2034.',
    p0_2034:
      '1934 moet nu de typemachine herstellen en brief XII typen (①). Wat ze daarvoor nodig hebben, ligt bij jullie: het restauratieverslag en de codekaart in het archief.',
    html: `
  <h2 id="hulp-titel">Hulp nodig?</h2>
  <h3>Zo werkt D.U.A.</h3>
  <ul>
    <li>Jullie spelen in twee tijdperken. 1934 doet dingen, 2034 vindt wat er honderd jaar later van overblijft.</li>
    <li>Bel of videobel en zeg hardop wat je doet en ziet. Wat 1934 verknoeit, merkt 2034 pas later.</li>
    <li>Met z'n tweeën? Elk één tijdperk. Met drie speelt één speler zijn tijdperk alleen. De rol is een label: wie in hetzelfde tijdperk staat, ziet hetzelfde dossier.</li>
    <li>De verdenkingsmeter stijgt bij risico's. Op 100% duiken jullie onder en verliezen jullie 5 minuten.</li>
  </ul>
  <h3>Vast?</h3>
  <ul>
    <li>Bij de puzzels staat <strong>Hint vragen</strong>. De hints gaan stap voor stap verder.</li>
    <li>Vraag het de andere kant: vaak heeft het andere tijdperk het ontbrekende stuk.</li>
    <li>"Je zit er vlak naast" betekent: bijna, overleg nog even.</li>
  </ul>
  <h3>Technisch probleem?</h3>
  <p>Herlaad de pagina: jullie voortgang blijft bewaard. Lukt het niet, mail naar
    <a href="mailto:info@bureau-x.be?subject=Hulp%20bij%20D.U.A.">info@bureau-x.be</a>
    met je sessiecode.</p>
`,
  },

  lobby: {
    rol: {
      schrijver: 'De Schrijver (1934)',
      loper: 'De Loper (1934)',
      archivaris: 'De Archivaris (2034)',
      restaurateur: 'De Restaurateur (2034)',
    },
    vol: 'Alle plaatsen van deze sessie zijn al ingenomen.',
    houdVrij: 'Houd deze plek vrij: er moet minstens één speler in {era} staan.',
  },

  einde: {
    nogBezig:
      'De andere kant is nog bezig. Jullie kunnen alvast verder lezen en een review achterlaten.',
    wacht1934: 'Wachten op 1934: de veertiende brief is nog niet verzegeld…',
    wacht2034: 'Wachten op 2034: het rapport is nog niet ingediend…',
    samen:
      'De brief uit 1934 en het rapport uit 2034 liggen naast elkaar. Jullie waren D.U.A. Allebei. Altijd al.',
    resttijd: 'Resttijd',
    hints: 'Hints gebruikt',
    verdenking: 'Eindverdenking',
    insignes: 'Insignes',
    deelMetTijd:
      'Wij kraakten D.U.A. met {tijd} resttijd en {badges}/{totaal} insignes 🕰️ Gratis online escape room over De Rechtvaardige Rechters: {url}',
    deel: 'Wij kraakten D.U.A. 🕰️ Gratis online escape room over De Rechtvaardige Rechters: {url}',
    url: 'https://bureau-x.be/dua/',
  },
} as const;

/** Elke tekst wordt een gewone string, met dezelfde sleutels en lijsten. */
type Verbreed<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Verbreed<U>[]
    : { readonly [K in keyof T]: Verbreed<T[K]> };

export type DuaTeksten = Verbreed<typeof nl>;
