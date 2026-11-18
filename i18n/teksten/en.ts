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
};
