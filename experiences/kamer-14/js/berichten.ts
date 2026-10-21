/**
 * berichten.ts: de verhaalfragmenten ook als tekst, zodat wie het geluid mist
 * het verhaal toch krijgt. Drie onderdelen:
 *  - de lijst "Berichten" in de zijbalk met alle fragmenten tot nu toe;
 *  - een ondertitel zolang een fragment speelt;
 *  - een melding bij de start om het geluid aan te zetten.
 *
 * De teksten zijn letterlijk de opnamescripts voor ElevenLabs.
 */
import { FRAGMENT_NA_PUZZEL, type FragmentId } from './audio.ts';

export type Rol = 'a' | 'b';

export const SPREKER: Record<FragmentId, string> = {
  briefing: 'An Vermeersch',
  wending: 'An Vermeersch',
  telefoon: 'Katrijn',
  dagboek: 'Lena',
};

export const FRAGMENT_TEKST: Record<FragmentId, string> = {
  briefing:
    'Goeiemiddag. Met An Vermeersch, OPZ Geel. Bedankt dat Bureau X zo snel kon komen. Lena Bogaert, drieëndertig jaar, kostgangster bij het gezin Martens-Peeters, is vanochtend vertrokken zonder iets te zeggen. Volgens het gastgezin zijn haar kleren mee, maar haar oude gsm ligt nog op haar kamer. Geen briefje. Om vijf uur moet ik beslissen of ik haar als vermist meld. Als ik dat doe, gaat de politie zoeken. Dan is het voor Lena niet meer terug te draaien. Jullie krijgen elk een deel. Eén van jullie zit aan mijn bureau, de ander in haar kamer bij het gastgezin. Zoek uit waar ze is, bij wie, hoe ze er geraakt is en wanneer ze terugkomt. En wees voorzichtig met wat ge vindt.',
  wending:
    'Ik begrijp het niet. Katrijn tekende elke week voor geld dat volgens haar eigen kasboek nooit binnenkwam. Waarom zou ze dat doen? Kijk nog eens naar vanochtend. Er belde ook een buurman.',
  telefoon:
    'An? Met Katrijn. Ge weet het al, hé. Anders belde ge niet zo dikwijls. Ja. Ik heb haar naar de bus gebracht. Om half acht stonden we op de Markt. Ze had haar beste jas aan. Dat geld heb ik teruggegeven. Elke week dat ze het niet nodig had om te leven. Dat was niet slim, ik weet het. Maar ge hebt haar niet gezien, An, al die avonden aan tafel met die tekening. Luc heeft die fiets zaterdag al naar Marie gebracht, dat is waar. Waarom ze ging, moet ze zelf vertellen. Ze schrijft alles op. Ze heeft die bladzijde verscheurd. Ik vond drie stukken achter het nachtkastje, de rest zit in haar map, denk ik. Ze komt terug. Dat heeft ze beloofd.',
  dagboek:
    'Zes mei. Vandaag word je tien. Tien jaar geleden lag ik in kamer veertien en hield ik je vast tot de verpleegster zei dat ik moest slapen. Ik heb niet geslapen. Marie schrijft dat je soms nog naar mij vraagt. Katrijn zegt dat het niet mag, en dat ze me toch naar de bus brengt. Ik weet niet wat ik tegen je ga zeggen. Misschien niets. Misschien kijk ik alleen. Het geld voor de fiets heb ik bij elkaar. Hij is groen, jouw kleur, toen toch. Om vijf over vijf neem ik de bus terug. Dat beloof ik An, al weet ze het nog niet.',
};

/** De voicemail van Marie, in twee delen rond de beiaard. */
export const VOICEMAIL_TEKST = {
  voor: 'Lena, met Marie. Ik heb je briefje gekregen. En ik heb je gezien, vorige dinsdag, op de markt. Ik ben niet kwaad. Ze vraagt nog naar je, weet je dat? Ik mag dit niet doen. Maar op haar verjaardag zijn we op de markt, om…',
  beiaard:
    '(De beiaard speelt een deuntje: do do sol sol la la sol. Een bus rijdt voorbij en overstemt de klokslagen.)',
  na: '…ik zeg niets tegen haar. Als je er bent, ben je er.',
};

/** Welke fragmenten de spelers al gehoord hebben, in volgorde. */
export function gehoordeFragmenten(puzzels: Record<string, boolean>): FragmentId[] {
  const lijst: FragmentId[] = ['briefing'];
  for (const [puzzel, id] of Object.entries(FRAGMENT_NA_PUZZEL)) {
    if (puzzels[puzzel]) lijst.push(id);
  }
  return lijst;
}

// ── Lijst "Berichten" ─────────────────────────────────────

export function toonBerichten(
  puzzels: Record<string, boolean>,
  lijst: HTMLElement | null = document.getElementById('berichten-lijst'),
  opnieuw?: (id: FragmentId) => void,
): void {
  if (!lijst) return;
  lijst.replaceChildren();
  for (const id of gehoordeFragmenten(puzzels).reverse()) {
    const bericht = document.createElement('details');
    bericht.className = `bericht bericht-${id}`;
    const kop = document.createElement('summary');
    kop.textContent = SPREKER[id];
    const tekst = document.createElement('p');
    tekst.textContent = FRAGMENT_TEKST[id];
    bericht.append(kop, tekst);
    if (opnieuw) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'bericht-luister';
      knop.textContent = 'Opnieuw beluisteren';
      knop.addEventListener('click', () => opnieuw(id));
      bericht.append(knop);
    }
    lijst.append(bericht);
  }
}

// ── Ondertitel tijdens het afspelen ───────────────────────

/** Toont de tekst van een fragment zolang het speelt. */
export function toonOndertitel(spreker: string, tekst: string, audio: HTMLAudioElement): void {
  document.getElementById('ondertitel')?.remove();
  const el = document.createElement('div');
  el.id = 'ondertitel';
  el.className = 'ondertitel';
  el.setAttribute('role', 'status');
  const wie = document.createElement('strong');
  wie.textContent = `${spreker}: `;
  el.append(wie, document.createTextNode(tekst));
  document.body.append(el);
  const weg = () => el.remove();
  audio.addEventListener('ended', weg, { once: true });
  audio.addEventListener('error', weg, { once: true });
  audio.addEventListener('pause', weg, { once: true });
}

// ── Geluidsmelding ────────────────────────────────────────

export const GELUIDSMELDING =
  'Kamer 14 heeft stemmen en geluid. Zet je geluid aan. Lukt dat niet, dan lees je alles onder Berichten.';

/**
 * Melding over het geluid (geblokkeerd door de browser of nog niet aan).
 * "Geluid aan" roept `zetAan` op binnen een klik en sluit de melding.
 */
export function toonGeluidsmelding(zetAan: () => void): HTMLElement {
  document.getElementById('geluidsmelding')?.remove();
  const el = document.createElement('div');
  el.id = 'geluidsmelding';
  el.className = 'geluidsmelding';
  el.setAttribute('role', 'status');

  const tekst = document.createElement('p');
  tekst.textContent = GELUIDSMELDING;

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
  document.body.append(el);
  return el;
}
