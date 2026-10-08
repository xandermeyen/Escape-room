import { db } from './firebase-config.ts';
import { ref, set, get, update, onValue, serverTimestamp, runTransaction } from 'firebase/database';
import { authReady } from './auth.ts';
import { schrijf } from './verbinding.ts';

export interface RapportInhoud {
  bestemming: string;
  wie: string;
  vervoer: string;
  tijdstip: string;
}

interface RapportData {
  ingediend?: boolean;
  inhoud?: Partial<RapportInhoud>;
  tijdstip?: number;
}

type PuzzelStatus = Record<string, boolean>;
type SpelersStatus = Record<string, string>;

// Sessie deactiveren (na afloop van het spel)
export async function sluitSessie(sessieCode: string): Promise<void> {
  await authReady;
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  await schrijf('sluitSessie', update(sessieRef, { actief: false }));
}

// Sessie aanmaken (gastheer)
// Loopt via een transactie zodat twee hosts nooit dezelfde code kunnen
// overschrijven. Geeft false terug als de code al bestond.
export interface MaakSessieOpties {
  ervaringsId?: string;
  aantalSpelers?: number;
  /** Puzzels van deze experience, uit de config (KAMER14_PUZZELS, DUA_PUZZELS). */
  puzzelIds: string[];
  /** Demo-sessie (zie demo.ts): telt niet mee in speldata en statistieken. */
  demo?: boolean;
}

export async function maakSessie(sessieCode: string, opties: MaakSessieOpties): Promise<boolean> {
  await authReady;
  const { ervaringsId = 'kamer-14', aantalSpelers, puzzelIds, demo } = opties;

  const puzzels: Record<string, boolean> = {};
  for (const id of puzzelIds) puzzels[id] = false;

  const nieuw: Record<string, unknown> = {
    aangemaakt: serverTimestamp(),
    actief: true,
    ervaringsId,
    puzzels,
    rapport: {
      ingediend: false,
      inhoud: {},
    },
    timerGestart: null, // Wordt gezet door timer.ts zodra de eerste speler de game laadt
  };
  if (aantalSpelers) nieuw.aantalSpelers = aantalSpelers;
  if (demo) nieuw.demo = true;

  const sessieRef = ref(db, `sessions/${sessieCode}`);
  const result = await schrijf(
    'maakSessie',
    runTransaction(sessieRef, huidig => {
      if (huidig !== null) return; // bestaat al → transactie afbreken
      return nieuw;
    }),
  );
  return result.committed;
}

// ── Sessiecode normaliseren ───────────────────────────────
// Codes komen vaak via copy-paste uit een e-mail: met spaties, een lang
// streepje (–) of onzichtbare tekens. Die maken we hier gelijk, zodat een
// geldige code niet als "ongeldig" wordt geweigerd.
const GELDIGE_CODE = /^[A-Z0-9-]{3,20}$/;

export function normaliseerSessieCode(invoer: string): string {
  return invoer
    .normalize('NFKC')
    .replace(/\p{Cf}/gu, '') // zero-width e.d.
    .replace(/\s+/g, '') // ook spaties midden in de code
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // streepjes → koppelteken
    .toUpperCase();
}

// Sessie valideren bij inloggen
export async function valideerSessie(sessieCode: string): Promise<boolean> {
  // Een punt, #, $, [ of / in het pad laat Firebase een fout gooien; zo'n
  // code kan sowieso niet bestaan (zie database.rules.json).
  if (!GELDIGE_CODE.test(sessieCode)) return false;
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  const snapshot = await get(sessieRef);

  if (!snapshot.exists()) return false;
  return snapshot.val().actief === true;
}

/**
 * zoekSessieCode: normaliseert de invoer en zoekt de actieve sessie.
 * Wie het koppelteken vergeet ("ABC234" i.p.v. "ABC-234"), wordt ook
 * gevonden: we proberen dan ook de vorm met een koppelteken op elke
 * overgang tussen letters en cijfers. Geeft de echte code terug, of null.
 */
export async function zoekSessieCode(invoer: string): Promise<string | null> {
  const code = normaliseerSessieCode(invoer);
  const kandidaten = [code];
  if (!code.includes('-')) {
    const metKoppelteken = code.replace(/([A-Z])(?=\d)/g, '$1-').replace(/(\d)(?=[A-Z])/g, '$1-');
    if (metKoppelteken !== code) kandidaten.push(metKoppelteken);
  }
  for (const kandidaat of kandidaten) {
    if (await valideerSessie(kandidaat)) return kandidaat;
  }
  return null;
}

/**
 * markeerGeopend: bewaart het moment waarop een code de lobby voor het
 * eerst opent (sessions/<code>/geopendOp). Faalt stil: dit is statistiek
 * voor het host-paneel en mag een speler nooit blokkeren, ook niet zolang
 * de nieuwe database-regel nog niet gedeployed is.
 */
export async function markeerGeopend(sessieCode: string): Promise<void> {
  try {
    await authReady;
    const geopendRef = ref(db, `sessions/${sessieCode}/geopendOp`);
    const snap = await get(geopendRef);
    if (snap.exists()) return;
    await set(geopendRef, serverTimestamp());
  } catch (err) {
    console.warn('geopendOp bewaren mislukt:', err);
  }
}

/**
 * geefRollenVrij (host): maakt alle rollen van een sessie weer vrij. Voor
 * een groep die op een ander toestel verder wil en op "rol al bezet" botst.
 */
export async function geefRollenVrij(sessieCode: string): Promise<void> {
  await authReady;
  await schrijf('geefRollenVrij', set(ref(db, `sessions/${sessieCode}/spelers`), null));
}

/**
 * resetDemo (host): verwijdert de demo-sessie volledig en maakt ze opnieuw
 * aan met demo: true. Twee stappen: eerst wissen, dan aanmaken, zodat er
 * geen oude speldata, rollen of D.U.A.-toestand blijft hangen.
 */
export async function resetDemo(sessieCode: string, opties: MaakSessieOpties): Promise<void> {
  await authReady;
  await schrijf('resetDemo', set(ref(db, `sessions/${sessieCode}`), null));
  const ok = await maakSessie(sessieCode, { ...opties, demo: true });
  if (!ok) throw new Error('Demo-sessie opnieuw aanmaken mislukt');
}

// Puzzel markeren als voltooid
export async function puzzelVoltooid(sessieCode: string, puzzelNr: number): Promise<void> {
  await authReady;
  const puzzelRef = ref(db, `sessions/${sessieCode}/puzzels/p${puzzelNr}`);
  // schrijf() toont de balk + meldt aan Sentry; we slikken het opnieuw gooien
  // zodat een mislukte markering de klik-handler niet onderbreekt.
  await schrijf(`puzzelVoltooid p${puzzelNr}`, set(puzzelRef, true)).catch(() => {});
}

// Live luisteren naar puzzelstatus
// Geeft de unsubscribe-functie terug
export function luisterNaarStatus(
  sessieCode: string,
  callback: (puzzels: PuzzelStatus) => void,
): () => void {
  const puzzelsRef = ref(db, `sessions/${sessieCode}/puzzels`);
  return onValue(puzzelsRef, snapshot => {
    callback(snapshot.val() || {});
  });
}

// Rapport indienen
export async function diendRapportIn(sessieCode: string, inhoud: RapportInhoud): Promise<void> {
  await authReady;
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  await schrijf(
    'diendRapportIn',
    update(rapportRef, {
      ingediend: true,
      inhoud: inhoud,
      tijdstip: serverTimestamp(),
    }),
  );
}

// Luisteren naar rapport (voor briefkaart reveal)
// Geeft de unsubscribe-functie terug
export function luisterNaarRapport(
  sessieCode: string,
  callback: (rapport: RapportData) => void,
): () => void {
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  return onValue(rapportRef, snapshot => {
    callback(snapshot.val() || {});
  });
}

// Bewaakt of de sessie nog actief is. Zet de host de sessie op inactief
// (of was ze dat al bij het laden), dan vuurt `opGesloten`. Een natuurlijk
// einde — rapport ingediend, waarna de spelers zelf sluiten — telt niet als
// onderbreking. Geeft de unsubscribe-functie terug.
export function bewaakSessieGesloten(sessieCode: string, opGesloten: () => void): () => void {
  const actiefRef = ref(db, `sessions/${sessieCode}/actief`);
  return onValue(actiefRef, snapshot => {
    if (snapshot.val() !== false) return;
    get(ref(db, `sessions/${sessieCode}/rapport/ingediend`))
      .then(r => {
        if (r.val() !== true) opGesloten();
      })
      .catch(() => opGesloten());
  });
}

// Aantal spelers van een sessie (D.U.A.: 2–4). Null als het niet gezet is.
export async function haalAantalSpelers(sessieCode: string): Promise<number | null> {
  const snap = await get(ref(db, `sessions/${sessieCode}/aantalSpelers`));
  const waarde = snap.val();
  return typeof waarde === 'number' ? waarde : null;
}

// Tijden ophalen voor de eindstatistieken
export interface SessieTijden {
  timerGestart: number | null;
  rapportTijdstip: number | null;
}

export async function haalTijden(sessieCode: string): Promise<SessieTijden> {
  const snapshot = await get(ref(db, `sessions/${sessieCode}`));
  const data = snapshot.val() || {};
  return {
    timerGestart: data.timerGestart ?? null,
    rapportTijdstip: data.rapport?.tijdstip ?? null,
  };
}

// Rol atomisch claimen — voorkomt dat twee spelers dezelfde rol kiezen
// Geeft true terug als claimen gelukt is, false als de rol al bezet was
export async function claimRol(sessieCode: string, rol: string): Promise<boolean> {
  await authReady;
  const rolRef = ref(db, `sessions/${sessieCode}/spelers/${rol}`);
  const result = await schrijf(
    'claimRol',
    runTransaction(rolRef, huidig => {
      if (huidig !== null) return; // undefined = transaction afgebroken
      return 'bezet';
    }),
  );
  return result.committed;
}

// Live luisteren naar welke rollen bezet zijn
// Geeft de unsubscribe-functie terug
export function luisterNaarRollen(
  sessieCode: string,
  callback: (spelers: SpelersStatus) => void,
): () => void {
  const spelersRef = ref(db, `sessions/${sessieCode}/spelers`);
  return onValue(spelersRef, snapshot => {
    callback(snapshot.val() || {});
  });
}
