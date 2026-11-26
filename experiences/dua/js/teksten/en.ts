/**
 * Engelse teksten van de D.U.A.-game. Zelfde vorm als nl.ts (TypeScript bewaakt dat).
 * Wordt pas geladen als een sessie Engels is (dua-tekst.ts).
 */
import type { DuaTeksten } from './nl.ts';

export const en: DuaTeksten = {
  kop: {
    sysCase: 'D.U.A. · File 1934/RR · Session {sessie}',
    eindCase: 'D.U.A. · final report · Session {sessie}',
    rol: {
      schrijver: 'The Writer',
      loper: 'The Runner',
      archivaris: 'The Archivist',
      restaurateur: 'The Restorer',
    },
  },

  ui: {
    tienMinuten: '10 minutes left. The line between 1934 and 2034 is getting weaker.',
    straf: 'The police nearly stepped in. You went into hiding: 5 MINUTES lost.',
    geluidAan: '♪ on',
    geluidUit: '♪ off',
    insigne: 'Badge found: {naam}',
    insignes: {
      'door-u-aangesteld': 'Duly Appointed',
      'anno-verwisseld': 'Eras Swapped',
      'de-dertiende-brief': 'The Thirteenth Letter',
      'het-lam-waakt': 'The Lamb Keeps Watch',
      'groeten-uit-geel': 'Greetings from Geel',
    },
    telefoon:
      'A crackling voice: "The Judges do not travel. They have been looking down on you for years."',
  },

  plekken: {
    kast: 'Cupboard',
    bureau: 'Desk',
    vensterbank: 'Windowsill',
    schouw: 'Fireplace',
    boekenrek: 'Bookshelf',
    vloerplank: 'Loose floorboard',
    sintbaafs: "St Bavo's Cathedral",
    belfort: 'Belfry',
    station: "St Peter's Station",
    gravensteen: 'Gravensteen',
    leie: 'The Leie',
  },

  s1934: {
    zegelGezet:
      'The seal is set. Ask 2034 what just appeared on their side. The handshake is only complete once they confirm it.',
    hamerStatus: 'Letter XII can only be typed once the machine is repaired.',
    hamerHersteld: 'Mechanism repaired. The machine is waiting for the Writer.',
    machineWeer: 'The typewriter works again.',
    wachtOpBevestiging:
      'Wait until 2034 confirms they see the seal (practice round ⓪). Only then does the machine work.',
    eerstHanddruk:
      'Do the handshake first (practice round ⓪): that is how you learn how time works.',
    vak: 'slot {nr}',
    hamerLabel: 'Type bar {letter} in slot {nr}',
    machineStuk: 'The typewriter is broken. Repair the type bars first.',
    briefVerstuurd: 'Carbon copy sent. In 2034 there is now a letter in the archive.',
    nogLetters: '{aantal} letters left to choose.',
    allesGekozen: '{Aantal} letters chosen. Strike when you are sure.',
    eerstMachine: 'Repair the machine first.',
    precies: '{Aantal} letters. No more, no less.',
    doorslagGemaakt: 'Carbon copy made. 2034 can now find the letter in their archive.',
    doorslagFout:
      'The carbon copy spells "{woord}". That is not what the Runner asked for. Take a new sheet and check the code with 2034 again.',
    briefGelezen: '2034 has already read the letter. A new sheet is no longer needed.',
    eerstBrief: 'The letter first (P1): without a promise on paper, a locker makes no sense.',
    alInKluis: 'The panel is already in locker {nummer}.',
    tweeCijfers: 'Two digits.',
    kluisFout:
      'That number does not match the promise in the letter. Read it again: one more than the number of letters the bishop has received.',
    betrapt: '⚠ The platform guard saw you fiddling with the lockers. Suspicion +15%',
    betraptStatus: 'Caught. Wait until he is really out of sight (at the far right of his round).',
    gedeponeerd: 'Panel deposited in locker {nummer}. The ticket travels to 2034, half illegible.',
    kluisStatus: 'Panel deposited in locker {nummer}. Now it is up to 2034.',
    kamerStatus: 'Find the key first.',
    alVerstopt: 'The folder is already hidden ({plek}). Now it is up to 2034.',
    sleutelGevonden:
      'The key, in the late sunlight. Now choose the hiding place for the folder. Choose well: one chance.',
    niets: 'Nothing. The seconds are ticking. "Where the light falls..."',
    geenBergplaats: 'That is where the key was. Not a hiding place.',
    kamerVerzegeld: 'The study is sealed in time. 2034 can search as soon as P2 and P3 are done.',
    kamerVerzegeldOpen: 'The study is sealed in time. 2034 can search now.',
    pinVerloren:
      '2034 found the place, but nothing survived there. Choose a place that survives the century.',
    mapjeVerstopt: 'Folder hidden: {plek}. Now we wait a hundred years.',
    nieuweRonde: 'Find the key first. "Where the light falls."',
    inBeslag:
      '2034 found the folder in a place the police searched: it was seized. Go back inside and choose a safer place.',
    politie: '⚠ The police are at the door. Get out, without hiding anything. Suspicion +10%',
    keuzeGemaakt: 'The choice is made. Ask 2034 to search.',
    nogNiet: 'Not yet. First the folder (P4) has to make it safely through the century.',
    paneelVerstopt: 'The panel is hidden. Speak of it to no one. Except in riddles.',
    pinStatus: 'The panel is hidden. 2034 must point to the same place, without you naming it.',
    meerWoorden: 'A letter that has to survive a hundred years deserves more words.',
    plekGevonden: '2034 has found the place. Write the fourteenth letter.',
  },

  s2034: {
    zegelTekst: 'Suddenly, on the yellowed sheet, a hundred years old and yet crisp:',
    handdruk:
      'The handshake is complete. That is how this game works: what 1934 does, you find. Get to work.',
    nogNiets: 'Nothing here yet. In 1934 the letter has not been typed…',
    geenDoorslag: 'There is no carbon copy yet. 1934 has to type first.',
    woordBijna: 'You are very close. Look at the struck letters one by one.',
    woordFout: 'That is not what it says. Look more closely at the struck letters.',
    p1Opgelost: 'P1 solved: the letters point to a LOCKER. P2 and P3 are open.',
    doorslagFout:
      'The carbon copy spells "{woord}". That is not the word from the Runner\'s note. Check the code together on the code card (RR-12); 1934 takes a new sheet.',
    geenTicket: 'Exhibit 7 (locker ticket) has not been found yet.',
    ticket: 'BRUSSELS NORTH STATION · LUGGAGE LOCKER No.',
    ticketUitleg:
      'The second digit has faded. The letter says: one more than the number of letters the bishop has received. How many did 1934 actually send?',
    p2Opgelost: 'P2 solved: the locker swings open. John the Baptist, unharmed.',
    slotWeigert: 'The lock refuses. Wrong locker.',
    eerstP1: 'P1 first: without the letter, nobody knows what to look for.',
    p3Opgelost: 'P3 solved: sacristy, ambulatory, Vijd Chapel, side door. The neighbour lied.',
    routeFout: 'That route is wrong. Who is lying, and what did 1934 really see?',
    nietsVerstopt: '1934 has not hidden anything yet. Literally nothing to find.',
    nietsOnderStof: 'Nothing under the dust. Ask 1934 where they left it.',
    inBeslag:
      'The report did not lie: this is where the police searched in December 1934. The folder was seized back then. 1934 has to try again, in a safer place. Suspicion +15%',
    p4Opgelost:
      'P4 solved: the folder survived the search. Carbon copies of thirteen letters and one last note.',
    nogNietVerstopt: '1934 has not hidden the panel yet. There is nothing to find.',
    nietHier: 'Not here. Ask 1934 better questions, without letting them give the place away.',
    verloren:
      'You found the place… but nothing was preserved there: over the century it was all restored, cleared or rebuilt. The panel is lost. 1934 has to choose a better place. Suspicion +15%',
    gevonden: 'Found. A hundred years later, exactly where it was meant to be. In plain sight.',
    meerZinnen: 'A conclusion from Bureau X takes at least a few sentences.',
    verbinding: 'Connection error. Please try again.',
    codekaart: 'Document RR-12 found: the code card of D.U.A.',
    geenCodekaart: 'No code card with this document: it belongs with letter XII.',
    geenStuk: 'No document found under that number.',
  },

  bijna: {
    route: 'The right places, but not in the right order. Ask 1934 in which order they saw it.',
    kluis:
      'You are very close. How many letters did the bishop really receive? Letter XIII never arrives.',
  },

  hints: {
    'hint-p1a': [
      '» Both answers are in 2034. Ask for their restoration report on the typewriter, and read them the numbers on the note: their archive has a copy of the code card.',
      '» Each number is a row and a column on the code card: first the row, then the column. Let 2034 look up the letters. The word fits your next task (②).',
      '» The type bars, from slot 1 to 6: T, K, S, U, N, R. The word is LOCKER: click L, O, C, K, E and R in reading order and send.',
    ],
    'hint-p2a': [
      '» Choose the number first. Only deposit when the guard is at the far right of his round, out of sight.',
      '» The letter promises: one more than the number of letters the bishop has received. Letter XII is the last one to arrive.',
      '» Twelve letters reached the bishop. Add one, and wait until the guard is all the way to the right.',
    ],
    'hint-p4a': [
      '» "Where the light falls." Where does light come into a room?',
      '» The key is on the windowsill. After that, do NOT hide the folder where the police will search; 2034 has the report.',
      '» The key lies where the sunlight comes in. Hide the folder in a place that is not in the search report of 2034.',
    ],
    'hint-p5a': [
      '» The sentence says: a place the public always visits, so nobody can remove anything unnoticed.',
      '» Ask 2034 what happened to the Belfry, the Gravensteen and the station in the twentieth century.',
      '» One building stayed open to the public for a hundred years and was never emptied. That is also where it all began, in April 1934.',
    ],
    'hint-p1': [
      '» 1934 is stuck with a broken typewriter and a note in code. You have the restoration report, and the archive has the code card. Tell them what you see.',
      '» Search RR-12 in the archive finder (12 is the number of the letter). Let 1934 read out the numbers and look up each letter: first the row, then the column.',
      '» The word is LOCKER. As soon as 1934 strikes those six letters harder and sends, you will read it here on the carbon copy. If it says something else, 1934 takes a new sheet.',
    ],
    'hint-p2': [
      '» The first digit is still on the ticket. The second is in the letter itself.',
      '» "One more than the count of our letters in your hands." The bishop counted what arrived, and letter XIII never arrived.',
      '» The bishop received letters I to XII. Add one. Turn each digit and confirm it separately.',
    ],
    'hint-p3': [
      '» Compare what the neighbour says with the weather report in the newspaper.',
      '» A full moon on a heavily overcast, pitch-dark night? The neighbour is lying; cross out the west portal. Ask 1934 for the real order.',
      '» Cross out the neighbour. Take the other three witnesses in order of time and look up the number of each place on the floor plan. The last witness mentions two places.',
    ],
    'hint-p4b': [
      '» The report says where the police searched. So it is not (or no longer) there.',
      '» Ask 1934 straight out where they left the folder. Talking is allowed, this is no secret.',
      '» Click the same place 1934 chose. If 1934 chose a place from the search report, the folder is gone and 1934 has to go back inside.',
    ],
    'hint-p5': [
      '» Reread the famous sentence. Where do people come every day without noticing a thing?',
      '» The city archive tells you which buildings were restored or rebuilt. One place always stayed open and was never cleared.',
      '» The place where it all began. Hidden in plain sight.',
    ],
  },

  hulp: {
    stem1934: 'A voice from the box',
    notitie2034: 'Bureau X note',
    inactief: {
      '1934': {
        p0: 'Press the seal. Nothing more needs to happen. Then ask 2034 what they see.',
        p1: "The slots only have a number and the Runner's note is in code. What you are missing is in 2034: their restoration report and the code card in their archive.",
        p2: 'Choose the number the letter promises and wait until the platform guard is all the way to the right.',
        p3: '2034 has the floor plan, you were there. Tell them in which order the carriers walked.',
        p4: 'Only go inside once you know where the police will search in December. 2034 has the search report.',
        p5: 'One place survives the century. 2034 knows which buildings were rebuilt or cleared. Ask before you click.',
      },
      '2034': {
        p0: 'The sheet stays blank as long as 1934 does nothing. Ask them to press the seal.',
        p1: '1934 is stuck with a broken typewriter and a note in code. You have the restoration report, and the code card is in the archive with letter XII.',
        p2: 'The ticket is half illegible. The second digit is in the letter: one more than the number of letters the bishop has received.',
        p3: 'One witness describes something that was impossible that night. Compare his story with the newspaper report in De Gentenaar, and ask 1934 what they saw.',
        p4: 'Where did 1934 leave the folder? Just ask. If it is in a place from the search report, tell them.',
        p5: '1934 may not name the place. Ask yes-or-no questions and tell them what the century did to each building.',
      },
    },
    nieuw: 'The line crackles',
    gevondenTitel: 'Found',
    gevonden1934: 'Now write the fourteenth letter.',
    gevonden2034: 'Now write your final report.',
    p4_1934: 'The folder survived the search. Now choose the hiding place on the city map (⑤).',
    p4_2034:
      'The city map is open (⑤). 1934 chooses the place; you find it without them naming it.',
    werkkamer1934:
      '2034 can now search the study in the museum (④). Hide the folder, if that has not happened yet.',
    werkkamer2034: 'The museum study is open (④). Ask 1934 where they left the folder.',
    goedBezig: 'Well done',
    nogRoute: 'Just the route (③) to go, then the study opens (④).',
    nogKluis: 'Just the locker (②) to go, then the study opens (④).',
    p1_1934:
      '2034 read the letter. Now two things at once: deposit the panel in the locker (②) and tell 2034 the route of the carriers (③).',
    p1_2034:
      'Now open: the luggage locker (②) and the witnesses (③). 1934 deposits the panel and knows the route.',
    handdrukTitel: 'The handshake worked',
    p0_1934: 'Now repair the typewriter and type letter XII (①). What you do not know, 2034 knows.',
    p0_2034:
      '1934 now has to repair the typewriter and type letter XII (①). What they need for that is with you: the restoration report and the code card in the archive.',
    html: `
  <h2 id="hulp-titel">Need help?</h2>
  <h3>How D.U.A. works</h3>
  <ul>
    <li>You play in two eras. 1934 does things, 2034 finds what is left of them a hundred years later.</li>
    <li>Call or video call and say out loud what you do and see. What 1934 ruins, 2034 only notices later.</li>
    <li>Two of you? One era each. With three, one player takes an era alone. The role is a label: whoever is in the same era sees the same file.</li>
    <li>The suspicion meter rises when you take risks. At 100% you go into hiding and lose 5 minutes.</li>
  </ul>
  <h3>Stuck?</h3>
  <ul>
    <li>Each puzzle has an <strong>Ask for a hint</strong> button. The hints go further step by step.</li>
    <li>Ask the other side: the other era often has the missing piece.</li>
    <li>"You are very close" means: almost, talk it over a bit more.</li>
  </ul>
  <h3>Technical problem?</h3>
  <p>Reload the page: your progress is saved. If that does not help, email
    <a href="mailto:info@bureau-x.be?subject=Help%20with%20D.U.A.">info@bureau-x.be</a>
    with your session code.</p>
`,
  },

  lobby: {
    rol: {
      schrijver: 'The Writer (1934)',
      loper: 'The Runner (1934)',
      archivaris: 'The Archivist (2034)',
      restaurateur: 'The Restorer (2034)',
    },
    vol: 'All places in this session are already taken.',
    houdVrij: 'Keep this place free: there must be at least one player in {era}.',
  },

  einde: {
    nogBezig: 'The other side is still busy. You can read on in the meantime and leave a review.',
    wacht1934: 'Waiting for 1934: the fourteenth letter has not been sealed yet…',
    wacht2034: 'Waiting for 2034: the report has not been submitted yet…',
    samen:
      'The letter from 1934 and the report from 2034 lie side by side. You were D.U.A. Both sides. All along.',
    resttijd: 'Time left',
    hints: 'Hints used',
    verdenking: 'Final suspicion',
    insignes: 'Badges',
    deelMetTijd:
      'We cracked D.U.A. with {tijd} to spare and {badges}/{totaal} badges 🕰️ Free online escape room about The Just Judges: {url}',
    deel: 'We cracked D.U.A. 🕰️ Free online escape room about The Just Judges: {url}',
    url: 'https://bureau-x.be/en/dua/',
  },
};
