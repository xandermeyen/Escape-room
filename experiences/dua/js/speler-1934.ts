/**
 * speler-1934.ts — de kant van D.U.A.
 * Schrijft state naar Firebase (zegel, brief, kluis, verstopplek, pin)
 * en leeft onder politiedruk: wachter, werkkamer-klok en verdenking.
 */
import '../../../shared/js/sentry.ts';
import { luisterNaarStatus } from '../../../shared/js/session.ts';
import {
  luisterDua, zetZegel, zetBrief, gomBrief, zetKluisNummer,
  zetVerstopPlek, zetPin1934, zetBrief14, verhoogVerdenking,
  BRIEFTEKST, type DuaState,
} from './dua-session.ts';
import {
  melding, startDuaTimer, koppelMeta, tekenVoortgang, ontgrendeld,
  duaHint, koppelMuteKnop, koppelEasterEggs, leesSessie, type PuzzelStatus,
} from './dua-ui.ts';
import { fx, koppelTypgeluid } from './dua-audio.ts';

const sessie = leesSessie()!;
const rol = new URLSearchParams(window.location.search).get('rol') ?? 'schrijver';

document.getElementById('sys-case')!.textContent = `D.U.A. · Dossier 1934/RR · Sessie ${sessie}`;
document.getElementById('sys-rol')!.textContent = `1934 · ${rol === 'loper' ? 'De Loper' : 'De Schrijver'}`;

// ── Lokale spiegel van de gedeelde state ──
let dua: DuaState = {};
let puzzels: PuzzelStatus = {};
let toezichtVerscherpt = false;

// ── Hints globaal voor onclick ──
declare global {
  interface Window { duaHintKlik: (blokId: string) => void; }
}
window.duaHintKlik = (blokId: string) => duaHint(sessie, blokId);

// ═══════════════════ P0: HET ZEGEL ═══════════════════
document.getElementById('zegelknop')?.addEventListener('click', async () => {
  if (dua.p0zegel) return;
  fx.lade();
  await zetZegel(sessie);
  melding('Het zegel staat. Vraag 2034 wat er zonet bij hen verscheen.');
});

function tekenZegel(): void {
  if (!dua.p0zegel) return;
  document.getElementById('zegel-toon')!.innerHTML = '<span class="zegel">D.U.A.</span>';
  (document.getElementById('zegelknop') as HTMLButtonElement).style.display = 'none';
  document.getElementById('s-zegel')?.classList.add('klaar');
}

// ═══════════════════ P1a: HAMERPUZZEL ═══════════════════
const HAMER_SLOTS = ['K', 'N', 'R', 'S', 'T', 'U'];
const hamers = ['R', 'U', 'K', 'T', 'S', 'N'];
let hamerSel = -1;
let hamersHersteld = false;

function bouwHamers(): void {
  const rij = document.getElementById('hamerrij')!;
  rij.innerHTML = '';
  hamers.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'hamerslot';
    // Veilig: HAMER_SLOTS is een vaste constante, geen externe invoer.
    // eslint-disable-next-line no-unsanitized/property
    div.innerHTML = `<div class="label">vak ${HAMER_SLOTS[i]}</div>`;
    const knop = document.createElement('div');
    knop.className = `hamer${i === hamerSel ? ' gekozen' : ''}${hamersHersteld ? ' goedzo' : ''}`;
    knop.textContent = h;
    knop.addEventListener('click', () => hamerKlik(i));
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
    [hamers[hamerSel], hamers[i]] = [hamers[i]!, hamers[hamerSel]!];
    hamerSel = -1;
    fx.typDiep();
    if (hamers.every((h, j) => h === HAMER_SLOTS[j])) {
      hamersHersteld = true;
      document.getElementById('s-hamers')?.classList.add('klaar');
      document.getElementById('hamer-status')!.textContent = 'Mechaniek hersteld. De machine wacht op de Schrijver.';
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

function bouwTypvel(): void {
  const vel = document.getElementById('typvel')!;
  vel.innerHTML = '';
  [...BRIEFTEKST].forEach((ch, i) => {
    const span = document.createElement('span');
    span.textContent = ch;
    if (/[A-Z]/.test(ch)) {
      span.className = 'lt' + (briefLetters.includes(i) ? ' diep' : '');
      span.addEventListener('click', () => kiesLetter(i));
    }
    vel.appendChild(span);
  });
}

function kiesLetter(i: number): void {
  if (!hamersHersteld) { fx.fout(); melding('De typemachine is stuk. Herstel eerst de letterhamers.'); return; }
  if (dua.brief?.verstuurd) return;
  const idx = briefLetters.indexOf(i);
  if (idx > -1) { briefLetters.splice(idx, 1); fx.klik(); }
  else if (briefLetters.length < 5) { briefLetters.push(i); fx.typDiep(); }
  else { fx.fout(); }
  bouwTypvel();
  document.getElementById('brief-status')!.textContent = briefLetters.length < 5
    ? `Nog ${5 - briefLetters.length} letters te kiezen.`
    : 'Vijf letters gekozen. Sla door wanneer je zeker bent.';
}
bouwTypvel();

document.getElementById('btn-verstuur')?.addEventListener('click', async () => {
  if (!hamersHersteld) { fx.fout(); melding('Eerst de machine herstellen.'); return; }
  if (briefLetters.length !== 5) { fx.fout(); melding('Vijf letters. Niet meer, niet minder.'); return; }
  fx.typmachine(); fx.lade();
  await zetBrief(sessie, briefLetters);
  melding('Doorslag gemaakt. In 2034 ligt er nu een brief in het archief.');
});

document.getElementById('btn-gom')?.addEventListener('click', async () => {
  briefLetters = [];
  fx.lade();
  await gomBrief(sessie);
  bouwTypvel();
  document.getElementById('brief-status')!.textContent = 'Nog 5 letters te kiezen.';
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
  if (wachterPos >= 96) { wachterPos = 96; wachterDir = -1; }
  if (wachterPos <= 2)  { wachterPos = 2;  wachterDir = 1; }
  const w = document.getElementById('wachter');
  if (w) w.style.left = `${wachterPos}%`;
  if (wachterPos < 30 && Math.random() < 0.25 && !dua.kluisNummer) fx.voetstap();
}, 120);

const wachterVeilig = (): boolean => wachterPos >= 65;

document.getElementById('btn-deponeer')?.addEventListener('click', async () => {
  if (!puzzels['p1']) { fx.fout(); melding('Eerst de brief (P1): zonder belofte op papier heeft een kluis geen zin.'); return; }
  if (dua.kluisNummer) { melding(`Het paneel ligt al in kluis ${dua.kluisNummer}.`); return; }
  const v = (document.getElementById('kluis-keuze') as HTMLInputElement).value.trim();
  if (!/^\d{2}$/.test(v)) { fx.fout(); melding('Twee cijfers.'); return; }
  if (!wachterVeilig()) {
    await verhoogVerdenking(sessie, 15);
    fx.fluitje();
    melding('⚠ De perronwachter zag je bij de kluizen rommelen. Verdenking +15%');
    document.getElementById('kluis-status')!.textContent = 'Betrapt. Wacht tot hij écht buiten zicht is (rechts op de baan).';
    return;
  }
  fx.stoom(); fx.lade();
  await zetKluisNummer(sessie, v);
  melding(`Paneel gedeponeerd in kluis ${v}. Het ticket reist naar 2034, half onleesbaar.`);
});

function tekenKluis(): void {
  if (!dua.kluisNummer) return;
  document.getElementById('s-kluis')?.classList.add('klaar');
  document.getElementById('kluis-status')!.textContent =
    `Paneel gedeponeerd in kluis ${dua.kluisNummer}. Nu is het wachten op 2034.`;
}

// ═══════════════════ P4: DE WERKKAMER ═══════════════════
let kamerInterval: ReturnType<typeof setInterval> | null = null;
let kamerActief = false;
let kamerTijd = 0;
let sleutelGevonden = false;

document.getElementById('btn-kamer')?.addEventListener('click', () => {
  if (dua.verstopPlek) { melding(`Het mapje is al verstopt (${dua.verstopPlek}). Nu is het aan 2034.`); return; }
  kamerActief = true;
  sleutelGevonden = false;
  kamerTijd = toezichtVerscherpt ? 60 : 90;
  document.getElementById('kamer')!.style.display = 'block';
  (document.getElementById('btn-kamer') as HTMLButtonElement).style.display = 'none';
  document.getElementById('kamer-status')!.textContent = 'Vind eerst de sleutel. "Waar het licht valt."';
  fx.lade();
  kamerInterval = setInterval(async () => {
    kamerTijd--;
    document.getElementById('kamer-timer')!.textContent = `${kamerTijd}s`;
    if (kamerTijd <= 10) fx.hartslag();
    if (kamerTijd <= 0) {
      kamerUit();
      await verhoogVerdenking(sessie, 10);
      fx.fluitje();
      melding('⚠ De politie staat voor de deur. Wegwezen, zonder iets te verstoppen. Verdenking +10%');
    }
  }, 1000);
});

function kamerUit(): void {
  if (kamerInterval) clearInterval(kamerInterval);
  kamerActief = false;
  document.getElementById('kamer')!.style.display = 'none';
  (document.getElementById('btn-kamer') as HTMLButtonElement).style.display = 'inline-block';
  document.getElementById('kamer-timer')!.textContent = '';
}

document.querySelectorAll<SVGElement>('#kamer [data-plek]').forEach(el => {
  el.addEventListener('click', async () => {
    if (!kamerActief) return;
    const plek = el.getAttribute('data-plek')!;
    if (!sleutelGevonden) {
      if (plek === 'vensterbank') {
        sleutelGevonden = true;
        fx.klik();
        document.getElementById('kamer-status')!.textContent =
          'De sleutel, in het late zonlicht. Kies nu de bergplaats voor het mapje. Kies goed: één kans.';
      } else {
        fx.fout();
        document.getElementById('kamer-status')!.textContent = 'Niets. De seconden tikken. "Waar het licht valt..."';
      }
      return;
    }
    if (plek === 'vensterbank') {
      fx.fout();
      document.getElementById('kamer-status')!.textContent = 'Daar lag de sleutel. Geen bergplaats.';
      return;
    }
    if (kamerInterval) clearInterval(kamerInterval);
    kamerActief = false;
    fx.lade();
    document.getElementById('kamer-timer')!.textContent = '';
    await zetVerstopPlek(sessie, plek);
    melding('De werkkamer is verzegeld in de tijd. 2034 kan zoeken zodra P2 en P3 rond zijn.');
  });
});

function tekenKamer(): void {
  const plek = dua.verstopPlek;
  document.getElementById('s-kamer')?.classList.toggle('klaar', !!plek);
  if (plek) {
    document.getElementById('kamer')!.style.display = 'none';
    document.getElementById('kamer-status')!.textContent = `Mapje verstopt: ${plek}. Honderd jaar wachten maar.`;
  }
}

// ═══════════════════ P5: DE BERGPLAATS ═══════════════════
document.getElementById('kaart-1934')?.addEventListener('click', async (e: Event) => {
  const doel = (e.target as Element).getAttribute?.('data-plek');
  if (!doel) { fx.fout(); return; }
  if (dua.pin1934) { melding('De keuze is gemaakt. Vraag 2034 om te zoeken.'); return; }
  if (!puzzels['p4']) { fx.fout(); melding('Nog niet. Eerst moet het mapje (P4) veilig de eeuw door.'); return; }
  fx.lade();
  await zetPin1934(sessie, doel);
  melding('Het paneel is verstopt. Spreek er met niemand over. Behalve in raadsels.');
});

function tekenPin(): void {
  document.getElementById('s-pin')?.classList.toggle('klaar', !!dua.pin1934);
  document.getElementById('pin-status')!.textContent = dua.pin1934
    ? 'Het paneel is verstopt. 2034 moet dezelfde plek aanduiden, zonder dat jullie ze noemen.'
    : '';
}

// ═══════════════════ FINALE: BRIEF 14 ═══════════════════
document.getElementById('btn-brief14')?.addEventListener('click', async () => {
  const tekst = (document.getElementById('brief14') as HTMLTextAreaElement).value.trim();
  if (tekst.length < 20) { fx.fout(); melding('Een brief die honderd jaar moet overleven, verdient meer woorden.'); return; }
  fx.typmachine();
  await zetBrief14(sessie, tekst);
  window.location.href = `einde.html?sessie=${encodeURIComponent(sessie)}&era=1934`;
});

// ═══════════════════ LIVE SYNC ═══════════════════
luisterDua(sessie, (nieuw) => {
  dua = nieuw;
  tekenZegel();
  tekenBrief();
  tekenKluis();
  tekenKamer();
  tekenPin();
});

luisterNaarStatus(sessie, (p) => {
  const hadP5 = !!puzzels['p5'];
  puzzels = p;
  tekenVoortgang(p);
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
koppelMuteKnop();
koppelTypgeluid();
koppelEasterEggs(sessie);
koppelMeta(sessie, (meta) => { toezichtVerscherpt = (meta.verdenking || 0) >= 50; });
startDuaTimer(sessie);
