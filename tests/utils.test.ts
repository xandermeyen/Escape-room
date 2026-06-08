import { describe, it, expect, vi, beforeEach } from 'vitest';
import { controleerAntwoordHash, volgendHint } from '../shared/js/utils.ts';

// ── controleerAntwoordHash ────────────────────────────────────────────────────

describe('controleerAntwoordHash', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input  id="inp" value="" />
      <div    id="fb"></div>
      <button id="btn"></button>
    `;
  });

  it('roept onJuist aan bij correct antwoord', async () => {
    // SHA-256 van 'hello' = 2cf24dba...
    (document.getElementById('inp') as HTMLInputElement).value = 'hello';

    const hashes = { p1: ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'] };
    const onJuist = vi.fn();

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, onJuist, 'Fout');

    expect(onJuist).toHaveBeenCalledOnce();
  });

  it('toont "Correct" feedback bij goed antwoord', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = 'hello';

    const hashes = { p1: ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'] };

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, vi.fn(), 'Fout');

    expect(document.getElementById('fb')!.textContent).toContain('Correct');
  });

  it('roept onJuist NIET aan bij fout antwoord', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = 'foutantwoord';

    const onJuist = vi.fn();
    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', { p1: ['abc'] }, onJuist, 'Niet correct.');

    expect(onJuist).not.toHaveBeenCalled();
  });

  it('toont foutTekst bij fout antwoord', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = 'foutantwoord';

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', { p1: ['abc'] }, vi.fn(), 'Probeer opnieuw.');

    expect(document.getElementById('fb')!.textContent).toBe('Probeer opnieuw.');
  });

  it('doet niets bij leeg invoerveld', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = '   '; // alleen spaties

    const onJuist = vi.fn();
    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', {}, onJuist, 'Fout');

    expect(onJuist).not.toHaveBeenCalled();
  });

  it('is hoofdletter-onafhankelijk', async () => {
    // 'HELLO' moet matchen met de hash van 'hello'
    (document.getElementById('inp') as HTMLInputElement).value = 'HELLO';

    const hashes = { p1: ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'] };
    const onJuist = vi.fn();

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, onJuist, 'Fout');

    expect(onJuist).toHaveBeenCalledOnce();
  });

  it('negeert spaties voor en achter het antwoord', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = '  hello  ';

    const hashes = { p1: ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'] };
    const onJuist = vi.fn();

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, onJuist, 'Fout');

    expect(onJuist).toHaveBeenCalledOnce();
  });

  it('accepteert meerdere geldige hashes per puzzel', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = 'world';
    // SHA-256 van 'world' = 486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7
    const hashes = {
      p1: [
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824', // hello
        '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7', // world
      ],
    };
    const onJuist = vi.fn();

    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, onJuist, 'Fout');

    expect(onJuist).toHaveBeenCalledOnce();
  });

  it('schakelt de knop uit na correct antwoord', async () => {
    (document.getElementById('inp') as HTMLInputElement).value = 'hello';

    const hashes = { p1: ['2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'] };
    await controleerAntwoordHash('p1', 'inp', 'fb', 'btn', hashes, vi.fn(), 'Fout');

    expect((document.getElementById('btn') as HTMLButtonElement).disabled).toBe(true);
  });
});


// ── volgendHint ───────────────────────────────────────────────────────────────

describe('volgendHint', () => {
  it('maakt de eerste verborgen hint zichtbaar', () => {
    document.body.innerHTML = `
      <div id="blok">
        <div class="hint-stap verborgen">Hint 1</div>
        <div class="hint-stap verborgen">Hint 2</div>
        <button class="hint-knop">Hint aanvragen</button>
        <button class="hint-verder verborgen">Volgende aanwijzing</button>
      </div>
    `;

    volgendHint('blok');

    const stappen = document.querySelectorAll('.hint-stap');
    expect(stappen[0]!.classList.contains('verborgen')).toBe(false);
    expect(stappen[1]!.classList.contains('verborgen')).toBe(true);
  });

  it('toont de "volgende"-knop zolang er nog hints zijn', () => {
    document.body.innerHTML = `
      <div id="blok">
        <div class="hint-stap verborgen">Hint 1</div>
        <div class="hint-stap verborgen">Hint 2</div>
        <button class="hint-knop">Hint aanvragen</button>
        <button class="hint-verder verborgen">Volgende aanwijzing</button>
      </div>
    `;

    volgendHint('blok');

    expect(document.querySelector('.hint-verder')!.classList.contains('verborgen')).toBe(false);
  });

  it('verbergt de "volgende"-knop als alle hints getoond zijn', () => {
    document.body.innerHTML = `
      <div id="blok">
        <div class="hint-stap verborgen">Hint 1</div>
        <button class="hint-knop">Hint aanvragen</button>
        <button class="hint-verder verborgen">Volgende aanwijzing</button>
      </div>
    `;

    volgendHint('blok');

    expect(document.querySelector('.hint-verder')!.classList.contains('verborgen')).toBe(true);
  });

  it('verbergt de initiële hint-knop bij de eerste aanvraag', () => {
    document.body.innerHTML = `
      <div id="blok">
        <div class="hint-stap verborgen">Hint 1</div>
        <button class="hint-knop">Hint aanvragen</button>
        <button class="hint-verder verborgen">Volgende aanwijzing</button>
      </div>
    `;

    volgendHint('blok');

    expect(document.querySelector('.hint-knop')!.classList.contains('verborgen')).toBe(true);
  });

  it('gooit geen fout als het element niet bestaat', () => {
    expect(() => volgendHint('niet-bestaand')).not.toThrow();
  });

  it('doet niets als alle hints al getoond zijn', () => {
    document.body.innerHTML = `
      <div id="blok">
        <div class="hint-stap">Hint 1 (al zichtbaar)</div>
        <button class="hint-verder verborgen">Volgende aanwijzing</button>
      </div>
    `;

    // Tweede aanroep moet geen wijzigingen doen
    volgendHint('blok');

    expect(document.querySelector('.hint-stap')!.classList.contains('verborgen')).toBe(false);
  });
});
