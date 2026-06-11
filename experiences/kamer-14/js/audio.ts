/**
 * audio.js — Geluidsmodule voor Kamer 14 (v2)
 *
 * Achtergrondsfeer (synthesized, geen bestanden):
 *   Speler A (OPZ-dossier)  : koud, institutioneel — gebromm + fluorescentiezoem + elektrische drone
 *   Speler B (Buurtdossier) : warm, huiselijk       — zachte kamerlucht + luchtstroom + trage adem
 *
 * Verhaalfragmenten (MP3):
 *   Na elke puzzeloplossing speelt automatisch het vaste fragment voor die puzzel.
 *   Speler A : an-vermeersch/verhaal-p1 t/m p5
 *   Speler B : katrijn/verhaal-p1 t/m p5
 *   Speciaal : lena/briefkaart.mp3 bij omdraaien envelop (Speler B)
 *
 * Browsers blokkeren audio tot eerste gebruikersinteractie.
 * Roep startAchtergrond('a') of startAchtergrond('b') aan bij eerste klik.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

// ── Gedeelde AudioContext (lazy) ──────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext!)();
  return _ctx;
}


// ── Geluidseffecten ───────────────────────────────────────

function speelTonen(tonen: [number, number, number][], volume = 0.2): void {
  const c = getCtx();
  tonen.forEach(([freq, vertraging, duur]) => {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type            = 'sine';
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
  speelTonen([
    [523, 0,    0.35],
    [659, 0.13, 0.40],
    [784, 0.26, 0.50],
  ], 0.18);
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
      { freq:  65, Q: 2.0, gain: 0.012 },  // Diep gebromm (HVAC)
      { freq: 100, Q: 6.0, gain: 0.007 },  // Elektrische brom (50 Hz net × 2)
      { freq: 960, Q: 3.5, gain: 0.004 },  // Fluorescentiezoem (hoge harmonische)
    ],
    drone:  { freq: 55, gain: 0.006 },      // Diepe gebouwdrone (sinusgolf)
    lfo:    { freq: 0.08, depth: 0.035 },   // Subtiele fluorescentieflikkering
    fadeIn: 14,
    master: 0.95,
  },
  b: {
    ruisLagen: [
      { freq: 180, Q: 1.5, gain: 0.009 },  // Warme kamerlucht (lageband)
      { freq: 420, Q: 2.5, gain: 0.005 },  // Aanwezigheid middenband
      { freq: 700, Q: 4.0, gain: 0.002 },  // Zachte luchtstroom (raam)
    ],
    drone:  null,                            // Geen drone — warm en open
    lfo:    { freq: 0.04, depth: 0.055 },   // Trage "ademhaling" van de ruimte
    fadeIn: 10,
    master: 0.80,
  },
};

let _achtergrondActief: boolean                     = false;
let _achtergrondMasterGain: GainNode | null         = null;
let _achtergrondSources: AudioScheduledSourceNode[] = [];

/**
 * Start de achtergrondsfeer voor het opgegeven type ('a' of 'b').
 * Vervaagt zeer geleidelijk in. Veilig om meerdere keren aan te roepen.
 */
export function startAchtergrond(type: 'a' | 'b' = 'a'): void {
  if (_achtergrondActief) return;
  _achtergrondActief = true;

  const c      = getCtx();
  const preset = PRESETS[type] ?? PRESETS['a'];

  // Master gain — vervaagt in over fadeIn seconden
  // Local const so TypeScript knows it's non-null inside closures below.
  const masterGain = c.createGain();
  _achtergrondMasterGain = masterGain;
  masterGain.gain.setValueAtTime(0, c.currentTime);
  masterGain.gain.linearRampToValueAtTime(
    preset.master,
    c.currentTime + preset.fadeIn
  );
  masterGain.connect(c.destination);

  // LFO — subtiele modulatie voor leven in het geluid
  if (preset.lfo) {
    const lfo     = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type             = 'sine';
    lfo.frequency.value  = preset.lfo.freq;
    lfoGain.gain.value   = preset.lfo.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();
    _achtergrondSources.push(lfo);
  }

  // Ruislagen — gefilterde witte ruis geeft de ruimte zijn kleur
  preset.ruisLagen.forEach(({ freq, Q, gain }) => {
    const bufferSize = c.sampleRate * 2;
    const buffer     = c.createBuffer(1, bufferSize, c.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source  = c.createBufferSource();
    source.buffer = buffer;
    source.loop   = true;

    const filter           = c.createBiquadFilter();
    filter.type            = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value         = Q;

    const layerGain      = c.createGain();
    layerGain.gain.value = gain;

    source.connect(filter);
    filter.connect(layerGain);
    layerGain.connect(masterGain);
    source.start();
    _achtergrondSources.push(source);
  });

  // Optionele sinusdrone (alleen OPZ — geeft het gebouw een zware aanwezigheid)
  if (preset.drone) {
    const osc       = c.createOscillator();
    const droneGain = c.createGain();
    osc.type             = 'sine';
    osc.frequency.value  = preset.drone.freq;
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
    _achtergrondSources.forEach(s => { try { s.stop(); } catch {} });
    _achtergrondSources     = [];
    _achtergrondMasterGain  = null;
    _achtergrondActief      = false;
  }, 3500);
}


// ── Voice lines ───────────────────────────────────────────

/**
 * Laadt en speelt een opgenomen voice line.
 * Pad: audio/<karakter>/<fragment>.mp3 (relatief aan de HTML-pagina)
 * Faalt stil als het bestand ontbreekt.
 */
export function speelStem(karakter: string, fragment: string): HTMLAudioElement {
  const audio = new Audio(`audio/${karakter}/${fragment}.mp3`);
  audio.volume = 0.88;
  audio.play().catch(() => {});
  return audio;
}

/**
 * Speelt Lena's briefkaartfragment.
 * Aanroepen op einde.html of als afsluitend moment — niet bij het omdraaien zelf.
 */
export function speelBriefkaartStem(): void {
  speelStem('lena', 'briefkaart');
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
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = c.createBufferSource();
  source.buffer = buffer;

  const filter           = c.createBiquadFilter();
  filter.type            = 'highpass';
  filter.frequency.value = 1800;

  const gain = c.createGain();
  const t    = c.currentTime;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.14, t + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(t);
  source.stop(t + duur + 0.05);
}


// ── Verhaalfragmenten na puzzeloplossing ──────────────────
/**
 * Elk fragment is specifiek gekoppeld aan de puzzel die net opgelost werd.
 * Bestandsnaamconventie: audio/<karakter>/<fragment>.mp3
 *
 * Om een fragment toe te voegen: neem het op, zet het in de juiste map,
 * en vervang null door de bestandsnaam (zonder .mp3).
 *
 * Scripts staan in: Kamer_story/naratie_scripts.md
 */
type SpelerType = 'a' | 'b';
type PuzzelNr   = 'p1' | 'p2' | 'p3' | 'p4' | 'p5';

// Per puzzel een vast verhaalfragment, ingesproken door het
// personage van de eigen kant (A: An Vermeersch, B: Katrijn).
const VERHAAL_FRAGMENTEN: Record<SpelerType, Record<PuzzelNr, string>> = {
  a: {
    p1: 'verhaal-p1',
    p2: 'verhaal-p2',
    p3: 'verhaal-p3',
    p4: 'verhaal-p4',
    p5: 'verhaal-p5',
  },
  b: {
    p1: 'verhaal-p1',
    p2: 'verhaal-p2',
    p3: 'verhaal-p3',
    p4: 'verhaal-p4',
    p5: 'verhaal-p5',
  },
};

const KARAKTER: Record<SpelerType, string> = {
  a: 'an-vermeersch',
  b: 'katrijn',
};

/**
 * Speelt het verhaalfragment dat bij de opgegeven puzzel hoort.
 * Wacht 1.8 s zodat het unlock-geluid eerst klinkt.
 * Doet niets als er voor die puzzel nog geen opname is.
 *
 * @param spelerType - 'a' of 'b'
 * @param puzzelNr   - 'p1' t/m 'p5'
 */
export function speelVerhaalFragment(spelerType: SpelerType, puzzelNr: PuzzelNr): void {
  const fragment = VERHAAL_FRAGMENTEN[spelerType]?.[puzzelNr];
  const karakter = KARAKTER[spelerType];
  if (!fragment || !karakter) return;

  setTimeout(() => speelStem(karakter, fragment), 1800);
}
