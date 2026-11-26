import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * Een volledige Engelse run van D.U.A. met vier spelers (Writer + Runner in 1934,
 * Archivist + Restorer in 2034), van het oefenzegel (P0) tot het eindscherm.
 * Zelfde opbouw als dua-volledige-run.spec.ts, maar met `taal: 'en'` in de sessie
 * en LOCKER (6 letters) in P1.
 *
 * Onderweg verzamelt de test: paginafouten, <html lang>, alle meldingen
 * (#dua-melding en #hulp-melding) en de zichtbare tekst per stap, die hij
 * nakijkt op achtergebleven Nederlandse woorden. Alles komt in de testbijlage
 * en op de console (zie VERSLAG), zodat een mens het kan nalezen.
 */
const CODE = 'DUA-EN-FULL-1';
const DUA = '/experiences/dua';
const DB = 'e2e-firebase-db';

function startData(): Record<string, unknown> {
  return {
    sessions: {
      [CODE]: {
        aangemaakt: Date.now(),
        actief: true,
        ervaringsId: 'dua',
        aantalSpelers: 4,
        taal: 'en',
        puzzels: Object.fromEntries(['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map(p => [p, false])),
        rapport: { ingediend: false, inhoud: {} },
        dua: {
          p0zegel: false,
          brief: { letters: '', verstuurd: false },
          kluisNummer: null,
          verstopPlek: null,
          pin1934: null,
          brief14: { tekst: '', klaar: false },
          hamers: 'RUKTSN',
          letterKeuze: '',
          meta: { verdenking: 0, strafMs: 0, hints: 0 },
        },
      },
    },
  };
}

async function nieuweContext(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ([sleutel, data]) => {
      if (!localStorage.getItem(sleutel as string)) {
        localStorage.setItem(sleutel as string, JSON.stringify(data));
      }
    },
    [DB, startData()] as const,
  );
  // Elke melding vastleggen, ook als ze na 4,8 s weer verdwijnt.
  await context.addInitScript(() => {
    const w = window as unknown as { __meldingen: string[] };
    w.__meldingen = [];
    const laatste: Record<string, string> = {};
    const kijk = () => {
      for (const id of ['dua-melding', 'hulp-melding']) {
        const el = document.getElementById(id);
        const t = (el?.textContent ?? '').trim();
        if (el && t && t !== laatste[id]) {
          laatste[id] = t;
          w.__meldingen.push(`[${id}] ${t}`);
        } else if (!el || !t) laatste[id] = '';
      }
    };
    new MutationObserver(kijk).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

// Woorden die in een Engelse tekst niet horen. Eigennamen staan in NEGEER.
const NL_WOORDEN = [
  'de',
  'het',
  'een',
  'niet',
  'nog',
  'jullie',
  'naar',
  'vraag',
  'vragen',
  'klik',
  'hulp',
  'sluit',
  'sluiten',
  'gevonden',
  'opgelost',
  'wij',
  'zijn',
  'voor',
  'met',
  'ook',
  'maar',
  'hier',
  'dat',
  'wat',
  'je',
  'uw',
  'bij',
  'dan',
  'als',
  'nu',
  'op',
  'te',
  'om',
  'er',
  'deze',
  'dit',
  'kluis',
  'brief',
  'brieven',
  'sleutel',
  'mapje',
  'getuigen',
  'terug',
  'verder',
  'opnieuw',
  'speler',
  'spelers',
  'tijd',
  'resttijd',
  'verdenking',
  'insignes',
  'insigne',
  'wachten',
  'verstuur',
  'bevestig',
  'zoek',
  'zoeken',
  'kies',
  'kamer',
  'werkkamer',
  'paneel',
  'plek',
  'stuk',
  'geen',
  'alle',
  'en',
  'van',
  'uit',
  'aan',
  'zegel',
  'druk',
  'hamer',
  'hamers',
  'vak',
  'typemachine',
  'doorslag',
  'verslag',
  'archief',
  'getuige',
  'onderzoek',
  'eindrapport',
  'gebruikt',
  'tot',
  'wordt',
  'werd',
  'hebben',
  'heeft',
  'moet',
  'kan',
  'zal',
  'mag',
  'sessie',
  'deel',
  'resultaat',
  'beoordeling',
  'versturen',
  'opslaan',
  'naam',
  'jouw',
  'ons',
  'onze',
  'zij',
  'hij',
  'wie',
  'waar',
  'waarom',
  'hoe',
  'welke',
];
const NEGEER = [
  'De Gentenaar',
  'Kamer 14',
  'Bureau X',
  'Gravensteen',
  'De Leie',
  'Sint-Baafs',
  'Vijd',
  'D.U.A.',
  'Door U Aangesteld',
  'De Rechtvaardige Rechters',
  'Arsène Goedertier',
  'Goedertier',
];

function nlTreffers(tekst: string): string[] {
  let t = tekst.replace(/https?:\/\/\S+/g, 'URL');
  for (const n of NEGEER) t = t.split(n).join('NAME');
  const treffers: string[] = [];
  const re = /[A-Za-zÀ-ÿ'’-]+/g;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const woord = m[0].toLowerCase();
    if (NL_WOORDEN.includes(woord)) {
      const ctx = t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ');
      treffers.push(`"${m[0]}" in …${ctx}…`);
    }
  }
  return treffers;
}

interface Verslag {
  fouten: string[];
  taal: string[];
  nl: string[];
  meldingen: string[];
  teksten: Record<string, string>;
}
const VERSLAG: Verslag = { fouten: [], taal: [], nl: [], meldingen: [], teksten: {} };

function bewaakFouten(page: Page, naam: string): void {
  page.on('pageerror', e => VERSLAG.fouten.push(`${naam}: ${e.message}`));
}

/** Zichtbare tekst plus attributen die een speler (of schermlezer) ziet. */
async function zichtbareTekst(page: Page): Promise<string> {
  return page.evaluate(() => {
    const attrs: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) {
        const v = el.getAttribute(a);
        if (v) attrs.push(`[${a}] ${v}`);
      }
    }
    return `${document.body.innerText}\n${attrs.join('\n')}\n[title] ${document.title}`;
  });
}

async function controleer(pages: Record<string, Page>, moment: string): Promise<void> {
  for (const [naam, p] of Object.entries(pages)) {
    if (p.isClosed()) continue;
    const lang = await p.locator('html').getAttribute('lang');
    if (lang !== 'en') VERSLAG.taal.push(`${moment} / ${naam}: lang="${lang}"`);
    const tekst = await zichtbareTekst(p);
    VERSLAG.teksten[`${moment} / ${naam}`] = tekst;
    for (const t of nlTreffers(tekst)) VERSLAG.nl.push(`${moment} / ${naam}: ${t}`);
    const meldingen = await p.evaluate(() => {
      const w = window as unknown as { __meldingen?: string[] };
      const m = w.__meldingen ?? [];
      w.__meldingen = [];
      return m;
    });
    for (const m of meldingen) {
      VERSLAG.meldingen.push(`${moment} / ${naam}: ${m}`);
      for (const t of nlTreffers(m)) VERSLAG.nl.push(`${moment} / ${naam} (melding): ${t}`);
    }
  }
}

/** Leest een stuk van de gedeelde (nep-)database, vanuit het perspectief van een tab. */
async function dbWaarde(page: Page, pad: string): Promise<unknown> {
  return page.evaluate(
    ([sleutel, p]) => {
      let huidig: unknown = JSON.parse(localStorage.getItem(sleutel as string) ?? '{}');
      for (const deel of (p as string).split('/')) {
        if (huidig === null || typeof huidig !== 'object') return null;
        huidig = (huidig as Record<string, unknown>)[deel];
      }
      return huidig ?? null;
    },
    [DB, `sessions/${CODE}/${pad}`] as const,
  );
}

/** Zet iets in de gedeelde database vanuit een tab: de andere tabs krijgen een storage-event. */
async function dbZet(page: Page, pad: string, waarde: unknown): Promise<void> {
  await page.evaluate(
    ([sleutel, p, w]) => {
      const boom = JSON.parse(localStorage.getItem(sleutel as string) ?? '{}');
      const delen = (p as string).split('/');
      let huidig = boom;
      for (const deel of delen.slice(0, -1)) huidig = huidig[deel];
      huidig[delen[delen.length - 1] as string] = w;
      localStorage.setItem(sleutel as string, JSON.stringify(boom));
    },
    [DB, `sessions/${CODE}/${pad}`, waarde] as const,
  );
}

const speler = (rol: string, era: '1934' | '2034') =>
  `${DUA}/speler-${era}.html?sessie=${CODE}&rol=${rol}`;

/** Sorteert de hamers door twee aan twee te wisselen. */
async function herstelHamers(page: Page): Promise<void> {
  const doel = ['T', 'K', 'S', 'U', 'N', 'R'];
  const knoppen = page.locator('#hamerrij .hamer');
  const huidig = (await knoppen.allTextContents()).map(t => t.trim());
  for (let i = 0; i < doel.length; i++) {
    if (huidig[i] === doel[i]) continue;
    const j = huidig.indexOf(doel[i] as string);
    await knoppen.nth(i).click();
    await knoppen.nth(j).click();
    [huidig[i], huidig[j]] = [huidig[j] as string, huidig[i] as string];
  }
}

/** De indexen in de brieftekst die samen LOCKER vormen, in leesvolgorde. */
async function woordIndexen(page: Page, woord: string): Promise<number[]> {
  const tekst = (await page.locator('#typvel').textContent()) ?? '';
  const indexen: number[] = [];
  let vanaf = 0;
  for (const letter of woord) {
    const i = tekst.indexOf(letter, vanaf);
    expect(i, `letter ${letter} in de brief`).toBeGreaterThan(-1);
    indexen.push(i);
    vanaf = i + 1;
  }
  return indexen;
}

test('D.U.A. in English, start to finish with four players', async ({ context }) => {
  test.setTimeout(300_000);
  await nieuweContext(context);
  const writer = await context.newPage();
  const runner = await context.newPage();
  const archivist = await context.newPage();
  const restorer = await context.newPage();
  const alle = { writer, runner, archivist, restorer };
  for (const [n, p] of Object.entries(alle)) bewaakFouten(p, n);

  try {
    await writer.goto(speler('schrijver', '1934'));
    await runner.goto(speler('loper', '1934'));
    await archivist.goto(speler('archivaris', '2034'));
    await restorer.goto(speler('restaurateur', '2034'));
    for (const p of Object.values(alle)) {
      await expect(p.locator('html')).toHaveAttribute('lang', 'en');
      await expect(p.locator('html')).not.toHaveClass(/i18n-wacht/);
    }
    await expect(writer.locator('#sys-rol')).toHaveText('1934 · The Writer');
    await expect(runner.locator('#sys-rol')).toHaveText('1934 · The Runner');
    await expect(archivist.locator('#sys-rol')).toHaveText('2034 · The Archivist');
    await expect(restorer.locator('#sys-rol')).toHaveText('2034 · The Restorer');
    await controleer(alle, 'start');

    // ── P0: the handshake ──
    await expect(writer.getByRole('button', { name: 'Press the seal' })).toBeVisible();
    await writer.click('#zegelknop');
    await expect(archivist.locator('#btn-zegel-bevestig')).toBeVisible();
    await expect(restorer.locator('#btn-zegel-bevestig')).toBeVisible();
    await controleer(alle, 'P0 seal pressed');
    await archivist.click('#btn-zegel-bevestig');
    await expect(restorer.locator('#zegel-actie')).toBeHidden();
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p0')).toBe(true);
    await restorer.reload();
    await expect(restorer.locator('#zegel-actie')).toBeHidden();
    await writer.waitForTimeout(600);
    await controleer(alle, 'P0 solved');

    // ── P1: type bars and letter (LOCKER) ──
    await expect(writer.locator('#hamerrij .label').first()).toHaveText('slot 1');
    await expect(archivist.locator('#typekoppen .typekop-letter')).toHaveText([
      'T',
      'K',
      'S',
      'U',
      'N',
      'R',
    ]);
    await expect(archivist.locator('#codekaart')).toBeHidden();
    // An unknown number first, then the right document.
    await archivist.fill('#archief-zoek', 'rr-99');
    await archivist.click('#btn-archief');
    await expect(archivist.locator('#dua-melding')).toBeVisible();
    await controleer({ archivist }, 'P1 archive wrong number');
    await archivist.fill('#archief-zoek', 'rr-12');
    await archivist.click('#btn-archief');
    await expect(archivist.locator('#codekaart')).toBeVisible();
    await controleer({ archivist }, 'P1 code card found');

    // Hints in English.
    await writer.locator('#hint-p1a .hint-knop').click();
    await expect(writer.locator('#hint-p1a .hint-stap').first()).toBeVisible();
    await expect(writer.locator('#hint-p1a')).toContainText('restoration report');
    await expect(writer.getByRole('button', { name: 'Ask for a hint' }).first()).toBeVisible();

    await writer.locator('#typvel .lt').first().click();
    await expect(writer.locator('#dua-melding')).toContainText('Repair the type bars first');
    await controleer({ writer }, 'P1 click letter while locked');

    await herstelHamers(writer);
    await expect(runner.locator('#s-hamers')).toHaveClass(/klaar/);
    await runner.reload();
    await expect(runner.locator('#s-hamers')).toHaveClass(/klaar/);
    await expect(runner.locator('#s-brief')).not.toHaveClass(/slot/);
    await controleer(alle, 'P1 type bars repaired');

    const indexen = await woordIndexen(writer, 'LOCKER');
    for (const i of indexen.slice(0, 3)) await writer.locator(`#typvel .lt[data-i="${i}"]`).click();
    await expect(runner.locator('#typvel .lt.diep')).toHaveCount(3);
    await expect(writer.locator('#brief-status')).toHaveText('3 letters left to choose.');
    for (const i of indexen.slice(3)) await runner.locator(`#typvel .lt[data-i="${i}"]`).click();
    await expect(writer.locator('#typvel .lt.diep')).toHaveCount(6);
    await expect(writer.locator('#brief-status')).toHaveText(
      'Six letters chosen. Strike when you are sure.',
    );
    await writer.reload();
    await expect(writer.locator('#typvel .lt.diep')).toHaveCount(6);

    // A seventh letter is refused ("Six letters. No more, no less.").
    const tekstBrief = (await writer.locator('#typvel').textContent()) ?? '';
    const extra = tekstBrief.lastIndexOf('D');
    await writer.locator(`#typvel .lt[data-i="${extra}"]`).click();
    await writer.waitForTimeout(300);
    await controleer({ writer }, 'P1 seventh letter');

    // Wrong word first: LOCKE + a later S = LOCKES.
    await writer.locator(`#typvel .lt[data-i="${indexen[5]}"]`).click(); // deselect R
    await expect(writer.locator('#typvel .lt.diep')).toHaveCount(5);
    const andereS = tekstBrief.lastIndexOf('S');
    expect(andereS).toBeGreaterThan(indexen[4] as number);
    await writer.locator(`#typvel .lt[data-i="${andereS}"]`).click();
    await writer.click('#btn-verstuur');
    await expect(writer.locator('#dua-melding')).toContainText('not what the Runner asked for');
    await expect.poll(() => dbWaarde(writer, 'stats/p1/fout')).toBe(1);
    await controleer(alle, 'P1 wrong word sent');
    await writer.click('#btn-gom');
    for (const i of indexen) await writer.locator(`#typvel .lt[data-i="${i}"]`).click();
    await expect(writer.locator('#typvel .lt.diep')).toHaveCount(6);
    await writer.click('#btn-verstuur');
    await expect(writer.locator('#dua-melding')).toContainText('Carbon copy made');

    await expect(archivist.locator('#doorslag-inhoud .doorgedrukt')).toHaveCount(6);
    // 'Almost' (one letter off) and wrong answers first.
    await archivist.fill('#ant-woord', 'lockes');
    await archivist.click('#btn-woord');
    await archivist.waitForTimeout(300);
    await controleer({ archivist }, 'P1 answer one letter off');
    await archivist.fill('#ant-woord', 'kluis');
    await archivist.click('#btn-woord');
    await archivist.waitForTimeout(300);
    await controleer({ archivist }, 'P1 answer KLUIS (Dutch)');
    expect(await dbWaarde(archivist, 'puzzels/p1')).toBe(false);
    await archivist.fill('#ant-woord', 'locker');
    await archivist.click('#btn-woord');
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p1')).toBe(true);
    await expect(archivist.locator('#dua-melding')).toContainText('P1 solved');
    await writer.waitForTimeout(600);
    await controleer(alle, 'P1 solved');

    await writer.reload();
    await expect(writer.locator('#s-hamers')).toHaveClass(/klaar/);
    await expect(writer.locator('#s-brief')).not.toHaveClass(/slot/);

    // ── P2: the luggage locker ──
    const wachterLinks = async (p: Page): Promise<number> =>
      p.locator('#wachter').evaluate(el => parseFloat((el as HTMLElement).style.left));
    const [wa, wb] = [await wachterLinks(writer), await wachterLinks(runner)];
    expect(Math.abs(wa - wb)).toBeLessThan(15);

    // Wrong number first (14 = almost).
    await writer.fill('#kluis-keuze', '14');
    await expect
      .poll(() => wachterLinks(writer), { timeout: 20_000, intervals: [60] })
      .toBeGreaterThan(78);
    await writer.click('#btn-deponeer');
    await writer.waitForTimeout(300);
    await controleer({ writer }, 'P2 wrong locker 14');

    await writer.fill('#kluis-keuze', '13');
    await expect
      .poll(() => wachterLinks(writer), { timeout: 20_000, intervals: [60] })
      .toBeGreaterThan(78);
    await writer.click('#btn-deponeer');
    await expect.poll(() => dbWaarde(writer, 'dua/kluisNummer')).toBe('13');
    await controleer(alle, 'P2 deposited');

    await archivist.click('#btn-draai'); // first digit: 1
    await archivist.click('#btn-cijfer-ok');
    await archivist.click('#btn-draai');
    await archivist.click('#btn-draai'); // second digit: 3
    await archivist.click('#btn-cijfer-ok');
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p2')).toBe(true);
    await writer.waitForTimeout(600);
    await controleer(alle, 'P2 solved');

    // ── P3: the witnesses ──
    await archivist.fill('#ant-route', '1394');
    await archivist.click('#btn-route');
    await archivist.waitForTimeout(300);
    await controleer({ archivist }, 'P3 wrong order');
    await archivist.fill('#ant-route', '3194');
    await archivist.click('#btn-route');
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p3')).toBe(true);
    await writer.waitForTimeout(600);
    await controleer(alle, 'P3 solved');

    // ── P4: the study ──
    await restorer.reload();
    const kamerBinnen = async (p: Page, plek: string) =>
      p.locator(`#kamer [data-plek="${plek}"]`).click();

    await writer.click('#btn-kamer');
    await expect(runner.locator('#kamer')).toBeVisible();
    await expect(runner.locator('#btn-kamer')).toBeHidden();
    await expect(writer.locator('#kamer-status')).toContainText('Find the key first.');
    await kamerBinnen(writer, 'kast'); // nothing
    await writer.waitForTimeout(200);
    await controleer({ writer }, 'P4 cupboard before key');
    await kamerBinnen(writer, 'vensterbank');
    await writer.waitForTimeout(200);
    await controleer({ writer, runner }, 'P4 key found');
    await kamerBinnen(writer, 'bureau'); // searched by the police
    await expect(restorer.locator('#museum-spel')).toBeVisible();
    await controleer(alle, 'P4 hidden in desk');
    await restorer.locator('#museum-spel [data-plek="bureau"]').click();

    await expect(writer.locator('#btn-kamer')).toBeVisible();
    await expect(runner.locator('#btn-kamer')).toBeVisible();
    await expect(writer.locator('#kamer')).toBeHidden();
    await expect(writer.locator('#kamer-status')).toHaveText('Find the key first.');
    expect(await dbWaarde(writer, 'dua/meta/verdenking')).toBe(15);
    await writer.waitForTimeout(600);
    await controleer(alle, 'P4 seized');

    // Second try: the police come.
    await runner.click('#btn-kamer');
    await expect(writer.locator('#kamer')).toBeVisible();
    await dbZet(archivist, 'dua/kamerEinde', Date.now() - 1000);
    await expect(writer.locator('#btn-kamer')).toBeVisible({ timeout: 8000 });
    await expect(runner.locator('#btn-kamer')).toBeVisible();
    await expect.poll(() => dbWaarde(writer, 'dua/meta/verdenking')).toBe(25);
    await writer.waitForTimeout(2500);
    expect(await dbWaarde(writer, 'dua/meta/verdenking')).toBe(25);
    await controleer(alle, 'P4 police');

    // Third try: right.
    await writer.click('#btn-kamer');
    await kamerBinnen(writer, 'vensterbank');
    await kamerBinnen(writer, 'schouw');
    await expect(runner.locator('#kamer-status')).toContainText('Folder hidden');
    await controleer(alle, 'P4 hidden in fireplace');
    await restorer.locator('#museum-spel [data-plek="kast"]').click(); // wrong spot first
    await restorer.waitForTimeout(300);
    await controleer({ restorer }, 'P4 restorer wrong spot');
    await restorer.locator('#museum-spel [data-plek="schouw"]').click();
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p4')).toBe(true);
    await writer.waitForTimeout(600);
    await controleer(alle, 'P4 solved');

    // ── P5: the hiding place ──
    // Wrong pin first: the Belfry (rebuilt/cleared).
    await writer.locator('#kaart-1934 [data-plek="belfort"]').click();
    await writer.waitForTimeout(300);
    await controleer({ writer }, 'P5 1934 pins belfry');
    await archivist.locator('#kaart-2034 [data-plek="sintbaafs"]').click();
    await archivist.waitForTimeout(300);
    await controleer(alle, 'P5 2034 clicks cathedral while 1934 pinned belfry');
    await archivist.locator('#kaart-2034 [data-plek="belfort"]').click();
    await archivist.waitForTimeout(600);
    await controleer(alle, 'P5 belfry lost');
    if (!(await dbWaarde(archivist, 'puzzels/p5'))) {
      await writer.locator('#kaart-1934 [data-plek="sintbaafs"]').click();
      await archivist.locator('#kaart-2034 [data-plek="sintbaafs"]').click();
    }
    await expect.poll(() => dbWaarde(archivist, 'puzzels/p5')).toBe(true);
    await writer.waitForTimeout(600);
    await controleer(alle, 'P5 solved');

    // ── Finale ──
    await expect(writer.locator('#s-brief14')).toBeVisible();
    await writer.fill('#brief14', 'Short.');
    await writer.click('#btn-brief14');
    await writer.waitForTimeout(300);
    await controleer({ writer }, 'Finale letter too short');
    await writer.fill('#brief14', 'To whoever finds this a hundred years later: we were D.U.A.');
    await writer.click('#btn-brief14');
    await expect(writer).toHaveURL(/einde\.html/);
    await expect(runner).toHaveURL(/einde\.html/);
    await expect(writer.locator('html')).toHaveAttribute('lang', 'en');
    await writer.waitForTimeout(800);
    await controleer({ writer, runner }, 'End screen 1934 waiting for 2034');

    await expect(archivist.locator('#s-rapport')).toBeVisible();
    await archivist.fill('#rapport', 'Short.');
    await archivist.click('#btn-rapport');
    await archivist.waitForTimeout(300);
    await controleer({ archivist }, 'Finale report too short');
    await archivist.fill(
      '#rapport',
      'Bureau X concludes: we are the letter we wrote ourselves. The panel was in plain sight.',
    );
    await archivist.click('#btn-rapport');
    await expect(archivist).toHaveURL(/einde\.html/);
    await expect(restorer).toHaveURL(/einde\.html/);

    for (const p of Object.values(alle)) {
      await expect(p.locator('html')).toHaveAttribute('lang', 'en');
      await expect(p.locator('#einde-stats')).toBeVisible();
      await expect(p.locator('#einde-stats')).toContainText('Time left');
      await expect(p.locator('#einde-stats')).toContainText('Hints used');
      await expect(p.locator('#einde-stats')).toContainText('Final suspicion');
      await expect(p.locator('#einde-stats')).toContainText('Badges');
    }
    await writer.waitForTimeout(1000);
    await controleer(alle, 'End screen');
  } finally {
    const uit = [
      '=== PAGE ERRORS ===',
      ...VERSLAG.fouten,
      '=== LANG ===',
      ...VERSLAG.taal,
      '=== DUTCH WORD HITS ===',
      ...VERSLAG.nl,
      '=== TOASTS ===',
      ...VERSLAG.meldingen,
    ].join('\n');
    console.log(uit);
    // Alle zichtbare teksten per stap, om na te lezen (test-results/).
    writeFileSync(test.info().outputPath('teksten.json'), JSON.stringify(VERSLAG.teksten, null, 2));
    await test.info().attach('verslag.txt', { body: uit, contentType: 'text/plain' });
    await test.info().attach('teksten.json', {
      body: JSON.stringify(VERSLAG.teksten, null, 2),
      contentType: 'application/json',
    });
  }

  expect(VERSLAG.fouten).toEqual([]);
  expect(VERSLAG.taal).toEqual([]);
});

test('D.U.A. in English: easter eggs, help, end screen extras and time-up page', async ({
  context,
}) => {
  test.setTimeout(120_000);
  await nieuweContext(context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const writer = await context.newPage();
  const archivist = await context.newPage();
  const fouten: string[] = [];
  const nl: string[] = [];
  const meldingen: string[] = [];
  for (const [n, p] of Object.entries({ writer, archivist }))
    p.on('pageerror', e => fouten.push(`${n}: ${e.message}`));

  const lees = async (p: Page, moment: string) => {
    const tekst = await zichtbareTekst(p);
    for (const t of nlTreffers(tekst)) nl.push(`${moment}: ${t}`);
    const m = await p.evaluate(() => {
      const w = window as unknown as { __meldingen?: string[] };
      const r = w.__meldingen ?? [];
      w.__meldingen = [];
      return r;
    });
    for (const x of m) {
      meldingen.push(`${moment}: ${x}`);
      for (const t of nlTreffers(x)) nl.push(`${moment} (melding): ${t}`);
    }
    return tekst;
  };

  await writer.goto(speler('schrijver', '1934'));
  await archivist.goto(speler('archivaris', '2034'));
  await expect(archivist.locator('html')).toHaveAttribute('lang', 'en');

  // Easter eggs, 2034.
  await archivist.fill('#archief-zoek', 'RR-13');
  await archivist.click('#btn-archief');
  await expect(archivist.locator('#dua-melding')).toContainText(
    'Badge found: The Thirteenth Letter',
  );
  await lees(archivist, 'egg RR-13');
  for (let i = 0; i < 3; i++) await archivist.locator('#lam').dispatchEvent('click');
  await expect(archivist.locator('#dua-melding')).toContainText('The Lamb Keeps Watch');
  await lees(archivist, 'egg lamb');
  await archivist.locator('#briefkaart').dispatchEvent('click');
  await expect(archivist.locator('#dua-melding')).toContainText('Greetings from Geel');
  await lees(archivist, 'egg postcard');

  // Easter eggs, 1934: DUA and 1180.
  await writer.locator('body').click({ position: { x: 5, y: 5 } });
  await writer.keyboard.type('DUA');
  await expect(writer.locator('#dua-melding')).toContainText('Duly Appointed');
  await lees(writer, 'egg DUA');
  await writer.keyboard.type('1180');
  await expect(writer.locator('#dua-melding')).toContainText('The Judges do not travel', {
    timeout: 5000,
  });
  await lees(writer, 'egg 1180');

  // Need help? dialog in English.
  await writer.getByRole('button', { name: 'Need help?' }).click();
  await expect(writer.getByRole('heading', { name: 'How D.U.A. works' })).toBeVisible();
  await lees(writer, 'help dialog');
  await writer.keyboard.press('Escape');

  // Penalty at 100% suspicion and the 10-minute warning.
  await dbZet(writer, 'dua/meta', { verdenking: 100, strafMs: 5 * 60 * 1000, hints: 0 });
  await expect(archivist.locator('#dua-melding')).toContainText('5 MINUTES lost');
  await lees(archivist, 'penalty');
  await dbZet(archivist, 'timerGestart', Date.now() - 46 * 60 * 1000); // 60 - 5 penalty - 46 = 9 min
  await writer.reload();
  await expect(writer.locator('#dua-melding')).toContainText('10 minutes left', { timeout: 5000 });
  await lees(writer, '10 minutes');

  // End screen: seed a finished session and look at the extras. The game tabs
  // close first, otherwise they navigate away while we write.
  await writer.close();
  await archivist.close();
  const einde = await context.newPage();
  einde.on('pageerror', e => fouten.push(`einde: ${e.message}`));
  await einde.goto(`${DUA}/einde.html?sessie=${CODE}`);
  await dbZet(einde, 'timerGestart', Date.now() - 20 * 60 * 1000);
  await dbZet(einde, 'puzzels', { p0: true, p1: true, p2: true, p3: true, p4: true, p5: true });
  await dbZet(einde, 'dua/brief14', {
    tekst: 'To whoever finds this: we were D.U.A.',
    klaar: true,
  });
  await dbZet(einde, 'rapport', {
    ingediend: true,
    tijdstip: Date.now(),
    inhoud: { tekst: 'Bureau X concludes that we were D.U.A. all along.' },
  });
  await einde.reload(); // a tab gets no storage event for its own writes
  await expect(einde.locator('html')).toHaveAttribute('lang', 'en');
  await expect(einde.locator('#einde-stats')).toContainText('Time left');
  await einde.click('#btn-review-verstuur');
  await expect(einde.locator('#review-fout')).toBeVisible();
  await lees(einde, 'end review empty');
  await einde.locator('#review-sterren button').nth(4).click();
  await einde.fill('#review-tekst', 'Great game, the two eras really work together.');
  await einde.click('#btn-review-verstuur');
  await expect(einde.locator('#review-dank')).toBeVisible();
  await lees(einde, 'end review sent');
  await einde.click('#btn-deel-resultaat');
  await expect(einde.locator('#btn-deel-resultaat')).toContainText('Copied');
  const gedeeld = await einde.evaluate(() => navigator.clipboard.readText());
  meldingen.push(`share text: ${gedeeld}`);
  for (const t of nlTreffers(gedeeld)) nl.push(`share text: ${t}`);
  await einde.waitForTimeout(8500); // the closing voice of Bureau X
  const eindTekst = await lees(einde, 'end screen after voice');
  expect(eindTekst).toContain('We laid the letter from the archive next to your notes again.');

  // Time-up page with the clock really expired.
  await dbZet(einde, 'rapport', { ingediend: false, inhoud: {} });
  // Met 5 minuten straf stuurt de spelklok na 55 minuten door; vanaf dan is de
  // tijd ook voor het tijd-voorbij-scherm om (shared/js/tijd-voorbij.ts).
  await dbZet(einde, 'timerGestart', Date.now() - 56 * 60 * 1000);
  const tijd = await context.newPage();
  tijd.on('pageerror', e => fouten.push(`tijd-voorbij: ${e.message}`));
  await tijd.goto(`${DUA}/tijd-voorbij.html?sessie=${CODE}`);
  await expect(tijd.locator('html')).toHaveAttribute('lang', 'en');
  await expect(tijd.locator('#oplossing-blok')).toBeVisible();
  await lees(tijd, 'time-up page');
  for (const [n, p] of [
    ['einde', einde],
    ['tijd-voorbij', tijd],
  ] as const) {
    const links = await p.$$eval('a[href]', as =>
      as.map(a => `${a.textContent?.trim()} -> ${a.getAttribute('href')}`),
    );
    meldingen.push(`links ${n}: ${links.join(' | ')}`);
  }
  writeFileSync(
    test.info().outputPath('extra-teksten.txt'),
    `${await zichtbareTekst(einde)}\n=====\n${await zichtbareTekst(tijd)}`,
  );

  console.log(
    [
      '=== EXTRA ERRORS ===',
      ...fouten,
      '=== EXTRA DUTCH ===',
      ...nl,
      '=== EXTRA TOASTS ===',
      ...meldingen,
    ].join('\n'),
  );
  expect(fouten).toEqual([]);
});
