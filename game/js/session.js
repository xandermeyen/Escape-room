import { db } from './firebase-config.js';
import {
  ref,
  set,
  get,
  update,
  onValue,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Sessie aanmaken (gastheer)
export async function maakSessie(sessieCode) {
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  await set(sessieRef, {
    aangemaakt: serverTimestamp(),
    actief: true,
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
  });
  return sessieCode;
}

// Sessie valideren bij inloggen
export async function valideerSessie(sessieCode) {
  const sessieRef = ref(db, `sessions/${sessieCode}`);
  const snapshot  = await get(sessieRef);
  if (!snapshot.exists()) return false;
  return snapshot.val().actief === true;
}

// Puzzel markeren als voltooid
export function puzzelVoltooid(sessieCode, puzzelNr) {
  const puzzelRef = ref(db, `sessions/${sessieCode}/puzzels/p${puzzelNr}`);
  set(puzzelRef, true);
}

// Live luisteren naar puzzelstatus
export function luisterNaarStatus(sessieCode, callback) {
  const puzzelsRef = ref(db, `sessions/${sessieCode}/puzzels`);
  onValue(puzzelsRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}

// Rapport indienen
export async function diendRapportIn(sessieCode, inhoud) {
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  await update(rapportRef, {
    ingediend: true,
    inhoud: inhoud,
    tijdstip: serverTimestamp(),
  });
}

// Luisteren naar rapport (voor briefkaart reveal)
export function luisterNaarRapport(sessieCode, callback) {
  const rapportRef = ref(db, `sessions/${sessieCode}/rapport`);
  onValue(rapportRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
}