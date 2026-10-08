/**
 * speler-1934.ts — de kant van D.U.A.
 * Schrijft state naar Firebase (zegel, brief, kluis, verstopplek, pin)
 * en leeft onder politiedruk: wachter, werkkamer-klok en verdenking.
 */
import '../../../shared/js/sentry.ts';
import { luisterNaarStatus, bewaakSessieGesloten } from '../../../shared/js/session.ts';
import { requireEl, beoordeelAntwoord, koppelHints } from '../../../shared/js/utils.ts';
import {
  registreerPoging,
  registreerVrijgaves,
  luisterNaarHints,
  puzzelUitHintBlok,
} from '../../../shared/js/speldata.ts';
import { initHulp } from '../../../shared/js/hulp.ts';
import { koppelDemoModus } from '../../../shared/js/demo.ts';
import { DUA_HASHES, DUA_REGELS, DUA_VRIJGAVE, DUA_BIJNA_KLUIS } from './dua-config.ts';
import { DUA_INACTIEF, DUA_HULP_HTML, duaVrijgaveMelding } from './dua-hulp.ts';
import {
  luisterDua,
  zetZegel,
  zetBrief,
  gomBrief,
  zetKluisNummer,
  zetVerstopPlek,
  zetPin1934,
  zetBrief14,
  verhoogVerdenking,
  BRIEFTEKST,
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
  leesSessie,
  maakSvgToegankelijk,
  type PuzzelStatus,
} from './dua-ui.ts';
import { fx, koppelTypgeluid } from './dua-audio.ts';

const sessie = leesSessie();
const rol = new URLSearchParams(window.location.search).get('rol') ?? 'schrijver';

requireEl('sys-case').textContent = `D.U.A. · Dossier 1934/RR · Sessie ${sessie}`;
requireEl('sys-rol').textContent = `1934 · ${rol === 'loper' ? 'De Loper' : 'De Schrijver'}`;

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
  inactiefMeldingen: DUA_INACTIEF['1934'],
  vrijgaveMelding: (oud, nieuw) => duaVrijgaveMelding('1934', oud, nieuw),
  hulpHtml: DUA_HULP_HTML,
});

// ── Speldata: geopende hintstappen van 1934 ──
luisterNaarHints(sessie, blokId => {
  const puzzel = puzzelUitHintBlok(blokId);
  return puzzel ? { puzzel, rol: '1934' } : null;
});

// ── Hints globaal voor onclick ──
koppelHints(blokId => duaHint(sessie, blokId));

// ═══════════════════ P0: HET ZEGEL ═══════════════════
document.getElementById('zegelknop')?.addEventListener('click', async () => {
  if (dua.p0zegel) return;
  fx.lade();
  await zetZegel(sessie);
  melding('Het zegel staat. Vraag 2034 wat er zonet bij hen verscheen.');
});

function tekenZegel(): void {
  if (!dua.p0zegel) return;
  requireEl('zegel-toon').innerHTML = '<span class="zegel">D.U.A.</span>';
  requireEl<HTMLButtonElement>('zegelknop').style.display = 'none';
  document.getElementById('s-zegel')?.classList.add('klaar');
}

// ═══════════════════ P1a: HAMERPUZZEL ═══════════════════
const HAMER_SLOTS = ['K', 'N', 'R', 'S', 'T', 'U'];
const hamers = ['R', 'U', 'K', 'T', 'S', 'N'];
let hamerSel = -1;
let hamersHersteld = false;

function bouwHamers(): void {
  const rij = requireEl('hamerrij');
  rij.innerHTML = '';
  hamers.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'hamerslot';
    // Veilig: HAMER_SLOTS is een vaste constante, geen externe invoer.
    // eslint-disable-next-line no-unsanitized/property
    div.innerHTML = `<div class="label">vak ${HAMER_SLOTS[i]}</div>`;
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = `hamer${i === hamerSel ? ' gekozen' : ''}${hamersHersteld ? ' goedzo' : ''}`;
    knop.textContent = h;
    knop.setAttribute('aria-label', `Hamer ${h} in vak ${HAMER_SLOTS[i]}`);
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

function hamerKlik(i: number): void {
  if (hamersHersteld) return;
  if (!puzzels['p0']) {
    fx.fout();
    melding('Doe eerst de handdruk (oefenronde ⓪): zo leren jullie hoe de tijd werkt.');
    return;
  }
  fx.klik();
  if (hamerSel < 0) {
    hamerSel = i;
  } else {
    [hamers[hamerSel], hamers[i]] = [hamers[i] ?? '', hamers[hamerSel] ?? ''];
    hamerSel = -1;
    fx.typDiep();
    if (hamers.every((h, j) => h === HAMER_SLOTS[j])) {
      hamersHersteld = true;
      document.getElementById('s-hamers')?.classList.add('klaar');
      requireEl('hamer-status').textContent =
        'Mechaniek hersteld. De machine wacht op de Schrijver.';
      document.getElementById('s-brief')?.classList.remove('slot');
      fx.kerkklok(1);
      melding('De typemachine doet het weer.');
    }
  }
  bouwHamers();
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
  if (!hamersHersteld) {
    fx.fout();
    melding('De typemachine is stuk. Herstel eerst de letterhamers.');
    return;
  }
  if (dua.brief?.verstuurd) return;
  const idx = briefLetters.indexOf(i);
  if (idx > -1) {
    briefLetters.splice(idx, 1);
    fx.klik();
  } else if (briefLetters.length < 5) {
    briefLetters.push(i);
    fx.typDiep();
  } else {
    fx.fout();
  }
  bouwTypvel();
  requireEl('brief-status').textContent =
    briefLetters.length < 5
      ? `Nog ${5 - briefLetters.length} letters te kiezen.`
      : 'Vijf letters gekozen. Sla door wanneer je zeker bent.';
}
bouwTypvel();

document.getElementById('btn-verstuur')?.addEventListener('click', async () => {
  if (!hamersHersteld) {
    fx.fout();
    melding('Eerst de machine herstellen.');
    return;
  }
  if (briefLetters.length !== 5) {
    fx.fout();
    melding('Vijf letters. Niet meer, niet minder.');
    return;
  }
  fx.typmachine();
  fx.lade();
  await zetBrief(sessie, briefLetters);
  melding('Doorslag gemaakt. In 2034 ligt er nu een brief in het archief.');
});

document.getElementById('btn-gom')?.addEventListener('click', async () => {
  if (puzzels['p1']) {
    melding('2034 heeft de brief al gelezen. Een nieuw vel is niet meer nodig.');
    return;
  }
  briefLetters = [];
  fx.lade();
  await gomBrief(sessie);
  bouwTypvel();
  requireEl('brief-status').textContent = 'Nog 5 letters te kiezen.';
  document.getElementById('s-brief')?.classList.remove('klaar');
});

function tekenBrief(): void {
  const verstuurd = !!dua.brief?.verstuurd;
  document.getElementById('s-brief')?.classList.toggle('klaar', verstuurd);
  if (verstuurd && dua.brief?.letters) {
    briefLetters = dua.brief.letters.split(',').filter(Boolean).map(Number);
    bouwTypvel();
  }
}

// ═══════════════════ P2: WACHTER & KLUIS ═══════════════════
let wachterPos = 10;
let wachterDir = 1;

setInterval(() => {
  const snelheid = toezichtVerscherpt ? 2.6 : 1.6;
  wachterPos += wachterDir * snelheid;
  if (wachterPos >= 96) {
    wachterPos = 96;
    wachterDir = -1;
  }
  if (wachterPos <= 2) {
    wachterPos = 2;
    wachterDir = 1;
  }
  const w = document.getElementById('wachter');
  if (w) w.style.left = `${wachterPos}%`;
  if (wachterPos < 30 && Math.random() < 0.25 && !dua.kluisNummer) fx.voetstap();
}, 120);

const wachterVeilig = (): boolean => wachterPos >= 65;

document.getElementById('btn-deponeer')?.addEventListener('click', async () => {
  if (!puzzels['p1']) {
    fx.fout();
    melding('Eerst de brief (P1): zonder belofte op papier heeft een kluis geen zin.');
    return;
  }
  if (dua.kluisNummer) {
    melding(`Het paneel ligt al in kluis ${dua.kluisNummer}.`);
    return;
  }
  const v = requireEl<HTMLInputElement>('kluis-keuze').value.replace(/\D/g, '');
  if (!/^\d{2}$/.test(v)) {
    fx.fout();
    melding('Twee cijfers.');
    return;
  }
  // Eerst het nummer: een verkeerde kluis zou 2034 later laten vastlopen.
  const oordeel = await beoordeelAntwoord(v, DUA_HASHES.kluis ?? [], DUA_REGELS.kluis);
  if (oordeel !== 'juist') {
    fx.fout();
    hulp.poging('p2', oordeel);
    void registreerPoging(sessie, 'p2', oordeel);
    melding(
      oordeel === 'bijna'
        ? DUA_BIJNA_KLUIS
        : 'Dat nummer past niet bij de belofte in de brief. Lees ze nog eens: één meer dan het aantal brieven dat het bisdom telt.',
    );
    return;
  }
  if (!wachterVeilig()) {
    await verhoogVerdenking(sessie, 15);
    fx.fluitje();
    melding('⚠ De perronwachter zag je bij de kluizen rommelen. Verdenking +15%');
    requireEl('kluis-status').textContent =
      'Betrapt. Wacht tot hij écht buiten zicht is (rechts op de baan).';
    return;
  }
  fx.stoom();
  fx.lade();
  await zetKluisNummer(sessie, v);
  melding(`Paneel gedeponeerd in kluis ${v}. Het ticket reist naar 2034, half onleesbaar.`);
});

function tekenKluis(): void {
  if (!dua.kluisNummer) return;
  document.getElementById('s-kluis')?.classList.add('klaar');
  requireEl('kluis-status').textContent =
    `Paneel gedeponeerd in kluis ${dua.kluisNummer}. Nu is het wachten op 2034.`;
}

// ═══════════════════ P4: DE WERKKAMER ═══════════════════
let kamerInterval: ReturnType<typeof setInterval> | null = null;
let kamerActief = false;
let kamerTijd = 0;
let sleutelGevonden = false;

document.getElementById('btn-kamer')?.addEventListener('click', () => {
  if (dua.verstopPlek) {
    melding(`Het mapje is al verstopt (${dua.verstopPlek}). Nu is het aan 2034.`);
    return;
  }
  kamerActief = true;
  sleutelGevonden = false;
  kamerTijd = toezichtVerscherpt ? 60 : 90;
  requireEl('kamer').style.display = 'block';
  requireEl<HTMLButtonElement>('btn-kamer').style.display = 'none';
  requireEl('kamer-status').textContent = 'Vind eerst de sleutel. "Waar het licht valt."';
  fx.lade();
  kamerInterval = setInterval(async () => {
    kamerTijd--;
    requireEl('kamer-timer').textContent = `${kamerTijd}s`;
    if (kamerTijd <= 10) fx.hartslag();
    if (kamerTijd <= 0) {
      kamerUit();
      await verhoogVerdenking(sessie, 10);
      fx.fluitje();
      melding(
        '⚠ De politie staat voor de deur. Wegwezen, zonder iets te verstoppen. Verdenking +10%',
      );
    }
  }, 1000);
});

function kamerUit(): void {
  if (kamerInterval) clearInterval(kamerInterval);
  kamerActief = false;
  requireEl('kamer').style.display = 'none';
  requireEl<HTMLButtonElement>('btn-kamer').style.display = 'inline-block';
  requireEl('kamer-timer').textContent = '';
}

document.querySelectorAll<SVGElement>('#kamer [data-plek]').forEach(el => {
  el.addEventListener('click', async () => {
    if (!kamerActief) return;
    const plek = el.getAttribute('data-plek');
    if (!plek) return;
    if (!sleutelGevonden) {
      if (plek === 'vensterbank') {
        sleutelGevonden = true;
        fx.klik();
        requireEl('kamer-status').textContent =
          'De sleutel, in het late zonlicht. Kies nu de bergplaats voor het mapje. Kies goed: één kans.';
      } else {
        fx.fout();
        requireEl('kamer-status').textContent =
          'Niets. De seconden tikken. "Waar het licht valt..."';
      }
      return;
    }
    if (plek === 'vensterbank') {
      fx.fout();
      requireEl('kamer-status').textContent = 'Daar lag de sleutel. Geen bergplaats.';
      return;
    }
    if (kamerInterval) clearInterval(kamerInterval);
    kamerActief = false;
    fx.lade();
    requireEl('kamer-timer').textContent = '';
    await zetVerstopPlek(sessie, plek);
    melding('De werkkamer is verzegeld in de tijd. 2034 kan zoeken zodra P2 en P3 rond zijn.');
  });
});

function tekenKamer(): void {
  const plek = dua.verstopPlek;
  document.getElementById('s-kamer')?.classList.toggle('klaar', !!plek);
  if (plek) {
    requireEl('kamer').style.display = 'none';
    requireEl('kamer-status').textContent = `Mapje verstopt: ${plek}. Honderd jaar wachten maar.`;
  }
}

// ═══════════════════ P5: DE BERGPLAATS ═══════════════════
document.getElementById('kaart-1934')?.addEventListener('click', async (e: Event) => {
  const doel = (e.target as Element).getAttribute?.('data-plek');
  if (!doel) {
    fx.fout();
    return;
  }
  if (dua.pin1934) {
    melding('De keuze is gemaakt. Vraag 2034 om te zoeken.');
    return;
  }
  if (!puzzels['p4']) {
    fx.fout();
    melding('Nog niet. Eerst moet het mapje (P4) veilig de eeuw door.');
    return;
  }
  fx.lade();
  await zetPin1934(sessie, doel);
  melding('Het paneel is verstopt. Spreek er met niemand over. Behalve in raadsels.');
});

function tekenPin(): void {
  document.getElementById('s-pin')?.classList.toggle('klaar', !!dua.pin1934);
  requireEl('pin-status').textContent = dua.pin1934
    ? 'Het paneel is verstopt. 2034 moet dezelfde plek aanduiden, zonder dat jullie ze noemen.'
    : '';
}

// ═══════════════════ FINALE: BRIEF 14 ═══════════════════
document.getElementById('btn-brief14')?.addEventListener('click', async () => {
  const tekst = requireEl<HTMLTextAreaElement>('brief14').value.trim();
  if (tekst.length < 20) {
    fx.fout();
    melding('Een brief die honderd jaar moet overleven, verdient meer woorden.');
    return;
  }
  fx.typmachine();
  await zetBrief14(sessie, tekst);
  window.location.href = `einde.html?sessie=${encodeURIComponent(sessie)}&era=1934`;
});

// ═══════════════════ LIVE SYNC ═══════════════════
luisterDua(sessie, nieuw => {
  dua = nieuw;
  tekenZegel();
  tekenBrief();
  tekenKluis();
  tekenKamer();
  tekenPin();
});

luisterNaarStatus(sessie, p => {
  const hadP5 = !!puzzels['p5'];
  puzzels = p;
  tekenVoortgang(p);
  registreerVrijgaves(sessie, p, DUA_VRIJGAVE);
  hulp.status(p);
  // Na P1 is een nieuw vel niet meer nodig.
  const gom = document.getElementById('btn-gom');
  if (gom) gom.hidden = !!p['p1'];
  // P5 net opgelost → kerkklok + brief 14 tonen
  if (!hadP5 && p['p5']) {
    fx.kerkklok(5);
    document.getElementById('s-brief14')?.classList.remove('verborgen');
    melding('2034 heeft de plek gevonden. Schrijf de veertiende brief.');
  }
  // P4 mislukt (mapje in beslag genomen): 2034 zet verstopPlek terug op null
  document.getElementById('s-pin')?.classList.toggle('slot', !ontgrendeld(p, 5) && !p['p5']);
});

// ═══════════════════ OPSTART ═══════════════════
maakSvgToegankelijk('#kamer [data-plek], #kaart-1934 [data-plek]');
koppelMuteKnop();
koppelTypgeluid();
koppelEasterEggs(sessie);
koppelMeta(sessie, meta => {
  toezichtVerscherpt = (meta.verdenking || 0) >= 50;
});
startDuaTimer(sessie);

// Host kan de sessie deactiveren → naar het tijd-voorbij-scherm
bewaakSessieGesloten(sessie, () => {
  window.location.href = `tijd-voorbij.html?sessie=${encodeURIComponent(sessie)}`;
});
