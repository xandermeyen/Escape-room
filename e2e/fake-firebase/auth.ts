/**
 * Nep-Firebase Auth voor de end-to-end-tests. Elke tab krijgt een eigen
 * anonieme gebruiker (sessionStorage), zoals echte spelers op twee toestellen.
 */
export interface User {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
  delete(): Promise<void>;
}

const SLEUTEL = 'e2e-firebase-uid';
let huidig: User | null = null;
const luisteraars = new Set<(u: User | null) => void>();

function maakUser(uid: string, email: string | null = null): User {
  return { uid, isAnonymous: !email, email, delete: async () => undefined };
}

try {
  const uid = sessionStorage.getItem(SLEUTEL);
  if (uid) huidig = maakUser(uid);
} catch {
  // geen sessionStorage: nieuwe gebruiker
}

const auth = {
  get currentUser() {
    return huidig;
  },
};

export function getAuth(): typeof auth {
  return auth;
}

function zetGebruiker(u: User | null): void {
  huidig = u;
  try {
    if (u) sessionStorage.setItem(SLEUTEL, u.uid);
    else sessionStorage.removeItem(SLEUTEL);
  } catch {
    // niet erg in de test
  }
  luisteraars.forEach(cb => cb(u));
}

export function onAuthStateChanged(_a: unknown, cb: (u: User | null) => void): () => void {
  luisteraars.add(cb);
  setTimeout(() => cb(huidig), 0);
  return () => luisteraars.delete(cb);
}

export async function signInAnonymously(): Promise<{ user: User }> {
  const u = maakUser(`anon-${Math.random().toString(36).slice(2, 10)}`);
  zetGebruiker(u);
  return { user: u };
}

export async function signInWithEmailAndPassword(
  _a: unknown,
  email: string,
): Promise<{ user: User }> {
  const u = maakUser(`host-${email}`, email);
  zetGebruiker(u);
  return { user: u };
}

export async function signOut(): Promise<void> {
  zetGebruiker(null);
}
