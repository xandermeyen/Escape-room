import { db } from './firebase-config.ts';
import {
  ref,
  set,
  get,
  update,
  onValue,
  serverTimestamp,
  runTransaction,
} from "firebase/database";
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
  puzzelIds?: string[];
}

export async function maakSessie(
  sessieCode: string,
  opties: MaakSessieOpties = {},
): Promise<boolean> {
  await authReady;
  const {
    ervaringsId = 'kamer-14',
    aantalSpelers,
    puzzelIds = ['p1', 'p2', 'p3', 'p4', 'p5'],
  } = opties;

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

  const sessieRef = ref(db, `sessions/${sessieCode}`);
  const result = await schrijf('maakSessie', runTransaction(sessieRef, (huidig) => {
    if (huidig !== null) return; // bestaat al → transactie afbreken
    return nieuw;
  }));
  return result.committed;
}

// Sessie valideren bij inloggen
export async function valideerSessie(sessieCode: string): Promise<boolean> {
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  const snapshot  = await get(sessieRef);

  if (!snapshot.exists()) return false;
  return snapshot.val().actief === true;
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
  return onValue(puzzelsRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// Rapport indienen
export async function diendRapportIn(sessieCode: string, inhoud: RapportInhoud): Promise<void> {
  await authReady;
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  await schrijf('diendRapportIn', update(rapportRef, {
    ingediend: true,
    inhoud: inhoud,
    tijdstip: serverTimestamp(),
  }));
}

// Luisteren naar rapport (voor briefkaart reveal)
// Geeft de unsubscribe-functie terug
export function luisterNaarRapport(
  sessieCode: string,
  callback: (rapport: RapportData) => void,
): () => void {
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  return onValue(rapportRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// Bewaakt of de sessie nog actief is. Zet de host de sessie op inactief
// (of was ze dat al bij het laden), dan vuurt `opGesloten`. Een natuurlijk
// einde — rapport ingediend, waarna de spelers zelf sluiten — telt niet als
// onderbreking. Geeft de unsubscribe-functie terug.
export function bewaakSessieGesloten(
  sessieCode: string,
  opGesloten: () => void,
): () => void {
  const actiefRef = ref(db, `sessions/${sessieCode}/actief`);
  return onValue(actiefRef, (snapshot) => {
    if (snapshot.val() !== false) return;
    get(ref(db, `sessions/${sessieCode}/rapport/ingediend`))
      .then((r) => {
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
  const result = await schrijf('claimRol', runTransaction(rolRef, (huidig) => {
    if (huidig !== null) return; // undefined = transaction afgebroken
    return 'bezet';
  }));
  return result.committed;
}

// Live luisteren naar welke rollen bezet zijn
// Geeft de unsubscribe-functie terug
export function luisterNaarRollen(
  sessieCode: string,
  callback: (spelers: SpelersStatus) => void,
): () => void {
  const spelersRef = ref(db, `sessions/${sessieCode}/spelers`);
  return onValue(spelersRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}
