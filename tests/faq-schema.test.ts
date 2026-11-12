import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { faqSchema, leesFaq, naarPlatteTekst } from '../scripts/vite-faq-schema.ts';

const item = (v: string, a: string) => `
  <div class="faq-item">
    <button class="faq-q">
      ${v} <span class="faq-arrow">&#9662;</span>
    </button>
    <div class="faq-a">
      <p>${a}</p>
    </div>
  </div>`;

describe('FAQ-schema uit zichtbare FAQ', () => {
  it('leest vraag en antwoord als platte tekst', () => {
    const html = item(
      'Is het <em>gratis</em>?',
      'Ja &amp; altijd,\n   vanuit huis &middot; 2 spelers.',
    );
    expect(leesFaq(html)).toEqual([
      { vraag: 'Is het gratis?', antwoord: 'Ja & altijd, vanuit huis · 2 spelers.' },
    ]);
  });

  it('zet numerieke entiteiten om', () => {
    expect(naarPlatteTekst('caf&#233; &#x2192;')).toBe('café →');
  });

  it('kan geen </script> in de JSON laten belanden', () => {
    const json = faqSchema([{ vraag: '</script>', antwoord: 'x' }]);
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json).mainEntity[0].name).toBe('</script>');
  });

  it.each(['index.html', 'kamer-14/index.html', 'dua/index.html'])(
    '%s heeft een FAQ en geen handgeschreven FAQPage-blok',
    pad => {
      const html = readFileSync(pad, 'utf-8');
      expect(leesFaq(html).length).toBeGreaterThan(3);
      expect(html).not.toMatch(/"@type":\s*"FAQPage"/);
    },
  );
});
