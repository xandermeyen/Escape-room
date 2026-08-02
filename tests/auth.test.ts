import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Tests voor de anonieme login met herpogingen (auth.ts).
 * De module logt in bij het laden, dus elke test laadt een verse module
 * met eigen mocks (vi.resetModules + vi.doMock + dynamic import).
 */

interface AuthModule {
  authReady: Promise<void>;
  authGelukt: boolean;
}

async function laadAuth(
  signInMock: ReturnType<typeof vi.fn>,
  bestaandeUser: object | null = null,
): Promise<{
  mod: AuthModule;
  captureMock: ReturnType<typeof vi.fn>;
}> {
  vi.resetModules();

  const captureMock = vi.fn();

  vi.doMock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    signInAnonymously: signInMock,
    // Meldt meteen de gegeven gebruiker (of null), zoals de echte SDK doet
    // zodra de eerste auth-statuscheck klaar is.
    onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: object | null) => void) => {
      callback(bestaandeUser);
      return () => {};
    }),
  }));
  vi.doMock('@sentry/browser', () => ({
    captureException: captureMock,
  }));
  vi.doMock('../shared/js/firebase-config.ts', () => ({ app: {}, db: {} }));

  const mod = (await import('../shared/js/auth.ts')) as unknown as AuthModule;
  return { mod, captureMock };
}

afterEach(() => {
  vi.doUnmock('firebase/auth');
  vi.doUnmock('@sentry/browser');
  vi.doUnmock('../shared/js/firebase-config.ts');
});

describe('anonieme login met herpogingen', () => {
  it('zet authGelukt bij een geslaagde eerste poging', async () => {
    const signIn = vi.fn().mockResolvedValue({});
    const { mod } = await laadAuth(signIn);

    await mod.authReady;

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(mod.authGelukt).toBe(true);
  });

  it('probeert opnieuw na een tijdelijke netwerkfout', async () => {
    const signIn = vi
      .fn()
      .mockRejectedValueOnce({ code: 'auth/network-request-failed' })
      .mockResolvedValueOnce({});
    const { mod, captureMock } = await laadAuth(signIn);

    await mod.authReady; // wacht de backoff (400 ms) gewoon af

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(mod.authGelukt).toBe(true);
    expect(captureMock).not.toHaveBeenCalled();
  }, 10_000);

  it('geeft een configfout meteen op en meldt aan Sentry', async () => {
    const signIn = vi.fn().mockRejectedValue({ code: 'auth/operation-not-allowed' });
    const { mod, captureMock } = await laadAuth(signIn);

    await mod.authReady; // resolveert ALTIJD, ook bij een mislukte login

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(mod.authGelukt).toBe(false);
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('geeft op na drie mislukte netwerkpogingen en meldt aan Sentry', async () => {
    const signIn = vi.fn().mockRejectedValue({ code: 'auth/network-request-failed' });
    const { mod, captureMock } = await laadAuth(signIn);

    await mod.authReady;

    expect(signIn).toHaveBeenCalledTimes(3);
    expect(mod.authGelukt).toBe(false);
    expect(captureMock).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('logt niet anoniem in als er al een gebruiker is ingelogd (bv. host-panel)', async () => {
    const signIn = vi.fn().mockResolvedValue({});
    const { mod } = await laadAuth(signIn, { uid: 'host-123' });

    await mod.authReady;

    // De bestaande sessie (host via e-mail/wachtwoord) mag niet overschreven
    // worden door een anonieme login — dat gaf eerder "moet steeds opnieuw
    // inloggen" en soms een permission-denied op het host-panel.
    expect(signIn).not.toHaveBeenCalled();
    expect(mod.authGelukt).toBe(true);
  });
});
