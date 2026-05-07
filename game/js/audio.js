/**
 * audio.js — Geluidsmodule voor Kamer 14 (v2)
 *
 * Achtergrondsfeer (synthesized, geen bestanden):
 *   Speler A (OPZ-dossier)  : koud, institutioneel — gebromm + fluorescentiezoem + elektrische drone
 *   Speler B (Buurtdossier) : warm, huiselijk       — zachte kamerlucht + luchtstroom + trage adem
 *
 * Verhaalfragmenten (MP3):
 *   Na elke puzzeloplossing speelt automatisch een random, nog niet gehoord fragment.
 *   Speler A pool : an-vermeersch/notitie-1 t/m 3
 *   Speler B pool : katrijn/logboek-1 t/m 3
 *   Speciaal      : lena/briefkaart.mp3 bij omdraaien envelop (Speler B)
 *
 * Browsers blokkeren audio tot eerste gebruikersinteractie.
 * Roep startAchtergrond('a') of startAchtergrond('b') aan bij eerste klik.
 */

// ── Gedeelde AudioContext (lazy) ──────────────────────────
let _ctx = null;

function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}


// ── Geluidseffecten ───────────────────────────────────────

function speelTonen(tonen, volume = 0.2) {
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
export function speelUnlock() {
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
const PRESETS = {
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

let _achtergrondActief     = false;
let _achtergrondMasterGain = null;
let _achtergrondSources    = [];

/**
 * Start de achtergrondsfeer voor het opgegeven type ('a' of 'b').
 * Vervaagt zeer geleidelijk in. Veilig om meerdere keren aan te roepen.
 */
export function startAchtergrond(type = 'a') {
  if (_achtergrondActief) return;
  _achtergrondActief = true;

  const c      = getCtx();
  const preset = PRESETS[type] ?? PRESETS.a;

  // Master gain — vervaagt in over fadeIn seconden
  _achtergrondMasterGain = c.createGain();
  _achtergrondMasterGain.gain.setValueAtTime(0, c.currentTime);
  _achtergrondMasterGain.gain.linearRampToValueAtTime(
    preset.master,
    c.currentTime + preset.fadeIn
  );
  _achtergrondMasterGain.connect(c.destination);

  // LFO — subtiele modulatie voor leven in het geluid
  if (preset.lfo) {
    const lfo     = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type             = 'sine';
    lfo.frequency.value  = preset.lfo.freq;
    lfoGain.gain.value   = preset.lfo.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(_achtergrondMasterGain.gain);
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
    layerGain.connect(_achtergrondMasterGain);
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
    droneGain.connect(_achtergrondMasterGain);
    osc.start();
    _achtergrondSources.push(osc);
  }
}

/** Stop de achtergrondsfeer — vervaagt geleidelijk uit (± 3 s). */
export function stopAchtergrond() {
  if (!_achtergrondMasterGain) return;
  const c = getCtx();
  _achtergrondMasterGain.gain.linearRampToValueAtTime(0, c.currentTime + 3);
  setTimeout(() => {
    _achtergrondSources.forEach(s => { try { s.stop(); } catch (e) {} });
    _achtergrondSources     = [];
    _achtergrondMasterGain  = null;
    _achtergrondActief      = false;
  }, 3500);
}


// ── Voice lines ───────────────────────────────────────────

/**
 * Laadt en speelt een opgenomen voice line.
 * Pad: game/audio/<karakter>/<fragment>.mp3
 * Faalt stil als het bestand ontbreekt.
 * Geeft het HTMLAudioElement terug (voor chaining via .addEventListener('ended')).
 */
export function speelStem(karakter, fragment) {
  const audio = new Audio(`audio/${karakter}/${fragment}.mp3`);
  audio.volume = 0.88;
  audio.play().catch(() => {});
  return audio;
}

/**
 * Speelt Lena's briefkaartfragment.
 * Aanroepen wanneer de envelop op het prikbord wordt omgedraaid (Speler B).
 */
export function speelBriefkaartStem() {
  speelStem('lena', 'briefkaart');
}


// ── Verhaalfragmenten na puzzeloplossing ──────────────────
/**
 * Na elke puzzeloplossing speelt automatisch een random, nog niet gehoord
 * fragment van het karakter dat bij die speler hoort.
 *
 * Pool Speler A : an-vermeersch — notitie-1, notitie-2, notitie-3
 * Pool Speler B : katrijn       — logboek-1, logboek-2, logboek-3
 *
 * Om later fragmenten toe te voegen: voeg simpelweg een string toe aan de pool.
 * Bestandsnaamconventie: game/audio/<karakter>/<fragment>.mp3
 */
// ── Verhaalfragmenten per puzzel ──────────────────────────
/**
 * Elk fragment is specifiek gekoppeld aan de puzzel die net opgelost werd.
 * Bestandsnaamconventie: game/audio/<karakter>/<fragment>.mp3
 *
 * Om een fragment toe te voegen: neem het op, zet het in de juiste map,
 * en vervang null door de bestandsnaam (zonder .mp3).
 *
 * Scripts staan in: Kamer_story/naratie_scripts.md
 */
const VERHAAL_FRAGMENTEN = {
  a: {
    p1: 'verhaal-p1',   // An Vermeersch — patroon di/do ontdekt
    p2: 'verhaal-p2',   // An Vermeersch — Diest ontdekt
    p3: 'verhaal-p3',   // An Vermeersch — 8 weken sparen
    p4: 'verhaal-p4',   // An Vermeersch — Marie Stas geïdentificeerd
    p5: 'verhaal-p5',   // An Vermeersch — bus 07:35 bevestigd
  },
  b: {
    p1: 'verhaal-p1',   // Katrijn — patroon di/do ontdekt
    p2: 'verhaal-p2',   // Katrijn — Diest ontdekt
    p3: 'verhaal-p3',   // Katrijn — 8 weken sparen
    p4: 'verhaal-p4',   // Katrijn — Marie Stas geïdentificeerd
    p5: 'verhaal-p5',   // Katrijn — bus 07:35 bevestigd
  },
};

const KARAKTER = {
  a: 'an-vermeersch',
  b: 'katrijn',
};

/**
 * Speelt het verhaalfragment dat bij de opgegeven puzzel hoort.
 * Wacht 1.8 s zodat het unlock-geluid eerst klinkt.
 * Doet niets als er voor die puzzel nog geen opname is.
 *
 * @param {'a'|'b'} spelerType
 * @param {'p1'|'p2'|'p3'|'p4'|'p5'} puzzelNr
 */
export function speelVerhaalFragment(spelerType, puzzelNr) {
  const fragment = VERHAAL_FRAGMENTEN[spelerType]?.[puzzelNr];
  const karakter = KARAKTER[spelerType];
  if (!fragment || !karakter) return;

  setTimeout(() => speelStem(karakter, fragment), 1800);
}
