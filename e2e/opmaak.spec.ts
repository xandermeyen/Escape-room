import { test, expect, type Page } from '@playwright/test';

/**
 * Opmaak van de productiebuild (zie playwright.opmaak.config.ts).
 *
 * Geen pixelvergelijking, maar een paar berekende stijlen die eerder stuk
 * gingen zonder dat een andere test het merkte:
 * - .btn-outline verloor zijn rand toen Vite de CSS anders ging bundelen;
 * - het hero-canvas bleef 300 x 150 px in plaats van de hele hero te vullen;
 * - de taalknoppen moeten op elke sitepagina zichtbaar zijn, ook in het Nederlands
 *   (behalve op de 404-pagina, die haar taal zelf kiest).
 */

const SITEPAGINAS = ['/', '/en/', '/kamer-14/', '/en/kamer-14/', '/dua/', '/en/dua/', '/404.html'];

async function open(page: Page, pad: string): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bureaux-cookiekeuze',
      JSON.stringify({ analytics: false, tijdstip: Date.now(), versie: 1 }),
    );
    // Geen taalsuggestie-balk die over de nav valt.
    localStorage.setItem('bureaux-taal', document.documentElement.lang || 'nl');
  });
  await page.goto(pad);
  await page.waitForLoadState('load');
}

for (const pad of SITEPAGINAS) {
  test(`${pad}: knoppen met rand, taalknoppen zichtbaar, geen horizontale scroll`, async ({
    page,
  }) => {
    await open(page, pad);

    const randen = await page
      .locator('.btn-outline:visible')
      .evaluateAll(els => els.map(e => getComputedStyle(e).borderTopWidth));
    expect(randen.length, 'minstens één .btn-outline op de pagina').toBeGreaterThan(0);
    for (const rand of randen) expect(rand).not.toBe('0px');

    // De 404-pagina heeft geen taalknop: ze kiest haar taal zelf uit het adres.
    if (pad !== '/404.html') {
      await expect(page.locator('[data-taal="nl"]:visible').first()).toBeVisible();
      await expect(page.locator('[data-taal="en"]:visible').first()).toBeVisible();
    }

    const breedte = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      venster: document.documentElement.clientWidth,
    }));
    expect(breedte.scroll).toBeLessThanOrEqual(breedte.venster);
  });
}

for (const pad of ['/', '/en/']) {
  test(`${pad}: hero-canvas vult de hele hero`, async ({ page }) => {
    await open(page, pad);
    const canvas = page.locator('#hero-canvas');
    await expect(canvas).toBeAttached();
    const hero = await canvas.evaluate(c => {
      const h = c.parentElement!.getBoundingClientRect();
      const r = c.getBoundingClientRect();
      return { heroB: h.width, heroH: h.height, b: r.width, h: r.height };
    });
    expect(hero.b).toBeGreaterThanOrEqual(hero.heroB - 1);
    expect(hero.h).toBeGreaterThanOrEqual(hero.heroH - 1);
  });
}

test('gsm-breedte: geen horizontale scroll op de homepage', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page, '/');
  const breedte = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    venster: document.documentElement.clientWidth,
  }));
  expect(breedte.scroll).toBeLessThanOrEqual(breedte.venster);
});
