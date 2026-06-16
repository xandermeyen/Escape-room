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
export async function maakSessie(sessieCode: string, ervaringsId: string = 'kamer-14'): Promise<string> {
  await authReady;
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  await schrijf('maakSessie', set(sessieRef, {
    aangemaakt: serverTimestamp(),
    actief: true,
    ervaringsId,
    puzzels: {
      p1: false,
      p2: false,
      p3: false,
      p4: false,
      p5: false,
    },
    rapport: {
      ingediend: false,
      inhoud: {},
    },
    timerGestart: null, // Wordt gezet door timer.js zodra de eerste speler de game laadt
  }));
  return sessieCode;
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
export function luisterNaarRapport(
  sessieCode: string,
  callback: (rapport: RapportData) => void,
): void {
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  onValue(rapportRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
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
