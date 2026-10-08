import { test, expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Een volledige run van Kamer 14 met twee spelers in twee tabbladen van
 * dezelfde browser. De nep-Firebase (e2e/fake-firebase) deelt de data via
 * localStorage, dus wat Speler A oplost, ziet Speler B live verschijnen.
 *
 * Dit vangt wat de unittests niet zien: de pagina-scripts samen, de
 * vrijgave van tabs tussen twee spelers, P6 en het hele einde.
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
        puzzels: { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false },
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

async function antwoord(page: Page, puzzel: string, waarde: string): Promise<void> {
  const blok = page.locator(`#puzzel-${puzzel.slice(1)}`);
  await expect(blok).toBeVisible();
  await page.fill(`#input-${puzzel}`, waarde);
  await page.click(`#btn-${puzzel}`);
}

async function openTab(page: Page, naam: string): Promise<void> {
  await page.locator('.tabs .tab', { hasText: new RegExp(`^${naam}$`) }).click();
}

test('Kamer 14 van lobby tot epiloog, met twee spelers', async ({ context }) => {
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
  // Met de code in de link slaat de lobby het codescherm over
  await expect(b.locator('#scherm-rol')).toBeVisible();
  await expect(b.locator('#rol-kaart-a')).toHaveClass(/rol-bezet/);
  await b.click('#rol-kaart-b');
  await b.waitForURL(/speler-b\.html\?sessie=ABC-234/);

  // ── P1 (A) → bij B komen P2 en P3 vrij ──
  await antwoord(a, 'p1', 'dinsdag en donderdag');
  await expect(b.locator('#puzzel-2')).toBeVisible();
  await expect(a.locator('#tab-atelier')).not.toHaveClass(/slot/);

  // ── P2 (B) en P3 (A) → kamerinspectie en intakefiche ──
  await antwoord(b, 'p2', 'Diest');
  await openTab(a, 'Dossiernotities');
  await antwoord(a, 'p3', 'zeven weken');
  await expect(b.locator('#tab-kamer')).not.toHaveClass(/slot/);
  await expect(a.locator('#tab-intakefiche')).not.toHaveClass(/slot/);

  // Kamerinspectie: de envelop van Marie op het prikbord
  await openTab(b, 'Kamerinspectie');
  await b.click('[data-zone="prikbord"]');
  await expect(b.locator('#zone-modal-titel')).toContainText('Prikbord');
  await b.keyboard.press('Escape');

  // ── P4 (B, typfout mag) → bijlage D bij A ──
  await antwoord(b, 'p4', 'marie stass');
  await expect(a.locator('#tab-bijlage')).not.toHaveClass(/slot/);

  // ── P5 (A) → tab Bladzijde bij beiden ──
  await openTab(a, 'Bijlage D');
  await antwoord(a, 'p5', '7u35');
  await expect(b.locator('#tab-bladzijde')).not.toHaveClass(/slot/);

  // ── P6 (B): drie stroken in de juiste volgorde ──
  await openTab(b, 'Bladzijde');
  // Eerst een foute volgorde bevestigen: melding, niets opgelost
  await b.click('#btn-p6');
  await expect(b.locator('#feedback-p6')).toContainText('Speler A');
  // Beginvolgorde B is [4, 6, 2]: strook 2 twee keer omhoog
  const omhoog = (i: number) =>
    b.locator('#stroken-lijst .strook').nth(i).getByRole('button', { name: 'Strook omhoog' });
  await omhoog(2).click();
  await omhoog(1).click();
  await expect(b.locator('#stroken-lijst .strook').first()).toContainText('bloemenwinkel');
  await b.click('#btn-p6');

  // Beide spelers zien de hele bladzijde en de balk naar het rapport
  await openTab(a, 'Bladzijde');
  await expect(a.locator('#bladzijde-volledig')).toContainText('Dit wil ik één keer alleen doen.');
  await expect(b.locator('#einde-link')).toBeVisible();

  // ── Rapport (A): eerst fout, dan juist ──
  await a.click('#einde-link');
  await a.waitForURL(/einde\.html/);
  await a.fill('#r-vervoer', 'bus');
  await a.fill('#r-tijdstip', '07:35');
  await a.fill('#r-bestemming', 'Hasselt');
  await a.fill('#r-wie', 'Marie Stas');
  await expect(a.locator('#route-label-stad')).toHaveText('Hasselt');
  await a.click('#btn-indienen');
  await expect(a.locator('#an-waarschuwing')).toBeVisible();
  await expect(a.locator('#r-bestemming')).toHaveClass(/fout/);

  await a.fill('#r-bestemming', 'Diest');
  await a.click('#btn-indienen');

  // ── Einde: mail van An, briefkaart, epiloog, slot ──
  await expect(a.locator('#scherm-mail-an')).toBeVisible();
  await expect(a.locator('#scherm-mail-an')).toContainText('De politie bel ik niet.');
  await a.click('#btn-mail-verder');
  await a.click('#postkaart');
  await a.click('#btn-sluit-dossier');
  await expect(a.locator('#scherm-epiloog')).toContainText('Huidig adres: bekend.');
  await a.click('#btn-epiloog-verder');
  await expect(a.locator('#scherm-slot')).toBeVisible();
  await expect(a.locator('#stat-puzzels')).toHaveText('6/6');

  // De sessie is ingediend en gesloten in de database
  const sessie = await a.evaluate(
    code => JSON.parse(localStorage.getItem('e2e-firebase-db') ?? '{}').sessions[code],
    CODE,
  );
  expect(sessie.rapport.ingediend).toBe(true);
  expect(sessie.actief).toBe(false);
  expect(sessie.puzzels).toEqual({ p1: true, p2: true, p3: true, p4: true, p5: true, p6: true });

  expect(fouten).toEqual([]);
});

test('twee keer een fout rapport: An belt de politie', async ({ context }) => {
  await nieuweContext(context);
  const a = await context.newPage();
  const fouten = bewaakFouten(a, 'A');
  await a.goto(`${K14}/einde.html?sessie=${CODE}`);

  for (let i = 0; i < 2; i++) {
    await a.fill('#r-vervoer', 'trein');
    await a.fill('#r-tijdstip', '09:12');
    await a.fill('#r-bestemming', 'Turnhout');
    await a.fill('#r-wie', 'Katrijn');
    await a.click('#btn-indienen');
  }
  await expect(a.locator('#scherm-politie')).toBeVisible();
  await expect(a.locator('#scherm-politie')).toContainText('Om 19u40');
  await a.click('#btn-politie-verder');
  await expect(a.locator('#scherm-slot')).toBeVisible();
  expect(fouten).toEqual([]);
});
