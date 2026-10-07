// @vitest-environment node
/**
 * Tests voor firebase/database.rules.json tegen de Realtime Database-emulator.
 *
 * Draaien: `pnpm test:rules` (start de emulator via firebase-tools en voert
 * dit bestand uit). Zonder emulator (gewone `pnpm test`) wordt alles
 * overgeslagen, zodat de snelle testsuite geen Java nodig heeft.
 */
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const EMULATOR = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const SV_NU = { '.sv': 'timestamp' };
const CODE = 'ABC-234';
const HOST_UID = 'host-uid';

type Db = ReturnType<ReturnType<RulesTestEnvironment['unauthenticatedContext']>['database']>;

let env: RulesTestEnvironment;

function basisSessie(extra: Record<string, unknown> = {}) {
  return {
    aangemaakt: 1_700_000_000_000,
    actief: true,
    ervaringsId: 'kamer-14',
    puzzels: { p1: false, p2: false, p3: false, p4: false, p5: false },
    rapport: { ingediend: false },
    ...extra,
  };
}

/** Database als niet-ingelogde bezoeker. */
const anoniemLoos = (): Db => env.unauthenticatedContext().database();
/** Database als anoniem ingelogde speler. */
const speler = (uid = 'speler-1'): Db =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).database();
/** Database als host (staat in beheerders/). */
const host = (): Db =>
  env.authenticatedContext(HOST_UID, { firebase: { sign_in_provider: 'password' } }).database();
/** Iemand die zelf een e-mail/wachtwoord-account aanmaakte, maar geen beheerder is. */
const vreemdeWachtwoordGebruiker = (): Db =>
  env.authenticatedContext('vreemd', { firebase: { sign_in_provider: 'password' } }).database();

async function seed(pad: string, waarde: unknown): Promise<void> {
  await env.withSecurityRulesDisabled(async ctx => {
    await ctx.database().ref(pad).set(waarde);
  });
}

describe.skipIf(!EMULATOR)('database.rules.json', () => {
  beforeAll(async () => {
    const [host_, port] = (EMULATOR ?? 'localhost:9000').split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-bureau-x',
      database: {
        rules: readFileSync('firebase/database.rules.json', 'utf8'),
        host: host_,
        port: Number(port),
      },
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  beforeEach(async () => {
    await env.clearDatabase();
    await seed(`beheerders/${HOST_UID}`, true);
    await seed(`sessions/${CODE}`, basisSessie());
  });

  // ── Toegang in het algemeen ─────────────────────────────
  describe('toegang', () => {
    it('zonder login kan niemand schrijven', async () => {
      await assertFails(anoniemLoos().ref(`sessions/${CODE}/puzzels/p1`).set(true));
    });

    it('een losse sessie is leesbaar (lobby valideert de code)', async () => {
      await assertSucceeds(anoniemLoos().ref(`sessions/${CODE}`).get());
    });

    it('de volledige sessielijst is alleen voor beheerders', async () => {
      await assertFails(speler().ref('sessions').get());
      await assertFails(vreemdeWachtwoordGebruiker().ref('sessions').get());
      await assertSucceeds(host().ref('sessions').get());
    });

    it('beheerders/ is niet schrijfbaar vanuit de client', async () => {
      await assertFails(vreemdeWachtwoordGebruiker().ref('beheerders/vreemd').set(true));
      await assertFails(host().ref('beheerders/iemand').set(true));
    });
  });

  // ── Sessies aanmaken en verwijderen ─────────────────────
  describe('sessies beheren', () => {
    it('een speler kan geen sessie aanmaken of verwijderen', async () => {
      await assertFails(speler().ref('sessions/NIEUW-1').set(basisSessie()));
      await assertFails(speler().ref(`sessions/${CODE}`).remove());
      await assertFails(speler().ref(`sessions/${CODE}/puzzels`).remove());
    });

    it('een wachtwoordgebruiker die geen beheerder is, kan geen sessie aanmaken', async () => {
      await assertFails(vreemdeWachtwoordGebruiker().ref('sessions/NIEUW-1').set(basisSessie()));
    });

    it('een beheerder (ook Make.com) kan een sessie aanmaken en verwijderen', async () => {
      await assertSucceeds(
        host()
          .ref('sessions/A3F9C20')
          .set({
            aangemaakt: SV_NU,
            actief: true,
            ervaringsId: 'kamer-14',
            puzzels: { p1: false, p2: false, p3: false, p4: false, p5: false },
            rapport: { ingediend: false, inhoud: {} },
            timerGestart: null,
          }),
      );
      await assertSucceeds(host().ref('sessions/A3F9C20').remove());
    });

    it('een nieuwe sessie moet de verplichte velden hebben', async () => {
      await assertFails(host().ref('sessions/NIEUW-2').set({ actief: true }));
    });

    it('een ongeldige code wordt geweigerd', async () => {
      await assertFails(host().ref('sessions/kleine-letters').set(basisSessie()));
    });

    it('onbekende velden worden geweigerd', async () => {
      await assertFails(host().ref(`sessions/${CODE}/hack`).set(true));
    });
  });

  // ── Velden die spelers zetten ───────────────────────────
  describe('puzzels', () => {
    it('een speler mag een puzzel van false naar true zetten', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/puzzels/p1`).set(true));
    });

    it('maar niet terug naar false', async () => {
      await seed(`sessions/${CODE}/puzzels/p1`, true);
      await assertFails(speler().ref(`sessions/${CODE}/puzzels/p1`).set(false));
    });

    it('een nieuwe puzzel mag als false aangemaakt worden (D.U.A. p0)', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/puzzels/p0`).set(false));
    });

    it('niet in een sessie die niet bestaat', async () => {
      await assertFails(speler().ref('sessions/BESTAAT-NIET/puzzels/p1').set(true));
      await assertFails(speler().ref('sessions/BESTAAT-NIET/stats/p1/fout').set(1));
    });

    it('alleen p0 tot p5 en alleen booleans', async () => {
      await assertFails(speler().ref(`sessions/${CODE}/puzzels/p9`).set(true));
      await assertFails(speler().ref(`sessions/${CODE}/puzzels/p2`).set('ja'));
    });
  });

  describe('vaste velden', () => {
    it('aangemaakt, ervaringsId en aantalSpelers zijn niet aan te passen door spelers', async () => {
      await assertFails(speler().ref(`sessions/${CODE}/aangemaakt`).set(1));
      await assertFails(speler().ref(`sessions/${CODE}/ervaringsId`).set('dua'));
      await assertFails(speler().ref(`sessions/${CODE}/aantalSpelers`).set(4));
    });

    it('een speler mag een sessie sluiten, niet heropenen', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/actief`).set(false));
      await assertFails(speler().ref(`sessions/${CODE}/actief`).set(true));
    });

    it('timerGestart: één keer, en alleen met de servertijd', async () => {
      await assertFails(speler().ref(`sessions/${CODE}/timerGestart`).set(123));
      await assertSucceeds(speler().ref(`sessions/${CODE}/timerGestart`).set(SV_NU));
      await assertFails(speler().ref(`sessions/${CODE}/timerGestart`).set(SV_NU));
    });

    it('geopendOp: één keer, en alleen met de servertijd', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/geopendOp`).set(SV_NU));
      await assertFails(speler().ref(`sessions/${CODE}/geopendOp`).set(SV_NU));
    });
  });

  describe('rollen', () => {
    it('een rol kan één keer geclaimd worden', async () => {
      await assertSucceeds(speler('a').ref(`sessions/${CODE}/spelers/a`).set('bezet'));
      await assertFails(speler('b').ref(`sessions/${CODE}/spelers/a`).set('bezet'));
    });

    it('alleen een beheerder kan rollen vrijgeven', async () => {
      await seed(`sessions/${CODE}/spelers/a`, 'bezet');
      await assertFails(speler().ref(`sessions/${CODE}/spelers`).remove());
      await assertSucceeds(host().ref(`sessions/${CODE}/spelers`).remove());
    });
  });

  describe('rapport', () => {
    const rapport = {
      ingediend: true,
      inhoud: { bestemming: 'Diest', wie: 'x', vervoer: 'bus', tijdstip: '00:00' },
      tijdstip: SV_NU,
    };

    it('een speler kan het rapport één keer indienen', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/rapport`).update(rapport));
      await assertFails(speler().ref(`sessions/${CODE}/rapport`).update(rapport));
      await assertFails(speler().ref(`sessions/${CODE}/rapport/inhoud/wie`).set('ander'));
    });

    it('het rapport kan niet terug op niet-ingediend', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/rapport`).update(rapport));
      await assertFails(speler().ref(`sessions/${CODE}/rapport/ingediend`).set(false));
    });

    it('onbekende rapportvelden worden geweigerd', async () => {
      await assertFails(
        speler()
          .ref(`sessions/${CODE}/rapport`)
          .update({ ...rapport, inhoud: { iets: 'x' } }),
      );
    });
  });

  // ── Speldata ────────────────────────────────────────────
  describe('speldata', () => {
    const pad = `sessions/${CODE}/stats/p1`;

    it('start en opgelost: één keer, met servertijd', async () => {
      await assertFails(speler().ref(`${pad}/start`).set(123));
      await assertSucceeds(speler().ref(`${pad}/start`).set(SV_NU));
      await assertFails(speler().ref(`${pad}/start`).set(SV_NU));
      await assertSucceeds(speler().ref(`${pad}/opgelost`).set(SV_NU));
    });

    it('tellers gaan per 1 omhoog, nooit omlaag of met sprongen', async () => {
      await assertSucceeds(
        speler()
          .ref(`${pad}/fout`)
          .set({ '.sv': { increment: 1 } }),
      );
      await assertSucceeds(
        speler()
          .ref(`${pad}/fout`)
          .set({ '.sv': { increment: 1 } }),
      );
      await assertFails(speler().ref(`${pad}/fout`).set(50));
      await assertFails(speler().ref(`${pad}/fout`).set(1));
      await assertFails(speler().ref(`${pad}/fout`).remove());
    });

    it('hintstappen per rol: alleen stijgend, maximaal 10', async () => {
      await assertSucceeds(speler().ref(`${pad}/hints/a`).set(2));
      await assertFails(speler().ref(`${pad}/hints/a`).set(1));
      await assertFails(speler().ref(`${pad}/hints/b`).set(11));
      await assertFails(speler().ref(`${pad}/hints/Rol-X`).set(1));
    });

    it('geen onbekende velden of puzzels', async () => {
      await assertFails(speler().ref(`${pad}/naam`).set('Jan'));
      await assertFails(speler().ref(`sessions/${CODE}/stats/p9/start`).set(SV_NU));
    });

    it('zonder login geen speldata', async () => {
      await assertFails(anoniemLoos().ref(`${pad}/start`).set(SV_NU));
    });
  });

  // ── D.U.A. ──────────────────────────────────────────────
  describe('D.U.A.', () => {
    const dua = {
      p0zegel: false,
      brief: { letters: '', verstuurd: false },
      brief14: { tekst: '', klaar: false },
      meta: { verdenking: 0, strafMs: 0, hints: 0 },
    };

    beforeEach(async () => {
      await seed(`sessions/${CODE}/ervaringsId`, 'dua');
    });

    it('een speler kan de dua-node één keer klaarzetten', async () => {
      await assertSucceeds(speler().ref(`sessions/${CODE}/dua`).set(dua));
      await assertFails(speler().ref(`sessions/${CODE}/dua`).set(dua));
      await assertFails(speler().ref(`sessions/${CODE}/dua`).remove());
    });

    it('een nieuw vel mag zolang P1 niet opgelost is', async () => {
      await seed(`sessions/${CODE}/dua`, dua);
      const brief = { letters: '1,2,3,4,5', verstuurd: true };
      await assertSucceeds(speler().ref(`sessions/${CODE}/dua/brief`).set(brief));
      await seed(`sessions/${CODE}/puzzels/p1`, true);
      await assertFails(
        speler().ref(`sessions/${CODE}/dua/brief`).set({ letters: '', verstuurd: false }),
      );
    });

    it('het kluisnummer is twee cijfers en ligt daarna vast', async () => {
      await seed(`sessions/${CODE}/dua`, dua);
      await assertFails(speler().ref(`sessions/${CODE}/dua/kluisNummer`).set('abc'));
      await assertSucceeds(speler().ref(`sessions/${CODE}/dua/kluisNummer`).set('13'));
      await assertFails(speler().ref(`sessions/${CODE}/dua/kluisNummer`).set('14'));
    });

    it('verstopplek: alleen gekende plekken, en 2034 mag ze wissen tot P4 klaar is', async () => {
      await seed(`sessions/${CODE}/dua`, dua);
      await assertFails(speler().ref(`sessions/${CODE}/dua/verstopPlek`).set('kelder'));
      await assertSucceeds(speler().ref(`sessions/${CODE}/dua/verstopPlek`).set('kast'));
      await assertSucceeds(speler().ref(`sessions/${CODE}/dua/verstopPlek`).remove());
      await seed(`sessions/${CODE}/dua/verstopPlek`, 'schouw');
      await seed(`sessions/${CODE}/puzzels/p4`, true);
      await assertFails(speler().ref(`sessions/${CODE}/dua/verstopPlek`).remove());
    });

    it('tijdstraf en hintteller kunnen alleen stijgen', async () => {
      await seed(`sessions/${CODE}/dua`, {
        ...dua,
        meta: { verdenking: 60, strafMs: 300000, hints: 3 },
      });
      await assertSucceeds(
        speler()
          .ref(`sessions/${CODE}/dua/meta`)
          .set({ verdenking: 70, strafMs: 300000, hints: 4 }),
      );
      await assertFails(
        speler().ref(`sessions/${CODE}/dua/meta`).set({ verdenking: 0, strafMs: 0, hints: 0 }),
      );
      await assertFails(
        speler()
          .ref(`sessions/${CODE}/dua/meta`)
          .set({ verdenking: 150, strafMs: 300000, hints: 4 }),
      );
    });

    it('brief 14 kan niet meer gewijzigd worden na verzegelen', async () => {
      await seed(`sessions/${CODE}/dua`, dua);
      await assertSucceeds(
        speler()
          .ref(`sessions/${CODE}/dua/brief14`)
          .set({ tekst: 'Aan wie dit vindt', klaar: true }),
      );
      await assertFails(
        speler().ref(`sessions/${CODE}/dua/brief14`).set({ tekst: 'anders', klaar: true }),
      );
    });
  });

  // ── Reviews ─────────────────────────────────────────────
  describe('reviews', () => {
    const review = {
      rating: 5,
      tekst: 'Top!',
      ervaring: 'kamer-14',
      tijdstip: Date.now(),
      goedgekeurd: false,
    };

    it('zonder login kan je geen review schrijven', async () => {
      await assertFails(anoniemLoos().ref('reviews/r1').set(review));
    });

    it('een speler schrijft een review, maar keurt ze niet zelf goed', async () => {
      await assertSucceeds(speler().ref('reviews/r1').set(review));
      await assertFails(
        speler()
          .ref('reviews/r2')
          .set({ ...review, goedgekeurd: true }),
      );
      await assertFails(speler().ref('reviews/r1/goedgekeurd').set(true));
    });

    it('een bestaande review kan niet overschreven of verwijderd worden', async () => {
      await seed('reviews/r1', review);
      await assertFails(
        speler()
          .ref('reviews/r1')
          .set({ ...review, rating: 1 }),
      );
      await assertFails(speler().ref('reviews/r1').remove());
    });

    it('alleen een beheerder keurt goed', async () => {
      await seed('reviews/r1', review);
      await assertFails(vreemdeWachtwoordGebruiker().ref('reviews/r1/goedgekeurd').set(true));
      await assertSucceeds(host().ref('reviews/r1/goedgekeurd').set(true));
    });

    it('een lage review mag een verbeterpunt bevatten', async () => {
      await assertSucceeds(
        speler()
          .ref('reviews/r3')
          .set({ ...review, rating: 2, verbeter: 'P3 was vaag' }),
      );
    });

    it('publiek ziet alleen goedgekeurde reviews', async () => {
      await seed('reviews/r1', review);
      await assertFails(anoniemLoos().ref('reviews').get());
      await assertSucceeds(
        anoniemLoos().ref('reviews').orderByChild('goedgekeurd').equalTo(true).get(),
      );
      await assertSucceeds(host().ref('reviews').get());
    });
  });

  // ── Verdeling (sneller dan X%) ──────────────────────────
  describe('verdeling', () => {
    const verdeling = { duren: [1_200_000, 1_800_000], bijgewerkt: SV_NU };

    it('iedereen mag de tijden lezen', async () => {
      await assertSucceeds(anoniemLoos().ref('verdeling/kamer-14').get());
    });

    it('alleen een beheerder zet de tijden klaar', async () => {
      await assertFails(speler().ref('verdeling/kamer-14').set(verdeling));
      await assertSucceeds(host().ref('verdeling/kamer-14').set(verdeling));
    });

    it('enkel getallen, geen sessiecodes', async () => {
      await assertFails(
        host()
          .ref('verdeling/kamer-14')
          .set({ duren: { 'ABC-234': 1200000 }, bijgewerkt: SV_NU }),
      );
      await assertFails(
        host()
          .ref('verdeling/kamer-14')
          .set({ ...verdeling, codes: 'ABC-234' }),
      );
    });
  });

  // ── Demomodus ───────────────────────────────────────────
  describe('demo', () => {
    it('alleen een beheerder zet een sessie in demomodus', async () => {
      await assertFails(speler().ref(`sessions/${CODE}/demo`).set(true));
      await assertSucceeds(host().ref(`sessions/${CODE}/demo`).set(true));
    });

    it('in een demo-sessie wordt geen speldata bewaard', async () => {
      await seed(`sessions/${CODE}/demo`, true);
      await assertFails(speler().ref(`sessions/${CODE}/stats/p1/start`).set(SV_NU));
      await assertFails(speler().ref(`sessions/${CODE}/stats/p1/hints/a`).set(1));
    });

    it('een beheerder kan de demo wissen en opnieuw aanmaken', async () => {
      await assertSucceeds(host().ref(`sessions/${CODE}`).set(null));
      await assertSucceeds(
        host()
          .ref(`sessions/${CODE}`)
          .set(basisSessie({ demo: true })),
      );
    });
  });
});
