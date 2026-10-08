import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * Knoppen die vroeger via onclick="..." en window-functies liepen en nu via
 * data-actie (shared/js/acties.ts): hints in D.U.A. en het host-paneel van
 * Kamer 14, inclusief knoppen in rijen die pas later in de tabel komen.
 */
const HOST_EMAIL = 'host@bureau-x.be';

async function zaai(context: BrowserContext, data: Record<string, unknown>): Promise<void> {
  await context.addInitScript(d => {
    if (!localStorage.getItem('e2e-firebase-db')) {
      localStorage.setItem('e2e-firebase-db', JSON.stringify(d));
    }
  }, data);
}

test('D.U.A.: een hint opvragen werkt', async ({ context }) => {
  await zaai(context, {
    sessions: {
      'DUA-001': {
        aangemaakt: Date.now(),
        actief: true,
        ervaringsId: 'dua',
        aantalSpelers: 2,
        puzzels: { p0: true, p1: false, p2: false, p3: false, p4: false, p5: false },
        rapport: { ingediend: false, inhoud: {} },
      },
    },
  });
  const page = await context.newPage();
  const fouten: string[] = [];
  page.on('pageerror', e => fouten.push(e.message));
  await page.goto('/experiences/dua/speler-1934.html?sessie=DUA-001');

  const blok = page.locator('#hint-p2a');
  await blok.scrollIntoViewIfNeeded();
  await blok.getByRole('button', { name: 'Hint vragen' }).click();
  await expect(blok.locator('.hint-stap').first()).toBeVisible();
  expect(fouten).toEqual([]);
});

test('Kamer 14 host-paneel: inloggen, sessie aanmaken, details en uitloggen', async ({
  context,
}) => {
  await zaai(context, { beheerders: { [`host-${HOST_EMAIL}`]: true } });
  const page = await context.newPage();
  const fouten: string[] = [];
  page.on('pageerror', e => fouten.push(e.message));
  page.on('dialog', d => void d.accept());
  await page.goto('/experiences/kamer-14/host-panel.html');

  await page.fill('#email-invoer', HOST_EMAIL);
  await page.fill('#ww-invoer', 'geheim');
  await page.click('#login-knop');
  await expect(page.locator('#admin-inhoud')).toBeVisible();

  // Nieuwe code genereren en een sessie aanmaken
  const code = page.locator('#gegenereerde-code');
  const eerste = await code.textContent();
  await page.locator('[data-actie="genereer-code"]').click();
  await expect(code).not.toHaveText(eerste ?? '');
  const nieuweCode = (await code.textContent())?.trim() ?? '';
  await page.click('#btn-aanmaken');
  await expect(page.locator('#status-aanmaken')).toContainText('aangemaakt');

  // De rij verschijnt in de lijst; de detailknop zit in gegenereerde HTML
  await page.locator('[data-actie="ververs-lijst"]').click();
  const detailKnop = page.locator(`[data-actie="toon-details"][data-code="${nieuweCode}"]`);
  await expect(detailKnop).toBeVisible();
  await detailKnop.click();
  await expect(detailKnop).toHaveAttribute('aria-expanded', 'true');

  // De sessie heeft alle puzzels van Kamer 14, P6 inbegrepen
  const sessie = await page.evaluate(
    c => JSON.parse(localStorage.getItem('e2e-firebase-db') ?? '{}').sessions[c],
    nieuweCode,
  );
  expect(Object.keys(sessie.puzzels)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);

  // Deactiveren via de knop in de rij
  await page.locator(`[data-actie="deactiveer"][data-code="${nieuweCode}"]`).click();
  await expect
    .poll(() =>
      page.evaluate(
        c => JSON.parse(localStorage.getItem('e2e-firebase-db') ?? '{}').sessions[c].actief,
        nieuweCode,
      ),
    )
    .toBe(false);

  await page.locator('[data-actie="uitloggen"]').click();
  await expect(page.locator('#admin-inhoud')).toBeHidden();
  expect(fouten).toEqual([]);
});
