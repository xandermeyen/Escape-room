import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Kamer 14, einde: de foute rapporten tellen voor de hele sessie (Firebase,
 * rapport/fouten). Beide spelers hebben samen twee kansen en zien hetzelfde
 * einde, ook wie zelf niets fout indiende.
 */
type Rapport = { ingediend?: boolean; fouten?: number; inhoud?: { conclusie?: string } } | null;
let rapportLuisteraars: ((r: Rapport) => void)[] = [];
const diendRapportIn = vi.fn(() => Promise.resolve());
const sluitSessie = vi.fn(() => Promise.resolve());
const registreerFoutRapport = vi.fn((sessie: string) => Promise.resolve(sessie ? 1 : 0));

vi.mock('../shared/js/sentry.ts', () => ({}));
vi.mock('../shared/js/firebase-config.ts', () => ({ db: {}, app: {} }));
vi.mock('../shared/js/auth.ts', () => ({ authReady: Promise.resolve() }));
vi.mock('../shared/js/meet.ts', () => ({ meetSpel: () => {} }));
vi.mock('../shared/js/session.ts', () => ({
  luisterNaarRapport: (_s: string, cb: (r: Rapport) => void) => rapportLuisteraars.push(cb),
  diendRapportIn: (...args: unknown[]) => diendRapportIn(...(args as [])),
  sluitSessie: (...args: unknown[]) => sluitSessie(...(args as [])),
  registreerFoutRapport: (s: string) => registreerFoutRapport(s),
  haalTijden: () => Promise.resolve({}),
}));
vi.mock('../shared/js/review-form.ts', () => ({ koppelReviewFormulier: () => {} }));
vi.mock('../shared/js/deel.ts', () => ({ koppelDeelKnop: () => {} }));
vi.mock('../shared/js/verdeling.ts', () => ({
  haalDuren: () => Promise.resolve([]),
  percentielSneller: () => null,
  prestatieTekst: () => null,
}));
vi.mock('../experiences/kamer-14/js/audio.ts', () => ({
  speelStem: () => ({ addEventListener: () => {}, pause: () => {} }),
  hervatAudio: () => {},
}));

const html = readFileSync(resolve(__dirname, '../experiences/kamer-14/einde.html'), 'utf8');
const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? '').replace(
  /<script[\s\S]*?<\/script>/g,
  '',
);

const FOUT = { bestemming: 'Hasselt', wie: 'haar dochter Noor', vervoer: 'bus', tijdstip: '17u51' };
const actief = () => document.querySelector('.einde-scherm.actief')?.id;
const waarschuwingZichtbaar = () =>
  document.getElementById('an-waarschuwing')!.classList.contains('zichtbaar');
const eindeTitel = () => document.getElementById('einde-titel')?.textContent;
const meldRapport = (r: Rapport) => rapportLuisteraars.forEach(cb => cb(r));

let teller = 0;
async function laadPagina(): Promise<void> {
  teller += 1;
  window.history.replaceState({}, '', `/experiences/kamer-14/einde.html?sessie=GED-${teller}`);
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  document.body.innerHTML = body;
  rapportLuisteraars = [];
  vi.resetModules();
  await import('../experiences/kamer-14/js/einde.ts');
}

async function dienFoutIn(): Promise<void> {
  for (const [id, waarde] of Object.entries(FOUT)) {
    (document.getElementById(`r-${id}`) as HTMLInputElement).value = waarde;
  }
  (document.querySelector('input[name="keuze"][value="morgen"]') as HTMLInputElement).click();
  document.getElementById('btn-indienen')!.click();
  await vi.waitFor(() => expect(registreerFoutRapport).toHaveBeenCalled());
  await new Promise(r => setTimeout(r, 20));
}

describe('Kamer 14 einde: foute rapporten tellen per sessie', () => {
  beforeEach(() => {
    sessionStorage.clear();
    diendRapportIn.mockClear();
    sluitSessie.mockClear();
    registreerFoutRapport.mockReset();
  });

  it('eerste fout rapport van de sessie: waarschuwing, geen einde', async () => {
    await laadPagina();
    registreerFoutRapport.mockResolvedValue(1);
    await dienFoutIn();
    expect(waarschuwingZichtbaar()).toBe(true);
    expect(actief()).not.toBe('scherm-einde');
    expect(sluitSessie).not.toHaveBeenCalled();
  });

  it('de andere speler diende al een fout rapport in: één fout van mij is genoeg voor Vermist', async () => {
    await laadPagina();
    registreerFoutRapport.mockResolvedValue(2);
    await dienFoutIn();
    expect(actief()).toBe('scherm-einde');
    expect(eindeTitel()).toBe('Vermist');
    expect(sluitSessie).toHaveBeenCalled();
    expect(diendRapportIn).not.toHaveBeenCalled();
  });

  it('wie zelf niets fout deed, ziet de waarschuwing van An als de ander faalt', async () => {
    await laadPagina();
    meldRapport({ ingediend: false, fouten: 1 });
    expect(waarschuwingZichtbaar()).toBe(true);
    expect(actief()).not.toBe('scherm-einde');
  });

  it('wie zelf niets fout deed, krijgt ook Vermist na twee foute rapporten', async () => {
    await laadPagina();
    meldRapport({ ingediend: false, fouten: 2 });
    expect(actief()).toBe('scherm-einde');
    expect(eindeTitel()).toBe('Vermist');
  });

  it('na Vermist kan deze speler niet alsnog een rapport indienen', async () => {
    await laadPagina();
    meldRapport({ ingediend: false, fouten: 2 });
    document.getElementById('btn-indienen')!.click();
    await new Promise(r => setTimeout(r, 20));
    expect(diendRapportIn).not.toHaveBeenCalled();
    expect(registreerFoutRapport).not.toHaveBeenCalled();
  });

  it('zonder verbinding telt het toestel zelf verder (twee keer fout is Vermist)', async () => {
    await laadPagina();
    registreerFoutRapport.mockRejectedValue(new Error('offline'));
    await dienFoutIn();
    expect(waarschuwingZichtbaar()).toBe(true);
    registreerFoutRapport.mockClear();
    await dienFoutIn();
    expect(eindeTitel()).toBe('Vermist');
  });
});
