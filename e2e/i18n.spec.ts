import { test, expect, type Page } from '@playwright/test';

/**
 * Meertaligheid (docs/adr/001-meertaligheid.md): de Engelse pagina's bestaan,
 * hebben de juiste taal en metadata, de taalknop werkt, de cookiebanner is
 * vertaald en de taalsuggestie stuurt nooit automatisch door.
 */
async function zonderCookiebanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bureaux-cookiekeuze',
      JSON.stringify({ analytics: false, tijdstip: Date.now(), versie: 1 }),
    );
  });
}

for (const pad of ['/en/', '/en/kamer-14/', '/en/dua/', '/en/privacy.html']) {
  test(`${pad}: Engels, met canonical en hreflang`, async ({ page }) => {
    await zonderCookiebanner(page);
    await page.goto(pad);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    // De privacypagina staat op noindex en heeft geen canonical.
    if (!pad.includes('privacy')) {
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://bureau-x.be${pad}`,
      );
    }
    await expect(page.locator('link[rel="alternate"][hreflang="nl"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    await expect(page.locator('[data-taal="en"][aria-current="true"]')).toHaveCount(1);
  });
}

test('taalknop gaat naar dezelfde pagina in het Nederlands en onthoudt de keuze', async ({
  page,
}) => {
  await zonderCookiebanner(page);
  await page.goto('/en/dua/');
  await page.locator('[data-taal="nl"]').first().click({ force: true });
  await expect(page).toHaveURL(/\/dua\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl');
  expect(await page.evaluate(() => localStorage.getItem('bureaux-taal'))).toBe('nl');
});

test('cookiebanner is vertaald en linkt naar de Engelse privacypagina', async ({ page }) => {
  await page.goto('/en/');
  const banner = page.locator('#cookie-banner');
  await expect(banner).toContainText('May we measure how you use the site?');
  await expect(banner.locator('a')).toHaveAttribute('href', '/en/privacy.html#cookies');
  await expect(page.locator('#cookie-weigeren')).toHaveText('Decline');
});

test.describe('Engelse browser op een Nederlandse pagina', () => {
  test.use({ locale: 'en-GB' });

  test('krijgt een suggestie, geen doorverwijzing, en wegklikken onthoudt', async ({ page }) => {
    await zonderCookiebanner(page);
    await page.goto('/dua/');
    await expect(page).toHaveURL(/\/dua\/$/);
    const balk = page.locator('.taal-suggestie');
    await expect(balk).toContainText('This page is also available in English.');
    await expect(balk.locator('a')).toHaveAttribute('href', '/en/dua/');
    await balk.locator('button').click();
    await expect(balk).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.taal-suggestie')).toHaveCount(0);
  });
});

test('boekingsformulier op de Engelse pagina toont Engelse meldingen', async ({ page }) => {
  await zonderCookiebanner(page);
  await page.route('https://hook.eu1.make.com/**', route =>
    route.fulfill({ status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' }),
  );
  await page.goto('/en/kamer-14/');
  await page.fill('#boek-naam', 'Jane Smith');
  await page.fill('#boek-email_speler_1', 'a@example.com');
  await page.fill('#boek-email_speler_2', 'b@example.com');
  await page.locator('#boekForm button[type="submit"]').click();
  await expect(page.locator('#boek-fout')).toHaveText(
    'Your booking couldn’t be sent. Please try again or email info@bureau-x.be.',
  );
});

test('404-pagina: eigen stijl, noindex en links naar de spellen', async ({ page }) => {
  await zonderCookiebanner(page);
  await page.goto('/404.html');
  await expect(page.locator('h1')).toHaveText('Dit dossier bestaat niet.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('.nf-knoppen a[href="/dua/"]')).toHaveCount(1);
  await expect(page.locator('.nf-andere-taal a')).toHaveAttribute('href', '/en/');
});
