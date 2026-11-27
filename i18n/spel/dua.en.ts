/**
 * Engelse vertaling van de D.U.A.-gamepagina's (SPELPAGINAS in i18n/config.ts).
 * De sleutels staan als data-i18n in de Nederlandse HTML. Waarden zijn HTML met
 * enkel eenvoudige opmaak (b, em, br, span, a): de browser vult ze veilig in
 * (shared/js/spelvertaling.ts). Na een aanpassing: pnpm i18n:bevestig <sleutel>.
 *
 * Vaste vertalingen: De Rechtvaardige Rechters = The Just Judges, Johannes de
 * Doper = John the Baptist, het Lam Gods = the Ghent Altarpiece, de Schrijver /
 * Loper / Archivaris / Restaurateur = the Writer / Runner / Archivist / Restorer.
 */
import type { PaginaWoordenboek } from '../../scripts/i18n-paginas.ts';

const HINT = 'Ask for a hint';
const NOG_HINT = 'Another hint';
const BEZET = '- taken -';

const en: PaginaWoordenboek = {
  // ── Lobby ───────────────────────────────────────────────
  'dua-lobby.head.title': 'D.U.A. - Bureau X',
  'dua-lobby.scherm-intro.d-stempel': 'Strictly confidential',
  'dua-lobby.scherm-intro.lobby-sub': 'BUREAU X · FILE 1934/RR · TIME-SPLIT EXPERIENCE',
  'dua-lobby.scherm-intro.lobby-verhaal':
    'Ghent, April 2034. A hundred years after the theft of <em>The Just Judges</em>, Bureau X receives an anonymous box: the yellowed investigation file from 1934 and a fourteenth letter, signed <b>D.U.A.</b>',
  'dua-lobby.scherm-intro.lobby-verhaal-2':
    'This story has two sides. Some of you play in <b>1934</b>, as the people behind D.U.A., with the police on your heels and a trail to leave behind. The rest play in <b>2034</b> and know how the century turned out. What 1934 hides, 2034 finds. What 1934 ruins is still ruined a hundred years later.',
  'dua-lobby.scherm-intro.lobby-verhaal-3':
    '2 to 4 players · 60 minutes · call or video call your team and turn your sound on.',
  'dua-lobby.scherm-intro.d-knop': 'Open the line',
  'dua-lobby.scherm-code.se': 'Session code',
  'dua-lobby.scherm-code.lobby-verhaal':
    'You will find the code in your confirmation email (format: DUA-2026-001).',
  'dua-lobby.scherm-code.d-input@placeholder': 'DUA-2026-001',
  'dua-lobby.scherm-code.d-knop': 'Continue',
  'dua-lobby.scherm-code.recaptcha-melding':
    'This site is protected by reCAPTCHA. The Google <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> apply.',
  'dua-lobby.scherm-rol.se': 'Choose your side of time',
  'dua-lobby.scherm-rol.lobby-verhaal':
    'There must be at least one investigator in each era.<br> With two players, each plays one era. With three, one player takes an era alone and the other two share theirs. With four, two players share each era.',
  'dua-lobby.rol-kaart-schrijver.rol-era': '1934 · GHENT',
  'dua-lobby.rol-kaart-schrijver.rol-naam': 'The Writer',
  'dua-lobby.rol-kaart-schrijver.rol-info':
    'Types the blackmail letters to the bishop and decides which codes cross the century. Sadly, the typewriter is… broken.',
  'dua-lobby.rol-kaart-schrijver.rol-bezet-label': BEZET,
  'dua-lobby.rol-kaart-loper.rol-era': '1934 · BRUSSELS &amp; WETTEREN',
  'dua-lobby.rol-kaart-loper.rol-naam': 'The Runner',
  'dua-lobby.rol-kaart-loper.rol-info':
    'Slips through stations and studies, dodges guards and hides what must survive a hundred years.',
  'dua-lobby.rol-kaart-loper.rol-bezet-label': BEZET,
  'dua-lobby.rol-kaart-archivaris.rol-era': '2034 · BUREAU X',
  'dua-lobby.rol-kaart-archivaris.rol-naam': 'The Archivist',
  'dua-lobby.rol-kaart-archivaris.rol-info':
    'Reads the carbon copies, the police file and the newspapers. Knows where the police will search in December 1934.',
  'dua-lobby.rol-kaart-archivaris.rol-bezet-label': BEZET,
  'dua-lobby.rol-kaart-restaurateur.rol-era': '2034 · BUREAU X',
  'dua-lobby.rol-kaart-restaurateur.rol-naam': 'The Restorer',
  'dua-lobby.rol-kaart-restaurateur.rol-info':
    'Examines the panels, the museum reconstruction and the city archive. Knows what survives the century.',
  'dua-lobby.rol-kaart-restaurateur.rol-bezet-label': BEZET,
  'dua-lobby.scherm-rol.rol-tip':
    'The role is a label for the story. Both roles of an era see the same file and solve everything together, even if you are alone in your era.',

  // ── 1934 ────────────────────────────────────────────────
  'dua-1934.head.title': 'D.U.A. - Ghent, 1934',
  'dua-1934.body.sys-case': 'D.U.A. · loading…',
  'dua-1934.body.verdenking-label': 'SUSPICION',
  'dua-1934.body.era-kop': 'Ghent, April 1934. You are D.U.A.',
  'dua-1934.body.era-sub':
    'The Writer types. The Runner moves. The police are watching. And 2034 knows things you cannot know: ask them before you do anything you cannot undo.',
  'dua-1934.s-zegel.h3':
    '⓪ The handshake through time <span class="hintje">(practice round)</span>',
  'dua-1934.s-zegel.p':
    'First you learn how this works. Press the wax seal of D.U.A. onto a blank sheet. Nothing more. Then ask 2034 what happens on their side.',
  'dua-1934.s-zegel.d-knop': 'Press the seal',
  'dua-1934.s-hamers.h3': '① The typewriter has been sabotaged',
  'dua-1934.s-hamers.p':
    'Someone swapped the type bars and scratched the letters off their slots. Each slot only has a number now. Click two type bars to swap them until every bar is back in its own slot.',
  'dua-1934.s-hamers.hintje':
    'Nobody here remembers which bar goes where. In 2034 this machine stands restored in a museum. Ask them what it looks like.',
  'dua-1934.s-hamers.hintje-2': 'Letter XII can only be typed once the machine is repaired.',
  'dua-1934.s-brief.h3': '① Letter XII to Bishop Coppieters',
  'dua-1934.s-brief.p':
    'Writer. As agreed: in letter XII, strike the name of the place where I am leaving the panel harder. In our code:',
  'dua-1934.s-brief.p-2': 'I burned the code card. No one may read this. - L.',
  'dua-1934.s-brief.p-3':
    'Strike exactly <b>six letters harder</b> (click them): the letters of the word from the note, in reading order. The carbon copy is all that remains.',
  'dua-1934.s-brief.hintje':
    'You cannot read the code without the card. But the police keep everything, and 2034 has their archive, filed by letter number.',
  'dua-1934.s-brief.d-knop': 'Strike and send',
  'dua-1934.s-brief.d-knop-2': 'New sheet',
  'dua-1934.s-brief.hintje-2': '6 letters left to choose.',
  'dua-1934.hint-p1a.hint-knop': HINT,
  'dua-1934.hint-p1a.hint-verder': NOG_HINT,
  'dua-1934.s-kluis.h3': '② Brussels North Station: the return',
  'dua-1934.s-kluis.p':
    'The Runner stands by the luggage lockers, <em>John the Baptist</em> under one arm. The platform guard is doing his rounds. Only deposit when he is <b>out of sight</b>. Choose the locker number first; think of what the letter promises: <em>"one more than the count of our letters in your hands"</em>, and you never send letter XIII.',
  'dua-1934.s-kluis.span': '◉ guard nearby: danger',
  'dua-1934.s-kluis.span-2': 'platform',
  'dua-1934.s-kluis.span-3': 'out of sight: safe',
  'dua-1934.s-kluis.d-input@aria-label': 'Locker number',
  'dua-1934.s-kluis.d-knop': 'Deposit now',
  'dua-1934.s-kluis.hintje': 'Listen to the footsteps.',
  'dua-1934.hint-p2a.hint-knop': HINT,
  'dua-1934.hint-p2a.hint-verder': NOG_HINT,
  'dua-1934.s-route.h3': '③ What you saw that night',
  'dua-1934.s-route.p':
    "You kept watch at the cathedral. The route of the carriers, in order: <b>sacristy → ambulatory → Vijd Chapel → side door</b>. Only 2034 has the police floor plan with zone numbers. Tell them what you saw. Leave out what you don't know.",
  'dua-1934.s-kamer.h3': '④ Wetteren, 25 November 1934: the study',
  'dua-1934.s-kamer.p':
    'Goedertier is dying. The police are on their way: inside in <b>90 seconds</b>. First find the key (<em>"where the light falls"</em>), then hide the carbon copies and the last clue. But do not just pick any hiding place: 2034 has the search report and knows where the police will look. Ask them BEFORE you go in.',
  'dua-1934.s-kamer.d-knop': 'Go inside',
  'dua-1934.kamer.hintje': 'Find the key first.',
  'dua-1934.hint-p4a.hint-knop': HINT,
  'dua-1934.hint-p4a.hint-verder': NOG_HINT,
  'dua-1934.s-pin.h3': '⑤ The hiding place',
  'dua-1934.s-pin.p':
    'The moment of truth. One line may go down in history: <em>"in a place where neither I nor anyone else can remove it without attracting public attention."</em> But think beyond the riddle: the place must also <b>survive a hundred years</b>. What does 2034 know about what happened to these buildings? Only click when you are sure. After that: silence about the place. Code of honour.',
  'dua-1934.hint-p5a.hint-knop': HINT,
  'dua-1934.hint-p5a.hint-verder': NOG_HINT,
  'dua-1934.s-brief14.h3': 'The fourteenth letter',
  'dua-1934.s-brief14.p':
    '2034 has found the place. Now write the letter with which it all began for them. The circle closes.',
  'dua-1934.s-brief14.d-input@placeholder': 'To whoever finds this, a hundred years after us...',
  'dua-1934.s-brief14.d-knop': 'Seal the letter and open the final report',

  // ── 2034 ────────────────────────────────────────────────
  'dua-2034.head.title': 'D.U.A. - Bureau X, 2034',
  'dua-2034.body.sys-case': 'D.U.A. · loading…',
  'dua-2034.body.verdenking-label': 'SUSPICION',
  'dua-2034.body.era-kop': 'Bureau X, 2034. A trail gone cold.',
  'dua-2034.body.era-sub':
    'The Archivist reads. The Restorer investigates. And do not forget: you know how the century turned out. That knowledge can save 1934, if you share it in time.',
  'dua-2034.s-zegel.h3':
    '⓪ The handshake through time <span class="hintje">(practice round)</span>',
  'dua-2034.s-zegel.p':
    'On top of the box lies a blank, yellowed sheet. Strange. As if something still has to appear…',
  'dua-2034.zegel-actie.d-knop': 'Confirm: we see the seal',
  'dua-2034.s-verslag.h3':
    '① Restoration report: the typewriter of D.U.A. <span class="hintje">(P1)</span>',
  'dua-2034.s-verslag.p':
    'MSK Ghent, inventory no. 2031/117. At restoration the six type bars were found in their original positions. In order, from slot 1 to slot 6:',
  'dua-2034.typekoppen.label': 'slot 1',
  'dua-2034.typekoppen.sr-only': 'slot 1: T',
  'dua-2034.typekoppen.label-2': 'slot 2',
  'dua-2034.typekoppen.sr-only-2': 'slot 2: K',
  'dua-2034.typekoppen.label-3': 'slot 3',
  'dua-2034.typekoppen.sr-only-3': 'slot 3: S',
  'dua-2034.typekoppen.label-4': 'slot 4',
  'dua-2034.typekoppen.sr-only-4': 'slot 4: U',
  'dua-2034.typekoppen.label-5': 'slot 5',
  'dua-2034.typekoppen.sr-only-5': 'slot 5: N',
  'dua-2034.typekoppen.label-6': 'slot 6',
  'dua-2034.typekoppen.sr-only-6': 'slot 6: R',
  'dua-2034.s-verslag.hintje':
    "Restorer's note: the letters on the type bars are mirrored, as on any typewriter. On paper they come out readable. In 1934 this machine was sabotaged: tell them this order.",
  'dua-2034.body.h3': 'Archive finder',
  'dua-2034.body.p': 'Look up a document by archive number (format RR-__):',
  'dua-2034.body.d-input@placeholder': 'e.g. RR-04',
  'dua-2034.body.d-knop': 'Search',
  'dua-2034.codekaart.h3': 'RR-12: code card of D.U.A.',
  'dua-2034.codekaart.p':
    'Found during the search of December 1934, among the carbon copies of letter XII. Each number is a letter: <b>first the row, then the column</b>. Example: 21 is D.',
  'dua-2034.codekaart.sr-only': 'Code card: rows 1 to 5, columns 1 to 5',
  'dua-2034.s-doorslag.h3': '① Carbon copy of letter XII <span class="hintje">(P1)</span>',
  'dua-2034.s-doorslag.p':
    'Letter XII hid a word, in the secret code of D.U.A. 1934 has that code, but not the card to read it. The police did find the card: it is in the archive with the letter it belonged to. Every document is filed under RR plus the number of its letter.',
  'dua-2034.doorslag-inhoud.hintje': 'Nothing here yet. In 1934 the letter has not been typed…',
  'dua-2034.doorslag-vraag.p': 'Some letters were struck harder. What word do they form?',
  'dua-2034.doorslag-vraag.d-input@aria-label': 'Word in the carbon copy',
  'dua-2034.doorslag-vraag.d-knop': 'Read',
  'dua-2034.hint-p1.hint-knop': HINT,
  'dua-2034.hint-p1.hint-verder': NOG_HINT,
  'dua-2034.s-kluis.h3': '② Luggage lockers, North Station <span class="hintje">(P2)</span>',
  'dua-2034.ticket-inhoud.hintje': 'Exhibit 7 (locker ticket) has not been found yet.',
  'dua-2034.kluis-spel.d-knop@aria-label': 'Previous digit',
  'dua-2034.kluis-spel.d-knop@aria-label-2': 'Next digit',
  'dua-2034.kluis-spel.d-knop': 'Confirm digit',
  'dua-2034.kluis-spel.hintje':
    'Turn with − and +, confirm each digit separately.<br>Two digits, then the lock decides.',
  'dua-2034.hint-p2.hint-knop': HINT,
  'dua-2034.hint-p2.hint-verder': NOG_HINT,
  'dua-2034.s-getuigen.h3':
    '③ Police file: floor plan and witnesses <span class="hintje">(P3)</span>',
  'dua-2034.s-getuigen.b': 'Witnesses, 11 April 1934:',
  'dua-2034.s-getuigen.p': '⏱ 00:15, Sexton: "noises by the <b>sacristy</b>."',
  'dua-2034.s-getuigen.p-2':
    '⏱ 00:40, Night watchman: "a glimmer of light in the <b>ambulatory</b>."',
  'dua-2034.s-getuigen.p-3':
    '⏱ 01:05, Neighbour: "by the light of the <b>full moon</b> I saw two men at the <b>west portal</b>, clear as day."',
  'dua-2034.s-getuigen.p-4':
    '⏱ 01:20, Milkman: "movement by the <b>Vijd Chapel</b>, then the <b>side door</b> slammed."',
  'dua-2034.s-getuigen.hintje':
    'De Gentenaar (newspaper), 11 April: "that night was heavily overcast and pitch dark; the street lights were out." So one witness is lying. And 1934 was there: ask them.',
  'dua-2034.s-getuigen.p-5': 'Zone numbers of the route, in order:',
  'dua-2034.s-getuigen.d-input@aria-label': 'Zone numbers of the route',
  'dua-2034.s-getuigen.d-knop': 'Check',
  'dua-2034.hint-p3.hint-knop': HINT,
  'dua-2034.hint-p3.hint-verder': NOG_HINT,
  'dua-2034.body.h3-2': 'Search report, December 1934 <span class="hintje">(crucial for P4)</span>',
  'dua-2034.body.p-2':
    '"By order of the public prosecutor, the house in Wetteren was searched. Thoroughly examined were: <b>the desk</b> (every drawer pulled out), <b>the cupboard</b> (completely emptied) and <b>the bookshelf</b> (book by book). Nothing of value found."',
  'dua-2034.body.hintje':
    'Anything hidden <em>there</em> was seized long before 2034. Tell 1934 before it is too late.',
  'dua-2034.s-museum.h3':
    '④ Museum reconstruction: the study in Wetteren <span class="hintje">(P4)</span>',
  'dua-2034.museum-slot.hintje': 'Locked until the locker (P2) and the route (P3) are solved.',
  'dua-2034.museum-spel.p':
    'A hundred years later the room is still there, as a museum. Somewhere lies the folder that survived the search. Where did D.U.A. leave it?',
  'dua-2034.hint-p4b.hint-knop': HINT,
  'dua-2034.hint-p4b.hint-verder': NOG_HINT,
  'dua-2034.body.h3-3':
    'City archive: a century of Ghent <span class="hintje">(crucial for P5)</span>',
  'dua-2034.body.p-3':
    '"The <b>Belfry</b> and the <b>Gravensteen</b> were fully restored during the twentieth century; every room was inventoried in the process. The <b>station</b> was rebuilt several times, and the old cellars were not preserved. Only the <b>cathedral</b> stayed open to the public all those years, day after day, and was never completely cleared."',
  'dua-2034.body.hintje-2':
    'A hiding place has to survive a hundred years. Tell 1934 what survives the century, before they choose.',
  'dua-2034.s-pin.h3': '⑤ The city map <span class="hintje">(P5)</span>',
  'dua-2034.pin-slot.hintje': 'Locked until the study (P4) has given up its secret.',
  'dua-2034.pin-spel.p':
    '"In a place where neither I nor anyone else can remove it without attracting public attention." 1934 knows where, but may not say it. Ask the right questions and click the same place.',
  'dua-2034.hint-p5.hint-knop': HINT,
  'dua-2034.hint-p5.hint-verder': NOG_HINT,
  'dua-2034.brief13.h3': 'Letter XIII, RR-13 - never sent',
  'dua-2034.brief13.p':
    '"If you are reading this, I am no longer here. Do not follow the words of a dying man, but the hands of whoever hid it. - A.G."',
  'dua-2034.brief13.hintje':
    'Bonus document: the deathbed words are not the hiding place. Ask 1934.',
  'dua-2034.body.h3-4': 'The Ghent Altarpiece (diagram)',
  'dua-2034.body.h3-5': 'Uncatalogued, postcard',
  'dua-2034.body.p-4':
    'A postcard from <b>Geel</b>, addressed to Bureau X. <em>"Kamer 14 is closed. But archives never forget. - L.B."</em>',
  'dua-2034.body.h3-6': 'Classified ad, De Gentenaar',
  'dua-2034.body.em': '"Lost: patience. Found: nothing. Information: tel. Ghent 1180."',
  'dua-2034.s-rapport.h3': 'Final report, Bureau X',
  'dua-2034.s-rapport.p': 'The place is right. Write your conclusion: who was D.U.A., and why?',
  'dua-2034.s-rapport.d-input@placeholder': 'We, investigators of Bureau X, conclude that...',
  'dua-2034.s-rapport.d-knop': 'Submit the report and open the final screen',

  // ── Einde ───────────────────────────────────────────────
  'dua-einde.head.title': 'D.U.A. - The circle is complete',
  'dua-einde.body.sys-case': 'D.U.A. · final report',
  'dua-einde.body.sys-badge': 'Case reopened',
  'dua-einde.body.d-stempel': 'Case reopened',
  'dua-einde.body.era-kop': 'The circle is complete.',
  'dua-einde.body.d-knop': 'Share your result',
  'dua-einde.body.h3': 'The fourteenth letter (1934)',
  'dua-einde.body.hintje': 'Not sealed yet…',
  'dua-einde.body.h3-2': 'The report (2034)',
  'dua-einde.body.hintje-2': 'Not submitted yet…',
  'dua-einde.einde-review.h3': 'Leave a review',
  'dua-einde.einde-review.hintje':
    'Optional. We read every review ourselves, and the best ones appear on the website.',
  'dua-einde.einde-review.review-sterren@aria-label': 'Rating',
  'dua-einde.review-sterren.ster@aria-label': '1 star',
  'dua-einde.review-sterren.ster@aria-label-2': '2 stars',
  'dua-einde.review-sterren.ster@aria-label-3': '3 stars',
  'dua-einde.review-sterren.ster@aria-label-4': '4 stars',
  'dua-einde.review-sterren.ster@aria-label-5': '5 stars',
  'dua-einde.einde-review.d-input@placeholder': 'What did you think of D.U.A.? (optional)',
  'dua-einde.einde-review.d-input@placeholder-2': 'Name (optional)',
  'dua-einde.einde-review.review-fout': 'Choose a number of stars first.',
  'dua-einde.einde-review.d-knop': 'Send review',
  'dua-einde.einde-review.review-dank': 'Thank you for your review!',
  'dua-einde.einde-onthulling.h3': 'And in real life?',
  'dua-einde.einde-onthulling.p':
    "The theft on the night of 10 to 11 April 1934 was never solved. The thirteen letters of D.U.A. really exist, as do the deathbed words of Arsène Goedertier and the return of John the Baptist via a luggage locker at Brussels North Station. The panel has never been found. As recently as late 2024, the Ghent public prosecutor's office was still searching in Oosterzele, without result. Maybe someone in 1934 simply hid it too well.",
  'dua-einde.einde-onthulling.hintje':
    'Want to know more? <a href="https://rechtvaardigerechters.be" target="_blank" rel="noopener">rechtvaardigerechters.be</a> · <a href="https://visit.gent.be/en" target="_blank" rel="noopener">visit.gent.be</a>',
  'dua-einde.body.d-knop-2': '← Back to the website',

  // ── Tijd voorbij ────────────────────────────────────────
  'dua-tijd.head.title': 'D.U.A. - The line goes dead',
  'dua-tijd.body.d-stempel': 'Unsolved',
  'dua-tijd.body.se': 'The line goes dead.',
  'dua-tijd.body.lobby-verhaal':
    'Sixty minutes, and not a second more. The line between 1934 and 2034 is dead, but the trail is not cold: everything you found is part of the story.',
  'dua-tijd.oplossing-blok.h3': 'How it could have gone',
  'dua-tijd.body.lobby-verhaal-2':
    'Thank you for searching with us. The real investigation has been running since 10 April 1934, and nobody found the panel there either. You are in good company.',
  'dua-tijd.einde-review.h3': 'How was it?',
  'dua-tijd.einde-review.hintje': 'Optional. We read every review ourselves.',
  'dua-tijd.einde-review.review-sterren@aria-label': 'Rating',
  'dua-tijd.review-sterren.ster@aria-label': '1 star',
  'dua-tijd.review-sterren.ster@aria-label-2': '2 stars',
  'dua-tijd.review-sterren.ster@aria-label-3': '3 stars',
  'dua-tijd.review-sterren.ster@aria-label-4': '4 stars',
  'dua-tijd.review-sterren.ster@aria-label-5': '5 stars',
  'dua-tijd.einde-review.d-input@placeholder': 'What did you think of D.U.A.? (optional)',
  'dua-tijd.einde-review.d-input@aria-label': 'Your review',
  'dua-tijd.einde-review.d-input@placeholder-2': 'Name (optional)',
  'dua-tijd.einde-review.d-input@aria-label-2': 'Name (optional)',
  'dua-tijd.einde-review.review-fout': 'Choose a number of stars first.',
  'dua-tijd.einde-review.d-knop': 'Send review',
  'dua-tijd.einde-review.review-dank': 'Thank you for your review!',
  'dua-tijd.body.lobby-verhaal-3': 'File 1934/RR · reopened and closed again · Bureau X',
  'dua-tijd.body.d-knop': 'Play again? Book a new session',
  'dua-tijd.body.d-knop-2': '← Back to the website',

  // ── SVG-labels (kamer, stadsplan, plattegrond, Lam Gods) ─
  'dua-1934.kamer.kast': 'CUPBOARD',
  'dua-1934.kamer.bureau': 'DESK',
  'dua-1934.kamer.vensterbank': 'WINDOWSILL',
  'dua-1934.kamer.schouw': 'FIREPLACE',
  'dua-1934.kamer.boekenrek': 'BOOKSHELF',
  'dua-1934.kamer.vloerplank': 'FLOORBOARD',
  'dua-1934.kaart.leie': 'the Leie',
  'dua-1934.kaart.sintbaafs': "St Bavo's Cathedral",
  'dua-1934.kaart.belfort': 'Belfry',
  'dua-1934.kaart.station': "St Peter's Station",
  'dua-1934.kaart.gravensteen': 'Gravensteen',
  'dua-2034.plan.westportaal': '5 · West portal',
  'dua-2034.plan.middenschip': '2 · Nave',
  'dua-2034.plan.kooromgang': '1 · Ambulatory',
  'dua-2034.plan.vijdkapel': '9 · Vijd Chapel',
  'dua-2034.plan.sacristie': '3 · Sacristy',
  'dua-2034.plan.zijdeur': '4 · Side door',
  'dua-2034.museum.kast': 'CUPBOARD',
  'dua-2034.museum.bureau': 'DESK',
  'dua-2034.museum.vensterbank': 'WINDOWSILL',
  'dua-2034.museum.schouw': 'FIREPLACE',
  'dua-2034.museum.boekenrek': 'BOOKSHELF',
  'dua-2034.museum.vloerplank': 'FLOORBOARD',
  'dua-2034.kaart.leie': 'the Leie',
  'dua-2034.kaart.sintbaafs': "St Bavo's Cathedral",
  'dua-2034.kaart.belfort': 'Belfry',
  'dua-2034.kaart.station': "St Peter's Station",
  'dua-2034.kaart.gravensteen': 'Gravensteen',
  'dua-2034.lam.rechters': 'Judges',
  'dua-2034.lam.gestolen': 'STOLEN',
  'dua-2034.lam.ridders': 'Knights',
  'dua-2034.lam.aanbidding': 'Adoration of',
  'dua-2034.lam.lam': 'the Lamb',
  'dua-2034.lam.kluizenaars': 'Hermits',
  'dua-2034.lam.pelgrims': 'Pilgrims',
};

export default en;
