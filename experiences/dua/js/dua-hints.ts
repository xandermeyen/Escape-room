/**
 * dua-hints.ts: de hintteksten van D.U.A., per hint-blok.
 *
 * Ze staan hier en niet in de HTML: wie de paginabron opent, ziet ze zo niet
 * meteen staan (vroeger stond de laatste stap, met het antwoord, gewoon in de
 * bron). De HTML bevat per blok enkel lege stappen. Een stap krijgt zijn tekst
 * pas als hij zichtbaar wordt, via de hintknop of het herstel na een herlaad.
 */
export const DUA_HINTS: Record<string, readonly string[]> = {
  'hint-p1a': [
    '» Beide antwoorden liggen in 2034. Vraag hun restauratieverslag van de typemachine, en lees hen de getallen van het briefje voor: in hun archief ligt een kopie van de codekaart.',
    '» Elk getal is een rij en een kolom op de codekaart: eerst de rij, dan de kolom. Laat 2034 de letters opzoeken. Het woord past bij jullie volgende opdracht (②).',
    '» De hamers, van vak 1 tot 6: T, K, S, U, N, R. Het woord is KLUIS: klik K, L, U, I en S in leesvolgorde aan en verstuur.',
  ],
  'hint-p2a': [
    '» Kies eerst het nummer. Deponeer pas als de wachter rechts op de baan loopt, buiten zicht.',
    '» De brief belooft: één meer dan het aantal brieven dat het bisdom telt. Brief XII is de laatste die aankomt.',
    '» Twaalf brieven kwamen aan bij het bisdom. Tel er één bij op, en wacht tot de wachter helemaal rechts loopt.',
  ],
  'hint-p4a': [
    '» "Waar het licht valt." Waar valt licht een kamer binnen?',
    '» De sleutel ligt op de vensterbank. Verstop het mapje daarna NIET waar de politie gaat zoeken; 2034 heeft het verslag.',
    '» De sleutel ligt waar het zonlicht binnenvalt. Verstop het mapje op een plek die niet in het huiszoekingsverslag van 2034 staat.',
  ],
  'hint-p5a': [
    '» De zin zegt: een plek waar altijd publiek komt, zodat niemand er ongemerkt iets kan weghalen.',
    '» Vraag 2034 wat er in de twintigste eeuw met het Belfort, het Gravensteen en het station gebeurde.',
    '» Eén gebouw bleef honderd jaar open voor het publiek en werd nooit leeggehaald. Daar begon ook alles, in april 1934.',
  ],
  'hint-p1': [
    '» 1934 zit met een kapotte typemachine en een briefje in code. Jullie hebben het restauratieverslag, en het archief heeft de codekaart. Vertel hen wat jullie zien.',
    '» Zoek RR-12 in de archiefzoeker (12 is het nummer van de brief). Laat 1934 de getallen voorlezen en zoek elke letter op: eerst de rij, dan de kolom.',
    '» Het woord is KLUIS. Zodra 1934 die vijf letters dieper aanslaat en verstuurt, lees je het hier op de doorslag. Staat er iets anders, dan neemt 1934 een nieuw vel.',
  ],
  'hint-p2': [
    '» Het eerste cijfer staat nog op het ticket. Het tweede zit in de brief zelf.',
    '» "Eén meer dan het aantal brieven dat u telt." Het bisdom telde wat aankwam, en brief XIII kwam nooit aan.',
    '» Het bisdom ontving de brieven I tot en met XII. Tel er één bij op. Draai elk cijfer en bevestig het apart.',
  ],
  'hint-p3': [
    '» Vergelijk wat de buurman zegt met het weerbericht in de krant.',
    '» Volle maan bij zwaar bewolkt en aardedonker? De buurman liegt; schrap het westportaal. Vraag 1934 naar de echte volgorde.',
    '» Schrap de buurman. Neem de andere drie getuigen in volgorde van tijd en zoek bij elke plek het nummer op de plattegrond. Bij de laatste getuige horen twee plekken.',
  ],
  'hint-p4b': [
    '» Het verslag zegt waar de politie zocht. Daar ligt het dus niet (meer).',
    '» Vraag 1934 letterlijk waar ze het mapje lieten. Praten mag, dit is geen geheim.',
    '» Klik op dezelfde plek die 1934 koos. Koos 1934 een plek uit het huiszoekingsverslag, dan ligt het mapje er niet meer en moet 1934 opnieuw naar binnen.',
  ],
  'hint-p5': [
    '» Herlees de beroemde zin. Waar komt het publiek elke dag, zonder iets te zien?',
    '» Het stadsarchief vertelt welke gebouwen doorzocht of verbouwd werden. Eén plek bleef altijd open en werd nooit ontruimd.',
    '» De plek waar het allemaal begon. Verstopt in het volle zicht.',
  ],
};

/** Geeft elke zichtbare, nog lege hintstap zijn tekst. */
export function vulZichtbareHints(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.hint-blok[id]').forEach(blok => {
    const teksten = DUA_HINTS[blok.id];
    if (!teksten) return;
    blok.querySelectorAll<HTMLElement>('.hint-stap').forEach((stap, i) => {
      if (stap.classList.contains('verborgen') || stap.textContent?.trim()) return;
      stap.textContent = teksten[i] ?? '';
    });
  });
}

/** Vult een stap zodra hij zichtbaar wordt, langs welke weg ook. */
export function bewaakHints(root: HTMLElement = document.body): MutationObserver {
  vulZichtbareHints(root);
  const kijker = new MutationObserver(() => vulZichtbareHints(root));
  kijker.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
  return kijker;
}
