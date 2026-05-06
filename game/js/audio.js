/**
 * audio.js — Geluidsmodule voor Kamer 14
 *
 * Geluidseffecten : Web Audio API (geen externe bestanden)
 * Achtergrondsfeer: gefilterde ruis — twee aparte presets voor Speler A en B
 * Voice lines     : laadt .mp3 uit game/audio/stemmen/<karakter>/<fragment>.mp3
 *
 * Browsers blokkeren audio tot er een gebruikersinteractie plaatsvindt.
 * Roep startAchtergrond('a') of startAchtergrond('b') op bij de eerste klik.
 */

// ── Gedeelde AudioContext (lazy) ──────────────────────────
let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}


// ── Interne helper: reeks sinustonen spelen ───────────────
// tonen: array van [frequentie (Hz), vertraging (s), duur (s)]
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


// ── Geluidseffecten ───────────────────────────────────────

/**
 * Tab of document vrijgegeven — drie oplopende tonen.
 * Roep op in updateTabs() bij elke tab-unlock.
 */
export function speelUnlock() {
  speelTonen([
    [523, 0,    0.35],   // C5
    [659, 0.13, 0.40],   // E5
    [784, 0.26, 0.50],   // G5
  ], 0.18);
}

/**
 * Briefkaart omdraaien — warm opgelost akkoord (C majeur).
 * Roep op wanneer de postkaart omgedraaid wordt.
 */
export function speelBriefkaart() {
  speelTonen([
    [392, 0,    1.1],    // G4
    [523, 0.10, 1.0],    // C5
    [659, 0.22, 0.95],   // E5
    [784, 0.38, 0.85],   // G5
  ], 0.15);
}


// ── Achtergrondsfeer ──────────────────────────────────────
/**
 * Gefilterde ruis klinkt veel naturaler dan pure oscillatoren.
 * Witte ruis wordt door een bandpass-filter gestuurd zodat alleen
 * een smalle frequentieband overblijft — dat geeft de "ruimte" een kleur.
 *
 * Speler A (OPZ-dossier): koud en institutioneel
 *   → twee lage bandpass-lagen (gebouwgebrom + fluorescentiezoem)
 *
 * Speler B (Buurtdossier): warm en huiselijk
 *   → iets hogere bandpass + zachtere mix (woonkamer-gevoel)
 */

const PRESETS = {
  a: {
    // Institutioneel: laag gebromm + hoge fluorescentietint
    lagen: [
      { freq:  80, Q: 2.5, gain: 0.010 },  // Gebouwgebrom
      { freq: 160, Q: 4.0, gain: 0.005 },  // Fluorescentiezoem
    ],
    fadeIn: 10,   // seconden
    master: 0.9,
  },
  b: {
    // Huiselijk: iets warmere middenband, rustiger
    lagen: [
      { freq: 110, Q: 2.0, gain: 0.009 },  // Woonkamer-laag
      { freq: 220, Q: 3.0, gain: 0.004 },  // Subtiele aanwezigheid
    ],
    fadeIn: 10,
    master: 0.85,
  },
};

let _achtergrondActief = false;
let _achtergrondMasterGain = null;
let _achtergrondSources = [];

/**
 * Start de achtergrondsfeer voor het opgegeven type ('a' of 'b').
 * Vervaagt zeer geleidelijk in zodat het nauwelijks opvalt.
 * Veilig om meerdere keren aan te roepen — start slechts één keer.
 *
 * @param {'a'|'b'} type — 'a' voor OPZ-dossier, 'b' voor Buurtdossier
 */
export function startAchtergrond(type = 'a') {
  if (_achtergrondActief) return;
  _achtergrondActief = true;

  const c      = getCtx();
  const preset = PRESETS[type] ?? PRESETS.a;

  // Master gain: begint op 0, vervaagt traag in
  _achtergrondMasterGain = c.createGain();
  _achtergrondMasterGain.gain.setValueAtTime(0, c.currentTime);
  _achtergrondMasterGain.gain.linearRampToValueAtTime(
    preset.master,
    c.currentTime + preset.fadeIn
  );
  _achtergrondMasterGain.connect(c.destination);

  preset.lagen.forEach(({ freq, Q, gain }) => {
    // Witte ruis genereren (2 seconden, geloopt)
    const bufferSize = c.sampleRate * 2;
    const buffer     = c.createBuffer(1, bufferSize, c.sampleRate);
    const data       = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = c.createBufferSource();
    source.buffer = buffer;
    source.loop   = true;

    // Bandpass-filter geeft de ruis zijn "kleur"
    const filter     = c.createBiquadFilter();
    filter.type      = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value   = Q;

    // Eigen gain per laag (bepaalt de mix)
    const layerGain  = c.createGain();
    layerGain.gain.value = gain;

    source.connect(filter);
    filter.connect(layerGain);
    layerGain.connect(_achtergrondMasterGain);
    source.start();

    _achtergrondSources.push(source);
  });
}

/**
 * Stop de achtergrondsfeer. Vervaagt geleidelijk uit (±3 s).
 */
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
 *
 * @param {string} karakter  — mapnaam: 'an-vermeersch' | 'katrijn' | 'lena'
 * @param {string} fragment  — bestandsnaam zonder extensie, bv. 'notitie-1'
 *
 * Bestandspad: game/audio/stemmen/<karakter>/<fragment>.mp3
 * Als het bestand ontbreekt, faalt het stil.
 * Geeft het HTMLAudioElement terug zodat je .pause() kunt aanroepen.
 */
export function speelStem(karakter, fragment) {
  const audio = new Audio(`../audio/stemmen/${karakter}/${fragment}.mp3`);
  audio.volume = 0.85;
  audio.play().catch(() => {});
  return audio;
}
