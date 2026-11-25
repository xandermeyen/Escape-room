import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leesBoekAntwoord } from '../js/landing.ts';
import { KAMER14_PUZZELS } from '../experiences/kamer-14/js/kamer14-config.ts';
import { DUA_PUZZELS } from '../experiences/dua/js/dua-config.ts';

/**
 * Contract tussen de site en het Make-scenario "Boekingen (webhook)".
 *
 * docs/make-boekingen.blueprint.json is een export van het scenario (zonder
 * wachtwoord). Pas je het scenario in Make aan, exporteer dan opnieuw. Pas je de
 * formulieren aan, dan vangt deze test elke veldnaam die Make niet meer vindt.
 */
const lees = (pad: string) => readFileSync(resolve(__dirname, '..', pad), 'utf8');

interface Module {
  id: number;
  module: string;
  mapper?: Record<string, unknown> | null;
  filter?: { conditions: { a: string; o: string; b?: string }[][] };
  routes?: { flow: Module[] }[];
}

const ruw = lees('docs/make-boekingen.blueprint.json');
const blueprint = JSON.parse(ruw) as { flow: Module[] };

function alleModules(flow: Module[]): Module[] {
  return flow.flatMap(m => [m, ...(m.routes ?? []).flatMap(r => alleModules(r.flow))]);
}
const modules = alleModules(blueprint.flow);
const module = (id: number): Module => {
  const m = modules.find(x => x.id === id);
  if (!m) throw new Error(`module ${id} ontbreekt in de blueprint`);
  return m;
};

/** Veldnamen in een formulier (name="..."), het boekingsformulier alleen. */
function formulierVelden(pad: string): Set<string> {
  const html = lees(pad);
  const form = /<form[^>]*id="boekForm"[\s\S]*?<\/form>/.exec(html)?.[0] ?? '';
  return new Set([...form.matchAll(/name="([^"]+)"/g)].map(m => m[1] as string));
}

/** Waarde van het verborgen veld experience op een pagina. */
function experienceVan(pad: string): string | undefined {
  return /name="experience" value="([^"]+)"/.exec(lees(pad))?.[1];
}

/** Zoals Make het doet: 8 hoofdletters uit een uuid zonder streepjes. */
const voorbeeldCode = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

/** Vervangt Make-expressies door voorbeeldwaarden, zodat de JSON-body te parsen is. */
function invullen(tekst: string, speltaal = 'nl'): string {
  return tekst
    .replace(/\{\{2\.sessieCode\}\}/g, voorbeeldCode)
    .replace(/\{\{2\.speltaal\}\}/g, speltaal)
    .replace(/\{\{if\(2\.speltaal = "en"; "([^"]*)"; emptystring\)\}\}/g, (_, en: string) =>
      speltaal === 'en' ? en : '',
    )
    .replace(/\{\{length\([^}]*\)\}\}/g, '3');
}

describe('Make-blueprint: geen geheimen in de repo', () => {
  it('het wachtwoord van make@bureau-x.be is vervangen door <wachtwoord>', () => {
    const body = JSON.parse(String(module(3).mapper?.['jsonStringBodyContent'])) as {
      password: string;
    };
    expect(body.password).toBe('<wachtwoord>');
  });
});

describe('Make-blueprint: velden die Make leest, bestaan in de formulieren', () => {
  // Ook binnen functies, zoals ifempty(1.datumTekst; ...).
  const gelezen = new Set(
    [...ruw.matchAll(/(?<=[{(;\s])1\.`?([A-Za-z_]\w*)`?/g)].map(m => m[1] as string),
  );
  const kamer14 = formulierVelden('kamer-14/index.html');
  const dua = formulierVelden('dua/index.html');
  // Deze velden voegt de browser zelf toe (zie vulBoekingAan in js/landing.ts).
  const doorJs = new Set(['datumTekst', 'taal', 'speltaal']);
  const enkelDua = new Set(['email_speler_3', 'email_speler_4']);

  it('Make leest de verwachte velden', () => {
    expect(gelezen).toEqual(
      new Set([
        'experience',
        '_gotcha',
        'email_speler_1',
        'email_speler_2',
        'email_speler_3',
        'email_speler_4',
        'datumTekst',
        'taal',
        'speltaal',
      ]),
    );
  });

  it.each([...gelezen].filter(v => !doorJs.has(v)))('D.U.A.-formulier heeft %s', veld => {
    expect(dua.has(veld)).toBe(true);
  });

  it.each([...gelezen].filter(v => !doorJs.has(v) && !enkelDua.has(v)))(
    'Kamer 14-formulier heeft %s',
    veld => {
      expect(kamer14.has(veld)).toBe(true);
    },
  );

  it.each(['datumTekst', 'taal', 'speltaal'])('de browser voegt %s toe', veld => {
    expect(lees('js/landing.ts')).toContain(`velden.set('${veld}'`);
  });

  it('de experience-waarden in de filters zijn die van de pagina’s', () => {
    expect(module(5).filter?.conditions[0]?.[0]?.b).toBe(experienceVan('kamer-14/index.html'));
    expect(module(8).filter?.conditions[0]?.[0]?.b).toBe(experienceVan('dua/index.html'));
  });
});

describe('Make-blueprint: het antwoord past bij wat de site verwacht', () => {
  it.each([
    [6, 'kamer-14'],
    [9, 'dua'],
  ])('module %i geeft een antwoord dat leesBoekAntwoord aanvaardt (%s)', (id, ervaring) => {
    const body = JSON.parse(invullen(String(module(id).mapper?.['body'])));
    const antwoord = leesBoekAntwoord(body);
    expect(antwoord.sessieCode).toBe(voorbeeldCode);
    expect(antwoord.link).toBe(
      `https://bureau-x.be/experiences/${ervaring}/?sessie=${voorbeeldCode}`,
    );
    expect(lees(`experiences/${ervaring}/index.html`)).toContain('<html'); // de lobby bestaat
  });

  it('de response staat vóór de mail (de speler wacht niet op SMTP)', () => {
    const volgorde = (route: number) =>
      (module(4).routes?.[route]?.flow ?? []).map(m => m.module.split(':')[1]);
    expect(volgorde(0)).toEqual(['MakeRequest', 'WebhookRespond', 'BasicRouter']);
    expect(volgorde(1)).toEqual(['MakeRequest', 'WebhookRespond', 'BasicRouter']);
  });

  it('met speltaal en krijgt de D.U.A.-link een taalhint', () => {
    const body = JSON.parse(invullen(String(module(9).mapper?.['body']), 'en'));
    expect(leesBoekAntwoord(body).link).toBe(
      `https://bureau-x.be/experiences/dua/?sessie=${voorbeeldCode}&taal=en`,
    );
  });
});

describe('Make-blueprint: de sessie die Make aanmaakt', () => {
  it.each([
    [5, 'kamer-14', KAMER14_PUZZELS],
    [8, 'dua', DUA_PUZZELS],
  ])('module %i maakt een %s-sessie met de puzzels uit de config', (id, ervaring, puzzels) => {
    const sessie = JSON.parse(invullen(String(module(id).mapper?.['jsonStringBodyContent'])));
    expect(sessie.ervaringsId).toBe(ervaring);
    expect(sessie.actief).toBe(true);
    expect(sessie.aangemaakt).toEqual({ '.sv': 'timestamp' }); // vereist door de rules
    expect(Object.keys(sessie.puzzels)).toEqual(puzzels);
    expect(Object.values(sessie.puzzels).every(v => v === false)).toBe(true);
  });

  it('elke PUT weigert een bestaande code te overschrijven', () => {
    for (const id of [5, 8]) {
      expect(module(id).mapper?.['headers']).toEqual([{ name: 'if-match', value: 'null_etag' }]);
    }
  });

  it('de voorbeeldcode voldoet aan de validatie van de site en de rules', () => {
    expect(voorbeeldCode).toMatch(/^[A-Z0-9-]{3,20}$/);
  });
});

describe('Make-blueprint: taal van de mail en het spel', () => {
  const variabelen = module(2).mapper?.['variables'] as { name: string; value: string }[];
  const variabele = (naam: string) => variabelen.find(v => v.name === naam)?.value;

  it('taal en speltaal worden alleen nl of en (de rules weigeren al de rest)', () => {
    expect(variabele('taal')).toBe('{{if(1.taal = "en"; "en"; "nl")}}');
    expect(variabele('speltaal')).toBe('{{if(1.speltaal = "en"; "en"; "nl")}}');
  });

  it('de D.U.A.-sessie krijgt de speltaal, Kamer 14 niet', () => {
    const dua = JSON.parse(invullen(String(module(8).mapper?.['jsonStringBodyContent']), 'en'));
    expect(dua.taal).toBe('en');
    const k14 = JSON.parse(invullen(String(module(5).mapper?.['jsonStringBodyContent'])));
    expect(k14).not.toHaveProperty('taal');
  });

  it.each([
    [13, 'Kamer 14'],
    [15, 'D.U.A.'],
  ])('router %i stuurt precies één mail: Nederlands of Engels (%s)', id => {
    const routes = module(id).routes ?? [];
    expect(routes).toHaveLength(2);
    const [nl, en] = routes.map(r => r.flow[0]!);
    expect(nl.module).toBe('email:ActionSendEmail');
    expect(en.module).toBe('email:ActionSendEmail');
    expect(nl.filter?.conditions).toEqual([[{ a: '{{2.taal}}', o: 'text:notequal', b: 'en' }]]);
    expect(en.filter?.conditions).toEqual([[{ a: '{{2.taal}}', o: 'text:equal', b: 'en' }]]);
    expect(String(en.mapper?.['html'])).toMatch(/lang="en"|Session code/);
    expect(en.mapper?.['to']).toEqual(nl.mapper?.['to']);
  });

  it('de Engelse mails melden dat het spel (nog) Nederlands is', () => {
    expect(String(module(14).mapper?.['html'])).toContain('Kamer 14 is played in Dutch');
    expect(String(module(16).mapper?.['html'])).toContain('if(2.speltaal = "nl"');
  });
});

describe('Make-blueprint: bewaking en webhook-URL', () => {
  const hookUrl = /https:\/\/hook\.eu1\.make\.com\/[a-z0-9]+/;

  it('ping antwoordt exact wat de workflow verwacht', () => {
    expect(module(11).mapper?.['body']).toBe('{"pong":true}');
    expect(lees('.github/workflows/boeking-ping.yml')).toContain(`'{"pong":true}'`);
  });

  it('formulieren, bewaking en documentatie gebruiken dezelfde webhook', () => {
    const urls = [
      lees('kamer-14/index.html'),
      lees('dua/index.html'),
      lees('.github/workflows/boeking-ping.yml'),
      lees('docs/make-scenario.md'),
    ].map(t => hookUrl.exec(t)?.[0]);
    expect(urls[0]).toBeDefined();
    expect(new Set(urls).size).toBe(1);
  });
});
