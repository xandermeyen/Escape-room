import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Een volledige run van Kamer 14 met twee spelers in twee tabbladen van
 * dezelfde browser. De nep-Firebase (e2e/fake-firebase) deelt de data via
 * localStorage, dus wat Speler A oplost, ziet Speler B live verschijnen.
 *
 * Dit vangt wat de unittests niet zien: de pagina-scripts samen, voorwerpen
 * die bij de ene speler verschijnen als de andere een slot opent, de
 * stroken en het hele einde.
 */
const CODE = 'ABC-234';
const K14 = '/experiences/kamer-14';

/** Een verse sessie zoals het host-paneel of Make.com ze aanmaakt. */
function startData(): Record<string, unknown> {
  return {
    sessions: {
      [CODE]: {
        aangemaakt: Date.now(),
        actief: true,
        ervaringsId: 'kamer-14',
        puzzels: Object.fromEntries(
          ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(p => [p, false]),
        ),
        rapport: { ingediend: false, inhoud: {} },
      },
    },
  };
}

async function nieuweContext(context: BrowserContext): Promise<void> {
  // Alleen in het eerste tabblad zaaien; daarna delen beide tabs dezelfde data.
  await context.addInitScript(data => {
    if (!localStorage.getItem('e2e-firebase-db')) {
      localStorage.setItem('e2e-firebase-db', JSON.stringify(data));
    }
  }, startData());
}

/** Fouten op de pagina laten de test falen (behalve audio in een headless browser). */
function bewaakFouten(page: Page, naam: string): string[] {
  const fouten: string[] = [];
  page.on('pageerror', e => fouten.push(`${naam}: ${e.message}`));
  return fouten;
}

/** Klikt op een voorwerp in de kamer en wacht tot de close-up open is. */
async function open(page: Page, closeup: string): Promise<void> {
  await page.locator(`.voorwerp[data-open="${closeup}"]`).click();
  await expect(page.locator(`#${closeup}`)).toBeVisible();
}

async function sluit(page: Page, closeup: string): Promise<void> {
  await page.locator(`#${closeup} [data-sluit]`).first().click();
  await expect(page.locator(`#${closeup}`)).toBeHidden();
}

/** Typt een code op de cijfertoetsen van een slot. */
async function toetsIn(page: Page, closeup: string, code: string): Promise<void> {
  const toetsen = page.locator(`#${closeup} .toetsen`).first();
  for (const c of code) await toetsen.getByRole('button', { name: c, exact: true }).click();
}

async function geluidUit(page: Page): Promise<void> {
  await page
    .locator('#geluidsmelding')
    .evaluate(el => el.remove())
    .catch(() => {});
}

test('Kamer 14 van lobby tot einde, met twee spelers', async ({ context }) => {
  await nieuweContext(context);
  const a = await context.newPage();
  const b = await context.newPage();
  const fouten = [...bewaakFouten(a, 'A'), ...bewaakFouten(b, 'B')];

  // ── Lobby: Speler A typt de code, Speler B komt via de link uit de mail ──
  await a.goto(`${K14}/`);
  await a.click('#btn-naar-briefing');
  await expect(a.locator('#briefing-onderwerp')).toHaveText('Lena Bogaert is weg');
  await a.click('#btn-begin');
  await a.fill('#sessieCodeInput', 'abc 234');
  await a.getByRole('button', { name: /verder/i }).click();
  await a.click('#rol-kaart-a');
  await a.waitForURL(/speler-a\.html\?sessie=ABC-234/);

  await b.goto(`${K14}/?sessie=${CODE}`);
  await b.click('#btn-naar-briefing');
  await b.click('#btn-begin');
  await expect(b.locator('#scherm-rol')).toBeVisible();
  await expect(b.locator('#rol-kaart-a')).toHaveClass(/rol-bezet/);
  await b.click('#rol-kaart-b');
  await b.waitForURL(/speler-b\.html\?sessie=ABC-234/);
  await geluidUit(a);
  await geluidUit(b);

  // ── P0 (A): de computer van An, met de datum van de welkomstkaart (B) ──
  await expect(b.locator('.voorwerp[data-open="cu-schriften"]')).toBeHidden();
  await open(b, 'cu-kast');
  await expect(b.locator('#cu-kast')).toContainText('3 april 2023');
  await sluit(b, 'cu-kast');

  await open(a, 'cu-terminal');
  await toetsIn(a, 'cu-terminal', '0403'); // eerst verkeerd om
  await a.click('#btn-p0');
  await expect(a.locator('#feedback-p0')).not.toBeEmpty();
  await a.getByRole('button', { name: 'Laatste cijfer wissen' }).click({ clickCount: 4 });
  await toetsIn(a, 'cu-terminal', '0304');
  await a.click('#btn-p0');
  await sluit(a, 'cu-terminal');
  await expect(b.locator('.voorwerp[data-open="cu-schriften"]')).toBeVisible();

  // ── P1 (A): rooster naast het logboek → de ateliermap ──
  await open(a, 'cu-notitieblok');
  await a.fill('#input-p1', 'dinsdag en donderdag');
  await a.click('#btn-p1');
  await sluit(a, 'cu-notitieblok');
  await expect(a.locator('.voorwerp[data-open="cu-ateliermap"]')).toBeVisible();

  // ── P2 (B): de pincode van de gsm ──
  await open(b, 'cu-gsm');
  await toetsIn(b, 'cu-gsm', '7394');
  await b.click('#btn-p2');
  await expect(b.locator('#cu-gsm .voicemail')).toBeVisible();
  await sluit(b, 'cu-gsm');

  // ── P3 (A): het uur van de afspraak ──
  await open(a, 'cu-notitieblok');
  await a.fill('#input-p3', '10u');
  await a.click('#btn-p3');
  await sluit(a, 'cu-notitieblok');

  // ── P4 (B): de spaardoos, met de wieltjes ──
  await expect(a.locator('.voorwerp[data-open="cu-telefoon"]')).toBeHidden();
  await open(b, 'cu-spaardoos');
  const hoger = (i: number, n: number) =>
    b.getByRole('button', { name: `Wieltje ${i} hoger` }).click({ clickCount: n });
  await hoger(1, 2);
  await hoger(2, 8);
  await hoger(3, 5);
  await b.click('#btn-p4');
  await sluit(b, 'cu-spaardoos');
  // P3 en P4 open: de telefoonnotitie verschijnt bij A
  await expect(a.locator('.voorwerp[data-open="cu-telefoon"]')).toBeVisible();

  // ── P5 (B): de leugen in het logboek ──
  await open(b, 'cu-schriften');
  await b.fill('#input-p5', '07:50');
  await b.click('#btn-p5');
  await expect(b.locator('#cu-schriften .leugen')).toBeVisible();
  await sluit(b, 'cu-schriften');
  await expect(a.locator('.voorwerp[data-open="cu-stroken"]')).toBeVisible();
  await expect(b.locator('.voorwerp[data-open="cu-stroken"]')).toBeVisible();

  // ── P6 (A): de eigen stroken in volgorde. Beginvolgorde A: [w3, k7, m4] ──
  await open(a, 'cu-stroken');
  await a.click('#btn-p6');
  await expect(a.locator('#feedback-p6')).toContainText('Speler B');
  const strook = (i: number) => a.locator('#stroken-lijst .strook').nth(i);
  await strook(0).getByRole('button', { name: 'Strook omlaag' }).click();
  await strook(1).getByRole('button', { name: 'Strook omlaag' }).click();
  await expect(strook(0)).toContainText('Vandaag word je tien');
  await a.click('#btn-p6');
  await expect(a.locator('#cu-stroken .rapport-knop')).toBeVisible();
  await expect(b.locator('#rapport-knop-plek .rapport-knop')).toBeVisible();

  // ── Rapport (A): eerst fout, dan juist, met een keuze ──
  await a.locator('#cu-stroken .rapport-knop').click();
  await a.waitForURL(/einde\.html/);
  await a.fill('#r-bestemming', 'Hasselt');
  await a.fill('#r-wie', 'haar dochter');
  await a.fill('#r-vervoer', 'bus');
  await a.fill('#r-tijdstip', '17:51');
  await a.click('#btn-indienen');
  await expect(a.locator('#fout-keuze')).toHaveClass(/zichtbaar/);
  await a.check('input[name="keuze"][value="morgen"]');
  await a.click('#btn-indienen');
  await expect(a.locator('#an-waarschuwing')).toHaveClass(/zichtbaar/);
  await expect(a.locator('#r-bestemming')).toHaveClass(/fout/);

  await a.fill('#r-bestemming', 'Diest');
  await a.click('#btn-indienen');

  // ── Einde: volgt de keuze ──
  await expect(a.locator('#scherm-einde')).toBeVisible();
  await expect(a.locator('#scherm-einde')).toHaveAttribute('data-einde', 'morgen');
  await expect(a.locator('#einde-titel')).toHaveText('Morgen praten we');
  await a.click('#btn-einde-verder');
  await expect(a.locator('#scherm-slot')).toBeVisible();
  await expect(a.locator('#stat-puzzels')).toHaveText('7/7');

  const sessie = await a.evaluate(
    code => JSON.parse(localStorage.getItem('e2e-firebase-db') ?? '{}').sessions[code],
    CODE,
  );
  expect(sessie.rapport.ingediend).toBe(true);
  expect(sessie.rapport.inhoud.conclusie).toBe('morgen');
  expect(sessie.actief).toBe(false);
  expect(Object.values(sessie.puzzels).every(Boolean)).toBe(true);

  expect(fouten).toEqual([]);
});

test('twee keer een fout rapport: An meldt Lena als vermist', async ({ context }) => {
  await nieuweContext(context);
  const a = await context.newPage();
  const fouten = bewaakFouten(a, 'A');
  await a.goto(`${K14}/einde.html?sessie=${CODE}`);

  await a.check('input[name="keuze"][value="alles"]');
  for (let i = 0; i < 2; i++) {
    await a.fill('#r-vervoer', 'trein');
    await a.fill('#r-tijdstip', '09:12');
    await a.fill('#r-bestemming', 'Turnhout');
    await a.fill('#r-wie', 'Katrijn');
    await a.click('#btn-indienen');
    if (i === 0) await expect(a.locator('#an-waarschuwing')).toHaveClass(/zichtbaar/);
  }
  await expect(a.locator('#scherm-einde')).toHaveAttribute('data-einde', 'vermist');
  await expect(a.locator('#einde-titel')).toHaveText('Vermist');
  await a.click('#btn-einde-verder');
  await expect(a.locator('#scherm-slot')).toBeVisible();
  expect(fouten).toEqual([]);
});

test('elke speler één fout rapport: allebei Vermist, en niemand kan nog indienen', async ({
  context,
}) => {
  await nieuweContext(context);
  const a = await context.newPage();
  const b = await context.newPage();
  const fouten = [...bewaakFouten(a, 'A'), ...bewaakFouten(b, 'B')];
  await a.goto(`${K14}/einde.html?sessie=${CODE}`);
  await b.goto(`${K14}/einde.html?sessie=${CODE}`);

  const dienFoutIn = async (page: Page): Promise<void> => {
    await page.check('input[name="keuze"][value="alles"]');
    await page.fill('#r-vervoer', 'trein');
    await page.fill('#r-tijdstip', '09:12');
    await page.fill('#r-bestemming', 'Turnhout');
    await page.fill('#r-wie', 'Katrijn');
    await page.click('#btn-indienen');
  };

  // A faalt: An waarschuwt, ook bij B die zelf niets indiende.
  await dienFoutIn(a);
  await expect(a.locator('#an-waarschuwing')).toHaveClass(/zichtbaar/);
  await expect(b.locator('#an-waarschuwing')).toHaveClass(/zichtbaar/);

  // B faalt ook: dat is de tweede fout van de sessie, dus voor beiden Vermist.
  await dienFoutIn(b);
  await expect(b.locator('#einde-titel')).toHaveText('Vermist');
  await expect(a.locator('#einde-titel')).toHaveText('Vermist');

  const sessie = await a.evaluate(
    code => JSON.parse(localStorage.getItem('e2e-firebase-db') ?? '{}').sessions[code],
    CODE,
  );
  expect(sessie.rapport.fouten).toBe(2);
  expect(sessie.rapport.ingediend).toBe(false);
  expect(sessie.actief).toBe(false);
  expect(fouten).toEqual([]);
});
