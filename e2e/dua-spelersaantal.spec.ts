import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * D.U.A. met 2 en 3 spelers: de lobby bewaakt het aantal plaatsen uit de sessie
 * (aantalSpelers, gezet door Make) en zorgt dat elk tijdperk minstens één
 * speler heeft. Wie zijn tijdperk alleen speelt, krijgt het volledige dossier
 * van dat tijdperk: de rol is een label.
 *
 * De volledige run met 4 spelers staat in dua-volledige-run.spec.ts.
 */
const DB = 'e2e-firebase-db';
const LOBBY = '/experiences/dua/';

async function zaaiSessie(context: BrowserContext, code: string, aantal: number): Promise<void> {
  await context.addInitScript(
    ([sleutel, c, n]) => {
      if (!location.protocol.startsWith('http')) return; // about:blank van een nieuw tabblad
      if (localStorage.getItem(sleutel as string)) return;
      localStorage.setItem(
        sleutel as string,
        JSON.stringify({
          sessions: {
            [c as string]: {
              aangemaakt: Date.now(),
              actief: true,
              ervaringsId: 'dua',
              aantalSpelers: n,
              puzzels: Object.fromEntries(
                ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map(p => [p, false]),
              ),
              rapport: { ingediend: false, inhoud: {} },
            },
          },
        }),
      );
    },
    [DB, code, aantal] as const,
  );
}

/** Opent de lobby via de link uit de mail en gaat naar het rolscherm. */
async function naarRolscherm(context: BrowserContext, code: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${LOBBY}?sessie=${code}`);
  await page.click('#btn-begin');
  await expect(page.locator('#scherm-rol')).toBeVisible();
  return page;
}

async function claim(page: Page, rol: string, pagina: '1934' | '2034'): Promise<void> {
  await page.click(`#rol-kaart-${rol}`);
  await expect(page).toHaveURL(new RegExp(`speler-${pagina}\\.html.*rol=${rol}`));
}

/** Wacht tot de lobby ziet dat deze rollen al bezet zijn (live listener). */
async function zietBezet(page: Page, ...rollen: string[]): Promise<void> {
  for (const rol of rollen)
    await expect(page.locator(`#rol-kaart-${rol}`)).toHaveClass(/rol-bezet/);
}

test('D.U.A. met 3 spelers: twee in 1934, één alleen in 2034, en geen vierde', async ({
  context,
}) => {
  const CODE = 'DUA-DRIE-01';
  await zaaiSessie(context, CODE, 3);
  const fouten: string[] = [];
  context.on('page', p => p.on('pageerror', e => fouten.push(e.message)));

  const een = await naarRolscherm(context, CODE);
  await claim(een, 'schrijver', '1934');

  const twee = await naarRolscherm(context, CODE);
  await zietBezet(twee, 'schrijver');
  await claim(twee, 'loper', '1934');

  // De derde mag niet meer in 1934, maar 2034 is vrij.
  const drie = await naarRolscherm(context, CODE);
  await zietBezet(drie, 'schrijver', 'loper');
  await claim(drie, 'restaurateur', '2034');

  // Een vierde speler wordt geweigerd: de sessie is voor 3.
  const vier = await naarRolscherm(context, CODE);
  await zietBezet(vier, 'schrijver', 'loper', 'restaurateur');
  await vier.click('#rol-kaart-archivaris');
  await expect(vier.locator('#rol-fout')).toHaveText(
    'Alle plaatsen van deze sessie zijn al ingenomen.',
  );
  await expect(vier).toHaveURL(/experiences\/dua\/\?sessie=/);

  // Wie 2034 alleen speelt, kan ook het werk van de Archivaris doen.
  await drie.fill('#archief-zoek', 'rr-12');
  await drie.click('#btn-archief');
  await expect(drie.locator('#codekaart')).toBeVisible();
  await expect(drie.locator('#typekoppen .typekop-letter')).toHaveCount(6);

  expect(fouten).toEqual([]);
});

test('D.U.A. met 2 spelers: de tweede moet het andere tijdperk nemen', async ({ context }) => {
  const CODE = 'DUA-TWEE-01';
  await zaaiSessie(context, CODE, 2);

  const een = await naarRolscherm(context, CODE);
  await claim(een, 'schrijver', '1934');

  const twee = await naarRolscherm(context, CODE);
  await zietBezet(twee, 'schrijver');
  await twee.click('#rol-kaart-loper');
  await expect(twee.locator('#rol-fout')).toHaveText(
    'Houd deze plek vrij: er moet minstens één speler in 2034 staan.',
  );
  await claim(twee, 'archivaris', '2034');

  const drie = await naarRolscherm(context, CODE);
  await zietBezet(drie, 'schrijver', 'archivaris');
  await drie.click('#rol-kaart-restaurateur');
  await expect(drie.locator('#rol-fout')).toHaveText(
    'Alle plaatsen van deze sessie zijn al ingenomen.',
  );
});
