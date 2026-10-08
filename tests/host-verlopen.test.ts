import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  get: vi.fn(),
  update: vi.fn(() => Promise.resolve()),
}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {} }));

import { update } from 'firebase/database';
import { maakVerlopenKnop } from '../shared/js/host-verlopen.ts';
import { VERLOOPT_NA_MS } from '../shared/js/host-sessies.ts';
import { DEMO_CODES } from '../shared/js/demo.ts';

const updateMock = update as unknown as ReturnType<typeof vi.fn>;
const oud = Date.now() - VERLOOPT_NA_MS - 60_000;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = `
    <button id="btn-sluit-verlopen" hidden></button>
    <div id="status-verlopen"></div>`;
});

const knop = () => document.getElementById('btn-sluit-verlopen') as HTMLButtonElement;

describe('knop "Verlopen sessies sluiten"', () => {
  it('blijft verborgen zonder verlopen sessies', () => {
    maakVerlopenKnop(() => {}).bijLijst([{ code: 'ABC-234', data: { actief: true } }]);
    expect(knop().hidden).toBe(true);
  });

  it('telt verlopen sessies, demo-sessies niet', () => {
    maakVerlopenKnop(() => {}).bijLijst([
      { code: 'ABC-234', data: { actief: true, geopendOp: oud } },
      { code: DEMO_CODES.dua, data: { actief: true, geopendOp: oud } },
    ]);
    expect(knop().hidden).toBe(false);
    expect(knop().textContent).toBe('Verlopen sessies sluiten (1)');
  });

  it('sluit na bevestiging en herlaadt de lijst', async () => {
    const herlaad = vi.fn();
    vi.stubGlobal('confirm', () => true);
    const v = maakVerlopenKnop(herlaad);
    v.bijLijst([{ code: 'DUA-2026-007', data: { actief: true, geopendOp: oud } }]);
    await v.sluit();
    expect(updateMock).toHaveBeenCalledWith({ path: 'sessions/DUA-2026-007' }, { actief: false });
    expect(herlaad).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('doet niets als de host annuleert', async () => {
    vi.stubGlobal('confirm', () => false);
    const v = maakVerlopenKnop(() => {});
    v.bijLijst([{ code: 'ABC-234', data: { actief: true, geopendOp: oud } }]);
    await v.sluit();
    expect(updateMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it.each(['kamer-14', 'dua'])('staat in het host-paneel van %s', ervaring => {
    const html = readFileSync(
      resolve(__dirname, `../experiences/${ervaring}/host-panel.html`),
      'utf8',
    );
    expect(html).toContain('id="btn-sluit-verlopen"');
    expect(html).toContain('id="status-verlopen"');
    // De opmaak van de badge staat in de gedeelde host-CSS
    expect(html).toContain('shared/css/host.css');
    const css = readFileSync(resolve(__dirname, '../shared/css/host.css'), 'utf8');
    expect(css).toContain('.badge-verlopen');
  });
});
