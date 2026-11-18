/** Privacybeleid (/privacy.html): zelfde menu als de landingspagina's. */
import { koppelGsmMenu, koppelNavbar } from './landing.ts';
import { toonRecaptchaMeldingen } from '../shared/js/app-check-status.ts';

koppelNavbar();
koppelGsmMenu();
// De reCAPTCHA-paragraaf in artikel 6 enkel tonen als App Check aanstaat.
toonRecaptchaMeldingen();
