import { test, expect, type BrowserContext } from '@playwright/test';

/**
 * D.U.A. in het Engels (ADR-001, fase 3): de speltaal komt uit de sessie en de
 * browser vertaalt de pagina (shared/js/spelvertaling.ts). Een sessie zonder
 * taal blijft Nederlands.
 */
async function zaai(context: BrowserContext, taal?: string): Promise<void> {
  const sessie: Record<string, unknown> = {
    aangemaakt: Date.now(),
    actief: true,
    ervaringsId: 'dua',
    aantalSpelers: 2,
    puzzels: { p0: false, p1: false, p2: false, p3: false, p4: false, p5: false },
    rapport: { ingediend: false, inhoud: {} },
  };
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
