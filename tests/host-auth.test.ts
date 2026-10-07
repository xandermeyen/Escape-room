import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(),
}));

vi.mock('../shared/js/firebase-config.ts', () => ({ app: {}, db: {} }));

import { get } from 'firebase/database';
import type { User } from 'firebase/auth';
import { isBeheerder, magHostPaneelZien } from '../shared/js/host-auth.ts';

const getMock = get as unknown as ReturnType<typeof vi.fn>;
const gebruiker = (uid: string, isAnonymous = false) => ({ uid, isAnonymous }) as User;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isBeheerder', () => {
  it('true als beheerders/<uid> op true staat', async () => {
    getMock.mockResolvedValue({ val: () => true });
    expect(await isBeheerder('host')).toBe(true);
    expect(getMock).toHaveBeenCalledWith({ path: 'beheerders/host' });
  });

  it('false als de uid ontbreekt', async () => {
    getMock.mockResolvedValue({ val: () => null });
    expect(await isBeheerder('vreemd')).toBe(false);
  });

  it('false als het lezen geweigerd wordt', async () => {
    getMock.mockRejectedValue(new Error('permission_denied'));
    expect(await isBeheerder('vreemd')).toBe(false);
  });
});

describe('magHostPaneelZien', () => {
  it('niemand ingelogd: nee', async () => {
    expect(await magHostPaneelZien(null)).toBe(false);
  });

  it('anonieme speler: nee, zonder de database te bevragen', async () => {
    expect(await magHostPaneelZien(gebruiker('speler', true))).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it('wachtwoordaccount zonder beheerdersrecht: nee', async () => {
    getMock.mockResolvedValue({ val: () => null });
    expect(await magHostPaneelZien(gebruiker('vreemd'))).toBe(false);
  });

  it('beheerder: ja', async () => {
    getMock.mockResolvedValue({ val: () => true });
    expect(await magHostPaneelZien(gebruiker('host'))).toBe(true);
  });
});
