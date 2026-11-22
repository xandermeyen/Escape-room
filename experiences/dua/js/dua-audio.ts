/**
 * dua-audio.ts — geluid in D.U.A.
 * Korte klikjes en tonen via de Web Audio API (geen bestanden). Sfeerlagen
 * en een paar effecten zijn opnames (ElevenLabs) in public/audio/dua/sfeer;
 * ontbreekt een bestand, dan valt een effect terug op de synthese.
 * Elke speler kan dempen via de ♪-knop (voorkeur in localStorage).
 */

let ctx: AudioContext | null = null;
let gedempt = localStorage.getItem('dua-mute') === '1';

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function toon(
  freq: number,
  duur: number,
  type: OscillatorType = 'sine',
  vol = 0.15,
  when = 0,
): void {
  if (gedempt) return;
  const c = audio();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duur);
  o.connect(g);
  g.connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + duur + 0.05);
}

function ruis(duur = 0.2, vol = 0.08, when = 0): void {
  if (gedempt) return;
  const c = audio();
  const n = c.sampleRate * duur;
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(c.destination);
  src.start(c.currentTime + when);
}

export const fx = {
  typmachine(): void {
    ruis(0.03, 0.1);
    toon(2400, 0.02, 'square', 0.03);
  },
  typDiep(): void {
    ruis(0.05, 0.16);
    toon(1600, 0.04, 'square', 0.06);
  },
  lade(): void {
    ruis(0.35, 0.12);
  },
  klik(): void {
    toon(1800, 0.03, 'square', 0.05);
  },
  fout(): void {
    toon(160, 0.3, 'sawtooth', 0.08);
  },
  voetstap(): void {
    ruis(0.06, 0.1);
    toon(90, 0.05, 'sine', 0.1);
  },
  fluitje(): void {
    speelSample('fluitje', 0.5, () => {
      toon(2200, 0.5, 'sine', 0.12);
      toon(2400, 0.4, 'sine', 0.1, 0.15);
    });
  },
  blaat(): void {
    [0, 0.18, 0.36].forEach((w, i) => toon(740 - i * 40, 0.14, 'sawtooth', 0.06, w));
  },
  fluister(): void {
    ruis(1.0, 0.05);
  },
  hartslag(): void {
    toon(55, 0.12, 'sine', 0.25);
    toon(55, 0.1, 'sine', 0.18, 0.22);
  },
  telefoon(): void {
    [0, 0.5].forEach(w => {
      toon(440, 0.35, 'sine', 0.1, w);
      toon(480, 0.35, 'sine', 0.1, w);
    });
  },
  stoom(): void {
    speelSample('trein', 0.5, () => ruis(0.8, 0.07));
  },
  scanner(): void {
    speelSample('scanner', 0.5, () => ruis(0.6, 0.05));
  },
  radio(): void {
    speelSample('radio', 0.35, () => ruis(0.4, 0.06));
  },
  // dof = 2034: dezelfde klok, maar verder weg
  kerkklok(slagen: number, dof = false): void {
    for (let i = 0; i < slagen; i++) {
      toon(dof ? 185 : 196, 2.2, 'sine', dof ? 0.12 : 0.2, i * 1.4);
      toon(dof ? 370 : 392, 1.4, 'sine', 0.06, i * 1.4);
    }
  },
};

export function isGedempt(): boolean {
  return gedempt;
}

export function wisselGeluid(): boolean {
  gedempt = !gedempt;
  localStorage.setItem('dua-mute', gedempt ? '1' : '0');
  if (gedempt) {
    sfeer?.pause();
    document.dispatchEvent(new CustomEvent('dua-gedempt'));
  } else {
    fx.klik();
    speel(sfeer);
  }
  return gedempt;
}

// ── Opnames (ElevenLabs) ────────────────────────────────────
export const AUDIO_PAD = '/audio/dua';
export type Sample = 'trein' | 'fluitje' | 'scanner' | 'radio';

/** Afspelen zonder fout bij autoplay-blokkering of in jsdom. */
export function speel(a: HTMLAudioElement | null): Promise<boolean> {
  if (!a) return Promise.resolve(false);
  try {
    const p = a.play() as Promise<void> | undefined;
    if (!p || typeof p.then !== 'function') return Promise.resolve(false);
    return p.then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

/** Eén effect; `terugval` speelt als het bestand niet laadt. */
function speelSample(naam: Sample, vol: number, terugval: () => void): void {
  if (gedempt) return;
  let a: HTMLAudioElement;
  try {
    a = new Audio(`${AUDIO_PAD}/sfeer/${naam}.mp3`);
  } catch {
    terugval();
    return;
  }
  a.volume = vol;
  a.addEventListener('error', terugval, { once: true });
  void speel(a);
}

// ── Sfeerlaag: zachte loop onder het spel ───────────────────
const SFEER_VOLUME = 0.18;
const SFEER_GEDUCKT = 0.05;
let sfeer: HTMLAudioElement | null = null;

/**
 * Start de sfeerlaag van een tijdperk. Browsers laten geluid pas toe na een
 * klik of toets, dus we proberen meteen en anders bij de eerste interactie.
 */
export function startSfeer(era: '1934' | '2034'): void {
  if (sfeer) return;
  try {
    sfeer = new Audio(`${AUDIO_PAD}/sfeer/${era === '1934' ? '1934-nacht' : '2034-archief'}.mp3`);
  } catch {
    return;
  }
  sfeer.loop = true;
  sfeer.volume = SFEER_VOLUME;
  const probeer = (): void => {
    if (gedempt || !sfeer) return;
    void speel(sfeer).then(ok => {
      if (ok) {
        document.removeEventListener('pointerdown', probeer);
        document.removeEventListener('keydown', probeer);
      }
    });
  };
  document.addEventListener('pointerdown', probeer);
  document.addEventListener('keydown', probeer);
  probeer();
}

/** Sfeerlaag zachter zetten zolang er een stem spreekt. */
export function duckSfeer(aan: boolean): void {
  if (sfeer) sfeer.volume = aan ? SFEER_GEDUCKT : SFEER_VOLUME;
}

// Typmachinegeluid op alle tekstvelden
export function koppelTypgeluid(): void {
  document.addEventListener('input', (e: Event) => {
    if ((e.target as HTMLElement).matches?.('input, textarea')) fx.typmachine();
  });
}
