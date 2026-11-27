/** Engelse versie van i18n/teksten/nl.ts. TypeScript bewaakt dat alle sleutels er zijn. */
import type { Teksten } from './nl.ts';

export const en: Teksten = {
  cookieTitel: 'May we measure how you use the site?',
  cookieTekst:
    'We would like to use Google Analytics to see which pages are visited and how people find us. ' +
    'That helps us improve the escape rooms and the site. Without your consent we do not place any analytics cookies. More info in our ',
  cookieLink: 'privacy policy',
  cookieWeigeren: 'Decline',
  cookieAccepteren: 'Accept',

  boekFout: 'Your booking couldn’t be sent. Please try again or email info@bureau-x.be.',
  boekBezig: 'Sending…',
  boekStart: 'Start the session',
  linkGekopieerd: 'Copied',

  dossierOpen: 'Read the full case file',
  dossierDicht: 'Hide the case file',

  anoniemeSpeler: 'Anonymous player',
  sterrenLabel: n => `${n} out of 5 stars`,
  reviewsGemiddelde: aantal => `average of ${aantal} reviews`,

  goedertierCitaat: ['"I alone know where the Just Judges rest.', 'This secret will die with me."'],
  goedertierBron: '- Arsène Goedertier, November 1934',

  archiefConsole:
    '\n\nYou search where others don’t look. Good instinct, detective.' +
    '\nThe archive responds to her name. Go on, type it.',
  lenaStempel: 'Missing',
  lenaLabel: 'Archive item B-X/14 · not for publication',
  lenaTitel: 'Have you seen Lena Bogaert?',
  lenaRegels: [
    'Last seen on a Tuesday morning in May, Geel.',
    'Bed made. Coat gone. No note.',
    'If you know something, open case file 14. If you don’t, open it anyway.',
  ],
  lenaSluiten: 'Click to put this archive item back.',

  nfTitelPagina: 'Case file not found | Bureau X',
  nfStempel: 'Not found',
  nfLabel: 'Error 404 · Bureau X archive',
  nfTitel: 'This case file does not exist.',
  nfTekst:
    'Either it was never opened, or someone made it disappear. The address you were looking for leads nowhere. Luckily, the real cases are still waiting for you.',
  nfHome: 'Back to Bureau X',
  nfAndereTaal: 'Page not found.',
  nfAndereTaalLink: 'Go to the English homepage',

  taalSuggestie: 'This page is also available in English.',
  taalSuggestieLink: 'Go to the English version',
  taalSuggestieSluiten: 'Close',
  tellerGroepen: (n: number): [string, string] => [`${n} groups`, ' have already solved a case'],

  spelHintTip: 'Stuck? There are hints below, step by step.',
  spelMeldingSluiten: 'Close message',
  spelHulpKnop: 'Need help?',
  spelSluiten: 'Close',
  spelVerbinding: 'Connection failed. Reload the page to keep playing.',
  demoAria: 'Demo mode: switch role',
  demoLabel: (rol: string): string => `Demo mode · ${rol}`,
  demoWissel: (rol: string): string => `Switch to ${rol}`,
  lobbyEerdereRol: (rol: string): string => `Earlier you chose ${rol}.`,
  lobbyVerder: 'Continue with this role →',
  lobbyGeenCode: 'Enter a valid session code.',
  lobbyControleren: 'Checking…',
  lobbyOngeldig: 'Invalid or inactive code. Check your email.',
  lobbyVerbinding: 'Connection error. Check your internet connection.',
  lobbyRolBezet: 'This role is already taken. Choose another one.',
  lobbyRolVerbinding: 'Connection error. Please try again.',
  reviewEscapetalk: 'A review on escapetalk.nl helps other players find us. ',
  reviewEscapetalkLink: 'Review on escapetalk',
  reviewOokEscapetalkKlembord:
    'Would you also like to post it on escapetalk.nl? Your text is already on your clipboard, just paste it. ',
  reviewOokEscapetalk:
    'Would you also like to post it on escapetalk.nl? That helps other players find us. ',
  reviewBeterLabel: 'What could be better? Optional, only we read this.',
  reviewBeterPlaceholder: 'E.g. a puzzle that was unclear, or something that did not work',
  reviewDemo: 'Demo mode: reviews are not saved.',
  reviewOnvolledig: 'Choose a number of stars first.',
  reviewBezig: 'Sending…',
  reviewVersturen: 'Send review',
  reviewMislukt: 'Sending failed. Please try again.',
  deelGekopieerd: 'Copied. Paste it in your group chat!',
  prestatieSneller: (p: number): string => `Faster than ${p}% of groups.`,
  prestatieBinnenUur: 'You reached the end within the hour. Not every group manages that.',
};
