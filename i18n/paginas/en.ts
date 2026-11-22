/**
 * Engelse vertaling van de publieke pagina's. De sleutels staan als data-i18n
 * in de Nederlandse HTML. Waarden zijn HTML (inline opmaak blijft behouden).
 * Na een aanpassing: pnpm i18n:bevestig (zie scripts/i18n-paginas.ts).
 */
import type { PaginaWoordenboek } from '../../scripts/i18n-paginas.ts';

const NL_SPEL = 'nl';

const en: PaginaWoordenboek = {
  // ── Home ────────────────────────────────────────────────
  'home.head.title': 'Free online escape rooms based on real Belgian mysteries | Bureau X',
  'home.head.description@content':
    'Bureau X makes online escape rooms based on real places, traditions and stories. Play Kamer 14 (Geel, 2 players) or D.U.A. (Ghent, 2 to 4 players) for free, from home in your browser.',
  'home.head.og-title@content': 'Bureau X - Online escape rooms',
  'home.head.og-description@content':
    'Online escape rooms based on real Belgian places and stories. Free to play, from home.',
  'home.jsonld.organization': {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://bureau-x.be/#organisatie',
    name: 'Bureau X',
    url: 'https://bureau-x.be/',
    logo: 'https://bureau-x.be/assets/img/favicon-192x192.png',
    description: 'Bureau X makes online escape rooms based on real places, traditions and stories.',
    email: 'info@bureau-x.be',
    areaServed: { '@type': 'Country', name: 'Belgium' },
    knowsLanguage: ['nl', 'en'],
    sameAs: ['https://escapetalk.nl/games/bureau-x/'],
  },
  'home.jsonld.website': {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://bureau-x.be/en/#website',
    name: 'Bureau X',
    url: 'https://bureau-x.be/en/',
    inLanguage: 'en',
    publisher: { '@id': 'https://bureau-x.be/#organisatie' },
  },
  'home.nav.dossiers': 'Case files',
  'home.nav.hoe': 'How it works',
  'home.nav.wie': 'Who makes this?',
  'home.nav.speel': 'Play for free',
  'home.navReviews.a': 'Reviews',
  'home.navbar.nav-toggle@aria-label': 'Menu',
  'home.hero.hero-eyebrow': 'Free online escape rooms',
  'home.hero.hero-title': 'Real mysteries.<br><em>You solve them.</em>',
  'home.hero.sub':
    'Online escape rooms built around real Belgian places and stories. Everyone plays on their own screen, together on a call. Free, no account needed. The games are in Dutch for now.',
  'home.hero.speel': 'Play for free',
  'home.hero.wie': 'Who makes this?',
  'home.hero.foto-dua@alt': 'D.U.A.: the screen of the 1934 team, with the sabotaged typewriter',
  'home.hero.foto-dua': 'D.U.A. · Ghent, 1934',
  'home.hero.foto-k14@alt': 'Kamer 14: the desk of care worker An at the OPZ in Geel',
  'home.hero.foto-k14': 'Kamer 14 · Geel',
  'home.hero.stempel': 'Free',
  'home.dossiers.label': 'The filing cabinet',
  'home.dossiers.heading': 'Two case files are open.',
  'home.dossiers.sub':
    'Each case is built around a real place. Each of you plays a different side of the story.',
  'home.dossiers.k14-tab': 'Case 14 · Geel',
  'home.dossiers.k14-beeld@alt':
    'Kamer 14, player A: An’s desk at the OPZ in Geel, with a computer, a pinboard and a phone',
  'home.dossiers.k14-gsm@alt': 'Kamer 14, player B on a phone: Lena’s room',
  'home.dossiers.k14-stempel': 'Unsolved',
  'home.dossiers.k14-desc':
    'On the morning of Tuesday 6 May, Lena Bogaert vanishes from her room at her host family in Geel. No note, no explanation. One of you sits at her care worker’s desk, the other stands in her room. Together you find out where she went. <strong>The game is in Dutch.</strong>',
  'home.dossiers.k14-spelers': '2 players',
  'home.dossiers.k14-duur': '25 to 45 minutes',
  'home.dossiers.k14-niveau': 'Difficulty: medium',
  'home.dossiers.k14-leeftijd': 'Ages 14 and up',
  'home.dossiers.start': 'Open this case',
  'home.dossiers.k14-meer': 'More about Kamer 14',
  'home.dossiers.dua-tab': 'Case 1934/RR · Ghent',
  'home.dossiers.dua-1934@alt':
    'D.U.A., team 1934: the tasks of The Writer, with the sabotaged typewriter',
  'home.dossiers.dua-2034@alt':
    'D.U.A., team 2034: the Bureau X archive with the restoration report',
  'home.dossiers.dua-stempel': 'Unsolved since 1934',
  'home.dossiers.dua-desc':
    'On the night of 10 to 11 April 1934, the panel <em>The Just Judges</em> by Jan van Eyck disappears from St Bavo’s Cathedral in Ghent. Part of your team plays in 1934, the rest a century later in the Bureau X archive. What one group knows, the other is missing. <strong>The game is in Dutch.</strong>',
  'home.dossiers.dua-spelers': '2 to 4 players',
  'home.dossiers.dua-duur': '30 to 60 minutes',
  'home.dossiers.dua-niveau': 'Difficulty: beginner',
  'home.dossiers.dua-leeftijd': 'Ages 12 and up',
  'home.dossiers.start-2': 'Open this case',
  'home.dossiers.dua-meer': 'More about D.U.A.',
  'home.hoe.label': 'How it works',
  'home.hoe.heading': 'Get started in three steps',
  'home.hoe.stap1-titel': 'Choose a case',
  'home.hoe.stap1':
    'Enter the email addresses of your fellow players. That way every player gets their own link, because each of you sees a different part of the case.',
  'home.hoe.stap2-titel': 'Open your link',
  'home.hoe.stap2':
    'Agree on a time. Everyone opens their link on their own screen, wherever they are. No download, no account.',
  'home.hoe.stap3-titel': 'Call and solve it',
  'home.hoe.stap3':
    'Call or video call and tell each other what you see. Stuck? The hints help you step by step.',
  'home.wie.foto@alt': 'Xander, the maker of Bureau X',
  'home.wie.label': 'Who makes this?',
  'home.wie.heading': 'I’m Xander.',
  'home.wie.tekst':
    'I study programming and make Bureau X in my free time. I love stories that really happened and puzzles you can only solve together. It’s a hobby project, not a business. That’s why it’s free, and it will stay that way.',
  'home.wie.mail':
    'Questions or ideas? Email <a href="mailto:info@bureau-x.be">info@bureau-x.be</a>.',
  'home.reviews.label': 'What players say',
  'home.reviews.heading': 'Played. Rated.',
  'home.reviews.reviews-note':
    'Played it yourself? You can leave a review on the final screen of your session. Every review is checked for spam and offensive language, not for its score. Reviews are shown in the language they were written in.',
  'home.faq.label': 'Questions',
  'home.faq.heading': 'What you want to know',
  'home.faq.gratis-v': 'Is Bureau X really free? <span class="faq-arrow">▾</span>',
  'home.faq.gratis-a':
    'Yes. No subscription, no account, no in-game purchases. Bureau X is a hobby project, not a business, so there is no business model behind it.',
  'home.faq.duur-v': 'How long does a session take? <span class="faq-arrow">▾</span>',
  'home.faq.duur-a':
    'Most groups finish Kamer 14 in 25 to 45 minutes and D.U.A. in 30 to 60 minutes. In both games you have one hour at most.',
  'home.faq.spelers-v': 'How many players do I need? <span class="faq-arrow">▾</span>',
  'home.faq.spelers-a':
    'Kamer 14 is made for exactly 2 players. D.U.A. is played with 2 to 4: part of the team plays in 1934, the rest in 2034.',
  'home.faq.vast-v': 'What if we get stuck? <span class="faq-arrow">▾</span>',
  'home.faq.vast-a':
    'You can ask for hints at every puzzle. They go one step further each time, from a nudge in the right direction to almost the answer. That way every group reaches the end.',
  'home.faq.niveau-v': 'How hard is it, and from what age? <span class="faq-arrow">▾</span>',
  'home.faq.niveau-a':
    'D.U.A. is a good first escape room: it starts with a practice round and suits ages 12 and up. Kamer 14 is a bit harder. You compare documents and work with times and amounts. Because of the theme, a missing woman in psychiatric family foster care, we recommend it from age 14.',
  'home.faq.nodig-v':
    'What do I need, and does it work on a phone? <span class="faq-arrow">▾</span>',
  'home.faq.nodig-a':
    'A browser on your phone, tablet or computer, and a way to call your fellow players. The documents are easier to read on a bigger screen. Turn your sound on: Kamer 14 has recorded voices and D.U.A. has sound effects. The games are in Dutch.',
  'home.faq.plek-v': 'Do we need to be in the same place? <span class="faq-arrow">▾</span>',
  'home.faq.plek-a':
    'No. Everyone plays on their own screen, wherever they are. So you can easily play together with friends or family who live further away.',
  'home.faq.mail-v':
    'Why do you ask for every player’s email address? <span class="faq-arrow">▾</span>',
  'home.faq.mail-a':
    'Every player gets their own link, because each of you sees a different part of the case. We send that link to that address. You can read more in our <a href="/privacy.html">privacy policy</a>.',
  'home.faq.echt-v': 'Are the stories real? <span class="faq-arrow">▾</span>',
  'home.faq.echt-a':
    'The settings are. Kamer 14 takes place within Geel’s real family foster care system, run by the psychiatric centre OPZ Geel, but Lena Bogaert and her disappearance are fictional. D.U.A. revolves around the real 1934 theft of The Just Judges from St Bavo’s Cathedral, still unsolved today. The 2034 side is made up.',
  'home.cta.titel': 'Which case will you open first?',
  'home.cta.btn': 'Play for free',
  'home.cta-section.cta-footnote':
    'Completely free &nbsp;·&nbsp; No account needed &nbsp;·&nbsp; From home',
  'home.footer.footer-tag':
    'Online escape rooms based on real Belgian stories and unsolved mysteries.',
  'home.footer.footer-head': 'Experiences',
  'home.footer.footer-head-2': 'Info',
  'home.footer.a': 'Contact',
  'home.footer.a-2': 'Privacy policy',
  'home.footer.a-3': 'Cookie settings',
  'home.footer.span': '© 2026 Bureau X',

  // ── Kamer 14 ────────────────────────────────────────────
  'kamer14.head.title': 'Kamer 14: free online escape room for 2 players (in Dutch)',
  'kamer14.head.description@content':
    'Free online escape room for 2 players, based on Geel’s family foster care tradition (UNESCO-recognised). Each on your own screen, 25 to 45 minutes, from home. The game is in Dutch.',
  'kamer14.head.og-title@content':
    'Kamer 14 - Escape room about Geel’s family foster care tradition | Bureau X',
  'kamer14.head.og-description@content':
    'Based on Geel’s family foster care tradition (UNESCO-recognised since 2023): play Kamer 14, a free online escape room for two.',
  'kamer14.jsonld.product-game': {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Game'],
    '@id': 'https://bureau-x.be/kamer-14/#spel',
    name: 'Kamer 14',
    brand: { '@type': 'Brand', name: 'Bureau X' },
    description:
      'Online escape room for two players about the disappearance of Lena Bogaert, based on the Geel tradition of family foster care. Usually 25 to 45 minutes, 100% online, free. The game is in Dutch.',
    url: 'https://bureau-x.be/en/kamer-14/',
    sameAs: ['https://escapetalk.nl/games/bureau-x/kamer-14/'],
    image: 'https://bureau-x.be/assets/img/kamer-14-preview.jpg',
    category: 'Online escape room',
    inLanguage: NL_SPEL,
    timeRequired: 'PT45M',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 2 },
    publisher: { '@id': 'https://bureau-x.be/#organisatie' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: 'https://bureau-x.be/en/kamer-14/#boek',
      areaServed: { '@type': 'Country', name: 'Belgium' },
    },
  },
  'kamer14.jsonld.breadcrumblist': {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bureau X', item: 'https://bureau-x.be/en/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Kamer 14',
        item: 'https://bureau-x.be/en/kamer-14/',
      },
    ],
  },
  'kamer14.navLinks.a': 'Experiences',
  'kamer14.navLinks.a-2': 'The case',
  'kamer14.navLinks.btn-nav': 'Book Kamer 14',
  'kamer14.navbar.nav-toggle@aria-label': 'Menu',
  'kamer14.hero.hero-eyebrow': 'Free online escape room for 2 · in Dutch · OPZ Geel',
  'kamer14.hero.hero-sub':
    'On the morning of Tuesday 6 May, Lena Bogaert is having breakfast as usual with the Martens-Peeters host family in Geel. Less than an hour later her room is empty. No note, no explanation.<br><br> You sit at the desk of her care worker at the OPZ, Geel’s psychiatric centre. Your fellow player stands in Lena’s room. You each see something different, and no lock opens for one of you alone. You really have to talk to each other to understand what happened.<br><br> Kamer 14 (“Room 14”) is based on Geel’s real tradition of family foster care, in which people have lived with ordinary families as full members of the household for seven centuries. Unique in the world, and still going today. <strong>Please note: the game itself is in Dutch.</strong>',
  'kamer14.hero.btn': 'Book a session →',
  'kamer14.hero.btn-2': 'More about the case',
  'kamer14.hero.hero-stamp': '■&nbsp; Status: unsolved',
  'kamer14.hero.hero-filebox-label': 'OPZ Geel &nbsp;·&nbsp; Boarder case file',
  'kamer14.hero.hero-filebox-stamp': 'Unsolved',
  'kamer14.body.feit-waarde': '25 to 45 min',
  'kamer14.body.feit-label': 'Playing time',
  'kamer14.body.feit-waarde-2': '2 players',
  'kamer14.body.feit-label-2': 'Duo',
  'kamer14.body.feit-label-3': 'Online',
  'kamer14.body.feit-waarde-3': 'Free',
  'kamer14.body.feit-label-4': 'Always',
  'kamer14.body.span':
    '<strong>Best played with sound.</strong> Kamer 14 has recorded voices (in Dutch) and sound. Not required: everything is also written out.',
  'kamer14.verhaal.label': 'The case',
  'kamer14.verhaal.heading': 'Two places, one disappearance',
  'kamer14.verhaal.sub':
    'Lena Bogaert has lived as a boarder with the Martens-Peeters host family in Geel for two years. Her care worker at the OPZ and the host family each know part of the story, and not everyone tells everything. The question is simple, the answer is not: <em>where is she, and why did she leave?</em>',
  'kamer14.verhaal.dossier-rol': 'Player A',
  'kamer14.verhaal.dossier-kop': 'An’s desk',
  'kamer14.verhaal.dossier-txt':
    'You sit at the desk of An Vermeersch, Lena’s care worker at OPZ Geel. Her computer, her notepad, Lena’s file and a phone that is about to ring.',
  'kamer14.verhaal.dossier-tag': 'Official · confidential',
  'kamer14.verhaal.dossier-rol-2': 'Player B',
  'kamer14.verhaal.dossier-kop-2': 'Lena’s room',
  'kamer14.verhaal.dossier-txt-2':
    'You stand in her room at the host family. A wardrobe, a pinboard, an old locked phone and a money box that won’t open. What she left behind, and what she hid.',
  'kamer14.verhaal.dossier-tag-2': 'Personal · locked',
  'kamer14.verhaal.sub-2': 'The solution lies in both. Only together will you find it.',
  'kamer14.section.label': 'How it works',
  'kamer14.section.heading': 'From booking to solution',
  'kamer14.section.step-title': 'Book a session',
  'kamer14.section.step-desc':
    'Fill in the form. Free. You get a personal game link straight away by email.',
  'kamer14.section.step-title-2': 'Split the roles',
  'kamer14.section.step-desc-2':
    'Send the link to your fellow player. Each of you picks a role and plays in your own browser. No download.',
  'kamer14.section.step-title-3': 'Solve it together',
  'kamer14.section.step-desc-3':
    'Call or video call each other and say what you see. What you need to open a lock is often on the other side.',
  'kamer14.echt.label': 'Based on real history',
  'kamer14.echt.heading': 'Family foster care in Geel',
  'kamer14.echt.p':
    '<strong>Geel, Belgium.</strong> For more than seven centuries, people who need extra care have lived with ordinary families in Geel, as full members of the household. This tradition of family foster care, which grew up around the pilgrimage site of Saint Dymphna, is unique in the world.',
  'kamer14.echt.p-2':
    'Today OPZ Geel still coordinates this care for about two hundred people. They are treated as full members of the household.',
  'kamer14.echt.p-3':
    'Kamer 14 is fictional, but the world around it is real. OPZ Geel exists, the tradition exists, the streets exist. Lena does not, but she could have been there.',
  'kamer14.faq.label': 'Questions',
  'kamer14.faq.heading': 'Frequently asked questions',
  'kamer14.faq.faq-q': 'Is Kamer 14 free? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p':
    'Completely free. No account, no subscription, no in-app purchases. You book, you play.',
  'kamer14.faq.faq-q-2': 'How do we play together online? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p-2':
    'Each of you opens your own game link in the browser, each in your own place. Call or video call your fellow player while you play. No download or screen sharing needed.',
  'kamer14.faq.faq-q-3': 'Can I play with more than 2 players? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p-3':
    'Kamer 14 is designed for exactly 2 players, each in their own place. More players is possible, but then some watch along on the same screen. With 3 or 4 players, D.U.A. is a better choice.',
  'kamer14.faq.faq-q-4': 'Do I need sound? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p-4':
    'Kamer 14 has recorded voices (in Dutch) and sound. It’s more intense with headphones, but not required: everything is also written out.',
  'kamer14.faq.faq-q-5': 'How long does it take? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p-5':
    'Usually 25 to 45 minutes, 60 at most. In the story it is four o’clock, and at five An decides whether to report Lena missing.',
  'kamer14.faq.faq-q-6': 'Is the story based on real events? <span class="faq-arrow">▾</span>',
  'kamer14.faq.p-6':
    'The setting is real: the Geel tradition of family foster care and OPZ Geel exist. Lena Bogaert and her disappearance are fictional, but fit into that world.',
  'kamer14.boek.label': 'Free · for two · from home',
  'kamer14.boek.heading': 'Start the investigation',
  'kamer14.boek.sub':
    'Enter your two email addresses. You each get your own link to your own case file. No account, no download. Kamer 14 has no fixed time slot, you play whenever it suits you. The game and the confirmation email are in Dutch.',
  'kamer14.boekForm.form-label': 'Contact name <span class="form-req">*</span>',
  'kamer14.boekForm.form-input@placeholder': 'Jane Smith',
  'kamer14.boekForm.form-label-2': 'When will you play? <span class="form-opt">(optional)</span>',
  'kamer14.boekForm.form-label-3': 'Email player 1 <span class="form-req">*</span>',
  'kamer14.boekForm.form-input@placeholder-2': 'player1@email.com',
  'kamer14.boekForm.form-label-4': 'Email player 2 <span class="form-req">*</span>',
  'kamer14.boekForm.form-input@placeholder-3': 'player2@email.com',
  'kamer14.boekForm.boek-btn': 'Start the session',
  'kamer14.boekForm.form-note':
    'Your link appears here right away and is also emailed to both players.',
  'kamer14.boek-ok.boek-ok-titel': '✓ Your session is ready',
  'kamer14.boek-ok.boek-ok-code': 'Session code: <strong data-boek="code"></strong>',
  'kamer14.boek-ok.boek-btn': 'Open the case file',
  'kamer14.boek-ok.boek-ok-kopieer': 'Copy link',
  'kamer14.boek-ok.form-note': 'Send the link to your fellow player. It is also in your inbox.',
  'kamer14.footer.footer-tag':
    'Online escape rooms based on real Belgian stories and unsolved mysteries.',
  'kamer14.footer.footer-head': 'Experiences',
  'kamer14.footer.a': 'Back to Bureau X',
  'kamer14.footer.footer-head-2': 'Info',
  'kamer14.footer.a-2': 'Contact',
  'kamer14.footer.a-3': 'Privacy policy',
  'kamer14.footer.a-4': 'Cookie settings',
  'kamer14.footer.span': '© 2026 Bureau X',

  // ── D.U.A. ──────────────────────────────────────────────
  'dua.head.title': 'D.U.A.: online escape room about the theft of The Just Judges',
  'dua.head.description@content':
    'On the night of 10 to 11 April 1934, The Just Judges disappears from St Bavo’s Cathedral in Ghent. One team plays in 1934, another in 2034. Together you solve it, across time.',
  'dua.head.og-title@content': 'D.U.A. - Online escape room, Ghent 1934/2034 | Bureau X',
  'dua.head.og-description@content':
    'A time-split escape room about the unsolved theft of The Just Judges (Ghent, 1934). Available now.',
  'dua.jsonld.product-game': {
    '@context': 'https://schema.org',
    '@type': ['Product', 'Game'],
    '@id': 'https://bureau-x.be/dua/#spel',
    name: 'D.U.A.',
    brand: { '@type': 'Brand', name: 'Bureau X' },
    description:
      'Online escape room about the unsolved theft of The Just Judges from St Bavo’s Cathedral (Ghent, 1934). Two teams play at the same time, one in 1934 and one in 2034. Together you solve the case, across time. 100% online, free. The game is currently in Dutch; an English version is coming.',
    url: 'https://bureau-x.be/en/dua/',
    sameAs: ['https://escapetalk.nl/games/bureau-x/dua/'],
    image: 'https://bureau-x.be/assets/img/dua-preview.jpg',
    category: 'Online escape room',
    inLanguage: NL_SPEL,
    timeRequired: 'PT60M',
    numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4 },
    publisher: { '@id': 'https://bureau-x.be/#organisatie' },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: 'https://bureau-x.be/en/dua/#boek',
      areaServed: { '@type': 'Country', name: 'Belgium' },
    },
  },
  'dua.jsonld.breadcrumblist': {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bureau X', item: 'https://bureau-x.be/en/' },
      { '@type': 'ListItem', position: 2, name: 'D.U.A.', item: 'https://bureau-x.be/en/dua/' },
    ],
  },
  'dua.navLinks.a': 'Experiences',
  'dua.navLinks.a-2': 'The case',
  'dua.navLinks.a-3': 'How it works',
  'dua.navLinks.btn-nav': 'Back to Bureau X',
  'dua.navbar.nav-toggle@aria-label': 'Menu',
  'dua.hero.img@alt': 'The Just Judges, Jan van Eyck (copy by Jef Van der Veken, 1939)',
  'dua.hero.hero-art-cred': 'The Just Judges · copy by Jef Van der Veken, 1939 · public domain',
  'dua.hero.case-stamp': 'Case 1934/RR<small>Ghent, Belgium · Unsolved</small>',
  'dua.hero.dua-over': 'Free online escape room for 2 to 4 players · in Dutch, English coming soon',
  'dua.hero.dua-subtitle': 'Stolen in 1934 · still missing',
  'dua.hero.dua-kop': 'Two teams. Two times. One lost masterpiece. Solve it, from 1934 to 2034.',
  'dua.hero.coming-badge': '<span class="coming-dot"></span>Available now',
  'dua.hero.btn': 'The real case',
  'dua.hero.btn-2': 'Book a session',
  'dua.body.feit-label': 'Era A',
  'dua.body.feit-label-2': 'Era B',
  'dua.body.feit-waarde': '2 to 4',
  'dua.body.feit-label-3': 'Players',
  'dua.body.feit-waarde-2': '30 to 60 min',
  'dua.body.feit-label-4': 'Playing time',
  'dua.spelen.label': 'How D.U.A. works',
  'dua.spelen.heading': 'Two eras. One case.',
  'dua.spelen.mech-city': 'Ghent · at the time of the theft',
  'dua.spelen.mech-head': 'The thieves are right next to you',
  'dua.spelen.mech-txt':
    'Gather evidence, leave traces, identify the extortionist, without getting caught. Whatever you hide, 2034 will find a century later.',
  'dua.spelen.mech-role': 'The Writer',
  'dua.spelen.mech-role-2': 'The Runner',
  'dua.spelen.mech-city-2': 'Ghent · a hundred years later',
  'dua.spelen.mech-head-2': 'All that is left are traces',
  'dua.spelen.mech-txt-2':
    'Reconstruct who did it and where the panel is. The future doesn’t know how it ended. You do, if 1934 does its job well.',
  'dua.spelen.mech-role-3': 'The Archivist',
  'dua.spelen.mech-role-4': 'The Restorer',
  'dua.spelen.span':
    'Information only travels one way: from 1934 to 2034. The final twist: together, you <em>are</em> D.U.A.',
  'dua.brieven.label': 'Thirteen letters',
  'dua.brieven.heading': 'The ransom letters',
  'dua.brieven.sub':
    'Between April and November 1934, the thief sent thirteen letters to the cathedral and the Belgian state. They have all been kept. None of them revealed who wrote them.',
  'dua.brieven.brief-num': 'Letter 1',
  'dua.brieven.brief-datum': 'April 1934',
  'dua.brieven.brief-txt':
    '"I want to let you know that I am keeping the panels in a safe place..."',
  'dua.brieven.brief-num-2': 'Letter 6',
  'dua.brieven.brief-datum-2': 'Summer 1934',
  'dua.brieven.brief-txt-2': '"The panels are in good condition. I will return them when..."',
  'dua.brieven.brief-num-3': 'Letter 11',
  'dua.brieven.brief-datum-3': 'October 1934',
  'dua.brieven.brief-txt-3':
    '"I have waited a long time. Time is running out for you, not for me..."',
  'dua.brieven.sub-2': 'The other letters are waiting for you in the game.',
  'dua.brieven.btn': 'Book a session →',
  'dua.verhaal.label': 'Based on real events',
  'dua.verhaal.heading': 'The theft of The Just Judges',
  'dua.verhaal.sub':
    'Ghent, 10 April 1934. It is one of the greatest unsolved art mysteries in history.',
  'dua.verhaal.dossier-stamp': 'Unsolved',
  'dua.dossierToggle.label-text': 'Read the full case file',
  'dua.dossierBody.tl-jaar': 'April 1432',
  'dua.dossierBody.tl-kop': 'The Ghent Altarpiece is completed',
  'dua.dossierBody.tl-txt':
    'The brothers Hubert and Jan van Eyck complete the polyptych <em>The Adoration of the Mystic Lamb</em> for St Bavo’s Cathedral in Ghent. The lower left panel shows The Just Judges at life size.',
  'dua.dossierBody.tl-jaar-2': 'Night of 10 to 11 April 1934',
  'dua.dossierBody.tl-kop-2': 'The panel disappears',
  'dua.dossierBody.tl-txt-2':
    'During the night, the lower left panel, <em>The Just Judges</em>, is stolen from the cathedral. How the thief got in has never been proven.',
  'dua.dossierBody.tl-jaar-3': 'April to November 1934',
  'dua.dossierBody.tl-kop-3': 'Thirteen ransom letters',
  'dua.dossierBody.tl-txt-3':
    'The cathedral and the Belgian state receive thirteen anonymous ransom letters. The author demands a ransom. The panel is never handed over. The letters are real. They have been kept.',
  'dua.dossierBody.tl-jaar-4': 'November 1934',
  'dua.dossierBody.tl-kop-4': 'A deathbed confession',
  'dua.dossierBody.tl-txt-4':
    'A Ghent stockbroker, Arsène Goedertier, dies of a heart attack. On his deathbed he confesses that he alone knows where the panel is. He dies before he can say.',
  'dua.dossierBody.tl-jaar-5': '1945 to today',
  'dua.dossierBody.tl-kop-5': 'A copy in its place',
  'dua.dossierBody.tl-txt-5':
    'Painter Jef Van der Veken makes a copy based on old photographs, the same image shown at the top of this page. It hangs in the altarpiece today. The original has never been found.',
  'dua.dossierBody.p': 'Document · Ransom letter no. 1',
  'dua.dossierBody.p-2':
    '"I want to let you, who are using every means available to preserve them, know that I am keeping the panels..."',
  'dua.dossierBody.p-3': 'Ghent, 1934 &nbsp;·&nbsp; Anonymous',
  'dua.dossierBody.p-4': 'Original kept in the diocesan archive',
  'dua.dossierBody.p-5':
    'The panel belongs to St Bavo’s Cathedral. The diocese of Ghent and the Belgian state never carried out a successful investigation. The case is officially unsolved.',
  'dua.dossierBody.p-6':
    'Learn more: <a href="https://sintbaafskathedraal.be" target="_blank" rel="noopener">St Bavo’s Cathedral</a> · <a href="https://www.museagent.be" target="_blank" rel="noopener">Musea Gent</a>',
  'dua.faq.label': 'Questions',
  'dua.faq.heading': 'Frequently asked questions',
  'dua.faq.faq-q': 'Is D.U.A. free? <span class="faq-arrow">▾</span>',
  'dua.faq.p':
    'Completely free. No account, no subscription, no in-app purchases. You book, you play.',
  'dua.faq.faq-q-2': 'How many players do you need for D.U.A.? <span class="faq-arrow">▾</span>',
  'dua.faq.p-2':
    'From 2 to 4 players. There is always at least one player in 1934 and one in 2034. With four, each era has two players.',
  'dua.faq.faq-q-3': 'How do we play together online? <span class="faq-arrow">▾</span>',
  'dua.faq.p-3':
    'Each of you opens your own game link in the browser and picks a role. Call or video call each other while you play. No download or installation needed.',
  'dua.faq.faq-q-4': 'How long does it take? <span class="faq-arrow">▾</span>',
  'dua.faq.p-4': 'Most groups solve the case in 30 to 60 minutes. You have one hour at most.',
  'dua.faq.faq-q-5': 'Did this really happen? <span class="faq-arrow">▾</span>',
  'dua.faq.p-5':
    'Yes. On the night of 10 to 11 April 1934, The Just Judges panel of the Ghent Altarpiece was stolen from St Bavo’s Cathedral in Ghent. It has never been found. The 2034 side of the game is fiction.',
  'dua.boek.label': 'Free · 2 to 4 players · from home',
  'dua.boek.heading': 'Take the case',
  'dua.boek.sub':
    'Arsène Goedertier died on 25 November 1934 as the only one who knew where the panel was. It is probably still there. Enter the email addresses of everyone who plays. Everyone gets their own game link and picks a role once you log in. D.U.A. is free. <strong>For now, the game and the confirmation email are in Dutch.</strong> An English version is on its way.',
  'dua.boekForm.form-label': 'Contact name <span class="form-req">*</span>',
  'dua.boekForm.form-input@placeholder': 'Jane Smith',
  'dua.boekForm.form-label-2': 'When will you play? <span class="form-opt">(optional)</span>',
  'dua.boekForm.form-label-3': 'Number of players <span class="form-req">*</span>',
  'dua.emailVelden.form-label': 'Email player 1 <span class="form-req">*</span>',
  'dua.emailVelden.form-input@placeholder': 'player1@email.com',
  'dua.emailVelden.form-label-2': 'Email player 2 <span class="form-req">*</span>',
  'dua.emailVelden.form-input@placeholder-2': 'player2@email.com',
  'dua.emailVelden.form-label-3': 'Email player 3 <span class="form-req">*</span>',
  'dua.emailVelden.form-input@placeholder-3': 'player3@email.com',
  'dua.emailVelden.form-label-4': 'Email player 4 <span class="form-req">*</span>',
  'dua.emailVelden.form-input@placeholder-4': 'player4@email.com',
  'dua.boekForm.boek-btn': 'Start the session',
  'dua.boekForm.form-note': 'Your link appears here right away and is also emailed to all players.',
  'dua.boek-ok.boek-ok-titel': '✓ Your session is ready',
  'dua.boek-ok.boek-ok-code': 'Session code: <strong data-boek="code"></strong>',
  'dua.boek-ok.boek-btn': 'Open the case file',
  'dua.boek-ok.boek-ok-kopieer': 'Copy link',
  'dua.boek-ok.form-note': 'Send the link to your fellow players. It is also in your inbox.',
  'dua.footer.footer-tag':
    'Online escape rooms based on real Belgian stories and unsolved mysteries.',
  'dua.footer.footer-head': 'Experiences',
  'dua.footer.a': 'Back to Bureau X',
  'dua.footer.footer-head-2': 'The case',
  'dua.footer.a-2': 'St Bavo’s Cathedral',
  'dua.footer.a-3': 'Musea Gent',
  'dua.footer.a-4': 'Privacy policy',
  'dua.footer.a-5': 'Cookie settings',
  'dua.footer.a-6': 'Contact',
  'dua.footer.span': '© 2026 Bureau X',

  // ── Privacy ─────────────────────────────────────────────
  'privacy.head.title': 'Privacy policy - Bureau X',
  'privacy.head.description@content':
    'Privacy policy of Bureau X. Read how we handle your personal data.',
  'privacy.navLinks.a': 'Experiences',
  'privacy.navLinks.btn-nav': 'Book a session',
  'privacy.navbar.nav-toggle@aria-label': 'Menu',
  'privacy.sectie-donker.dossier-stamp': 'Confidential - GDPR',
  'privacy.sectie-donker.dossier-ref': 'Bureau X - Internal document - REF-PRV-01',
  'privacy.sectie-donker.dossier-title': 'Privacy policy',
  'privacy.sectie-donker.meta-label': 'Controller',
  'privacy.sectie-donker.meta-value': 'Xander Meyen - Bureau X',
  'privacy.sectie-donker.meta-label-2': 'Contact',
  'privacy.sectie-donker.meta-label-3': 'Last updated',
  'privacy.sectie-donker.meta-value-2': '18 November 2026',
  'privacy.sectie-donker.meta-label-4': 'Legal basis',
  'privacy.sectie-donker.meta-value-3': 'GDPR - art. 6.1.a, 6.1.b and 6.1.f',
  'privacy.sectie-donker.artikel-nummer': 'Introduction',
  'privacy.sectie-donker.artikel-titel': 'About this document',
  'privacy.sectie-donker.p':
    'Bureau X cares about protecting your personal data. This privacy policy explains which data we process when you visit the site, book a session or play a game, why we do so, how long we keep it and what rights you have. Bureau X is subject to the European General Data Protection Regulation (GDPR). This is a translation of the Dutch privacy policy; in case of doubt, the <a href="/privacy.html" hreflang="nl" class="link-accent">Dutch version</a> prevails.',
  'privacy.sectie-donker.artikel-nummer-2': 'Article 1',
  'privacy.sectie-donker.artikel-titel-2': 'Controller',
  'privacy.sectie-donker.p-2':
    'Bureau X is a free, non-commercial project. The controller of your personal data is:',
  'privacy.sectie-donker.p-3':
    '<strong>Xander Meyen - Bureau X</strong><br> Belgium<br> <a href="mailto:info@bureau-x.be" class="link-accent">info@bureau-x.be</a>',
  'privacy.sectie-donker.artikel-nummer-3': 'Article 2',
  'privacy.sectie-donker.artikel-titel-3': 'What data do we process?',
  'privacy.sectie-donker.p-4': 'When booking a session, you fill in this data yourself:',
  'privacy.sectie-donker.th': 'Data',
  'privacy.sectie-donker.th-2': 'Purpose',
  'privacy.sectie-donker.td': 'Name',
  'privacy.sectie-donker.td-2': 'Personal confirmation of the booking',
  'privacy.sectie-donker.td-3': 'Email address',
  'privacy.sectie-donker.td-4': 'Sending the confirmation and game links',
  'privacy.sectie-donker.td-5': 'Preferred playing date',
  'privacy.sectie-donker.td-6': 'Scheduling the session',
  'privacy.sectie-donker.td-7': 'Number of players',
  'privacy.sectie-donker.td-8': 'Technical preparation of the session',
  'privacy.sectie-donker.mt-3': 'While you play and on the site, we also process:',
  'privacy.sectie-donker.li':
    '<strong>Game data:</strong> the progress of your session, the time per puzzle, the number of attempts and the hints used. These are linked to a session code and a random, anonymous user ID, not to your name or email address.',
  'privacy.sectie-donker.li-2':
    '<strong>Reviews:</strong> your score, your text and, if you fill it in yourself, a name or nickname.',
  'privacy.sectie-donker.li-3':
    '<strong>Technical data:</strong> when an error occurs on the site, data such as your browser, operating system and the page where the error happened.',
  'privacy.sectie-donker.li-4':
    '<strong>Visitor statistics:</strong> only if you accept analytics cookies, see article 9.',
  'privacy.sectie-donker.p-5': 'We do not collect payment details, passwords or location data.',
  'privacy.sectie-donker.artikel-nummer-4': 'Article 3',
  'privacy.sectie-donker.artikel-titel-4': 'Purposes of processing',
  'privacy.sectie-donker.p-6': 'We only use your data to:',
  'privacy.sectie-donker.li-5': 'Confirm your booking by email',
  'privacy.sectie-donker.li-6': 'Send the personal game links to you and your fellow players',
  'privacy.sectie-donker.li-7': 'Answer questions about your session',
  'privacy.sectie-donker.li-8': 'Make the game work and synchronise your progress between players',
  'privacy.sectie-donker.li-9': 'See which puzzles are too hard or too easy, and improve the game',
  'privacy.sectie-donker.li-10': 'Show reviews on the site, after we have checked them',
  'privacy.sectie-donker.li-11': 'Find and fix technical errors',
  'privacy.sectie-donker.li-12': 'Prevent misuse of the game database',
  'privacy.sectie-donker.p-7':
    'We do <strong>not</strong> use your data for marketing, advertising or profiling, and we do not sell it.',
  'privacy.sectie-donker.artikel-nummer-5': 'Article 4',
  'privacy.sectie-donker.artikel-titel-5': 'Legal basis',
  'privacy.sectie-donker.li-13':
    '<strong>Booking and the game itself:</strong> performance of a contract (art. 6.1.b GDPR). You request a session and we need this data to organise it and make it work.',
  'privacy.sectie-donker.li-14':
    '<strong>Game data for improvement, error reports and preventing misuse:</strong> our legitimate interest (art. 6.1.f GDPR) in offering a working, safe and good game. The data is limited and not linked to your name or email address.',
  'privacy.sectie-donker.li-15':
    '<strong>Reviews and Google Analytics:</strong> your consent (art. 6.1.a GDPR). You can withdraw it at any time, see articles 8 and 9.',
  'privacy.sectie-donker.artikel-nummer-6': 'Article 5',
  'privacy.sectie-donker.artikel-titel-6': 'Retention period',
  'privacy.sectie-donker.th-3': 'Data',
  'privacy.sectie-donker.th-4': 'Retention period',
  'privacy.sectie-donker.td-9': 'Booking data',
  'privacy.sectie-donker.td-10': 'At most 3 months after the booked playing date',
  'privacy.sectie-donker.td-11': 'Game data and session progress',
  'privacy.sectie-donker.td-12': 'At most 12 months after the session',
  'privacy.sectie-donker.td-13': 'Reviews',
  'privacy.sectie-donker.td-14':
    'As long as they are on the site, or until you ask us to remove them',
  'privacy.sectie-donker.td-15': 'Technical error reports (Sentry)',
  'privacy.sectie-donker.td-16': 'At most 90 days',
  'privacy.sectie-donker.td-17': 'Google Analytics',
  'privacy.sectie-donker.td-18': 'Cookies at most 2 years, statistics at most 14 months',
  'privacy.sectie-donker.mt-3-2':
    'After that, the data is deleted. You can always ask us to delete your data sooner, see article 8.',
  'privacy.sectie-donker.artikel-nummer-7': 'Article 6',
  'privacy.sectie-donker.artikel-titel-7': 'Processors',
  'privacy.sectie-donker.p-8':
    'We do not share your data with other parties. For the technical operation we do rely on these external services, which only process the data on our behalf:',
  'privacy.sectie-donker.li-16':
    '<strong>Make</strong> (Make s.r.o., Celonis group, Czech Republic): processes the data from the booking form and creates the game session, in Make’s EU zone.',
  'privacy.sectie-donker.li-17':
    '<strong>Combell</strong> (Combell nv, Belgium): sends the confirmation emails with the game links from info@bureau-x.be.',
  'privacy.sectie-donker.li-18':
    '<strong>Google Firebase</strong> (Google): stores the game data, session progress and reviews. The database is in the europe-west1 region (Belgium). For the game you get an anonymous user ID through Firebase Authentication.',
  'privacy.sectie-donker.li-19':
    '<strong>Sentry</strong> (Functional Software Inc.): technical error reports, stored on servers in the EU (Germany).',
  'privacy.sectie-donker.li-20':
    '<strong>Google Analytics 4</strong> (Google Ireland Ltd.): only with your consent, see article 9.',
  'privacy.sectie-donker.recaptcha-melding':
    'To prevent misuse of the game database, <strong>Google reCAPTCHA</strong> (through Firebase App Check) checks whether a request comes from a real visitor of this site. For this, Google processes technical data about your browser and device; Google’s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="link-accent">privacy policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" class="link-accent">terms of service</a> apply.',
  'privacy.sectie-donker.p-9':
    'The fonts on this site are loaded locally, not through Google Fonts. As a result, your IP address is not sent to Google when a page loads.',
  'privacy.sectie-donker.artikel-nummer-8': 'Article 7',
  'privacy.sectie-donker.artikel-titel-8': 'Transfers outside the European Union',
  'privacy.sectie-donker.p-10':
    'Sentry and Google are (partly) American companies. As a result, data may end up in the United States. This only happens with appropriate safeguards: on the basis of the EU-US Data Privacy Framework or the standard contractual clauses of the European Commission.',
  'privacy.sectie-donker.artikel-nummer-9': 'Article 8',
  'privacy.sectie-donker.artikel-titel-9': 'Your rights as a data subject',
  'privacy.sectie-donker.p-11':
    'Under the GDPR you have the following rights. You can exercise them through <a href="mailto:info@bureau-x.be" class="link-accent">info@bureau-x.be</a>. We respond within 30 days.',
  'privacy.sectie-donker.recht-naam':
    '<i class="bi bi-eye me-2" style="opacity: 0.5"></i>Right of access',
  'privacy.sectie-donker.recht-omschrijving': 'You can ask which personal data we keep about you.',
  'privacy.sectie-donker.recht-naam-2':
    '<i class="bi bi-pencil me-2" style="opacity: 0.5"></i>Right to rectification',
  'privacy.sectie-donker.recht-omschrijving-2':
    'You can have incorrect or incomplete data corrected.',
  'privacy.sectie-donker.recht-naam-3':
    '<i class="bi bi-trash me-2" style="opacity: 0.5"></i>Right to erasure',
  'privacy.sectie-donker.recht-omschrijving-3': 'You can ask us to delete your data completely.',
  'privacy.sectie-donker.recht-naam-4':
    '<i class="bi bi-pause-circle me-2" style="opacity: 0.5"></i>Right to restriction',
  'privacy.sectie-donker.recht-omschrijving-4':
    'You can ask us to temporarily stop processing your data, for example while we look into a request for correction.',
  'privacy.sectie-donker.recht-naam-5':
    '<i class="bi bi-slash-circle me-2" style="opacity: 0.5"></i>Right to object',
  'privacy.sectie-donker.recht-omschrijving-5':
    'You can object to processing that is based on our legitimate interest.',
  'privacy.sectie-donker.recht-naam-6':
    '<i class="bi bi-box-arrow-right me-2" style="opacity: 0.5"></i>Right to data portability',
  'privacy.sectie-donker.recht-omschrijving-6':
    'You can request your data in a readable, transferable format.',
  'privacy.sectie-donker.recht-naam-7':
    '<i class="bi bi-arrow-counterclockwise me-2" style="opacity: 0.5"></i>Right to withdraw consent',
  'privacy.sectie-donker.recht-omschrijving-7':
    'If you gave consent, you can always withdraw it. This does not affect processing that has already taken place.',
  'privacy.sectie-donker.mt-3-3':
    'We do not make decisions about you based solely on automated processing.',
  'privacy.sectie-donker.artikel-nummer-10': 'Article 9',
  'privacy.sectie-donker.artikel-titel-10': 'Cookies and analytics',
  'privacy.sectie-donker.p-12':
    '<strong>Necessary.</strong> For the site and the game to work, we store some data in your browser, such as your session code, the role you chose, your anonymous game login, your cookie choice and your language choice. These are needed for the site to work and do not require consent.',
  'privacy.sectie-donker.p-13':
    '<strong>Analytics (only with consent).</strong> If you click "Accept", we use Google Analytics 4 to see which pages are visited, how visitors find us and whether the site works well. Google Analytics places the cookies <code>_ga</code> and <code>_ga_*</code> for this, which are kept for at most 2 years. We do not use Google Analytics for advertising, Google signals are turned off and we do not link the data to your name or email address. If you click "Decline", we do not load Google Analytics at all.',
  'privacy.sectie-donker.p-14':
    'We remember your choice for 6 months. After that, we ask again. You can always change your choice or withdraw your consent through <a href="#" data-cookie-instellingen class="link-accent">Cookie settings</a> (also at the bottom of every page).',
  'privacy.sectie-donker.artikel-nummer-11': 'Article 10',
  'privacy.sectie-donker.artikel-titel-11': 'Minors',
  'privacy.sectie-donker.p-15':
    'If you are younger than 13, ask a parent or guardian to book the session for you and to give consent for cookies or a review. If we notice that we have data of a child under 13 without that consent, we delete it.',
  'privacy.sectie-donker.artikel-nummer-12': 'Article 11',
  'privacy.sectie-donker.artikel-titel-12': 'Complaints',
  'privacy.sectie-donker.p-16':
    'Do you have a complaint about how we handle your data? Feel free to contact us first. You can also always turn to the Belgian supervisory authority:',
  'privacy.sectie-donker.p-17':
    '<strong>Data Protection Authority (Gegevensbeschermingsautoriteit, GBA)</strong><br> Drukpersstraat 35 / Rue de la Presse 35, 1000 Brussels<br> <a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener" class="link-accent">dataprotectionauthority.be</a>',
  'privacy.sectie-donker.artikel-nummer-13': 'Article 12',
  'privacy.sectie-donker.artikel-titel-13': 'Changes to this policy',
  'privacy.sectie-donker.p-18':
    'We may change this privacy policy. The most recent version is always on this page, with the date of the last change in the bar at the top.',
  'privacy.sectie-donker.dossier-footer-note':
    'Bureau X - REF-PRV-01 - Valid under Belgian and European law',
  'privacy.footer.footer-tag':
    'Online escape rooms based on real Belgian stories and unsolved mysteries.',
  'privacy.footer.footer-head': 'Experiences',
  'privacy.footer.footer-head-2': 'Info',
  'privacy.footer.a': 'Contact',
  'privacy.footer.a-2': 'Privacy policy',
  'privacy.footer.a-3': 'Cookie settings',
  'privacy.footer.span': '© 2026 Bureau X',
};

export default en;
