// Gedeelde basis voor de site-pagina's (landing, kamer-14):
// Bootstrap eerst, daarna onze eigen stijl zodat die de cascade wint.
// Game-pagina's gebruiken src/bootstrap.ts + game.css en blijven hier los van.
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import '../css/style.css';
import { toonRecaptchaMeldingen } from '../shared/js/app-check-status.ts';

// reCAPTCHA-melding (o.a. in het privacybeleid) enkel tonen als App Check aanstaat.
toonRecaptchaMeldingen();
