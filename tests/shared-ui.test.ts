import { describe, it, expect, vi, beforeEach } from 'vitest';
import { escHtml, foutTekst, kopieerNaarKlembord } from '../shared/js/host-ui.ts';
import { requireEl } from '../shared/js/utils.ts';

describe('escHtml', () => {
  it('escapet de gevaarlijke HTML-tekens', () => {
    expect(escHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('laat gewone tekst ongemoeid', () => {
    expect(escHtml('DUA-2026-001')).toBe('DUA-2026-001');
  });
});

describe('foutTekst', () => {
  it('geeft de message van een Error', () => {
    expect(foutTekst(new Error('stuk'))).toBe('stuk');
  });

  it('zet een niet-Error om naar string', () => {
    expect(foutTekst('gewoon tekst')).toBe('gewoon tekst');
    expect(foutTekst(42)).toBe('42');
  });
});

describe('requireEl', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('geeft het element terug als het bestaat', () => {
    document.body.innerHTML = '<div id="x"></div>';
    expect(requireEl('x').id).toBe('x');
  });

  it('gooit een duidelijke fout als het element ontbreekt', () => {
    expect(() => requireEl('weg')).toThrow(/#weg/);
  });
});

describe('kopieerNaarKlembord', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('schrijft de tekst naar het klembord', async () => {
    await kopieerNaarKlembord('hallo');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hallo');
  });

  it('zet tijdelijk een vinkje-icoon op de knop', async () => {
    document.body.innerHTML = '<button id="b"><i class="bi bi-copy"></i></button>';
    const knop = document.getElementById('b')!;
    await kopieerNaarKlembord('x', knop);
    expect(knop.querySelector('i')!.className).toBe('bi bi-check2');
  });
});
