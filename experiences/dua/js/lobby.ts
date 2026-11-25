/**
 * lobby.ts (D.U.A.) — dunne configuratie op de gedeelde lobbyflow, plus de
 * D.U.A.-specifieke regels: de dua-node klaarzetten na validatie en bewaken
 * dat het aantal spelers klopt én elk tijdperk minstens één speler krijgt.
 */
import '../../../shared/js/sentry.ts';
import { haalAantalSpelers } from '../../../shared/js/session.ts';
import { initLobby } from '../../../shared/js/lobby-ui.ts';
import { initDua } from './dua-session.ts';
import { startDua, volgSessieTaal } from './dua-start.ts';
import { tekst, vul } from './dua-tekst.ts';

// Eerst de taal van de sessie en de vertaalde pagina, dan pas de rest (ADR-001, G1).
await startDua();

const ERA: Record<string, '1934' | '2034'> = {
  schrijver: '1934',
  loper: '1934',
  archivaris: '2034',
  restaurateur: '2034',
};

// Sessies zonder aantalSpelers (oudere of Make.com-sessies) krijgen geen limiet.
let aantalSpelers = 4;

type Rol = keyof ReturnType<typeof tekst>['lobby']['rol'];
const ROLLEN: Record<Rol, { pagina: string; naam: string }> = {
  schrijver: { pagina: 'speler-1934.html', naam: tekst().lobby.rol.schrijver },
  loper: { pagina: 'speler-1934.html', naam: tekst().lobby.rol.loper },
  archivaris: { pagina: 'speler-2034.html', naam: tekst().lobby.rol.archivaris },
  restaurateur: { pagina: 'speler-2034.html', naam: tekst().lobby.rol.restaurateur },
};

initLobby({
  metRolParam: true,
  rollen: ROLLEN,
  naValidatie: async code => {
    // Een Engelse sessie in een Nederlandse lobby: de lobby vertaalt mee.
    if (await volgSessieTaal(code).catch(() => false)) {
      for (const rol of Object.keys(ROLLEN) as Rol[]) ROLLEN[rol].naam = tekst().lobby.rol[rol];
    }
    await initDua(code); // dua-node klaarzetten (idempotent)
    aantalSpelers = (await haalAantalSpelers(code).catch(() => null)) ?? 4;
  },
  magClaimen: (rol, spelers) => {
    const bezet = Object.keys(ERA).filter(r => spelers[r] === 'bezet');
    if (bezet.length >= aantalSpelers) {
      return tekst().lobby.vol;
    }
    // Er moet minstens één onderzoeker in elk tijdperk staan.
    const andereEra = ERA[rol] === '1934' ? '2034' : '1934';
    const andereEraBezet = bezet.some(r => ERA[r] === andereEra);
    const plaatsenOver = aantalSpelers - bezet.length - 1;
    if (!andereEraBezet && plaatsenOver < 1) {
      return vul(tekst().lobby.houdVrij, { era: andereEra });
    }
    return null;
  },
});
