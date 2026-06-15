/**
 * tijd-voorbij.ts (D.U.A.) — sessie deactiveren zodra de tijd om is.
 */
import '../../../shared/js/sentry.ts';
import { sluitSessie } from '../../../shared/js/session.ts';

const sessie = new URLSearchParams(window.location.search).get('sessie');
if (sessie) {
  sluitSessie(sessie).catch((err: unknown) => {
    console.error('Sessie sluiten mislukt:', err);
  });
}
