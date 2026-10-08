/**
 * rookproef.ts: controleert elk uur of spelers op de live site nog kunnen
 * beginnen. Draait in GitHub Actions (.github/workflows/rookproef.yml) met
 * dezelfde Firebase-config als de site.
 *
 * Wat het doet, net als een speler:
 *  1. anoniem inloggen (faalt bv. als "Enable create (sign-up)" of de
 *     Anonymous-provider uit staat: auth/admin-restricted-operation);
 *  2. de demo-sessie van Kamer 14 lezen (faalt bij kapotte rules);
 *  3. de net aangemaakte anonieme gebruiker weer verwijderen, zodat er geen
 *     duizenden testgebruikers in Firebase Auth blijven staan.
 *
 * Faalt een stap, dan eindigt het script met code 1. GitHub stuurt bij een
 * mislukte geplande workflow automatisch een mail.
 *
 * Lokaal: VITE_FIREBASE_* in de omgeving zetten en
 *   node --experimental-strip-types scripts/rookproef.ts
 */

export interface RookproefStappen {
  /** Anoniem inloggen; geeft een functie terug om die gebruiker te verwijderen. */
  logIn: () => Promise<() => Promise<void>>;
  /** Een sessie lezen zoals de lobby dat doet. */
  leesSessie: (code: string) => Promise<unknown>;
}

export interface RookproefResultaat {
  ok: boolean;
  stap: 'login' | 'lezen' | 'opruimen' | 'klaar';
  fout?: string;
}

export const ROOKPROEF_SESSIE = 'DEMO-K14';

function foutTekst(err: unknown): string {
  if (err && typeof err === 'object') {
    const { code, message } = err as { code?: unknown; message?: unknown };
    if (typeof code === 'string') return code;
    if (typeof message === 'string') return message;
  }
  return String(err);
}

export async function voerRookproefUit(stappen: RookproefStappen): Promise<RookproefResultaat> {
  let verwijder: () => Promise<void>;
  try {
    verwijder = await stappen.logIn();
  } catch (err) {
    return { ok: false, stap: 'login', fout: foutTekst(err) };
  }

  let resultaat: RookproefResultaat = { ok: true, stap: 'klaar' };
  try {
    await stappen.leesSessie(ROOKPROEF_SESSIE);
  } catch (err) {
    resultaat = { ok: false, stap: 'lezen', fout: foutTekst(err) };
  }

  try {
    await verwijder();
  } catch (err) {
    // Opruimen mislukt is geen storing voor spelers, maar wel melden.
    if (resultaat.ok) resultaat = { ok: false, stap: 'opruimen', fout: foutTekst(err) };
  }
  return resultaat;
}

const UITLEG: Record<RookproefResultaat['stap'], string> = {
  login:
    'Anoniem inloggen mislukt. Spelers kunnen niets opslaan. Kijk in de Firebase-console bij Authentication: staat Anonymous aan, en staat "Enable create (sign-up)" aan?',
  lezen:
    'Inloggen lukt, maar de demo-sessie lezen mislukt. Kijk of de database-rules goed gedeployed zijn.',
  opruimen:
    'Alles werkt voor spelers, maar de testgebruiker kon niet verwijderd worden. Geen spoed.',
  klaar: 'Alles in orde.',
};

export function rapport(r: RookproefResultaat): string {
  return r.ok ? UITLEG.klaar : `${UITLEG[r.stap]} (${r.fout ?? 'onbekende fout'})`;
}

// ── Uitvoeren met de echte Firebase ───────────────────────
async function main(): Promise<void> {
  const [{ initializeApp }, auth, database] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/database'),
  ]);
  const env = process.env;
  const app = initializeApp({
    apiKey: env['VITE_FIREBASE_API_KEY'],
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'],
    databaseURL: env['VITE_FIREBASE_DATABASE_URL'],
    projectId: env['VITE_FIREBASE_PROJECT_ID'],
    appId: env['VITE_FIREBASE_APP_ID'],
  });
  const a = auth.getAuth(app);
  const db = database.getDatabase(app);

  const r = await voerRookproefUit({
    logIn: async () => {
      const { user } = await auth.signInAnonymously(a);
      return () => user.delete();
    },
    leesSessie: code => database.get(database.ref(db, `sessions/${code}/ervaringsId`)),
  });
  console.log(rapport(r));
  database.goOffline(db);
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1]?.endsWith('rookproef.ts')) void main();
