/**
 * Nep-Firebase Realtime Database voor de end-to-end-tests (alleen in
 * vite.e2e.config.ts). Bewaart de hele boom in localStorage, zodat twee
 * tabbladen in dezelfde browser (Speler A en B) dezelfde data zien en live
 * meekrijgen wat de ander schrijft, via het `storage`-event.
 *
 * Ondersteunt enkel wat de site gebruikt: ref, get, set, update, push,
 * onValue, runTransaction, query/orderByChild/equalTo, serverTimestamp en
 * increment. Geen rules: die zijn getest met de echte emulator.
 */
type Boom = Record<string, unknown>;
type Pad = string[];

const SLEUTEL = 'e2e-firebase-db';
const luisteraars = new Set<{
  pad: Pad;
  filter?: Filter;
  cb: (s: Snapshot) => void;
  laatste: string;
}>();

function lees(): Boom {
  try {
    return JSON.parse(localStorage.getItem(SLEUTEL) ?? '{}') as Boom;
  } catch {
    return {};
  }
}

function bewaar(boom: Boom): void {
  localStorage.setItem(SLEUTEL, JSON.stringify(boom));
  meld();
}

const splits = (pad: string): Pad => pad.split('/').filter(Boolean);

function opPad(boom: unknown, pad: Pad): unknown {
  let huidig = boom;
  for (const deel of pad) {
    if (huidig === null || typeof huidig !== 'object') return null;
    huidig = (huidig as Boom)[deel];
  }
  return huidig ?? null;
}

/** Zet de server-waarden om: tijdstempel en increment. */
function resolveer(waarde: unknown, oud: unknown): unknown {
  if (waarde && typeof waarde === 'object') {
    const sv = (waarde as { '.sv'?: unknown })['.sv'];
    if (sv === 'timestamp') return Date.now();
    if (sv && typeof sv === 'object' && 'increment' in sv) {
      return (typeof oud === 'number' ? oud : 0) + Number((sv as { increment: number }).increment);
    }
    const uit: Boom = {};
    for (const [k, v] of Object.entries(waarde as Boom)) {
      const r = resolveer(v, oud && typeof oud === 'object' ? (oud as Boom)[k] : undefined);
      if (r !== null && r !== undefined) uit[k] = r;
    }
    return Object.keys(uit).length ? uit : null;
  }
  return waarde;
}

function zet(boom: Boom, pad: Pad, waarde: unknown): Boom {
  if (pad.length === 0) return (resolveer(waarde, boom) as Boom) ?? {};
  const kopie: Boom = { ...boom };
  const [eerste, ...rest] = pad as [string, ...string[]];
  const kind = (kopie[eerste] && typeof kopie[eerste] === 'object' ? kopie[eerste] : {}) as Boom;
  if (rest.length === 0) {
    const r = resolveer(waarde, kopie[eerste]);
    if (r === null || r === undefined) delete kopie[eerste];
    else kopie[eerste] = r;
  } else {
    const nieuw = zet(kind, rest, waarde);
    if (Object.keys(nieuw).length) kopie[eerste] = nieuw;
    else delete kopie[eerste];
  }
  return kopie;
}

// ── Snapshot ──────────────────────────────────────────────
export class Snapshot {
  readonly key: string | null;
  private readonly waarde: unknown;
  constructor(key: string | null, waarde: unknown) {
    this.key = key;
    this.waarde = waarde;
  }
  val(): unknown {
    return this.waarde === undefined ? null : structuredClone(this.waarde);
  }
  exists(): boolean {
    return this.waarde !== null && this.waarde !== undefined;
  }
  forEach(cb: (kind: Snapshot) => boolean | void): boolean {
    if (!this.waarde || typeof this.waarde !== 'object') return false;
    for (const [k, v] of Object.entries(this.waarde as Boom)) {
      if (cb(new Snapshot(k, v)) === true) return true;
    }
    return false;
  }
}

// ── Refs en queries ───────────────────────────────────────
interface Filter {
  kind?: string;
  gelijk?: unknown;
}
export interface Ref {
  pad: Pad;
  key: string | null;
  filter?: Filter;
}

export function getDatabase(): object {
  return {};
}

export function ref(_db: unknown, pad = ''): Ref {
  const p = splits(pad);
  return { pad: p, key: p[p.length - 1] ?? null };
}

export function orderByChild(kind: string): Filter {
  return { kind };
}
export function equalTo(gelijk: unknown): Filter {
  return { gelijk };
}
export function query(r: Ref, ...filters: Filter[]): Ref {
  return { ...r, filter: Object.assign({}, ...filters) as Filter };
}

function snapshotVan(r: { pad: Pad; filter?: Filter }): Snapshot {
  let waarde = opPad(lees(), r.pad);
  const f = r.filter;
  if (f?.kind && waarde && typeof waarde === 'object') {
    waarde = Object.fromEntries(
      Object.entries(waarde as Boom).filter(
        ([, v]) => v && typeof v === 'object' && (v as Boom)[f.kind as string] === f.gelijk,
      ),
    );
    if (Object.keys(waarde as Boom).length === 0) waarde = null;
  }
  return new Snapshot(r.pad[r.pad.length - 1] ?? null, waarde);
}

// ── Lezen en schrijven ────────────────────────────────────
export async function get(r: Ref): Promise<Snapshot> {
  return snapshotVan(r);
}

export async function set(r: Ref, waarde: unknown): Promise<void> {
  bewaar(zet(lees(), r.pad, waarde));
}

export async function update(r: Ref, waarden: Boom): Promise<void> {
  let boom = lees();
  for (const [sub, waarde] of Object.entries(waarden)) {
    boom = zet(boom, [...r.pad, ...splits(sub)], waarde);
  }
  bewaar(boom);
}

let teller = 0;
export function push(r: Ref, waarde?: unknown): Ref & Promise<Ref> {
  const key = `-e2e${Date.now().toString(36)}${(teller++).toString(36)}`;
  const kind: Ref = { pad: [...r.pad, key], key };
  const klaar = (waarde === undefined ? Promise.resolve() : set(kind, waarde)).then(() => kind);
  return Object.assign(klaar, kind);
}

export async function runTransaction(
  r: Ref,
  fn: (huidig: unknown) => unknown,
): Promise<{ committed: boolean; snapshot: Snapshot }> {
  const nieuw = fn(opPad(lees(), r.pad));
  if (nieuw === undefined) return { committed: false, snapshot: snapshotVan(r) };
  await set(r, nieuw);
  return { committed: true, snapshot: snapshotVan(r) };
}

export function serverTimestamp(): object {
  return { '.sv': 'timestamp' };
}
export function increment(n: number): object {
  return { '.sv': { increment: n } };
}

// ── Live luisteren ────────────────────────────────────────
function meld(): void {
  for (const l of luisteraars) {
    const s = snapshotVan(l);
    const json = JSON.stringify(s.val());
    if (json === l.laatste) continue;
    l.laatste = json;
    l.cb(s);
  }
}

window.addEventListener('storage', e => {
  if (e.key === SLEUTEL) meld();
});

export function onValue(r: Ref, cb: (s: Snapshot) => void): () => void {
  const l = { pad: r.pad, filter: r.filter, cb, laatste: '' };
  luisteraars.add(l);
  queueMicrotask(() => {
    if (!luisteraars.has(l)) return;
    const s = snapshotVan(l);
    l.laatste = JSON.stringify(s.val());
    cb(s);
  });
  return () => luisteraars.delete(l);
}
