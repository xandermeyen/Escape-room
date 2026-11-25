import { describe, expect, it } from 'vitest';
import {
  isSpeltaal,
  kiesSpeltaal,
  laadVertaler,
  maakVertaler,
  speltaalVoorBoeking,
  taalHintUitUrl,
  vulIn,
  zetDocumentTaal,
  type Vertaling,
} from '../shared/js/speltaal.ts';

describe('kiesSpeltaal', () => {
  it('volgt de taal van de sessie', () => {
    expect(kiesSpeltaal({ gelezen: true, sessieTaal: 'en' })).toBe('en');
    expect(kiesSpeltaal({ gelezen: true, sessieTaal: 'nl', hint: 'en' })).toBe('nl');
  });

  it('een sessie zonder taal is Nederlands, ook met een Engelse hint', () => {
    expect(kiesSpeltaal({ gelezen: true, sessieTaal: null, hint: 'en' })).toBe('nl');
    expect(kiesSpeltaal({ gelezen: true })).toBe('nl');
  });

  it('Frans en onzin vallen terug op Nederlands', () => {
    expect(kiesSpeltaal({ gelezen: true, sessieTaal: 'fr' })).toBe('nl');
    expect(kiesSpeltaal({ gelezen: true, sessieTaal: 42 })).toBe('nl');
  });

  it('kon de sessie niet gelezen worden, dan telt de hint', () => {
    expect(kiesSpeltaal({ gelezen: false, hint: 'en' })).toBe('en');
    expect(kiesSpeltaal({ gelezen: false, hint: 'de' })).toBe('nl');
    expect(kiesSpeltaal({ gelezen: false, hint: null })).toBe('nl');
  });

  it('isSpeltaal kent alleen nl en en', () => {
    expect(isSpeltaal('nl')).toBe(true);
    expect(isSpeltaal('en')).toBe(true);
    expect(isSpeltaal('fr')).toBe(false);
    expect(isSpeltaal(undefined)).toBe(false);
  });
});

describe('taal in URL en document', () => {
  it('leest ?taal=', () => {
    expect(taalHintUitUrl('?sessie=ABC-123&taal=en')).toBe('en');
    expect(taalHintUitUrl('?sessie=ABC-123')).toBeNull();
  });

  it('zet <html lang>', () => {
    zetDocumentTaal('en');
    expect(document.documentElement.lang).toBe('en');
    zetDocumentTaal('nl');
    expect(document.documentElement.lang).toBe('nl');
  });
});

describe('vertaler', () => {
  const nl = { groet: 'Hallo {naam}', teller: 'Nog {aantal} letters' } as const;
  const en: Vertaling<typeof nl> = { groet: 'Hello {naam}', teller: '{aantal} letters left' };

  it('vult waarden in', () => {
    expect(vulIn('Nog {aantal} letters', { aantal: 3 })).toBe('Nog 3 letters');
    expect(vulIn('{a} en {a}', { a: 'x' })).toBe('x en x');
  });

  it('laat een plek zonder waarde staan', () => {
    expect(vulIn('Hallo {naam}')).toBe('Hallo {naam}');
  });

  it('geeft de tekst in de gekozen taal', () => {
    const { t, taal } = maakVertaler<typeof nl>('en', en);
    expect(taal).toBe('en');
    expect(t('groet', { naam: 'Lena' })).toBe('Hello Lena');
    expect(t('teller', { aantal: 2 })).toBe('2 letters left');
  });

  it('laadt alleen het woordenboek van de gevraagde taal', async () => {
    const geladen: string[] = [];
    const vertaler = await laadVertaler<typeof nl>('nl', {
      nl: async () => (geladen.push('nl'), nl),
      en: async () => (geladen.push('en'), en),
    });
    expect(geladen).toEqual(['nl']);
    expect(vertaler.t('groet', { naam: 'An' })).toBe('Hallo An');
  });
});

describe('speltaalVoorBoeking', () => {
  it('neemt de paginataal als de experience in die taal bestaat', () => {
    expect(speltaalVoorBoeking('dua', 'nl')).toBe('nl');
  });

  it('valt terug op de standaard van de experience', () => {
    expect(speltaalVoorBoeking('kamer-14', 'en')).toBe('nl');
    expect(speltaalVoorBoeking('dua', 'fr')).toBe('nl');
    expect(speltaalVoorBoeking('onbekend', 'en')).toBe('nl');
  });
});
