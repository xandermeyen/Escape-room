import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.mock('../shared/js/reviews.ts', () => ({ schrijfReview: vi.fn(() => Promise.resolve()) }));

import { schrijfReview } from '../shared/js/reviews.ts';
import { koppelReviewFormulier, LAGE_SCORE } from '../shared/js/review-form.ts';
import { reviewSamenvattingHtml, reviewKaartHtml } from '../shared/js/host-reviews.ts';
import {
  onderzoekstijd,
  percentielSneller,
  prestatieTekst,
  MIN_SESSIES_VOOR_PERCENTIEL,
} from '../shared/js/verdeling.ts';
import { kamer14Oplossing } from '../experiences/kamer-14/js/kamer14-oplossing.ts';
import type { Review } from '../shared/js/reviews.ts';

const schrijfMock = schrijfReview as unknown as ReturnType<typeof vi.fn>;
const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

const FORMULIER = `
  <div id="review-sterren">
    ${[1, 2, 3, 4, 5].map(n => `<button class="ster" data-waarde="${n}">☆</button>`).join('')}
  </div>
  <textarea id="review-tekst"></textarea>
  <input id="review-naam" />
  <p id="review-fout"></p>
  <button id="btn-review-verstuur">Versturen</button>
  <p id="review-dank"></p>`;

const ster = (n: number) =>
  document.querySelector<HTMLButtonElement>(`.ster[data-waarde="${n}"]`)!.click();

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = FORMULIER;
});

// ── Reviewflow ────────────────────────────────────────────────────────────────

describe('reviewformulier', () => {
  it('vraagt wat beter kan bij een lage score', () => {
    koppelReviewFormulier('kamer-14');
    const blok = document.getElementById('review-verbeter-blok')!;
    expect(blok.hidden).toBe(true);
    ster(LAGE_SCORE);
    expect(blok.hidden).toBe(false);
    ster(5);
    expect(blok.hidden).toBe(true);
  });

  it('bewaart een lage review gewoon, met het verbeterpunt erbij', async () => {
    koppelReviewFormulier('kamer-14');
    ster(2);
    (document.getElementById('review-tekst') as HTMLTextAreaElement).value = 'Te moeilijk';
    (document.getElementById('review-verbeter') as HTMLTextAreaElement).value =
      'P3 was onduidelijk';
    document.getElementById('btn-review-verstuur')!.click();
    await vi.waitFor(() => expect(schrijfMock).toHaveBeenCalled());
    expect(schrijfMock).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 2, tekst: 'Te moeilijk', verbeter: 'P3 was onduidelijk' }),
    );
  });

  it('stuurt geen verbeterpunt mee bij een hoge score', async () => {
    koppelReviewFormulier('kamer-14');
    ster(2);
    (document.getElementById('review-verbeter') as HTMLTextAreaElement).value = 'iets';
    ster(5);
    (document.getElementById('review-tekst') as HTMLTextAreaElement).value = 'Top!';
    document.getElementById('btn-review-verstuur')!.click();
    await vi.waitFor(() => expect(schrijfMock).toHaveBeenCalled());
    expect(schrijfMock.mock.calls[0]?.[0].verbeter).toBeUndefined();
  });

  it('sterren zijn radioknoppen voor schermlezers', () => {
    koppelReviewFormulier('kamer-14');
    ster(4);
    const knoppen = [...document.querySelectorAll('.ster')];
    expect(knoppen.every(k => k.getAttribute('role') === 'radio')).toBe(true);
    expect(knoppen.map(k => k.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
      'true',
      'false',
    ]);
  });
});

describe('Kamer 14: review pas na de briefkaart', () => {
  it('het reviewformulier staat op het slotscherm, niet bij het rapport of de briefkaart', () => {
    const html = lees('experiences/kamer-14/einde.html');
    const slot = html.indexOf('id="scherm-slot"');
    expect(slot).toBeGreaterThan(html.indexOf('id="scherm-briefkaart"'));
    expect(html.indexOf('id="slot-review"')).toBeGreaterThan(slot);
  });

  it('tijd-voorbij: review en oplossing na de briefkaart', () => {
    const html = lees('experiences/kamer-14/tijd-voorbij.html');
    const kaart = html.indexOf('class="briefkaart"');
    expect(html.indexOf('id="oplossing-blok"')).toBeGreaterThan(kaart);
    expect(html.indexOf('id="slot-review"')).toBeGreaterThan(kaart);
    expect(html).not.toContain('U heeft het onderzoek niet opgelost');
  });
});

// ── Host: alle reviews zichtbaar ──────────────────────────────────────────────

describe('host-reviews', () => {
  const review = (rating: number, extra: Partial<Review> = {}) => ({
    id: `r${rating}`,
    data: { rating, tekst: 'x', ervaring: 'kamer-14', tijdstip: 1, goedgekeurd: false, ...extra },
  });

  it('telt lage scores apart in de samenvatting', () => {
    const html = reviewSamenvattingHtml([review(5), review(2), review(4, { goedgekeurd: true })]);
    expect(html).toContain('3.7 ★');
    expect(html).toContain('1 met een lage score');
    expect(html).toContain('2 nog niet goedgekeurd');
  });

  it('toont het verbeterpunt, ge-escaped', () => {
    const html = reviewKaartHtml(review(1, { verbeter: '<b>P4</b> was vaag' }));
    expect(html).toContain('Wat kan beter');
    expect(html).toContain('&lt;b&gt;P4&lt;/b&gt;');
  });
});

// ── Sneller dan X% ────────────────────────────────────────────────────────────

describe('verdeling', () => {
  it('onderzoekstijd enkel voor ingediende rapporten', () => {
    expect(
      onderzoekstijd({ timerGestart: 0, rapport: { ingediend: true, tijdstip: 1_800_000 } }),
    ).toBe(1_800_000);
    expect(
      onderzoekstijd({ timerGestart: 0, rapport: { ingediend: false, tijdstip: 5 } }),
    ).toBeNull();
    expect(onderzoekstijd({ rapport: { ingediend: true, tijdstip: 5 } })).toBeNull();
    expect(
      onderzoekstijd({ timerGestart: 0, rapport: { ingediend: true, tijdstip: 99_000_000 } }),
    ).toBeNull();
  });

  it('percentage van de groepen die trager waren', () => {
    const duren = Array.from({ length: 10 }, (_, i) => (i + 1) * 300_000); // 5..50 min
    expect(percentielSneller(1_000_000, duren)).toBe(70);
    expect(
      percentielSneller(1_000_000, duren.slice(0, MIN_SESSIES_VOOR_PERCENTIEL - 1)),
    ).toBeNull();
  });

  it('positieve tekst, ook bij een laag percentage', () => {
    expect(prestatieTekst(72)).toBe('Sneller dan 72% van de groepen.');
    expect(prestatieTekst(20)).not.toMatch(/%/);
    expect(prestatieTekst(null)).toBeNull();
  });
});

describe('oplossing Kamer 14', () => {
  it('vertelt het hele verhaal in vijf stappen', () => {
    const zinnen = kamer14Oplossing();
    expect(zinnen).toHaveLength(5);
    expect(zinnen.join(' ')).toContain('Diest');
    expect(zinnen.join(' ')).toContain('€35');
  });

  it('staat niet leesbaar in de bron', () => {
    expect(lees('experiences/kamer-14/js/kamer14-oplossing.ts')).not.toMatch(/Diest|Marie|07:35/);
  });
});
