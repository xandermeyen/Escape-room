import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Nep-Audio: onthoudt welke bestanden geladen en afgespeeld worden.
const geladen: string[] = [];
class NepAudio {
  src: string;
  volume = 1;
  loop = false;
  gepauzeerd = false;
  constructor(src: string) {
    this.src = src;
    geladen.push(src);
  }
  play(): Promise<void> {
    return Promise.resolve();
  }
  pause(): void {
    this.gepauzeerd = true;
  }
  addEventListener(): void {}
}

async function laad(gedempt = false) {
  vi.resetModules();
  localStorage.setItem('dua-mute', gedempt ? '1' : '0');
  return import('../experiences/dua/js/dua-stemmen.ts');
}

beforeEach(() => {
  geladen.length = 0;
  vi.stubGlobal('Audio', NepAudio);
  sessionStorage.clear();
  document.body.innerHTML = '';
  document.documentElement.lang = 'nl';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('D.U.A. stemmen', () => {
  it('elk fragment heeft een Nederlandse en Engelse tekst en spreker', async () => {
    const { STEMMEN } = await laad();
    for (const stem of Object.values(STEMMEN)) {
      expect(stem.tekst.nl.trim()).not.toBe('');
      expect(stem.tekst.en.trim()).not.toBe('');
      expect(stem.spreker.nl.trim()).not.toBe('');
      expect(stem.spreker.en.trim()).not.toBe('');
    }
  });

  it('kiest de taal van de pagina en het juiste bestand', async () => {
    const { taal, stemPad } = await laad();
    expect(taal()).toBe('nl');
    expect(stemPad('intro-1934')).toBe('/audio/dua/stemmen/nl/intro-1934.mp3');
    document.documentElement.lang = 'en-GB';
    expect(taal()).toBe('en');
    expect(stemPad('wachter')).toBe('/audio/dua/stemmen/en/wachter.mp3');
  });

  it('speelt het fragment af met ondertitel en een knop om over te slaan', async () => {
    const { speelStem, stopStem } = await laad();
    speelStem('wachter');
    expect(geladen).toContain('/audio/dua/stemmen/nl/wachter.mp3');
    const el = document.getElementById('stem-ondertitel')!;
    expect(el.hidden).toBe(false);
    expect(el.querySelector('.stem-spreker')!.textContent).toBe('De perronwachter');
    expect(el.querySelector('.stem-tekst')!.textContent).toContain('Hela, gij daar!');
    expect(el.querySelector('.stem-sluit')!.textContent).toBe('Overslaan');
    stopStem();
    expect(el.hidden).toBe(true);
  });

  it('toont in het Engels de Engelse tekst en het Engelse bestand', async () => {
    document.documentElement.lang = 'en';
    const { speelStem } = await laad();
    speelStem('tijd-voorbij');
    expect(geladen).toContain('/audio/dua/stemmen/en/tijd-voorbij.mp3');
    const el = document.getElementById('stem-ondertitel')!;
    expect(el.querySelector('.stem-tekst')!.textContent).toContain("That'll do for today.");
    expect(el.querySelector('.stem-sluit')!.textContent).toBe('Skip');
  });

  it('gedempt: enkel de tekst, geen audio, en die sluit vanzelf', async () => {
    vi.useFakeTimers();
    const { speelStem, leesDuurMs, STEMMEN } = await laad(true);
    speelStem('intro-2034');
    expect(geladen.filter(s => s.includes('/stemmen/'))).toEqual([]);
    const el = document.getElementById('stem-ondertitel')!;
    expect(el.hidden).toBe(false);
    expect(el.querySelector('.stem-sluit')!.textContent).toBe('Sluiten');
    vi.advanceTimersByTime(leesDuurMs(STEMMEN['intro-2034'].tekst.nl) + 10);
    expect(el.hidden).toBe(true);
  });

  it('een eenmalig fragment speelt na een herlaad niet opnieuw', async () => {
    const { speelStem, stopStem } = await laad();
    speelStem('intro-1934', { eenmalig: 'ABC:intro-1934' });
    stopStem();
    geladen.length = 0;
    speelStem('intro-1934', { eenmalig: 'ABC:intro-1934' });
    expect(geladen).toEqual([]);
    expect(document.getElementById('stem-ondertitel')!.hidden).toBe(true);
  });

  it('leestijd is minstens vier seconden en groeit met de tekst', async () => {
    const { leesDuurMs } = await laad();
    expect(leesDuurMs('kort')).toBe(4000);
    expect(leesDuurMs('x'.repeat(300))).toBe(20000);
  });
});
