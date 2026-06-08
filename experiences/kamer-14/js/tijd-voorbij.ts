import '../../../shared/js/sentry.ts';
import { sluitSessie } from '../../../shared/js/session.ts';

const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (sessie) {
  sluitSessie(sessie).catch((err: unknown) => {
    console.error('sluitSessie mislukt:', err);
  });
}
