import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Een volledige run van D.U.A. met vier spelers in vier tabbladen van dezelfde
 * browser: Schrijver en Loper (1934), Archivaris en Restaurateur (2034). De
 * nep-Firebase deelt de data via localStorage, dus wat de ene speler doet,
 * zien de anderen live.
 *
 * Vooral gericht op wat tijdens het testen misging: twee spelers in hetzelfde
 * tijdperk die elkaars voortgang moeten zien, de werkkamer die na een mislukte
 * poging opnieuw open moet kunnen, en een eindscherm voor iedereen.
 */
const CODE = 'DUA-2026-001';
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
}

function bewaakFouten(page: Page, naam: string): string[] {
  const fouten: string[] = [];
  page.on('pageerror', e => fouten.push(`${naam}: ${e.message}`));
  return fouten;
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

/** Sorteert de hamers door twee aan twee te wisselen, op de plek van een van de tabs. */
async function herstelHamers(page: Page): Promise<void> {
  const doel = ['K', 'N', 'R', 'S', 'T', 'U'];
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

/** De indexen in de brieftekst die samen KLUIS vormen, in leesvolgorde. */
async function kluisIndexen(page: Page): Promise<number[]> {
  const tekst = (await page.locator('#typvel').textContent()) ?? '';
  const indexen: number[] = [];
  let vanaf = 0;
  for (const letter of 'KLUIS') {
    const i = tekst.indexOf(letter, vanaf);
    expect(i, `letter ${letter} in de brief`).toBeGreaterThan(-1);
    indexen.push(i);
    vanaf = i + 1;
  }
  return indexen;
}

test('D.U.A. van begin tot einde met vier spelers', async ({ context }) => {
  await nieuweContext(context);
  const schrijver = await context.newPage();
  const loper = await context.newPage();
  const archivaris = await context.newPage();
  const restaurateur = await context.newPage();
  const fouten = [
    ...bewaakFouten(schrijver, 'schrijver'),
    ...bewaakFouten(loper, 'loper'),
    ...bewaakFouten(archivaris, 'archivaris'),
    ...bewaakFouten(restaurateur, 'restaurateur'),
  ];

  await schrijver.goto(speler('schrijver', '1934'));
  await loper.goto(speler('loper', '1934'));
  await archivaris.goto(speler('archivaris', '2034'));
  await restaurateur.goto(speler('restaurateur', '2034'));

  // ── P0: de handdruk ──
  await schrijver.click('#zegelknop');
  await expect(archivaris.locator('#btn-zegel-bevestig')).toBeVisible();
  await expect(restaurateur.locator('#btn-zegel-bevestig')).toBeVisible();
  await archivaris.click('#btn-zegel-bevestig');
  // Bevestigd: de knop verdwijnt bij beide 2034-spelers, ook na een herlaad.
  await expect(restaurateur.locator('#zegel-actie')).toBeHidden();
  await restaurateur.reload();
  await expect(restaurateur.locator('#zegel-actie')).toBeHidden();

  // ── P1: hamers en brief, gedeeld door Schrijver en Loper ──
  await herstelHamers(schrijver);
  await expect(loper.locator('#s-hamers')).toHaveClass(/klaar/);
  await loper.reload(); // een herlaad raakt de hersteld machine niet kwijt
  await expect(loper.locator('#s-hamers')).toHaveClass(/klaar/);
  await expect(loper.locator('#s-brief')).not.toHaveClass(/slot/);

  const indexen = await kluisIndexen(schrijver);
  for (const i of indexen.slice(0, 3))
    await schrijver.locator(`#typvel .lt[data-i="${i}"]`).click();
  await expect(loper.locator('#typvel .lt.diep')).toHaveCount(3); // de Loper kijkt mee
  for (const i of indexen.slice(3)) await loper.locator(`#typvel .lt[data-i="${i}"]`).click();
  await expect(schrijver.locator('#typvel .lt.diep')).toHaveCount(5);
  await schrijver.reload(); // gekozen letters overleven een herlaad
  await expect(schrijver.locator('#typvel .lt.diep')).toHaveCount(5);
  await schrijver.click('#btn-verstuur');

  await expect(archivaris.locator('#doorslag-inhoud .doorgedrukt')).toHaveCount(5);
  await archivaris.fill('#ant-woord', 'kluis');
  await archivaris.click('#btn-woord');
  await expect.poll(() => dbWaarde(archivaris, 'puzzels/p1')).toBe(true);

  // Na het versturen toont een herladen Schrijver geen "slot en klaar" door elkaar.
  await schrijver.reload();
  await expect(schrijver.locator('#s-hamers')).toHaveClass(/klaar/);
  await expect(schrijver.locator('#s-brief')).not.toHaveClass(/slot/);

  // ── P2: de wachter loopt voor iedereen op dezelfde plek ──
  const wachterLinks = async (p: Page): Promise<number> =>
    p.locator('#wachter').evaluate(el => parseFloat((el as HTMLElement).style.left));
  const [wa, wb] = [await wachterLinks(schrijver), await wachterLinks(loper)];
  expect(Math.abs(wa - wb)).toBeLessThan(15);

  await schrijver.fill('#kluis-keuze', '13');
  await expect
    .poll(() => wachterLinks(schrijver), { timeout: 20_000, intervals: [60] })
    .toBeGreaterThan(78);
  await schrijver.click('#btn-deponeer');
  await expect.poll(() => dbWaarde(schrijver, 'dua/kluisNummer')).toBe('13');

  await archivaris.click('#btn-draai'); // eerste cijfer: 1
  await archivaris.click('#btn-cijfer-ok');
  await archivaris.click('#btn-draai');
  await archivaris.click('#btn-draai'); // tweede cijfer: 3
  await archivaris.click('#btn-cijfer-ok');
  await expect.poll(() => dbWaarde(archivaris, 'puzzels/p2')).toBe(true);

  // ── P3: de getuigen ──
  await archivaris.fill('#ant-route', '3194');
  await archivaris.click('#btn-route');
  await expect.poll(() => dbWaarde(archivaris, 'puzzels/p3')).toBe(true);

  // ── P4: de werkkamer ──
  await restaurateur.reload();
  const kamerBinnen = async (p: Page, plek: string) =>
    p.locator(`#kamer [data-plek="${plek}"]`).click();

  await schrijver.click('#btn-kamer');
  await expect(loper.locator('#kamer')).toBeVisible(); // ook de Loper staat in de kamer
  await expect(loper.locator('#btn-kamer')).toBeHidden();
  await kamerBinnen(schrijver, 'vensterbank');
  await kamerBinnen(schrijver, 'bureau'); // doorzocht door de politie
  await expect(restaurateur.locator('#museum-spel')).toBeVisible();
  await restaurateur.locator('#museum-spel [data-plek="bureau"]').click();

  // Mislukt: 1934 moet opnieuw naar binnen kunnen (dit liep eerder vast).
  await expect(schrijver.locator('#btn-kamer')).toBeVisible();
  await expect(loper.locator('#btn-kamer')).toBeVisible();
  await expect(schrijver.locator('#kamer')).toBeHidden();
  await expect(schrijver.locator('#kamer-status')).toHaveText('Vind eerst de sleutel.');
  expect(await dbWaarde(schrijver, 'dua/meta/verdenking')).toBe(15);

  // Tweede poging: de politie komt, en de straf valt maar één keer (twee 1934-tabs).
  await loper.click('#btn-kamer');
  await expect(schrijver.locator('#kamer')).toBeVisible();
  await dbZet(archivaris, 'dua/kamerEinde', Date.now() - 1000);
  await expect(schrijver.locator('#btn-kamer')).toBeVisible({ timeout: 8000 });
  await expect(loper.locator('#btn-kamer')).toBeVisible();
  await expect.poll(() => dbWaarde(schrijver, 'dua/meta/verdenking')).toBe(25);
  await schrijver.waitForTimeout(2500);
  expect(await dbWaarde(schrijver, 'dua/meta/verdenking')).toBe(25);

  // Derde poging: nu goed.
  await schrijver.click('#btn-kamer');
  await kamerBinnen(schrijver, 'vensterbank');
  await kamerBinnen(schrijver, 'schouw');
  await expect(loper.locator('#kamer-status')).toContainText('Mapje verstopt');
  await restaurateur.locator('#museum-spel [data-plek="schouw"]').click();
  await expect.poll(() => dbWaarde(archivaris, 'puzzels/p4')).toBe(true);

  // ── P5: de bergplaats ──
  await schrijver.locator('#kaart-1934 [data-plek="sintbaafs"]').click();
  await archivaris.locator('#kaart-2034 [data-plek="sintbaafs"]').click();
  await expect.poll(() => dbWaarde(archivaris, 'puzzels/p5')).toBe(true);

  // ── Finale: brief 14 en rapport, en iedereen gaat mee naar het eindscherm ──
  await expect(schrijver.locator('#s-brief14')).toBeVisible();
  await schrijver.fill('#brief14', 'Aan wie dit honderd jaar later vindt: wij waren D.U.A.');
  await schrijver.click('#btn-brief14');
  await expect(schrijver).toHaveURL(/einde\.html/);
  await expect(loper).toHaveURL(/einde\.html/); // de Loper wordt niet achtergelaten

  await expect(archivaris.locator('#s-rapport')).toBeVisible();
  await archivaris.fill(
    '#rapport',
    'Bureau X concludeert: wij zijn de brief die we zelf schreven.',
  );
  await archivaris.click('#btn-rapport');
  await expect(archivaris).toHaveURL(/einde\.html/);
  await expect(restaurateur).toHaveURL(/einde\.html/);

  expect(fouten).toEqual([]);
});

test('een tijd-voorbijpagina van een lopende sessie toont de oplossing niet', async ({
  context,
}) => {
  await nieuweContext(context);
  const speler1 = await context.newPage();
  await speler1.goto(`${DUA}/speler-1934.html?sessie=${CODE}&rol=schrijver`); // start de klok
  await expect(speler1.locator('#dua-timer')).not.toHaveText('60:00');

  const nieuw = await context.newPage();
  await nieuw.goto(`${DUA}/tijd-voorbij.html?sessie=${CODE}`);
  await nieuw.waitForTimeout(800);
  await expect(nieuw.locator('#oplossing-blok')).toBeHidden();
  expect(await dbWaarde(nieuw, 'actief')).toBe(true); // de sessie is niet gesloten

  // Is de tijd echt om, dan mag het wel.
  await dbZet(nieuw, 'timerGestart', Date.now() - 61 * 60 * 1000);
  await nieuw.reload();
  await expect(nieuw.locator('#oplossing-blok')).toBeVisible();
  await expect.poll(() => dbWaarde(nieuw, 'actief')).toBe(false);
});

test('een spelerpagina met een onbekende sessie stuurt terug naar de lobby', async ({
  context,
}) => {
  await nieuweContext(context);
  const p = await context.newPage();
  await p.goto(`${DUA}/speler-2034.html?sessie=BESTAAT-NIET&rol=archivaris`);
  await expect(p).toHaveURL(/\/experiences\/dua\/(index\.html)?$/);
});
