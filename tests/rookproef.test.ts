import { describe, it, expect, vi } from 'vitest';
import { voerRookproefUit, rapport, ROOKPROEF_SESSIE } from '../scripts/rookproef.ts';

const fout = (code: string) => Object.assign(new Error(code), { code });

describe('rookproef', () => {
  it('slaagt als inloggen en lezen lukken, en ruimt de testgebruiker op', async () => {
    const verwijder = vi.fn(() => Promise.resolve());
    const leesSessie = vi.fn(() => Promise.resolve({}));
    const r = await voerRookproefUit({ logIn: async () => verwijder, leesSessie });
    expect(r).toEqual({ ok: true, stap: 'klaar' });
    expect(leesSessie).toHaveBeenCalledWith(ROOKPROEF_SESSIE);
    expect(verwijder).toHaveBeenCalled();
  });

  it('vangt de fout van vanavond: sign-up uit', async () => {
    const r = await voerRookproefUit({
      logIn: () => Promise.reject(fout('auth/admin-restricted-operation')),
      leesSessie: vi.fn(),
    });
    expect(r).toMatchObject({ ok: false, stap: 'login', fout: 'auth/admin-restricted-operation' });
    expect(rapport(r)).toContain('Enable create (sign-up)');
  });

  it('kapotte rules: lezen faalt, maar de testgebruiker wordt toch verwijderd', async () => {
    const verwijder = vi.fn(() => Promise.resolve());
    const r = await voerRookproefUit({
      logIn: async () => verwijder,
      leesSessie: () => Promise.reject(fout('PERMISSION_DENIED')),
    });
    expect(r).toMatchObject({ ok: false, stap: 'lezen' });
    expect(verwijder).toHaveBeenCalled();
    expect(rapport(r)).toContain('rules');
  });

  it('opruimen mislukt: gemeld, maar met de juiste uitleg', async () => {
    const r = await voerRookproefUit({
      logIn: async () => () => Promise.reject(new Error('netwerk')),
      leesSessie: () => Promise.resolve(null),
    });
    expect(r).toMatchObject({ ok: false, stap: 'opruimen', fout: 'netwerk' });
    expect(rapport(r)).toContain('Geen spoed');
  });
});
