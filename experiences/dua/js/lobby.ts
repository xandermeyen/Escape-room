/**
 * lobby.ts (D.U.A.) — dunne configuratie op de gedeelde lobbyflow, plus de
 * D.U.A.-specifieke regels: de dua-node klaarzetten na validatie en bewaken
 * dat het aantal spelers klopt én elk tijdperk minstens één speler krijgt.
 */
import '../../../shared/js/sentry.ts';
import { haalAantalSpelers } from '../../../shared/js/session.ts';
import { initLobby } from '../../../shared/js/lobby-ui.ts';
import { initDua } from './dua-session.ts';

const ERA: Record<string, '1934' | '2034'> = {
  schrijver: '1934',
  loper: '1934',
  archivaris: '2034',
  restaurateur: '2034',
};

// Sessies zonder aantalSpelers (oudere of Make.com-sessies) krijgen geen limiet.
let aantalSpelers = 4;

initLobby({
  metRolParam: true,
  rollen: {
    schrijver: { pagina: 'speler-1934.html', naam: 'De Schrijver (1934)' },
    loper: { pagina: 'speler-1934.html', naam: 'De Loper (1934)' },
    archivaris: { pagina: 'speler-2034.html', naam: 'De Archivaris (2034)' },
    restaurateur: { pagina: 'speler-2034.html', naam: 'De Restaurateur (2034)' },
  },
  naValidatie: async (code) => {
    await initDua(code); // dua-node klaarzetten (idempotent)
    aantalSpelers = (await haalAantalSpelers(code).catch(() => null)) ?? 4;
  },
  magClaimen: (rol, spelers) => {
    const bezet = Object.keys(ERA).filter((r) => spelers[r] === 'bezet');
    if (bezet.length >= aantalSpelers) {
      return 'Alle plaatsen van deze sessie zijn al ingenomen.';
    }
    // Er moet minstens één onderzoeker in elk tijdperk staan.
    const andereEra = ERA[rol] === '1934' ? '2034' : '1934';
    const andereEraBezet = bezet.some((r) => ERA[r] === andereEra);
    const plaatsenOver = aantalSpelers - bezet.length - 1;
    if (!andereEraBezet && plaatsenOver < 1) {
      return `Houd deze plek vrij: er moet minstens één speler in ${andereEra} staan.`;
    }
    return null;
  },
});
