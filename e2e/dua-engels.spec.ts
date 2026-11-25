import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * D.U.A. in het Engels (ADR-001, fase 3): de speltaal komt uit de sessie en de
 * browser vertaalt de pagina (shared/js/spelvertaling.ts). Een sessie zonder
 * taal blijft Nederlands.
 */
async function zaai(
  context: BrowserContext,
  taal?: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const sessie: Record<string, unknown> = {
    aangemaakt: Date.now(),
    actief: true,
    ervaringsId: 'dua',
    aantalSpelers: 2,
    puzzels: { p0: false, p1: false, p2: false, p3: false, p4: false, p5: false },
    rapport: { ingediend: false, inhoud: {} },
  };
  Object.assign(sessie, extra);
  if (taal) sessie.taal = taal;
  await context.addInitScript(
    d => {
      if (!localStorage.getItem('e2e-firebase-db')) {
        localStorage.setItem('e2e-firebase-db', JSON.stringify(d));
      }
    },
    { sessions: { 'DUA-EN-1': sessie } },
  );
}

for (const [pagina, kop] of [
  ['speler-1934.html', 'Ghent, April 1934. You are D.U.A.'],
  ['speler-2034.html', 'Bureau X, 2034. The cold trail.'],
] as const) {
  test(`Engelse sessie: ${pagina} is Engels`, async ({ context }) => {
    await zaai(context, 'en');
    const page = await context.newPage();
    const fouten: string[] = [];
    page.on('pageerror', e => fouten.push(e.message));
    await page.goto(`/experiences/dua/${pagina}?sessie=DUA-EN-1`);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).not.toHaveClass(/i18n-wacht/);
    await expect(page.getByText(kop)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask for a hint' }).first()).toBeVisible();
    expect(fouten).toEqual([]);
  });
}

test('Engelse sessie: de lobby met ?taal=en is meteen Engels', async ({ context }) => {
  await zaai(context, 'en');
  const page = await context.newPage();
  await page.goto('/experiences/dua/?sessie=DUA-EN-1&taal=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Open the line' })).toBeVisible();
});

test('een sessie zonder taal blijft Nederlands', async ({ context }) => {
  await zaai(context);
  const page = await context.newPage();
  await page.goto('/experiences/dua/speler-2034.html?sessie=DUA-EN-1&taal=en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await expect(page.getByText('Bureau X, 2034. Het koude spoor.')).toBeVisible();
  await expect(page.locator('html')).not.toHaveClass(/i18n-wacht/);
});

test('Engelse sessie: de teksten uit TypeScript zijn Engels', async ({ context }) => {
  await zaai(context, 'en');
  const page = await context.newPage();
  await page.goto('/experiences/dua/speler-1934.html?sessie=DUA-EN-1&rol=loper');
  await expect(page.locator('#sys-rol')).toHaveText('1934 · The Runner');
  await expect(page.locator('#sys-case')).toContainText('File 1934/RR · Session DUA-EN-1');
  await expect(page.locator('.loper-code')).toHaveText('11 · 15 · 24 · 34 · 25 · 43');
  await expect(page.locator('#brief-status')).toHaveText('6 letters left to choose.');
  await expect(page.locator('#hamerrij .label').first()).toHaveText('slot 1');
  await expect(page.locator('#muteknop')).toHaveText(/♪ (on|off)/);
});

test('Engelse sessie: P1 met LOCKER, van typemachine tot doorslag', async ({ context }) => {
  await zaai(context, 'en', {
    puzzels: { p0: true, p1: false, p2: false, p3: false, p4: false, p5: false },
    dua: {
      p0zegel: true,
      brief: { letters: '', verstuurd: false },
      hamers: 'TKSUNR',
      letterKeuze: '',
      meta: { verdenking: 0, strafMs: 0, hints: 0 },
    },
  });
  const schrijver = await context.newPage();
  const archivaris = await context.newPage();
  const fouten: string[] = [];
  for (const p of [schrijver, archivaris]) p.on('pageerror', e => fouten.push(e.message));
  await schrijver.goto('/experiences/dua/speler-1934.html?sessie=DUA-EN-1&rol=schrijver');
  await archivaris.goto('/experiences/dua/speler-2034.html?sessie=DUA-EN-1&rol=archivaris');

  // LOCKER in leesvolgorde aanslaan.
  const brief = (await schrijver.locator('#typvel').textContent()) ?? '';
  let vanaf = 0;
  for (const letter of 'LOCKER') {
    const i = brief.indexOf(letter, vanaf);
    vanaf = i + 1;
    await schrijver.locator(`#typvel .lt[data-i="${i}"]`).click();
  }
  await expect(schrijver.locator('#brief-status')).toHaveText(
    'Six letters chosen. Strike when you are sure.',
  );
  await schrijver.click('#btn-verstuur');
  await expect(schrijver.locator('#dua-melding')).toContainText('Carbon copy made');

  await expect(archivaris.locator('#doorslag-inhoud .doorgedrukt')).toHaveCount(6);
  await archivaris.fill('#ant-woord', 'locker');
  await archivaris.click('#btn-woord');
  await expect(archivaris.locator('#dua-melding')).toContainText('P1 solved');
  expect(fouten).toEqual([]);
});

test('Engelse sessie: ook de gedeelde onderdelen zijn Engels', async ({ context }) => {
  await zaai(context, 'en');
  const page = await context.newPage();
  await page.goto('/experiences/dua/speler-2034.html?sessie=DUA-EN-1&rol=archivaris');
  await expect(page.getByRole('button', { name: 'Need help?' })).toBeVisible();
  await page.getByRole('button', { name: 'Need help?' }).click();
  await expect(page.getByRole('heading', { name: 'How D.U.A. works' })).toBeVisible();
});

test('een Engelse code in de Nederlandse lobby: de lobby wordt Engels', async ({ context }) => {
  await zaai(context, 'en');
  const page = await context.newPage();
  await page.goto('/experiences/dua/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  await page.getByRole('button', { name: 'Open de lijn' }).click();
  await page.locator('#sessieCodeInput').fill('DUA-EN-1');
  await page.getByRole('button', { name: 'Verder' }).click();
  await expect(page.getByText('Choose your side of time')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
