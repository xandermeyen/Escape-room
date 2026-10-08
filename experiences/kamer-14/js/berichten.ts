/**
 * berichten.ts: de verhaalfragmenten ook als tekst, zodat wie het geluid mist
 * het verhaal toch krijgt. Drie onderdelen:
 *  - de tab "Berichten" met alle fragmenten van de opgeloste puzzels;
 *  - een ondertitel zolang een fragment speelt;
 *  - een melding bij de start (en als het afspelen geblokkeerd wordt).
 *
 * De teksten komen letterlijk uit de opnamescripts. Een lege tekst betekent
 * dat het script nog ontbreekt: dat fragment verschijnt dan niet als bericht.
 */
import { KAMER14_TEKST_PUZZELS, type Kamer14TekstPuzzel } from './kamer14-config.ts';

export type Rol = 'a' | 'b';
export type PuzzelNr = Kamer14TekstPuzzel;

export const PUZZEL_NRS: readonly PuzzelNr[] = KAMER14_TEKST_PUZZELS;

/** Wie spreekt de fragmenten in, per speler. */
export const AFZENDER: Record<Rol, string> = {
  a: 'An Vermeersch',
  b: 'Katrijn',
};

/** Tekst per fragment (audio/an-vermeersch/verhaal-pX.mp3 en audio/katrijn/verhaal-pX.mp3). */
export const KAMER14_BERICHTEN: Record<Rol, Record<PuzzelNr, string>> = {
  a: { p1: '', p2: '', p3: '', p4: '', p5: '' },
  b: { p1: '', p2: '', p3: '', p4: '', p5: '' },
};

export function berichtTekst(rol: Rol, nr: PuzzelNr): string {
  return KAMER14_BERICHTEN[rol][nr].trim();
}

/** Zijn er teksten voor deze speler? Zo niet, dan blijft de tab verborgen. */
export function heeftBerichten(rol: Rol): boolean {
  return PUZZEL_NRS.some(nr => berichtTekst(rol, nr) !== '');
}

/** Berichten die de speler nu mag lezen: opgeloste puzzels met een tekst. */
export function zichtbareBerichten(
  rol: Rol,
  puzzels: Record<string, boolean>,
): { nr: PuzzelNr; tekst: string }[] {
  return PUZZEL_NRS.filter(nr => puzzels[nr] && berichtTekst(rol, nr)).map(nr => ({
    nr,
    tekst: berichtTekst(rol, nr),
  }));
}

// ── Tab "Berichten" ───────────────────────────────────────

export function toonBerichten(
  rol: Rol,
  puzzels: Record<string, boolean>,
  lijst: HTMLElement | null = document.getElementById('berichten-lijst'),
): void {
  if (!lijst) return;
  const berichten = zichtbareBerichten(rol, puzzels);
  lijst.replaceChildren();
  if (berichten.length === 0) {
    const leeg = document.createElement('p');
    leeg.className = 'berichten-leeg';
    leeg.textContent = `Nog geen berichten. Na elke opgeloste vraag komt hier een bericht van ${AFZENDER[rol]}.`;
    lijst.append(leeg);
    return;
  }
  for (const { nr, tekst } of berichten) {
    const bericht = document.createElement('div');
    bericht.className = 'notitie bericht';
    const kop = document.createElement('div');
    kop.className = 'notitie-datum';
    kop.textContent = `${AFZENDER[rol]} · na vraag ${nr.slice(1)}`;
    const inhoud = document.createElement('div');
    inhoud.className = 'doc-tekst';
    inhoud.textContent = tekst;
    bericht.append(kop, inhoud);
    lijst.append(bericht);
  }
}

// ── Ondertitel tijdens het afspelen ───────────────────────

/** Toont de tekst van een fragment zolang het speelt. */
export function toonOndertitel(rol: Rol, nr: PuzzelNr, audio: HTMLAudioElement): void {
  const tekst = berichtTekst(rol, nr);
  if (!tekst) return;
  document.getElementById('ondertitel')?.remove();
  const el = document.createElement('div');
  el.id = 'ondertitel';
  el.className = 'ondertitel';
  el.setAttribute('role', 'status');
  const wie = document.createElement('strong');
  wie.textContent = `${AFZENDER[rol]}: `;
  el.append(wie, document.createTextNode(tekst));
  document.body.append(el);
  const weg = () => el.remove();
  audio.addEventListener('ended', weg, { once: true });
  audio.addEventListener('error', weg, { once: true });
  audio.addEventListener('pause', weg, { once: true });
}

// ── Geluidsmelding ────────────────────────────────────────

export function geluidsmeldingTekst(rol: Rol): string {
  const basis = `Na elke opgeloste vraag hoor je een bericht van ${AFZENDER[rol]}. Zet je geluid aan.`;
  return heeftBerichten(rol)
    ? `${basis} Lukt dat niet, dan lees je alles in de tab Berichten.`
    : basis;
}

/**
 * Melding bovenaan: geluid staat uit of is (nog) geblokkeerd door de browser.
 * "Geluid aan" roept `zetAan` op (start de audio binnen een klik) en sluit.
 */
export function toonGeluidsmelding(rol: Rol, zetAan: () => void): HTMLElement {
  document.getElementById('geluidsmelding')?.remove();
  const el = document.createElement('div');
  el.id = 'geluidsmelding';
  el.className = 'geluidsmelding';
  el.setAttribute('role', 'status');

  const tekst = document.createElement('p');
  tekst.textContent = geluidsmeldingTekst(rol);

  const aan = document.createElement('button');
  aan.type = 'button';
  aan.className = 'geluid-aan';
  aan.textContent = 'Geluid aan';
  aan.addEventListener('click', () => {
    zetAan();
    el.remove();
  });

  const sluit = document.createElement('button');
  sluit.type = 'button';
  sluit.className = 'geluid-sluit';
  sluit.textContent = 'Sluiten';
  sluit.addEventListener('click', () => el.remove());

  el.append(tekst, aan, sluit);
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.insertAdjacentElement('beforebegin', el);
  else document.body.prepend(el);
  return el;
}
