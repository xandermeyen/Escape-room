/**
 * audio.ts: geluid voor Kamer 14.
 *
 * Achtergrondsfeer (synthetisch, geen bestanden):
 *   Speler A (bureau OPZ)  : koud, institutioneel
 *   Speler B (kamer Lena)  : warm, huiselijk
 *
 * Verhaalfragmenten (MP3, ingesproken met ElevenLabs):
 *   briefing  An Vermeersch, bij de start
 *   wending   An Vermeersch, na de spaardoos (P4)
 *   telefoon  Katrijn, na het alibi (P5)
 *   dagboek   Lena, na de dagboekstroken (P6)
 *   voicemail Marie, op de oude gsm (Speler B), met beiaard en bus
 *   eindes    zie einde.ts
 *
 * Geluidseffecten (sloten, papier, beiaard, bus) zijn synthetisch.
 * Browsers blokkeren audio tot de eerste klik.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ── Gedeelde AudioContext (lazy) ──────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API niet beschikbaar');
    _ctx = new Ctx();
  }
  return _ctx;
}

/** Zet een geblokkeerde AudioContext weer aan (enkel zinvol binnen een klik). */
export function hervatAudio(): void {
  void getCtx()
    .resume()
    .catch(() => {});
}

// ── Geluidseffecten ───────────────────────────────────────

function speelTonen(tonen: [number, number, number][], volume = 0.2): void {
  const c = getCtx();
  tonen.forEach(([freq, vertraging, duur]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = c.currentTime + vertraging;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    osc.start(t);
    osc.stop(t + duur + 0.05);
  });
}

/** Tab of document vrijgegeven — drie oplopende tonen. */
export function speelUnlock(): void {
  speelTonen(
    [
      [523, 0, 0.35],
      [659, 0.13, 0.4],
      [784, 0.26, 0.5],
    ],
    0.18,
  );
}

// ── Achtergrondsfeer ──────────────────────────────────────
/**
 * Speler A (OPZ-dossier): koud, institutioneel, steriel
 *   — Diep gebromm van het gebouw (HVAC / verwarmingssysteem)
 *   — Elektrische brom van het 50 Hz-net (× 2 = 100 Hz)
 *   — Hoog fluorescentiezoem (harmonische boventon)
 *   — Subtiele sinusdrone voor "aanwezigheid" van het gebouw
 *   — Lichte LFO-flikkering (fluorescentiebuizen)
 *
 * Speler B (Buurtdossier): warm, huiselijk, intiem
 *   — Warme lageband kamerlucht
 *   — Middenband aanwezigheid (levende ruimte)
 *   — Zachte hoge luchtstroom (raam op een kier)
 *   — Geen drone — open en warm
 *   — Trage LFO "ademhaling" van de ruimte
 */
interface RuisLaag {
  freq: number;
  Q: number;
  gain: number;
}

interface Drone {
  freq: number;
  gain: number;
}

interface LFO {
  freq: number;
  depth: number;
}

interface AchtergrondPreset {
  ruisLagen: RuisLaag[];
  drone: Drone | null;
  lfo: LFO | null;
  fadeIn: number;
  master: number;
}

const PRESETS: Record<string, AchtergrondPreset> = {
  a: {
    ruisLagen: [
      { freq: 65, Q: 2.0, gain: 0.012 }, // Diep gebromm (HVAC)
      { freq: 100, Q: 6.0, gain: 0.007 }, // Elektrische brom (50 Hz net × 2)
      { freq: 960, Q: 3.5, gain: 0.004 }, // Fluorescentiezoem (hoge harmonische)
    ],
    drone: { freq: 55, gain: 0.006 }, // Diepe gebouwdrone (sinusgolf)
    lfo: { freq: 0.08, depth: 0.035 }, // Subtiele fluorescentieflikkering
    fadeIn: 14,
    master: 0.95,
  },
  b: {
    ruisLagen: [
      { freq: 180, Q: 1.5, gain: 0.009 }, // Warme kamerlucht (lageband)
      { freq: 420, Q: 2.5, gain: 0.005 }, // Aanwezigheid middenband
      { freq: 700, Q: 4.0, gain: 0.002 }, // Zachte luchtstroom (raam)
    ],
    drone: null, // Geen drone — warm en open
    lfo: { freq: 0.04, depth: 0.055 }, // Trage "ademhaling" van de ruimte
    fadeIn: 10,
    master: 0.8,
  },
};

let _achtergrondActief: boolean = false;
let _achtergrondMasterGain: GainNode | null = null;
let _achtergrondSources: AudioScheduledSourceNode[] = [];

/**
 * Start de achtergrondsfeer voor het opgegeven type ('a' of 'b').
 * Vervaagt zeer geleidelijk in. Veilig om meerdere keren aan te roepen.
 */
export function startAchtergrond(type: 'a' | 'b' = 'a'): void {
  if (_achtergrondActief) return;
  _achtergrondActief = true;

  const c = getCtx();
  const preset = PRESETS[type] ?? PRESETS['a'];

  // Master gain — vervaagt in over fadeIn seconden
  // Local const so TypeScript knows it's non-null inside closures below.
  const masterGain = c.createGain();
  _achtergrondMasterGain = masterGain;
  masterGain.gain.setValueAtTime(0, c.currentTime);
  masterGain.gain.linearRampToValueAtTime(preset.master, c.currentTime + preset.fadeIn);
  masterGain.connect(c.destination);

  // LFO — subtiele modulatie voor leven in het geluid
  if (preset.lfo) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = preset.lfo.freq;
    lfoGain.gain.value = preset.lfo.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();
    _achtergrondSources.push(lfo);
  }

  // Ruislagen — gefilterde witte ruis geeft de ruimte zijn kleur
  preset.ruisLagen.forEach(({ freq, Q, gain }) => {
    const bufferSize = c.sampleRate * 2;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = Q;

    const layerGain = c.createGain();
    layerGain.gain.value = gain;

    source.connect(filter);
    filter.connect(layerGain);
    layerGain.connect(masterGain);
    source.start();
    _achtergrondSources.push(source);
  });

  // Optionele sinusdrone (alleen OPZ — geeft het gebouw een zware aanwezigheid)
  if (preset.drone) {
    const osc = c.createOscillator();
    const droneGain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = preset.drone.freq;
    droneGain.gain.value = preset.drone.gain;
    osc.connect(droneGain);
    droneGain.connect(masterGain);
    osc.start();
    _achtergrondSources.push(osc);
  }
}

/** Stop de achtergrondsfeer — vervaagt geleidelijk uit (± 3 s). */
export function stopAchtergrond(): void {
  if (!_achtergrondMasterGain) return;
  const c = getCtx();
  _achtergrondMasterGain.gain.linearRampToValueAtTime(0, c.currentTime + 3);
  setTimeout(() => {
    _achtergrondSources.forEach(s => {
      try {
        s.stop();
      } catch {
        /* bron was al gestopt */
      }
    });
    _achtergrondSources = [];
    _achtergrondMasterGain = null;
    _achtergrondActief = false;
  }, 3500);
}

// ── Voice lines ───────────────────────────────────────────

/**
 * Laadt en speelt een opgenomen voice line.
 * Pad: audio/<karakter>/<fragment>.mp3 (relatief aan de HTML-pagina)
 * Faalt stil als het bestand ontbreekt.
 */
export function speelStem(
  karakter: string,
  fragment: string,
  bijFout?: () => void,
): HTMLAudioElement {
  const audio = new Audio(`audio/${karakter}/${fragment}.mp3`);
  audio.volume = 0.88;
  // Geblokkeerd door de browser (geen klik gehad) of bestand ontbreekt.
  audio.play().catch(() => bijFout?.());
  return audio;
}

/**
 * Kort papiergeluid — synthesized, geen bestand nodig.
 * Aanroepen bij het omdraaien van de envelop op het prikbord.
 */
export function speelEnvelopGeluid(): void {
  const c = getCtx();
  const duur = 0.28;
  const bufferSize = Math.floor(c.sampleRate * duur);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;

  const gain = c.createGain();
  const t = c.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.14, t + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(t);
  source.stop(t + duur + 0.05);
}

// ── Klik, slot open, slot dicht ───────────────────────────

/** Korte mechanische klik (toets, wieltje). */
export function speelKlik(): void {
  try {
    speelTonen([[1400, 0, 0.04]], 0.05);
  } catch {
    /* geen audio */
  }
}

/** Fout antwoord: twee lage tonen. */
export function speelFout(): void {
  speelTonen(
    [
      [196, 0, 0.18],
      [165, 0.12, 0.26],
    ],
    0.12,
  );
}

// ── Beiaard en bus (voor de voicemail) ────────────────────

/** Noten van het begin van "Altijd is Kortjakje ziek" (do do sol sol la la sol). */
export const KORTJAKJE: number[] = [523.25, 523.25, 783.99, 783.99, 880, 880, 783.99];

/** Eén klok: grondtoon met de typische boventonen van een beiaardklok. */
function slaKlok(c: AudioContext, doel: AudioNode, freq: number, t: number, volume: number): void {
  const boventonen: [number, number, number][] = [
    [0.5, 0.35, 2.4], // hum
    [1, 1, 2.2], // grondtoon
    [1.2, 0.45, 1.6], // kleine terts, typisch voor klokken
    [1.5, 0.3, 1.2],
    [2, 0.4, 1.0],
    [2.67, 0.18, 0.7],
  ];
  for (const [ratio, rel, duur] of boventonen) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume * rel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    osc.connect(g);
    g.connect(doel);
    osc.start(t);
    osc.stop(t + duur + 0.05);
  }
}

/**
 * Speelt het deuntje van de beiaard, van ver weg (een beetje gedempt).
 * Geeft de duur in seconden terug.
 */
export function speelBeiaard(noten: number[] = KORTJAKJE, tempo = 0.62): number {
  const c = getCtx();
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3200;
  filter.connect(c.destination);
  const start = c.currentTime + 0.05;
  noten.forEach((f, i) => {
    const lang = i === noten.length - 1;
    slaKlok(c, filter, f, start + i * tempo, lang ? 0.16 : 0.13);
  });
  return noten.length * tempo + 1.6;
}

/**
 * Een bus die voorbijrijdt: een lage motor die aanzwelt en weer wegsterft.
 * Overstemt wat er tegelijk gezegd of geslagen wordt.
 */
export function speelBus(duur = 5.5): void {
  const c = getCtx();
  const lengte = Math.floor(c.sampleRate * duur);
  const buffer = c.createBuffer(1, lengte, c.sampleRate);
  const data = buffer.getChannelData(0);
  let vorige = 0;
  for (let i = 0; i < lengte; i++) {
    vorige = 0.97 * vorige + 0.03 * (Math.random() * 2 - 1); // bruine ruis
    data[i] = vorige * 6;
  }
  const bron = c.createBufferSource();
  bron.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  const motor = c.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 48;
  const motorGain = c.createGain();
  motorGain.gain.value = 0.05;
  const gain = c.createGain();
  const t = c.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.55, t + duur * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
  motor.frequency.linearRampToValueAtTime(62, t + duur * 0.45);
  motor.frequency.linearRampToValueAtTime(44, t + duur);
  bron.connect(filter);
  motor.connect(motorGain);
  motorGain.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  bron.start(t);
  motor.start(t);
  bron.stop(t + duur);
  motor.stop(t + duur);
}

// ── Verhaalfragmenten ─────────────────────────────────────

export type FragmentId = 'briefing' | 'wending' | 'telefoon' | 'dagboek';

/** Wie spreekt welk fragment in, en welk bestand (audio/<karakter>/<bestand>.mp3). */
export const FRAGMENTEN: Record<FragmentId, { karakter: string; bestand: string }> = {
  briefing: { karakter: 'an', bestand: 'briefing' },
  wending: { karakter: 'an', bestand: 'wending' },
  telefoon: { karakter: 'katrijn', bestand: 'telefoon' },
  dagboek: { karakter: 'lena', bestand: 'dagboek' },
};

/** Na welke puzzel speelt welk fragment. */
export const FRAGMENT_NA_PUZZEL: Record<string, FragmentId> = {
  p4: 'wending',
  p5: 'telefoon',
  p6: 'dagboek',
};

export interface FragmentOpties {
  /** Het fragment begint: bv. ondertitel tonen. */
  bijStart?: (audio: HTMLAudioElement) => void;
  /** Afspelen geblokkeerd of mislukt: bv. de geluidsmelding tonen. */
  bijFout?: () => void;
  /** Wachttijd in ms, zodat het slotgeluid eerst klinkt. */
  wacht?: number;
}

/** Wachttijd na het geluid van een opengaand slot. */
export const WACHT_NA_UNLOCK_MS = 1800;

/** Speelt een verhaalfragment. Beide spelers horen het tegelijk. */
export function speelFragment(id: FragmentId, opties: FragmentOpties = {}): void {
  const { karakter, bestand } = FRAGMENTEN[id];
  setTimeout(() => {
    const audio = speelStem(karakter, bestand, opties.bijFout);
    opties.bijStart?.(audio);
  }, opties.wacht ?? WACHT_NA_UNLOCK_MS);
}
