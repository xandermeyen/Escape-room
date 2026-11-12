import { test, expect, type Page, type Request } from '@playwright/test';

/**
 * Het boekingsformulier op /kamer-14/ en /dua/, met een nagebootste
 * Make-webhook (page.route). Er gaat dus niets naar Make en er komt geen echte
 * sessie of mail. Wat Make zelf doet, staat in docs/make-scenario.md en wordt
 * tegen de blueprint gecontroleerd in tests/make-contract.test.ts.
 */
const HOOK = 'https://hook.eu1.make.com/**';

async function zonderCookiebanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bureaux-cookiekeuze',
      JSON.stringify({ analytics: false, tijdstip: Date.now(), versie: 1 }),
    );
  });
}

/** Laat de webhook antwoorden en onthoudt het request. */
async function mockWebhook(
  page: Page,
  antwoord: { status?: number; body: string; contentType?: string },
): Promise<Request[]> {
  const requests: Request[] = [];
  await page.route(HOOK, route => {
    requests.push(route.request());
    return route.fulfill({
      status: antwoord.status ?? 200,
      contentType: antwoord.contentType ?? 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: antwoord.body,
    });
  });
  return requests;
}

/** Het enige request naar de webhook (faalt als er geen of meerdere waren). */
function enig(requests: Request[]): Request {
  expect(requests).toHaveLength(1);
  return requests[0] as Request;
}

function velden(req: Request): URLSearchParams {
  return new URLSearchParams(req.postData() ?? '');
}

test.beforeEach(async ({ page }) => {
  await zonderCookiebanner(page);
});

test('Kamer 14: boeken toont meteen de code en de link', async ({ page }) => {
  const fouten: string[] = [];
  page.on('pageerror', e => fouten.push(e.message));
  const link = 'https://bureau-x.be/experiences/kamer-14/?sessie=K14TEST1';
  const requests = await mockWebhook(page, {
    body: JSON.stringify({ sessieCode: 'K14TEST1', link }),
  });

  await page.goto('/kamer-14/');
  await page.fill('#boek-naam', 'Jan Janssen');
  await page.fill('#boek-email_speler_1', 'jan@voorbeeld.be');
  await page.fill('#boek-email_speler_2', 'an@voorbeeld.be');
  await page.getByRole('button', { name: 'Start de sessie' }).click();

  const ok = page.locator('#boek-ok');
  await expect(ok).toBeVisible();
  await expect(ok.locator('[data-boek="code"]')).toHaveText('K14TEST1');
  await expect(ok.getByRole('link', { name: 'Open het dossier' })).toHaveAttribute('href', link);
  await expect(page.locator('#boekForm')).toBeHidden();

  const req = enig(requests);
  // Simple request: geen preflight richting Make.
  expect(req.method()).toBe('POST');
  expect(req.headers()['content-type']).toContain('application/x-www-form-urlencoded');
  const v = velden(req);
  expect(v.get('experience')).toBe('kamer-14');
  expect(v.get('email_speler_1')).toBe('jan@voorbeeld.be');
  expect(v.get('email_speler_2')).toBe('an@voorbeeld.be');
  expect(v.get('_gotcha')).toBe('');
  expect(v.get('datumTekst')).toBe('');
  expect(fouten).toEqual([]);
});

test('Kamer 14: een gekozen datum gaat leesbaar mee', async ({ page }) => {
  const requests = await mockWebhook(page, {
    body: JSON.stringify({
      sessieCode: 'K14TEST2',
      link: 'https://bureau-x.be/experiences/kamer-14/?sessie=K14TEST2',
    }),
  });
  await page.goto('/kamer-14/');
  await page.fill('#boek-naam', 'Jan');
  await page.fill('#boek-datum', '2099-11-20');
  await page.fill('#boek-email_speler_1', 'jan@voorbeeld.be');
  await page.fill('#boek-email_speler_2', 'an@voorbeeld.be');
  await page.getByRole('button', { name: 'Start de sessie' }).click();
  await expect(page.locator('#boek-ok')).toBeVisible();
  expect(velden(enig(requests)).get('datumTekst')).toMatch(/20 november/);
});

test('D.U.A. met 3 spelers: veld 3 verplicht, veld 4 verborgen en leeg', async ({ page }) => {
  const requests = await mockWebhook(page, {
    body: JSON.stringify({
      sessieCode: 'DUATEST3',
      link: 'https://bureau-x.be/experiences/dua/?sessie=DUATEST3',
    }),
  });
  await page.goto('/dua/');

  const veld3 = page.locator('#boek-email_speler_3');
  const veld4 = page.locator('#boek-email_speler_4');
  await expect(veld3).toBeHidden();

  await page.locator('.speler-btn[data-n="4"]').click();
  await expect(veld4).toBeVisible();
  await veld4.fill('vier@voorbeeld.be');
  await page.locator('.speler-btn[data-n="3"]').click();
  await expect(veld3).toBeVisible();
  await expect(veld3).toHaveAttribute('required', '');
  await expect(veld4).toBeHidden();
  await expect(veld4).toHaveValue(''); // terug naar 3 wist speler 4

  await page.fill('#boek-naam', 'Jan');
  await page.fill('#boek-email_speler_1', 'een@voorbeeld.be');
  await page.fill('#boek-email_speler_2', 'twee@voorbeeld.be');

  // Veld 3 leeg: de browser houdt het formulier tegen, er gaat niets naar Make.
  await page.getByRole('button', { name: 'Start de sessie' }).click();
  expect(requests).toHaveLength(0);

  await veld3.fill('drie@voorbeeld.be');
  await page.getByRole('button', { name: 'Start de sessie' }).click();
  await expect(page.locator('#boek-ok [data-boek="code"]')).toHaveText('DUATEST3');

  const v = velden(enig(requests));
  expect(v.get('experience')).toBe('dua');
  expect(v.get('email_speler_3')).toBe('drie@voorbeeld.be');
  expect(v.get('email_speler_4')).toBe('');
  expect(v.get('aantal_spelers')).toBe('3');
});

for (const geval of [
  { naam: 'serverfout', status: 500, body: '{}' },
  { naam: 'Make weigert (filter of scenario uit)', body: 'Accepted', contentType: 'text/plain' },
  {
    naam: 'link naar een andere site',
    body: JSON.stringify({ sessieCode: 'K14TEST9', link: 'https://elders.be/' }),
  },
]) {
  test(`mislukt (${geval.naam}): foutmelding, formulier blijft bruikbaar`, async ({ page }) => {
    await mockWebhook(page, geval);
    await page.goto('/kamer-14/');
    await page.fill('#boek-naam', 'Jan');
    await page.fill('#boek-email_speler_1', 'jan@voorbeeld.be');
    await page.fill('#boek-email_speler_2', 'an@voorbeeld.be');
    const knop = page.getByRole('button', { name: 'Start de sessie' });
    await knop.click();

    await expect(page.locator('#boek-fout')).toBeVisible();
    await expect(page.locator('#boek-fout')).toContainText('info@bureau-x.be');
    await expect(page.locator('#boek-ok')).toBeHidden();
    await expect(knop).toBeEnabled();
  });
}
