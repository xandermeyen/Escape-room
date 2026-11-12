import { describe, expect, it } from 'vitest';
import type { Review } from '../shared/js/reviews.ts';
import { escapeHtml, marqueeItem, reviewKaart, sterAantal } from '../js/review-kaart.ts';

/**
 * Reviews zijn tekst van spelers die via innerHTML op de homepage komt. Een
 * beheerder keurt ze goed, maar die leest de tekst en niet de HTML: de
 * escaping is dus de echte grens tegen XSS.
 */
const review = (extra: Partial<Review> = {}): Review => ({
  rating: 5,
  tekst: 'Top avond!',
  naam: 'Jan',
  ervaring: 'kamer-14',
  tijdstip: new Date(2026, 10, 12).getTime(),
  goedgekeurd: true,
  ...extra,
});

/** Zet HTML om naar DOM, zoals innerHTML op de homepage. */
function render(html: string): HTMLElement {
  const doos = document.createElement('div');
  doos.innerHTML = html;
  return doos;
}

const AANVALLEN = [
  '<img src=x onerror="alert(1)">',
  '<script>alert(1)</script>',
  '"><svg onload=alert(1)>',
  "' onmouseover='alert(1)",
  '</blockquote><iframe src="javascript:alert(1)"></iframe>',
];

describe('reviews op de homepage: geen HTML van spelers', () => {
  it('escapeHtml zet alle gevaarlijke tekens om', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it.each(AANVALLEN)('reviewKaart: tekst en naam blijven tekst (%s)', aanval => {
    for (const r of [review({ tekst: aanval }), review({ naam: aanval })]) {
      const dom = render(reviewKaart(r));
      expect(dom.querySelector('img, script, svg, iframe')).toBeNull();
      expect(dom.querySelectorAll('[onerror], [onload], [onmouseover]')).toHaveLength(0);
      expect(dom.textContent).toContain(aanval);
    }
  });

  it.each(AANVALLEN)('marqueeItem: tekst en naam blijven tekst (%s)', aanval => {
    for (const r of [review({ tekst: aanval }), review({ naam: aanval })]) {
      const dom = render(marqueeItem(r));
      expect(dom.querySelector('img, script, svg, iframe')).toBeNull();
      expect(dom.textContent).toContain(aanval);
    }
  });

  it('een onbekende ervaring wordt ook geëscaped', () => {
    const dom = render(reviewKaart(review({ ervaring: '<b>x</b>' })));
    expect(dom.querySelector('b')).toBeNull();
    expect(dom.querySelector('.review-exp')?.textContent).toContain('<b>x</b>');
  });

  it('de marquee knipt lange tekst af zonder escaping te breken', () => {
    const lang = '&'.repeat(120);
    const dom = render(marqueeItem(review({ tekst: lang })));
    expect(dom.textContent).toContain('&'.repeat(88) + '…');
  });
});

describe('reviews op de homepage: weergave', () => {
  it('toont naam, ervaring, score en sterren', () => {
    const dom = render(reviewKaart(review({ rating: 4 })));
    expect(dom.querySelector('.review-author')?.textContent).toBe('Jan');
    expect(dom.querySelector('.review-exp')?.textContent).toMatch(/^Kamer 14/);
    expect(dom.querySelector('.review-score')?.textContent).toBe('4/5');
    expect(dom.querySelectorAll('.ster:not(.leeg)')).toHaveLength(4);
    expect(dom.querySelectorAll('.ster.leeg')).toHaveLength(1);
    expect(dom.querySelector('time')?.getAttribute('datetime')).toBe('2026-11');
  });

  it('zonder naam: Anonieme speler', () => {
    const dom = render(reviewKaart(review({ naam: undefined })));
    expect(dom.querySelector('.review-author')?.textContent).toBe('Anonieme speler');
  });

  it('een score buiten 1 tot 5 wordt begrensd', () => {
    expect(sterAantal(0)).toBe(1);
    expect(sterAantal(9)).toBe(5);
    expect(sterAantal(3.6)).toBe(4);
  });
});
