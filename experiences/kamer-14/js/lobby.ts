/**
 * lobby.ts (Kamer 14) — dunne configuratie op de gedeelde lobbyflow.
 * Code valideren, rollen live tonen, atomisch claimen en de
 * terugkeer-banner leven in shared/js/lobby-ui.ts.
 */
import '../../../shared/js/sentry.ts';
import { initLobby } from '../../../shared/js/lobby-ui.ts';

initLobby({
  rollen: {
    a: { pagina: 'speler-a.html', naam: 'Speler A (OPZ-dossier)' },
    b: { pagina: 'speler-b.html', naam: 'Speler B (Buurtdossier)' },
  },
});
