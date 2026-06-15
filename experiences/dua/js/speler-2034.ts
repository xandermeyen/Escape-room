/**
 * speler-2034.ts — Bureau X, honderd jaar later.
 * Leest live wat 1934 achterliet en lost de puzzels op.
 * Antwoorden staan als SHA-256 hash in de bundle (zelfde aanpak als kamer-14).
 */
import '../../../shared/js/sentry.ts';
import { luisterNaarStatus, puzzelVoltooid, sluitSessie } from '../../../shared/js/session.ts';
import { antwoordKlopt } from '../../../shared/js/utils.ts';
import {
  luisterDua, zetVerstopPlek, zetPin1934, verhoogVerdenking,
  dienDuaRapportIn, zetBadge, BRIEFTEKST, DOORZOCHT, type DuaState,
} from './dua-session.ts';
import {
  melding, startDuaTimer, koppelMeta, tekenVoortgang, ontgrendeld,
  duaHint, koppelMuteKnop, koppelEasterEggs, leesSessie, type PuzzelStatus,
} from './dua-ui.ts';
import { fx, koppelTypgeluid } from './dua-audio.ts';

const sessie = leesSessie()!;
const rol = new URLSearchParams(window.location.search).get('rol') ?? 'archivaris';

document.getElementById('sys-case')!.textContent = `D.U.A. · Dossier 1934/RR · Sessie ${sessie}`;
document.getElementById('sys-rol')!.textContent =
  `2034 · ${rol === 'restaurateur' ? 'De Restaurateur' : 'De Archivaris'}`;

// Antwoord-hashes (sha256, lowercase): nooit plain-text in de bundle.
const HASH_WOORD = ['821713fad1075e18471e008705ef3f8a0a3e2bca4948efd750947808a012935c']; // P1
const HASH_ROUTE = ['2eab8676deafcd2510a31613085a1242fb15f413789aa73787d541aae745818d']; // P3
const HASH_PLEK  = ['a360c666cfc62f704fdf79dd29e11861f604a726877e077944e6fb24e829b04f']; // P5 overleeft de eeuw

let dua: DuaState = {};
let puzzels: PuzzelStatus = {};

declare global {
  interface Window { duaHintKlik: (blokId: string) => void; }
}
window.duaHintKlik = (blokId: string) => duaHint(sessie, blokId);

// ═══════════════════ P0: HET ZEGEL ═══════════════════
function tekenZegel(): void {
  if (!dua.p0zegel || puzzels['p0']) return;
  document.getElementById('zegel-tekst')!.textContent =
    'Op het vergeelde vel staat plots, honderd jaar oud en toch kraakvers:';
  document.getElementById('zegel-toon')!.innerHTML = '<span class="zegel">D.U.A.</span>';
  document.getElementById('zegel-actie')!.style.display = 'block';
}

document.getElementById('btn-zegel-bevestig')?.addEventListener('click', async () => {
  if (!dua.p0zegel || puzzels['p0']) return;
  fx.kerkklok(1, true);
  await puzzelVoltooid(sessie, 0);
  document.getElementById('zegel-actie')!.style.display = 'none';
  document.getElementById('s-zegel')?.classList.add('klaar');
  melding('De handdruk is compleet. Zo werkt dit spel: wat 1934 doet, vinden jullie. Aan het werk.');
});

// ═══════════════════ P1: DE DOORSLAG ═══════════════════
function briefWoord(): string {
  const letters = (dua.brief?.letters ?? '').split(',').filter(Boolean).map(Number);
  return letters.sort((a, b) => a - b).map(i => BRIEFTEKST[i]).join('');
}

function tekenDoorslag(): void {
  const inhoud = document.getElementById('doorslag-inhoud')!;
  const vraag = document.getElementById('doorslag-vraag')!;
  if (!dua.brief?.verstuurd) {
    inhoud.innerHTML = '<p class="hintje">Er ligt hier nog niets. In 1934 is de brief nog niet getypt…</p>';
    vraag.style.display = 'none';
    return;
  }
  const set = new Set((dua.brief.letters ?? '').split(',').filter(Boolean).map(Number));
  const p = document.createElement('p');
  [...BRIEFTEKST].forEach((ch, i) => {
    if (set.has(i)) {
      const b = document.createElement('span');
      b.className = 'doorgedrukt';
      b.textContent = ch;
      p.appendChild(b);
    } else {
      p.appendChild(document.createTextNode(ch));
    }
  });
  inhoud.innerHTML = '';
  inhoud.appendChild(p);
  vraag.style.display = puzzels['p1'] ? 'none' : 'block';
  document.getElementById('s-doorslag')?.classList.toggle('klaar', !!puzzels['p1']);
}

document.getElementById('btn-woord')?.addEventListener('click', async () => {
  if (!dua.brief?.verstuurd) { fx.fout(); melding('Er is nog geen doorslag. 1934 moet eerst typen.'); return; }
  const input = document.getElementById('ant-woord') as HTMLInputElement;
  const val = input.value.trim().toLowerCase();
  const woord = briefWoord().toLowerCase();

  if (val !== woord) {
    fx.fout();
    input.classList.add('fout');
    setTimeout(() => input.classList.remove('fout'), 1500);
    melding('Dat staat er niet. Kijk beter naar de doorgedrukte letters.');
    return;
  }
  if (await antwoordKlopt(woord, HASH_WOORD)) {
    fx.kerkklok(1, true);
    await puzzelVoltooid(sessie, 1);
    melding('P1 opgelost: de brieven wijzen naar een KLUIS. P2 en P3 liggen open.');
  } else {
    fx.fout();
    melding(`De doorslag spelt "${woord.toUpperCase()}". Dat betekent niets. 1934 zal opnieuw moeten typen (nieuw vel).`);
  }
});

// ═══════════════════ P2: DE KLUIS ═══════════════════
let draaiHoek = 0;
let draaiCijfer = 0;
let kluisInvoer = '';

function tekenTicket(): void {
  const inhoud = document.getElementById('ticket-inhoud')!;
  const spel = document.getElementById('kluis-spel')!;
  if (!dua.kluisNummer) {
    inhoud.innerHTML = '<p class="hintje">Bewijsstuk 7 (kluisticket) is nog niet aangetroffen.</p>';
    spel.style.display = 'none';
    return;
  }
  inhoud.innerHTML =
    `<p style="font-family:var(--font);font-size:18px;border:1px dashed #999;padding:10px;display:inline-block">` +
    `NOORDSTATION BRUSSEL · BAGAGEKLUIS Nr. ${dua.kluisNummer[0]}<span style="color:#bbb">▓</span> · 1934</p>` +
    `<p class="hintje">Het tweede cijfer is vervaagd. De brief zegt: één meer dan het aantal brieven dat het bisdom telt. ` +
    `Hoeveel verstuurde 1934 er werkelijk?</p>`;
  spel.style.display = puzzels['p2'] ? 'none' : 'block';
  document.getElementById('s-kluis')?.classList.toggle('klaar', !!puzzels['p2']);
}

document.getElementById('draaiknop')?.addEventListener('click', () => {
  if (puzzels['p2']) return;
  fx.klik();
  draaiCijfer = (draaiCijfer + 1) % 10;
  draaiHoek += 36;
  (document.getElementById('draaiknop') as HTMLElement).style.transform = `rotate(${draaiHoek}deg)`;
  document.getElementById('kluis-display')!.textContent = (kluisInvoer || '_') + draaiCijfer;
});

document.getElementById('draaiknop')?.addEventListener('dblclick', async () => {
  if (puzzels['p2'] || !dua.kluisNummer) return;
  kluisInvoer += draaiCijfer;
  fx.lade();
  document.getElementById('kluis-display')!.textContent = kluisInvoer.padEnd(2, '_');
  if (kluisInvoer.length >= 2) {
    if (kluisInvoer === dua.kluisNummer) {
      fx.kerkklok(2, true);
      await puzzelVoltooid(sessie, 2);
      melding('P2 opgelost: de kluis zwaait open. Johannes de Doper, ongeschonden.');
    } else {
      fx.fout();
      kluisInvoer = '';
      document.getElementById('kluis-display')!.textContent = '__';
      melding('Het slot weigert. Verkeerde kluis.');
    }
  }
});

// ═══════════════════ P3: DE GETUIGEN ═══════════════════
document.getElementById('btn-route')?.addEventListener('click', async () => {
  if (!puzzels['p1']) { fx.fout(); melding('Eerst P1: zonder de brief weet niemand waarnaar te zoeken.'); return; }
  const input = document.getElementById('ant-route') as HTMLInputElement;
  if (await antwoordKlopt(input.value.trim(), HASH_ROUTE)) {
    fx.kerkklok(3, true);
    await puzzelVoltooid(sessie, 3);
    document.getElementById('s-getuigen')?.classList.add('klaar');
    melding('P3 opgelost: sacristie, kooromgang, Vijdkapel, zijdeur. De buurman loog.');
  } else {
    fx.fout();
    input.classList.add('fout');
    setTimeout(() => input.classList.remove('fout'), 1500);
    melding('Die route klopt niet. Wie liegt er, en wat zag 1934 echt?');
  }
});

// ═══════════════════ P4: HET MUSEUM ═══════════════════
document.querySelectorAll<SVGElement>('#museum-spel [data-plek]').forEach(el => {
  el.addEventListener('click', async () => {
    if (puzzels['p4'] || !ontgrendeld(puzzels, 4)) return;
    if (!dua.verstopPlek) { fx.fout(); melding('1934 heeft nog niets verstopt. Letterlijk niets te vinden.'); return; }
    const plek = el.getAttribute('data-plek')!;
    if (plek !== dua.verstopPlek) {
      fx.fout();
      melding('Niets onder het stof. Vraag 1934 waar ze het lieten.');
      return;
    }
    if (DOORZOCHT.includes(plek)) {
      fx.fout(); fx.fluitje();
      melding('Het verslag loog niet: hier zocht de politie in december 1934. Het mapje is toen in beslag genomen. 1934 moet opnieuw, op een veiligere plek. Verdenking +15%');
      await verhoogVerdenking(sessie, 15);
      await zetVerstopPlek(sessie, null);
      return;
    }
    el.style.fill = '#2a523f';
    fx.kerkklok(4, true);
    await puzzelVoltooid(sessie, 4);
    melding('P4 opgelost: het mapje overleefde de huiszoeking. Doorslagen van dertien brieven en een laatste notitie.');
  });
});

// ═══════════════════ P5: HET STADSPLAN ═══════════════════
document.getElementById('kaart-2034')?.addEventListener('click', async (e: Event) => {
  if (puzzels['p5'] || !ontgrendeld(puzzels, 5)) return;
  const doel = (e.target as Element).getAttribute?.('data-plek');
  if (!doel) { fx.fout(); return; }
  if (!dua.pin1934) { fx.fout(); melding('1934 heeft het paneel nog niet verstopt. Er valt niets te vinden.'); return; }
  if (doel !== dua.pin1934) {
    fx.fout();
    melding('Niet hier. Stel betere vragen aan 1934. Zonder de plek te laten verklappen.');
    return;
  }
  if (!(await antwoordKlopt(doel, HASH_PLEK))) {
    fx.fout(); fx.fluitje();
    melding('Jullie vonden de plek… maar daar bleef niets bewaard: alles werd in de loop van de eeuw gerestaureerd, ontruimd of verbouwd. Het paneel is verloren. 1934 moet een betere plek kiezen. Verdenking +15%');
    await verhoogVerdenking(sessie, 15);
    await zetPin1934(sessie, null);
    return;
  }
  fx.kerkklok(5, true);
  await puzzelVoltooid(sessie, 5);
  melding('Gevonden. Honderd jaar later, exact waar het hoorde te zijn. In het volle zicht.');
});

// ═══════════════════ FINALE: HET RAPPORT ═══════════════════
document.getElementById('btn-rapport')?.addEventListener('click', async () => {
  const tekst = (document.getElementById('rapport') as HTMLTextAreaElement).value.trim();
  if (tekst.length < 20) { fx.fout(); melding('Een conclusie van Bureau X telt minstens een paar zinnen.'); return; }
  const knop = document.getElementById('btn-rapport') as HTMLButtonElement;
  knop.disabled = true;
  try {
    await dienDuaRapportIn(sessie, tekst);
    await sluitSessie(sessie);
    window.location.href = `einde.html?sessie=${encodeURIComponent(sessie)}&era=2034`;
  } catch (err) {
    console.error('Rapport indienen mislukt:', err);
    knop.disabled = false;
    melding('Verbindingsfout. Probeer opnieuw.');
  }
});

// ═══════════════════ EASTER EGGS (2034) ═══════════════════
document.getElementById('btn-archief')?.addEventListener('click', () => {
  const v = (document.getElementById('archief-zoek') as HTMLInputElement).value.trim().toUpperCase();
  if (v === 'RR-13' || v === '13') {
    document.getElementById('brief13')?.classList.remove('verborgen');
    fx.lade();
    zetBadge(sessie, 'de-dertiende-brief');
    melding('Insigne gevonden: De Dertiende Brief');
  } else {
    fx.fout();
    melding('Geen stuk gevonden onder dat nummer.');
  }
});

let lamTeller = 0;
document.getElementById('lam')?.addEventListener('click', () => {
  lamTeller++;
  if (lamTeller >= 3) {
    fx.blaat();
    zetBadge(sessie, 'het-lam-waakt');
    melding('Insigne gevonden: Het Lam Waakt');
    lamTeller = 0;
  }
});

document.getElementById('briefkaart')?.addEventListener('click', () => {
  fx.fluister();
  zetBadge(sessie, 'groeten-uit-geel');
  melding('Insigne gevonden: Groeten uit Geel');
});

// ═══════════════════ LIVE SYNC ═══════════════════
luisterDua(sessie, (nieuw) => {
  dua = nieuw;
  tekenZegel();
  tekenDoorslag();
  tekenTicket();
});

luisterNaarStatus(sessie, (p) => {
  puzzels = p;
  tekenVoortgang(p);
  tekenDoorslag();
  tekenTicket();

  document.getElementById('museum-slot')!.style.display = ontgrendeld(p, 4) || p['p4'] ? 'none' : 'block';
  document.getElementById('museum-spel')!.style.display = ontgrendeld(p, 4) || p['p4'] ? 'block' : 'none';
  document.getElementById('s-museum')?.classList.toggle('klaar', !!p['p4']);

  document.getElementById('pin-slot')!.style.display = ontgrendeld(p, 5) || p['p5'] ? 'none' : 'block';
  document.getElementById('pin-spel')!.style.display = ontgrendeld(p, 5) || p['p5'] ? 'block' : 'none';
  document.getElementById('s-pin')?.classList.toggle('klaar', !!p['p5']);

  document.getElementById('s-rapport')?.classList.toggle('verborgen', !p['p5']);
  if (p['p0']) document.getElementById('s-zegel')?.classList.add('klaar');
});

// ═══════════════════ OPSTART ═══════════════════
koppelMuteKnop();
koppelTypgeluid();
koppelEasterEggs(sessie);
koppelMeta(sessie);
startDuaTimer(sessie);
