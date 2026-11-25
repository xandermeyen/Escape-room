/**
 * speler-1934.ts — de kant van D.U.A.
 * Schrijft state naar Firebase (zegel, brief, kluis, verstopplek, pin)
 * en leeft onder politiedruk: wachter, werkkamer-klok en verdenking.
 */
import '../../../shared/js/sentry.ts';
import { bewaakHints } from './dua-hints.ts';
import { luisterNaarStatus, bewaakSessieGesloten } from '../../../shared/js/session.ts';
import {
  requireEl,
  beoordeelAntwoord,
  antwoordKlopt,
  koppelHints,
} from '../../../shared/js/utils.ts';
import {
  registreerPoging,
  registreerVrijgaves,
  luisterNaarHints,
  puzzelUitHintBlok,
} from '../../../shared/js/speldata.ts';
import { initHulp } from '../../../shared/js/hulp.ts';
import { meetSpel } from '../../../shared/js/meet.ts';
import { koppelDemoModus } from '../../../shared/js/demo.ts';
import { serverNu } from '../../../shared/js/timer.ts';
import { DUA_HASHES, DUA_P1, DUA_REGELS, DUA_VRIJGAVE } from './dua-config.ts';
import { duaInactief, duaHulpHtml, duaVrijgaveMelding } from './dua-hulp.ts';
import { duaTaal, tekst, vul } from './dua-tekst.ts';
import {
  luisterDua,
  zetZegel,
  zetBrief,
  gomBrief,
  zetKluisNummer,
  zetHamers,
  zetLetterKeuze,
  startKamer,
  verstopMapje,
  kamerVerlopen,
  zetPin1934,
  zetBrief14,
  verhoogVerdenking,
  HAMERS_START,
  HAMERS_GOED,
  type DuaState,
} from './dua-session.ts';
import {
  melding,
  startDuaTimer,
  koppelMeta,
  tekenVoortgang,
  ontgrendeld,
  duaHint,
  koppelMuteKnop,
  koppelEasterEggs,
  herstelHints,
  controleerSessie,
  leesSessie,
  maakSvgToegankelijk,
  plekNaam,
  type PuzzelStatus,
} from './dua-ui.ts';
import { startSfeer, fx, koppelTypgeluid } from './dua-audio.ts';
import { speelStem } from './dua-stemmen.ts';
import { startDua } from './dua-start.ts';

// Eerst de taal van de sessie en de vertaalde pagina, dan pas de rest (ADR-001, G1).
await startDua();
const T = tekst().s1934;
// P1 in de speltaal: de brief, de code op het briefje en het aantal letters (dua-config.ts).
const P1 = DUA_P1[duaTaal()];
const BRIEFTEKST = P1.brief;
const AANTAL = P1.letters;

const sessie = leesSessie();
meetSpel('game_start', sessie, { rol: '1934' });
const rol = new URLSearchParams(window.location.search).get('rol') ?? 'schrijver';

requireEl('sys-case').textContent = vul(tekst().kop.sysCase, { sessie });
requireEl('sys-rol').textContent =
  `1934 · ${rol === 'loper' ? tekst().kop.rol.loper : tekst().kop.rol.schrijver}`;
const loperCode = document.querySelector('.loper-code');
if (loperCode) loperCode.textContent = P1.code;

// Demomodus: wisselen naar 2034 zonder lobby (zie demo.ts).
koppelDemoModus(sessie, '1934', [
  { label: '2034', href: `speler-2034.html?sessie=${encodeURIComponent(sessie)}&rol=archivaris` },
]);

// ── Lokale spiegel van de gedeelde state ──
let dua: DuaState = {};
let puzzels: PuzzelStatus = {};
let toezichtVerscherpt = false;

// ── Hulp: hint-tip, verhaalmeldingen, vrijgave en "Hulp nodig?" ──
const hulp = initHulp({
  hintBlokVoor: puzzel =>
    (
      ({ p1: 'hint-p1a', p2: 'hint-p2a', p4: 'hint-p4a', p5: 'hint-p5a' }) as Record<string, string>
    )[puzzel] ?? null,
  vrijgave: DUA_VRIJGAVE,
  inactiefMeldingen: duaInactief('1934'),
  vrijgaveMelding: (oud, nieuw) => duaVrijgaveMelding('1934', oud, nieuw),
  hulpHtml: duaHulpHtml(),
});

// ── Speldata: geopende hintstappen van 1934 ──
luisterNaarHints(sessie, blokId => {
  const puzzel = puzzelUitHintBlok(blokId);
  return puzzel ? { puzzel, rol: '1934' } : null;
});

// ── Hints globaal voor onclick ──
koppelHints(blokId => duaHint(sessie, blokId));
bewaakHints();

// ═══════════════════ P0: HET ZEGEL ═══════════════════
document.getElementById('zegelknop')?.addEventListener('click', async () => {
  if (dua.p0zegel) return;
  fx.lade();
  await zetZegel(sessie);
  melding(T.zegelGezet);
});

function tekenZegel(): void {
  if (!dua.p0zegel) return;
  requireEl('zegel-toon').innerHTML = '<span class="zegel">D.U.A.</span>';
  requireEl<HTMLButtonElement>('zegelknop').style.display = 'none';
  // Pas klaar als 2034 het zegel bevestigde (puzzels.p0), niet bij het drukken.
  document.getElementById('s-zegel')?.classList.toggle('klaar', !!puzzels['p0']);
}

// ═══════════════════ P1a: HAMERPUZZEL ═══════════════════
// De volgorde van de hamers staat in dua.hamers: beide 1934-spelers zien dezelfde
// machine en een herlaad raakt niets kwijt. Alleen de gekozen hamer is lokaal.
const HAMER_SLOTS = [...HAMERS_GOED];
const HAMER_STATUS_STANDAARD = T.hamerStatus;
let hamerSel = -1;
let hamersAlHersteld: boolean | null = null;

const hamerVolgorde = (): string[] => [...(dua.hamers ?? HAMERS_START)];
// Is de brief al verstuurd, dan was de machine per definitie heel.
const isHersteld = (): boolean =>
  hamerVolgorde().join('') === HAMERS_GOED || !!dua.brief?.verstuurd;

function bouwHamers(): void {
  const rij = requireEl('hamerrij');
  rij.innerHTML = '';
  const hersteld = isHersteld();
  const volgorde = hersteld ? HAMER_SLOTS : hamerVolgorde();
  volgorde.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'hamerslot';
    // De vakken dragen alleen een nummer: de volgorde staat in het verslag van 2034.
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = vul(T.vak, { nr: i + 1 });
    div.appendChild(label);
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = `hamer${i === hamerSel ? ' gekozen' : ''}${hersteld ? ' goedzo' : ''}`;
    knop.textContent = h;
    knop.setAttribute('aria-label', vul(T.hamerLabel, { letter: h, nr: i + 1 }));
    knop.setAttribute('aria-pressed', String(i === hamerSel));
    knop.addEventListener('click', () => {
      hamerKlik(i);
      // Na het herbouwen de focus op dezelfde plek houden.
      document.querySelectorAll<HTMLButtonElement>('#hamerrij .hamer')[i]?.focus();
    });
    div.appendChild(knop);
    rij.appendChild(div);
  });
}

/** Tekent de machine en de afhankelijke stukken (brief ontgrendelen). */
function tekenHamers(): void {
  bouwHamers();
  const hersteld = isHersteld();
  document.getElementById('s-hamers')?.classList.toggle('klaar', hersteld);
  requireEl('hamer-status').textContent = hersteld ? T.hamerHersteld : HAMER_STATUS_STANDAARD;
  document.getElementById('s-brief')?.classList.toggle('slot', !hersteld);
  // Alleen bij een echte overgang (ook als de ander ze herstelde), niet bij het laden.
  if (hamersAlHersteld === false && hersteld && !dua.brief?.verstuurd) {
    fx.kerkklok(1);
    melding(T.machineWeer);
  }
  hamersAlHersteld = hersteld;
}

function hamerKlik(i: number): void {
  if (isHersteld()) return;
  if (!puzzels['p0']) {
    fx.fout();
    melding(dua.p0zegel ? T.wachtOpBevestiging : T.eerstHanddruk);
    return;
  }
  fx.klik();
  if (hamerSel < 0) {
    hamerSel = i;
    bouwHamers();
    return;
  }
  const volgorde = hamerVolgorde();
  [volgorde[hamerSel], volgorde[i]] = [volgorde[i] ?? '', volgorde[hamerSel] ?? ''];
  hamerSel = -1;
  fx.typDiep();
  dua.hamers = volgorde.join('');
  tekenHamers();
  zetHamers(sessie, dua.hamers).catch(() => {
    /* schrijf() toont de verbindingsbalk */
  });
}
bouwHamers();

// ═══════════════════ P1b: DE BRIEF ═══════════════════
let briefLetters: number[] = [];

let typFocus = -1; // index van de letter met toetsenbordfocus

function bouwTypvel(): void {
  const vel = requireEl('typvel');
  vel.innerHTML = '';
  const eersteLetter = [...BRIEFTEKST].findIndex(ch => /[A-Z]/.test(ch));
  [...BRIEFTEKST].forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch;
    if (/[A-Z]/.test(ch)) {
      const diep = briefLetters.includes(i);
      span.className = 'lt' + (diep ? ' diep' : '');
      span.dataset.i = String(i);
      // Toetsenbord: één tabstop, pijltjes om te bewegen, Enter/spatie kiest.
      span.setAttribute('role', 'button');
      span.setAttribute('aria-pressed', String(diep));
      span.setAttribute('tabindex', i === (typFocus >= 0 ? typFocus : eersteLetter) ? '0' : '-1');
      span.addEventListener('click', () => {
        typFocus = i;
        kiesLetter(i);
      });
    }
    vel.appendChild(span);
  });
}

document.getElementById('typvel')?.addEventListener('keydown', (e: KeyboardEvent) => {
  const letters = [...document.querySelectorAll<HTMLElement>('#typvel .lt')];
  const i = letters.indexOf(e.target as HTMLElement);
  if (i < 0) return;
  let doel = -1;
  if (e.key === 'ArrowRight') doel = Math.min(letters.length - 1, i + 1);
  else if (e.key === 'ArrowLeft') doel = Math.max(0, i - 1);
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    letters[i]?.click();
    document.querySelector<HTMLElement>(`#typvel [data-i="${typFocus}"]`)?.focus();
    return;
  }
  if (doel < 0) return;
  e.preventDefault();
  letters[i]?.setAttribute('tabindex', '-1');
  letters[doel]?.setAttribute('tabindex', '0');
  letters[doel]?.focus();
  typFocus = Number(letters[doel]?.dataset.i ?? -1);
});

function kiesLetter(i: number): void {
  if (!isHersteld()) {
    fx.fout();
    melding(T.machineStuk);
    return;
  }
  if (dua.brief?.verstuurd) return;
  const idx = briefLetters.indexOf(i);
  if (idx > -1) {
    briefLetters.splice(idx, 1);
    fx.klik();
  } else if (briefLetters.length < AANTAL) {
    briefLetters.push(i);
    fx.typDiep();
  } else {
    fx.fout();
  }
  bouwTypvel();
  tekenBriefStatus();
  zetLetterKeuze(sessie, briefLetters).catch(() => {
    /* schrijf() toont de verbindingsbalk */
  });
}

function tekenBriefStatus(): void {
  requireEl('brief-status').textContent = dua.brief?.verstuurd
    ? T.briefVerstuurd
    : briefLetters.length < AANTAL
      ? vul(T.nogLetters, { aantal: AANTAL - briefLetters.length })
      : vul(T.allesGekozen, { Aantal: P1.lettersVoluit });
}
bouwTypvel();

document.getElementById('btn-verstuur')?.addEventListener('click', async () => {
  if (!isHersteld()) {
    fx.fout();
    melding(T.eerstMachine);
    return;
  }
  if (briefLetters.length !== AANTAL) {
    fx.fout();
    melding(vul(T.precies, { Aantal: P1.lettersVoluit }));
    return;
  }
  fx.typmachine();
  fx.lade();
  const letters = [...briefLetters];
  await zetBrief(sessie, letters);
  // De Schrijver leest de doorslag na: staat er het woord uit het briefje?
  const woord = doorslagWoord(letters);
  if (await antwoordKlopt(woord.toLowerCase(), P1.woordHash)) {
    melding(T.doorslagGemaakt);
    return;
  }
  hulp.poging('p1', 'fout');
  void registreerPoging(sessie, 'p1', 'fout', woord);
  melding(vul(T.doorslagFout, { woord }));
});

/** Het woord op de doorslag: de dieper aangeslagen letters in leesvolgorde. */
function doorslagWoord(letters: number[]): string {
  return [...letters]
    .sort((a, b) => a - b)
    .map(i => BRIEFTEKST[i] ?? '')
    .join('');
}

document.getElementById('btn-gom')?.addEventListener('click', async () => {
  if (puzzels['p1']) {
    melding(T.briefGelezen);
    return;
  }
  briefLetters = [];
  fx.lade();
  await gomBrief(sessie);
  bouwTypvel();
  tekenBriefStatus();
  document.getElementById('s-brief')?.classList.remove('klaar');
});

function tekenBrief(): void {
  const verstuurd = !!dua.brief?.verstuurd;
  document.getElementById('s-brief')?.classList.toggle('klaar', verstuurd);
  // Verstuurd: de doorslag telt. Anders de gedeelde (nog niet verstuurde) keuze,
  // zodat een tweede speler meekijkt en een herlaad niets kwijtraakt.
  const bron = verstuurd ? dua.brief?.letters : dua.letterKeuze;
  const nieuw = (bron ?? '').split(',').filter(Boolean).map(Number);
  if (nieuw.join(',') !== briefLetters.join(',')) {
    briefLetters = nieuw;
    bouwTypvel();
  }
  tekenBriefStatus();
}

// ═══════════════════ P2: WACHTER & KLUIS ═══════════════════
// De wachter loopt op de gedeelde servertijd: elke 1934-speler ziet hem op
// dezelfde plek, dus "buiten zicht" betekent voor iedereen hetzelfde.
const WACHTER_MIN = 2;
const WACHTER_MAX = 96;

function wachterPositie(): number {
  // Procent per seconde (voorheen 1,6 of 2,6 procent per tik van 120 ms).
  const snelheid = toezichtVerscherpt ? 21.67 : 13.33;
  const baan = WACHTER_MAX - WACHTER_MIN;
  const afstand = ((serverNu() / 1000) * snelheid) % (2 * baan);
  return WACHTER_MIN + (afstand < baan ? afstand : 2 * baan - afstand);
}

setInterval(() => {
  const pos = wachterPositie();
  const w = document.getElementById('wachter');
  if (w) w.style.left = `${pos}%`;
  if (pos < 30 && Math.random() < 0.25 && !dua.kluisNummer) fx.voetstap();
}, 120);

const wachterVeilig = (): boolean => wachterPositie() >= 65;

document.getElementById('btn-deponeer')?.addEventListener('click', async () => {
  if (!puzzels['p1']) {
    fx.fout();
    melding(T.eerstBrief);
    return;
  }
  if (dua.kluisNummer) {
    melding(vul(T.alInKluis, { nummer: dua.kluisNummer }));
    return;
  }
  const v = requireEl<HTMLInputElement>('kluis-keuze').value.replace(/\D/g, '');
  if (!/^\d{2}$/.test(v)) {
    fx.fout();
    melding(T.tweeCijfers);
    return;
  }
  // Eerst het nummer: een verkeerde kluis zou 2034 later laten vastlopen.
  const oordeel = await beoordeelAntwoord(v, DUA_HASHES.kluis ?? [], DUA_REGELS.kluis);
  if (oordeel !== 'juist') {
    fx.fout();
    hulp.poging('p2', oordeel);
    void registreerPoging(sessie, 'p2', oordeel, v);
    melding(oordeel === 'bijna' ? tekst().bijna.kluis : T.kluisFout);
    return;
  }
  if (!wachterVeilig()) {
    await verhoogVerdenking(sessie, 15);
    fx.fluitje();
    speelStem('wachter');
    melding(T.betrapt);
    requireEl('kluis-status').textContent = T.betraptStatus;
    return;
  }
  fx.stoom();
  fx.lade();
  await zetKluisNummer(sessie, v);
  melding(vul(T.gedeponeerd, { nummer: v }));
});

function tekenKluis(): void {
  if (!dua.kluisNummer) return;
  document.getElementById('s-kluis')?.classList.add('klaar');
  requireEl('kluis-status').textContent = vul(T.kluisStatus, { nummer: dua.kluisNummer });
}

// ═══════════════════ P4: DE WERKKAMER ═══════════════════
// Eén gedeelde klok (dua.kamerEinde, servertijd): alle 1934-spelers zien de kamer
// en de aftelling, en de politiestraf valt precies één keer.
const KAMER_STATUS_STANDAARD = T.kamerStatus;
let sleutelGevonden = false;
let kamerAfgehandeld: number | null = null;
let vorigeKamerEinde: number | null | undefined;
let vorigePlek: string | null | undefined;
let verstopt = false;

const kamerRest = (): number =>
  dua.kamerEinde ? Math.ceil((dua.kamerEinde - serverNu()) / 1000) : 0;
const kamerBinnen = (): boolean => !!dua.kamerEinde && !dua.verstopPlek && kamerRest() > 0;

document.getElementById('btn-kamer')?.addEventListener('click', () => {
  if (dua.verstopPlek) {
    melding(vul(T.alVerstopt, { plek: plekNaam(dua.verstopPlek) }));
    return;
  }
  if (dua.kamerEinde) return; // een teamgenoot is al binnen
  const duur = toezichtVerscherpt ? 60 : 90;
  fx.lade();
  startKamer(sessie, serverNu() + duur * 1000).catch(() => {
    /* schrijf() toont de verbindingsbalk */
  });
});

// De klok tikt op elke 1934-pagina; de transactie zorgt dat de straf één keer valt.
setInterval(() => {
  const einde = dua.kamerEinde;
  if (!einde || dua.verstopPlek) return;
  const rest = kamerRest();
  if (rest > 0) {
    requireEl('kamer-timer').textContent = `${rest}s`;
    if (rest <= 10) fx.hartslag();
    return;
  }
  if (kamerAfgehandeld === einde) return;
  kamerAfgehandeld = einde;
  void kamerVerlopen(sessie, einde)
    .then(async eerste => {
      if (!eerste) return; // een andere tab was eerst
      await verhoogVerdenking(sessie, 10);
      fx.fluitje();
    })
    .catch(() => {
      /* schrijf() toont de verbindingsbalk */
    });
}, 1000);

document.querySelectorAll<SVGElement>('#kamer [data-plek]').forEach(el => {
  el.addEventListener('click', async () => {
    if (!kamerBinnen() || verstopt) return;
    const plek = el.getAttribute('data-plek');
    if (!plek) return;
    if (!sleutelGevonden) {
      if (plek === 'vensterbank') {
        sleutelGevonden = true;
        fx.klik();
        requireEl('kamer-status').textContent = T.sleutelGevonden;
      } else {
        fx.fout();
        requireEl('kamer-status').textContent = T.niets;
      }
      return;
    }
    if (plek === 'vensterbank') {
      fx.fout();
      requireEl('kamer-status').textContent = T.geenBergplaats;
      return;
    }
    verstopt = true;
    fx.lade();
    try {
      await verstopMapje(sessie, plek);
      melding(T.kamerVerzegeld);
    } catch {
      /* schrijf() toont de verbindingsbalk */
    } finally {
      verstopt = false;
    }
  });
});

function tekenKamer(): void {
  const plek = dua.verstopPlek ?? null;
  const einde = dua.kamerEinde ?? null;
  const eerstePaint = vorigePlek === undefined;
  const binnen = !plek && !!einde;
  document.getElementById('s-kamer')?.classList.toggle('klaar', !!plek);
  requireEl('kamer').style.display = binnen ? 'block' : 'none';
  requireEl<HTMLButtonElement>('btn-kamer').style.display =
    plek || binnen ? 'none' : 'inline-block';

  if (plek) {
    requireEl('kamer-status').textContent = vul(T.mapjeVerstopt, { plek: plekNaam(plek) });
  } else if (!binnen) {
    requireEl('kamer-status').textContent = KAMER_STATUS_STANDAARD;
  }
  if (!binnen) requireEl('kamer-timer').textContent = '';

  // Nieuwe ronde in de kamer: de sleutel moet opnieuw gezocht worden.
  if (binnen && !vorigeKamerEinde) {
    sleutelGevonden = false;
    requireEl('kamer-status').textContent = T.nieuweRonde;
  }
  if (!eerstePaint) {
    if (vorigePlek && !plek && !puzzels['p4']) {
      melding(T.inBeslag);
    }
    if (vorigeKamerEinde && !einde && !plek) {
      melding(T.politie);
    }
  }
  vorigePlek = plek;
  vorigeKamerEinde = einde;
}

// ═══════════════════ P5: DE BERGPLAATS ═══════════════════
document.getElementById('kaart-1934')?.addEventListener('click', async (e: Event) => {
  const doel = (e.target as Element).getAttribute?.('data-plek');
  if (!doel) {
    fx.fout();
    return;
  }
  if (dua.pin1934) {
    melding(T.keuzeGemaakt);
    return;
  }
  if (!puzzels['p4']) {
    fx.fout();
    melding(T.nogNiet);
    return;
  }
  fx.lade();
  await zetPin1934(sessie, doel);
  melding(T.paneelVerstopt);
});

function tekenPin(): void {
  document.getElementById('s-pin')?.classList.toggle('klaar', !!dua.pin1934);
  requireEl('pin-status').textContent = dua.pin1934 ? T.pinStatus : '';
}

// ═══════════════════ FINALE: BRIEF 14 ═══════════════════
document.getElementById('btn-brief14')?.addEventListener('click', async () => {
  const tekst = requireEl<HTMLTextAreaElement>('brief14').value.trim();
  if (tekst.length < 20) {
    fx.fout();
    melding(T.meerWoorden);
    return;
  }
  fx.typmachine();
  try {
    await zetBrief14(sessie, tekst);
  } catch {
    // Een teamgenoot was je voor (de regels laten maar één brief toe): dan stuurt
    // de live sync je hieronder gewoon door. Anders blijft de verbindingsbalk staan.
    if (!dua.brief14?.klaar) return;
  }
  gaNaarEinde();
});

let naarEinde = false;
function gaNaarEinde(): void {
  if (naarEinde) return;
  naarEinde = true;
  window.location.href = `einde.html?sessie=${encodeURIComponent(sessie)}&era=1934`;
}

// ═══════════════════ LIVE SYNC ═══════════════════
luisterDua(sessie, nieuw => {
  dua = nieuw;
  tekenZegel();
  tekenBrief();
  tekenKluis();
  tekenKamer();
  tekenPin();
  tekenHamers();
  // Is de veertiende brief al geschreven (ook door een teamgenoot, of vóór een
  // herlaad), dan is er voor 1934 niets meer te doen.
  if (dua.brief14?.klaar) gaNaarEinde();
});

luisterNaarStatus(sessie, p => {
  const hadP5 = !!puzzels['p5'];
  puzzels = p;
  tekenVoortgang(p);
  tekenZegel();
  registreerVrijgaves(sessie, p, DUA_VRIJGAVE);
  hulp.status(p);
  // Na P1 is een nieuw vel niet meer nodig.
  const gom = document.getElementById('btn-gom');
  if (gom) gom.hidden = !!p['p1'];
  // P5 net opgelost → kerkklok + brief 14 tonen
  if (!hadP5 && p['p5']) {
    fx.kerkklok(5);
    speelStem('finale-1934', { eenmalig: `${sessie}:finale-1934` });
    document.getElementById('s-brief14')?.classList.remove('verborgen');
    melding(T.plekGevonden);
  }
  // P4 mislukt (mapje in beslag genomen): 2034 zet verstopPlek terug op null
  document.getElementById('s-pin')?.classList.toggle('slot', !ontgrendeld(p, 5) && !p['p5']);
});

// ═══════════════════ OPSTART ═══════════════════
maakSvgToegankelijk('#kamer [data-plek], #kaart-1934 [data-plek]');
herstelHints(sessie);
controleerSessie(sessie);
koppelMuteKnop();
koppelTypgeluid();
startSfeer('1934');
speelStem('intro-1934', { eenmalig: `${sessie}:intro-1934` });
koppelEasterEggs(sessie);
koppelMeta(sessie, meta => {
  toezichtVerscherpt = (meta.verdenking || 0) >= 50;
});
startDuaTimer(sessie);

// Host kan de sessie deactiveren → naar het tijd-voorbij-scherm
bewaakSessieGesloten(sessie, () => {
  window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(sessie)}`;
});
