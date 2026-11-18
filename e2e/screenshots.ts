import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Maakt de screenshots voor de README (docs/screenshots) en de promotiebeelden
 * voor overzichtssites (docs/promo). Draait tegen de nep-Firebase, met een
 * verse sessie, dus zonder echte spelers of data.
 *
 *   pnpm screenshots
 *
 * Geen gewone test: de bestandsnaam eindigt niet op .spec.ts, dus pnpm test:e2e
 * slaat dit over (zie playwright.screenshots.config.ts).
 * Toon bewust geen close-ups of opgeloste puzzels: niets mag de oplossing verklappen.
 */

const ROOT = resolve(import.meta.dirname, '..');
const README = resolve(ROOT, 'docs/screenshots');
const PROMO = resolve(ROOT, 'docs/promo');
mkdirSync(README, { recursive: true });
mkdirSync(PROMO, { recursive: true });

const DB = 'e2e-firebase-db';
const K14 = '/experiences/kamer-14';
const DUA = '/experiences/dua';
const K14_CODE = 'ABC-234';
const DUA_CODE = 'DUA-2026-001';

function sessies(): Record<string, unknown> {
  const nu = Date.now();
  return {
    sessions: {
      [K14_CODE]: {
        aangemaakt: nu,
        actief: true,
        ervaringsId: 'kamer-14',
        puzzels: Object.fromEntries(
          ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map(p => [p, false]),
        ),
        rapport: { ingediend: false, inhoud: {} },
      },
      [DUA_CODE]: {
        aangemaakt: nu,
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

async function voorbereid(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ([sleutel, data]) => {
      if (!localStorage.getItem(sleutel as string)) {
        localStorage.setItem(sleutel as string, JSON.stringify(data));
      }
      // Geen cookiebanner, geen taalsuggestie, geen geluid op de foto.
      localStorage.setItem(
        'bureaux-cookiekeuze',
        JSON.stringify({ analytics: false, tijdstip: Date.now(), versie: 1 }),
      );
      localStorage.setItem('bureaux-taal', document.documentElement.lang || 'nl');
      localStorage.setItem('dua-mute', '1');
    },
    [DB, sessies()] as const,
  );
}

async function foto(page: Page, naam: string, map = README): Promise<Buffer> {
  await page.waitForTimeout(400);
  return page.screenshot({ path: resolve(map, naam), type: 'jpeg', quality: 85 });
}

async function zonderGeluidsmelding(page: Page): Promise<void> {
  await page
    .locator('#geluidsmelding')
    .evaluate(el => el.remove())
    .catch(() => {});
}

/** Speler A en B van Kamer 14 via de lobby, zoals echte spelers. */
async function kamer14(context: BrowserContext): Promise<{ a: Page; b: Page }> {
  const a = await context.newPage();
  await a.goto(`${K14}/`);
  await a.click('#btn-naar-briefing');
  await a.click('#btn-begin');
  await a.fill('#sessieCodeInput', K14_CODE);
  await a.getByRole('button', { name: /verder/i }).click();
  await a.click('#rol-kaart-a');
  await a.waitForURL(/speler-a\.html/);

  const b = await context.newPage();
  await b.goto(`${K14}/?sessie=${K14_CODE}`);
  await b.click('#btn-naar-briefing');
  await b.click('#btn-begin');
  await b.click('#rol-kaart-b');
  await b.waitForURL(/speler-b\.html/);
  for (const p of [a, b]) {
    await p.waitForTimeout(800);
    await zonderGeluidsmelding(p);
  }
  return { a, b };
}

async function dua(context: BrowserContext): Promise<{ s1934: Page; s2034: Page }> {
  const s1934 = await context.newPage();
  await s1934.goto(`${DUA}/speler-1934.html?sessie=${DUA_CODE}&rol=schrijver`);
  const s2034 = await context.newPage();
  await s2034.goto(`${DUA}/speler-2034.html?sessie=${DUA_CODE}&rol=archivaris`);
  for (const p of [s1934, s2034]) await p.waitForTimeout(1000);
  return { s1934, s2034 };
}

test.use({ viewport: { width: 1280, height: 800 } });

test('README: homepage in het Nederlands en het Engels', async ({ context }) => {
  await voorbereid(context);
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(1800); // hero-animatie
  await foto(page, 'home.jpg');
  await page.goto('/en/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.waitForTimeout(1800);
  await foto(page, 'home-en.jpg');
});

test('README: Kamer 14, Speler A met hint en Speler B op gsm', async ({ context }) => {
  await voorbereid(context);
  const { a, b } = await kamer14(context);
  await a.getByRole('button', { name: 'Toon een hint' }).first().click();
  await foto(a, 'kamer14-speler-a.jpg');
  await b.setViewportSize({ width: 390, height: 844 });
  await foto(b, 'kamer14-speler-b-gsm.jpg');
});

test('README: D.U.A., 1934 en 2034', async ({ context }) => {
  await voorbereid(context);
  const { s1934, s2034 } = await dua(context);
  await foto(s1934, 'dua-1934.jpg');
  // Bovenaan 2034 staat de volgorde van de letterhamers: de oplossing van P1. Vervagen.
  await s2034.addStyleTag({ content: '.typekop-letter{filter:blur(7px)}' });
  await foto(s2034, 'dua-2034.jpg');
});

// ── Promotiebeelden ──────────────────────────────────────────

interface Promo {
  bestand: string;
  breedte: number;
  hoogte: number;
  lang: 'nl' | 'en';
  achtergrond: string;
  boven: string;
  titel: string;
  slogan: string;
  feiten: string[];
  beeldVoor: Buffer;
  beeldAchter: Buffer;
  bijschriftVoor: string;
  bijschriftAchter: string;
}

const dataUrl = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;

function promoHtml(p: Promo): string {
  const vierkant = p.breedte === p.hoogte;
  return `<!doctype html><html lang="${p.lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:${p.breedte}px;height:${p.hoogte}px;overflow:hidden;background:#0c0b09;color:#e8dcc8;
  font-family:'Atkinson Hyperlegible',system-ui,sans-serif;position:relative}
.foto{position:absolute;inset:0;background:url('${p.achtergrond}') center/cover;filter:saturate(.75) brightness(.42)}
.waas{position:absolute;inset:0;background:${
    vierkant
      ? 'linear-gradient(180deg,rgba(12,11,9,.92) 0%,rgba(12,11,9,.55) 48%,rgba(12,11,9,.9) 100%)'
      : 'linear-gradient(90deg,rgba(12,11,9,.96) 0%,rgba(12,11,9,.82) 42%,rgba(12,11,9,.35) 100%)'
  }}
.tekst{position:absolute;${vierkant ? 'left:64px;right:64px;top:60px' : 'left:64px;top:0;bottom:0;width:430px;display:flex;flex-direction:column;justify-content:center'}}
.boven{font-family:'Special Elite',serif;font-size:15px;letter-spacing:.32em;text-transform:uppercase;color:#c8a96e;margin-bottom:18px}
h1{font-family:'Special Elite',serif;font-weight:normal;font-size:${vierkant ? 92 : 84}px;line-height:1;color:#f1e6d2;margin-bottom:20px}
.slogan{font-size:${vierkant ? 30 : 27}px;line-height:1.3;color:#e8dcc8;margin-bottom:26px;max-width:${vierkant ? 900 : 380}px}
.feiten{display:flex;flex-wrap:wrap;gap:10px}
.feit{border:1px solid #7a6035;color:#d9bc84;font-size:16px;padding:7px 13px;background:rgba(12,11,9,.6)}
.merk{position:absolute;left:64px;bottom:44px;display:flex;align-items:center;gap:14px;font-family:'Special Elite',serif}
.merk img{height:40px}
.merk span{font-size:19px;letter-spacing:.12em;color:#c8a96e}
.gratis{position:absolute;${vierkant ? 'right:64px;top:64px' : 'left:64px;top:56px'};transform:rotate(-7deg);border:3px solid #b23a2e;
  color:#e0574a;font-family:'Special Elite',serif;font-size:24px;letter-spacing:.2em;padding:6px 16px;text-transform:uppercase;background:rgba(12,11,9,.55);z-index:5}
.scherm{position:absolute;border-radius:10px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.65),0 0 0 1px rgba(200,169,110,.35);background:#111}
.scherm .balk{height:22px;background:#1d1b17;display:flex;align-items:center;gap:6px;padding-left:10px}
.scherm .balk i{width:8px;height:8px;border-radius:50%;background:#4a443a;display:block}
.scherm img{display:block;width:100%}
.bijschrift{position:absolute;font-family:'Special Elite',serif;font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#c8a96e;
  background:rgba(12,11,9,.85);padding:5px 10px;border:1px solid #7a6035}
${
  vierkant
    ? `.achter{width:600px;right:40px;top:470px;transform:rotate(2.5deg)}
.voor{width:600px;left:60px;top:560px;transform:rotate(-2deg)}
.b-achter{right:56px;top:440px;z-index:3}.b-voor{left:76px;top:1010px;z-index:3}
.merk{left:auto;right:64px;bottom:22px}`
    : `.achter{width:520px;right:60px;top:70px;transform:rotate(3deg)}
.voor{width:520px;right:200px;top:250px;transform:rotate(-2.5deg)}
.b-achter{right:72px;top:62px;z-index:3}.b-voor{right:560px;top:596px;z-index:3}`
}
</style></head><body>
<div class="foto"></div><div class="waas"></div>
<div class="scherm achter"><div class="balk"><i></i><i></i><i></i></div><img src="${dataUrl(p.beeldAchter)}" alt=""></div>
<div class="scherm voor"><div class="balk"><i></i><i></i><i></i></div><img src="${dataUrl(p.beeldVoor)}" alt=""></div>
<div class="bijschrift b-achter">${p.bijschriftAchter}</div>
<div class="bijschrift b-voor">${p.bijschriftVoor}</div>
<div class="gratis">${p.lang === 'nl' ? 'Gratis' : 'Free'}</div>
<div class="tekst"><p class="boven">${p.boven}</p><h1>${p.titel}</h1><p class="slogan">${p.slogan}</p>
<div class="feiten">${p.feiten.map(f => `<span class="feit">${f}</span>`).join('')}</div></div>
<div class="merk"><img src="/assets/img/bureau_x_logo_dark.svg" alt=""><span>bureau-x.be</span></div>
</body></html>`;
}

async function maakPromo(page: Page, p: Promo): Promise<void> {
  await page.setViewportSize({ width: p.breedte, height: p.hoogte });
  await page.goto('/404.html'); // zelfde origin, zodat lettertypes en afbeeldingen laden
  await page.setContent(promoHtml(p), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(PROMO, p.bestand), type: 'jpeg', quality: 88 });
}

test('Promo: Kamer 14 en D.U.A.', async ({ context }) => {
  test.setTimeout(180_000);
  await voorbereid(context);
  const { a, b } = await kamer14(context);
  const k14a = await a.screenshot({ type: 'jpeg', quality: 92 });
  const k14b = await b.screenshot({ type: 'jpeg', quality: 92 });
  const { s1934, s2034 } = await dua(context);
  const d1934 = await s1934.screenshot({ type: 'jpeg', quality: 92 });
  const d2034 = await s2034.screenshot({ type: 'jpeg', quality: 92 });

  const page = await context.newPage();
  const liggend = { achtervoegsel: '1200x675', breedte: 1200, hoogte: 675 };
  const formaten = [liggend, { achtervoegsel: '1080x1080', breedte: 1080, hoogte: 1080 }];
  for (const f of formaten) {
    await maakPromo(page, {
      bestand: `kamer-14-nl-${f.achtervoegsel}.jpg`,
      ...f,
      lang: 'nl',
      achtergrond: '/assets/img/kamer-14-preview.jpg',
      boven: 'Online escape room · Geel',
      titel: 'Kamer 14',
      slogan: 'Lena is verdwenen. Jullie hebben één uur om te ontdekken waarom.',
      feiten: ['2 spelers', '± 45 min', 'Elk op je eigen scherm', 'In je browser'],
      beeldVoor: k14b,
      beeldAchter: k14a,
      bijschriftVoor: 'Speler B · haar kamer',
      bijschriftAchter: 'Speler A · het OPZ',
    });
    await maakPromo(page, {
      bestand: `dua-nl-${f.achtervoegsel}.jpg`,
      ...f,
      lang: 'nl',
      achtergrond: '/assets/img/dua-preview.jpg',
      boven: 'Online escape room · Gent',
      titel: 'D.U.A.',
      slogan: 'Gent, 1934. Het paneel is weg. Los het op, door de tijd heen.',
      feiten: ['2 tot 4 spelers', '60 min', '1934 én 2034', 'In je browser'],
      beeldVoor: d1934,
      beeldAchter: d2034,
      bijschriftVoor: 'Team 1934',
      bijschriftAchter: 'Team 2034',
    });
  }
  await maakPromo(page, {
    bestand: 'kamer-14-en-1200x675.jpg',
    ...liggend,
    lang: 'en',
    achtergrond: '/assets/img/kamer-14-preview.jpg',
    boven: 'Online escape room · Belgium',
    titel: 'Kamer 14',
    slogan: 'Lena has disappeared. You have one hour to find out why.',
    feiten: ['2 players', '± 45 min', 'Each on your own screen', 'Game in Dutch'],
    beeldVoor: k14b,
    beeldAchter: k14a,
    bijschriftVoor: 'Player B · her room',
    bijschriftAchter: 'Player A · the care centre',
  });
  await maakPromo(page, {
    bestand: 'dua-en-1200x675.jpg',
    ...liggend,
    lang: 'en',
    achtergrond: '/assets/img/dua-preview.jpg',
    boven: 'Online escape room · Belgium',
    titel: 'D.U.A.',
    slogan: 'Ghent, 1934. The panel is gone. Solve it across time.',
    feiten: ['2 to 4 players', '60 min', '1934 and 2034', 'Game in Dutch'],
    beeldVoor: d1934,
    beeldAchter: d2034,
    bijschriftVoor: 'Team 1934',
    bijschriftAchter: 'Team 2034',
  });
});
