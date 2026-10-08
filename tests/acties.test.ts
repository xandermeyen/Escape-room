import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'node:fs';
import { koppelActies, hintBlokVan } from '../shared/js/acties.ts';
import { koppelHints } from '../shared/js/utils.ts';

const root = resolve(__dirname, '..');

describe('koppelActies', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('roept de juiste handler aan, ook voor een klik op een kind van de knop', () => {
    document.body.innerHTML =
      '<button data-actie="kies-rol" data-rol="b"><span id="binnen">B</span></button>';
    const kies = vi.fn();
    const stop = koppelActies({ 'kies-rol': el => kies(el.dataset['rol']) });
    document.getElementById('binnen')!.click();
    expect(kies).toHaveBeenCalledWith('b');
    stop();
    document.getElementById('binnen')!.click();
    expect(kies).toHaveBeenCalledTimes(1);
  });

  it('werkt ook voor knoppen die later in de pagina komen (host-paneel)', () => {
    const deactiveer = vi.fn();
    koppelActies({ deactiveer: el => deactiveer(el.dataset['code']) });
    document.body.innerHTML = `<table><tr><td><button data-actie="deactiveer" data-code="ABC-123">x</button></td></tr></table>`;
    document.querySelector('button')!.click();
    expect(deactiveer).toHaveBeenCalledWith('ABC-123');
  });

  it('negeert onbekende acties', () => {
    document.body.innerHTML = '<button data-actie="bestaat-niet">x</button>';
    expect(() => document.querySelector('button')!.click()).not.toThrow();
  });

  it('hintknoppen vinden hun hint-blok', () => {
    document.body.innerHTML = `
      <div class="hint-blok" id="hint-p3-b">
        <button data-actie="hint">Hint</button>
      </div>`;
    expect(hintBlokVan(document.querySelector('button')!)).toBe('hint-p3-b');
    const opHint = vi.fn();
    koppelHints(opHint);
    document.querySelector('button')!.click();
    expect(opHint).toHaveBeenCalledWith('hint-p3-b');
  });
});

describe('geen onclick meer in de HTML of in gegenereerde HTML', () => {
  const bestanden = [
    ...globSync('experiences/**/*.html', { cwd: root }),
    ...globSync('{shared,experiences}/**/*.ts', { cwd: root }),
    'index.html',
    'kamer-14/index.html',
    'dua/index.html',
    'privacy.html',
  ];

  it.each(bestanden)('%s', bestand => {
    const inhoud = readFileSync(resolve(root, bestand), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(inhoud).not.toMatch(/\sonclick=/);
  });
});
