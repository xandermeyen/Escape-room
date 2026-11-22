/**
 * dua-stemmen.ts — de ingesproken fragmenten van D.U.A. (ElevenLabs).
 *
 * Regels (zie het audioplan): geen puzzelinfo die je alleen kan horen,
 * altijd ondertiteld, overslaan kan, en de sfeerlaag gaat zachter zolang
 * er iemand spreekt. Is het geluid gedempt, dan verschijnt enkel de tekst.
 * Bestanden: public/audio/dua/stemmen/<nl|en>/<id>.mp3.
 */
import { AUDIO_PAD, duckSfeer, isGedempt, speel } from './dua-audio.ts';

export type Taal = 'nl' | 'en';
export type StemId =
  'intro-1934' | 'intro-2034' | 'wachter' | 'finale-1934' | 'finale-2034' | 'tijd-voorbij';

type Tekst = Record<Taal, string>;

const STEM_UIT_DE_DOOS: Tekst = { nl: 'Een stem uit de doos', en: 'A voice from the box' };
const BUREAU_X: Tekst = { nl: 'Bureau X', en: 'Bureau X' };
const PERRONWACHTER: Tekst = { nl: 'De perronwachter', en: 'The platform guard' };

export const STEMMEN: Record<StemId, { spreker: Tekst; tekst: Tekst }> = {
  'intro-1934': {
    spreker: STEM_UIT_DE_DOOS,
    tekst: {
      nl: 'Goed, ge zijt binnen. De koster heeft zijn ronde gedaan en komt niet meer terug voor zes uur. Het paneel hangt waar het altijd hangt, maar ge moogt het niet aanraken voor de andere kant zegt dat het veilig is. Wat ge vannacht doet, gaat iemand over honderd jaar terugvinden. Laat dus niets liggen dat ge niet wilt dat ze vinden.',
      en: "Right, you're in. The sexton finished his round and won't be back before six. The panel is hanging where it always hangs, but don't you touch it until the other side tells you it's safe. Whatever you do tonight, someone is going to find it a hundred years from now. So don't leave anything behind you wouldn't want them to find.",
    },
  },
  'intro-2034': {
    spreker: BUREAU_X,
    tekst: {
      nl: 'Goedenavond. Jullie zitten op het dossier van de Rechtvaardige Rechters, het paneel dat in 1934 uit de Sint-Baafskathedraal verdween. Er is vorige week een nieuwe brief opgedoken in het archief, en die lijkt te verwijzen naar dingen die nog moeten gebeuren. We weten niet hoe dat kan. Kijk wat jullie ermee kunnen.',
      en: "Good evening. You're on the Just Judges file, the panel that disappeared from Saint Bavo's Cathedral in 1934. Last week a new letter turned up in the archive, and it seems to refer to things that haven't happened yet. We don't know how that's possible. See what you can make of it.",
    },
  },
  wachter: {
    spreker: PERRONWACHTER,
    tekst: {
      nl: 'Hela, gij daar! Wat zijt ge aan die kasten aan het doen? Ge hebt daar niets te zoeken, mannekes.',
      en: "Oi, you there! What are you doing at those lockers? You've no business there, lads.",
    },
  },
  'finale-1934': {
    spreker: STEM_UIT_DE_DOOS,
    tekst: {
      nl: 'Het is gedaan. Het paneel ligt op een plek waar niemand het gaat zoeken, en de politie gaat in december overal kijken behalve daar. Er moet nog één ding gebeuren. Schrijf de laatste brief, maar schrijf hem niet voor de bisschop. Schrijf hem voor wie hem binnen honderd jaar openmaakt, want die gaat maar weten waar te beginnen als gij het vertelt.',
      en: "It's done. The panel is somewhere nobody will think to look, and come December the police will search everywhere but there. There's one thing left to do. Write the last letter, but don't write it for the bishop. Write it for whoever opens it a hundred years from now, because they'll only know where to start if you tell them.",
    },
  },
  'finale-2034': {
    spreker: BUREAU_X,
    tekst: {
      nl: 'We hebben de brief uit het archief nog eens naast jullie notities gelegd. Het is hetzelfde handschrift, en het is dezelfde brief die dit dossier vorige week heeft geopend. Hij is geschreven door de mensen die we zochten. Dat waren jullie dus zelf. Ik weet eerlijk gezegd niet goed hoe ik dat in het rapport moet zetten.',
      en: "We laid the letter from the archive next to your notes again. It's the same handwriting, and it's the same letter that opened this file last week. It was written by the people we were looking for. Which means it was you all along. Honestly, I'm not sure how to put that in the report.",
    },
  },
  'tijd-voorbij': {
    spreker: BUREAU_X,
    tekst: {
      nl: 'Het is goed geweest voor vandaag. We sluiten het dossier voorlopig weer af. Misschien vindt iemand anders ooit wat jullie gemist hebben.',
      en: "That'll do for today. We're closing the file again for now. Maybe someone else will one day find what you missed.",
    },
  },
};

const OVERSLAAN: Tekst = { nl: 'Overslaan', en: 'Skip' };
const SLUITEN: Tekst = { nl: 'Sluiten', en: 'Close' };

/** Taal van de pagina (<html lang>), standaard Nederlands. */
export function taal(): Taal {
  return document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'nl';
}

export function stemPad(id: StemId, t: Taal = taal()): string {
  return `${AUDIO_PAD}/stemmen/${t}/${id}.mp3`;
}

/** Leestijd voor de ondertitel zonder geluid: ongeveer 15 tekens per seconde. */
export function leesDuurMs(tekst: string): number {
  return Math.max(4000, Math.round((tekst.length / 15) * 1000));
}

let audio: HTMLAudioElement | null = null;
let sluitTimer: ReturnType<typeof setTimeout> | null = null;
let wachtOpKlik: (() => void) | null = null;

function ondertitelEl(): HTMLElement {
  let el = document.getElementById('stem-ondertitel');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'stem-ondertitel';
  el.className = 'stem-ondertitel';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.hidden = true;
  const spreker = document.createElement('div');
  spreker.className = 'stem-spreker';
  const tekst = document.createElement('p');
  tekst.className = 'stem-tekst';
  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'stem-sluit';
  knop.addEventListener('click', () => stopStem());
  el.append(spreker, tekst, knop);
  document.body.appendChild(el);
  return el;
}

/** Stopt de stem die nu speelt en verbergt de ondertitel. */
export function stopStem(): void {
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (sluitTimer) clearTimeout(sluitTimer);
  sluitTimer = null;
  if (wachtOpKlik) {
    document.removeEventListener('pointerdown', wachtOpKlik);
    document.removeEventListener('keydown', wachtOpKlik);
    wachtOpKlik = null;
  }
  duckSfeer(false);
  const el = document.getElementById('stem-ondertitel');
  if (el) el.hidden = true;
}

function alGespeeld(sleutel: string): boolean {
  try {
    return sessionStorage.getItem(`dua-stem:${sleutel}`) === '1';
  } catch {
    return false;
  }
}

function markeer(sleutel: string): void {
  try {
    sessionStorage.setItem(`dua-stem:${sleutel}`, '1');
  } catch {
    /* privémodus: dan horen ze het na een herlaad opnieuw */
  }
}

/**
 * Speelt een fragment met ondertitel. `eenmalig` (bv. sessiecode + id)
 * zorgt dat een herlaad een intro niet opnieuw afspeelt.
 */
export function speelStem(id: StemId, opties: { eenmalig?: string } = {}): void {
  if (opties.eenmalig) {
    if (alGespeeld(opties.eenmalig)) return;
    markeer(opties.eenmalig);
  }
  stopStem();
  const t = taal();
  const stem = STEMMEN[id];
  const el = ondertitelEl();
  (el.querySelector('.stem-spreker') as HTMLElement).textContent = stem.spreker[t];
  (el.querySelector('.stem-tekst') as HTMLElement).textContent = stem.tekst[t];
  const knop = el.querySelector('.stem-sluit') as HTMLButtonElement;
  el.hidden = false;

  const alleenTekst = (): void => {
    knop.textContent = SLUITEN[t];
    sluitTimer = setTimeout(stopStem, leesDuurMs(stem.tekst[t]));
  };

  if (isGedempt()) {
    alleenTekst();
    return;
  }
  knop.textContent = OVERSLAAN[t];
  let a: HTMLAudioElement;
  try {
    a = new Audio(stemPad(id, t));
  } catch {
    alleenTekst();
    return;
  }
  audio = a;
  a.addEventListener('ended', () => {
    if (audio === a) stopStem();
  });
  a.addEventListener('error', () => {
    if (audio === a) {
      audio = null;
      duckSfeer(false);
      alleenTekst();
    }
  });
  duckSfeer(true);
  void speel(a).then(ok => {
    if (ok || audio !== a) return;
    // Autoplay geblokkeerd: de tekst staat er al, het geluid volgt bij de eerste klik.
    const opKlik = (): void => {
      document.removeEventListener('pointerdown', opKlik);
      document.removeEventListener('keydown', opKlik);
      wachtOpKlik = null;
      if (audio === a && !isGedempt()) void speel(a);
    };
    wachtOpKlik = opKlik;
    document.addEventListener('pointerdown', opKlik);
    document.addEventListener('keydown', opKlik);
  });
}

// Dempen tijdens een fragment: geluid stopt, de tekst blijft even staan.
document.addEventListener('dua-gedempt', () => {
  if (!audio) return;
  audio.pause();
  audio = null;
  duckSfeer(false);
  const el = document.getElementById('stem-ondertitel');
  const tekst = el?.querySelector('.stem-tekst')?.textContent ?? '';
  if (el && !el.hidden) {
    (el.querySelector('.stem-sluit') as HTMLElement).textContent = SLUITEN[taal()];
    sluitTimer = setTimeout(stopStem, leesDuurMs(tekst));
  }
});
