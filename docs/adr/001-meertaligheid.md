# ADR-001: Meertaligheid voor site en experiences

**Status:** Aanvaard (herzien na onafhankelijke review). Fase 1 en 2 uitgevoerd op 18 november 2026.
**Datum:** 18 november 2026
**Beslisser:** Xander

## Context

Bureau X is nu volledig Nederlandstalig. Het doel is om meer mensen te laten spelen: de publieke site in het Nederlands, Frans en Engels, en D.U.A. in het Nederlands en Engels. Kamer 14 blijft voorlopig Nederlandstalig. Frans voor de experiences moet later kunnen zonder de opzet opnieuw te doen.

Wat de keuze bepaalt:

- **Hosting is statisch.** De site draait op GitHub Pages. Er is geen server die op `Accept-Language` kan reageren of kan doorsturen. Elke taal moet dus als echte HTML-bestanden bestaan.
- **SEO en AI-zichtbaarheid zijn het doel.** ChatGPT is de grootste bron van bezoekers. Zoekmachines en AI-crawlers moeten elke taal als aparte pagina kunnen lezen, met hreflang. Tekst die pas in de browser verschijnt, telt slecht mee.
- **Bestaande build.** Vite multi-page met een handmatige lijst van ingangen in `vite.config.ts`, en een eigen plugin (`scripts/vite-faq-schema.ts`) die via `transformIndexHtml` het FAQPage-schema uit de zichtbare FAQ haalt. Die plugin draait alleen op HTML die als echte ingang in de build staat.
- **Metadata per pagina.** Elke publieke pagina heeft een vaste `canonical`, `og:url`, `og:locale` (`nl_BE`) en handgeschreven JSON-LD met `inLanguage: "nl"`.
- **Omvang van de tekst.** Publieke pagina's: ongeveer 4.800 woorden (home 880, D.U.A. 1.450, Kamer 14 1.140, privacy 1.300). D.U.A.-game: ongeveer 3.100 woorden in HTML (zonder host panel), plus teksten in TypeScript en in gedeelde modules (lobby, hulp, timer, cookiebanner, reviewformulier). In totaal ongeveer 12.000 woorden om te vertalen voor Engels en Frans samen.
- **Puzzels en antwoorden in D.U.A.**
  - Cijferantwoorden (P2 kluis, P3 route) zijn taalneutraal.
  - P5 (stadsplan) vergelijkt vaste plek-ID's (`sintbaafs`, `belfort`, ...). Taalneutraal, alleen de labels moeten vertaald worden.
  - **P1 is diep taalgebonden.** Het spel steunt op een Nederlandse zin (`BRIEFTEKST` in `dua-session.ts`). De gekozen letters worden als indexen in die zin bewaard, de hamerletters zijn vast (`HAMERS_GOED = 'TKSUNR'`) en de databaseregel aanvaardt alleen `^[KNRSTU]{6}$`. Ook de hints en het raadsel van P2 zijn Nederlandse tekst.
- **Geen stemopnames in D.U.A.** Geluid wordt gemaakt met de Web Audio API (`dua-audio.ts`, geen audiobestanden). Er hoeft niets opnieuw ingesproken te worden. Kamer 14 heeft wel stemopnames.
- **Boekingsketen.** Formulier, Make-webhook, sessie in Firebase en een mail met de spellink. Make bouwt de link `https://bureau-x.be/experiences/<experience>/?sessie=...`. De databaseregels weigeren onbekende velden in een sessie (`$other` is `false`). Alleen Make schrijft de root van een sessie.
- **Bestaande teksten die onwaar worden.** `llms.txt` en de FAQ zeggen dat alles Nederlandstalig is.
- **Juridisch.** Een vertaalde cookiebanner en privacyverklaring zijn sterk aangewezen voor de transparantie die de AVG vraagt (art. 12): wie een Engelse pagina bezoekt, moet begrijpen waarmee hij instemt.
- **Beperkingen.** Geen betalende diensten. Eén ontwikkelaar. Het project dient ook als portfolio, dus onderhoudbaarheid en typeveiligheid tellen.

## Beslissing

1. **URL-structuur met submappen.** Nederlands blijft op de huidige adressen (`/`, `/dua/`, `/kamer-14/`). Frans komt onder `/fr/`, Engels onder `/en/`, met dezelfde slugs. `x-default` wijst naar `/en/`.
2. **Publieke pagina's: de Nederlandse HTML blijft de bron.** Teksten krijgen een sleutel via `data-i18n` (en `data-i18n-attr` voor attributen zoals `alt` en `content`). Een **prebuild-script** schrijft voor `fr` en `en` echte HTML-bestanden (`fr/dua/index.html`, ...) met de vertalingen ingevuld. Die bestanden staan in `.gitignore` en worden via een glob als ingang aan Vite gegeven. Zo werken de dev-server, de FAQ-plugin, asset-hashing en `lint:html` zonder extra plugincode.
3. **Games: vertalen in de browser** met een eigen, getypeerde `t()`. De taal komt uit de sessie in Firebase. De spellink krijgt `&taal=xx` als hint voor de eerste weergave, en de pagina blijft verborgen tot de tekst vertaald is, zodat er geen Nederlandse tekst flitst.
4. **Woordenboeken als TypeScript-objecten**, opgesplitst in site en game, per taal apart geladen. Voor de game bepaalt `nl.ts` de vorm, `en.ts` moet die volgen. Ontbreekt een vertaling, dan geeft TypeScript een fout.
5. **Vertaaldrift wordt bewaakt.** Elke vertaling bewaart een korte hash van de Nederlandse brontekst. Een script in CI meldt vertalingen waarvan de Nederlandse tekst intussen veranderde.
6. **Speltaal en paginataal zijn twee velden.** Het boekingsformulier stuurt `taal` (de taal van de mail, volgt de pagina) en `speltaal` (`nl` of `en`, standaard die van de pagina, Frans valt terug op een keuze).
7. **Geen automatische doorverwijzing.** Een taalknop (NL, FR, EN) en hooguit een wegklikbaar balkje als de browsertaal niet overeenkomt met de pagina. Een onthouden keuze stuurt nooit stilletjes door.

## Overwogen opties: publieke pagina's

### Optie A: HTML met de hand kopiëren per taal

| Dimensie       | Beoordeling                                        |
| -------------- | -------------------------------------------------- |
| Complexiteit   | Laag om te starten, hoog om te onderhouden         |
| Kost           | Gratis                                             |
| Schaalbaarheid | Slecht: elke wijziging in de opmaak moet drie keer |
| Vertrouwdheid  | Hoog                                               |

**Voordelen:** geen nieuwe code, perfect voor SEO.
**Nadelen:** drie kopieën lopen snel uit elkaar. Dat is precies het probleem dat de FAQ-schemaplugin eerder moest oplossen.

### Optie B1: alle tekst naar woordenboeken, HTML als sjabloon, generatie in een Vite-plugin

| Dimensie       | Beoordeling                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| Complexiteit   | Hoog: virtuele HTML-ingangen in Vite krijgen geen bundling of FAQ-schema zonder extra werk |
| Kost           | Gratis                                                                                     |
| Schaalbaarheid | Goed                                                                                       |
| Vertrouwdheid  | Gemiddeld                                                                                  |

**Voordelen:** alle talen symmetrisch in woordenboeken.
**Nadelen:** alle Nederlandse tekst moet eerst uit de HTML, met risico dat de huidige site verandert. Pagina's die pas in `generateBundle` ontstaan, missen asset-hashing, script-bundling en het FAQ-schema. De dev-server heeft een eigen middleware nodig.

### Optie B2: Nederlandse HTML als bron met `data-i18n`, prebuild-script schrijft echte bestanden (gekozen)

| Dimensie       | Beoordeling                                               |
| -------------- | --------------------------------------------------------- |
| Complexiteit   | Gemiddeld: één script, geen ingrijpen in de Vite-pijplijn |
| Kost           | Gratis                                                    |
| Schaalbaarheid | Goed: een nieuwe taal is een nieuw woordenboek            |
| Vertrouwdheid  | Hoog: gewone HTML en een Node-script                      |

**Voordelen:** de Nederlandse site blijft per definitie identiek. Gegenereerde pagina's zijn gewone ingangen, dus dev-server, FAQ-plugin, hashing en HTML-validatie werken vanzelf. Minder verhuiswerk. De Nederlandse tekst per sleutel is meteen de bron voor de drift-controle.
**Nadelen:** Nederlands staat in HTML, Engels en Frans in woordenboeken, dus TypeScript kan de volledigheid niet zelf bewaken. Het script moet daarom falen bij een sleutel zonder vertaling of een vertaling zonder sleutel. Na elke wijziging moet het script opnieuw draaien (gebeurt automatisch voor `dev` en `build`).

### Optie C: vertalen in de browser (bijvoorbeeld i18next)

**Voordelen:** snel op te zetten.
**Nadelen:** crawlers zien vooral Nederlandse HTML, en hreflang vraagt toch aparte adressen. Tekst flitst bij het laden. Valt af voor publieke pagina's.

### Optie D: overstappen naar Astro of Eleventy

Beide maken per taal statische pagina's. Astro heeft ingebouwde i18n-routing en componenten. Eleventy heeft een i18n-plugin en werkt met eenvoudige sjablonen.

| Dimensie       | Beoordeling                                  |
| -------------- | -------------------------------------------- |
| Complexiteit   | Hoog om over te stappen, laag daarna         |
| Kost           | Gratis, werkt op GitHub Pages                |
| Schaalbaarheid | Zeer goed                                    |
| Vertrouwdheid  | Laag: nieuw framework en nieuwe sjabloontaal |

**Voordelen:** routing, componenten en sitemap zijn ingebouwd. Minder eigen code op lange termijn. Astro is een sterke portfoliokeuze.
**Nadelen:** eerst een migratie van de publieke pagina's, de build, de FAQ-plugin, de e2e-tests en de deploy, nog voor er één woord vertaald is. De games moeten in de nieuwe build passen of er apart naast blijven. Het lost het werk in de games niet op.

## Overwogen opties: de games

### Optie G1: vertalen in de browser, taal uit de sessie (gekozen)

**Voordelen:** gamepagina's worden niet geïndexeerd (`robots.txt` blokkeert `/experiences/`), dus SEO speelt geen rol. Veel tekst zit al in TypeScript. Alle spelers van een sessie spelen in dezelfde taal.
**Nadelen:** tekst in de game-HTML moet naar `data-i18n` of TypeScript. Zonder maatregel flitst Nederlandse tekst tot Firebase antwoordt; daarom de URL-hint en het verbergen tot vertaald.

### Optie G2: gamepagina's per taal genereren

**Voordelen:** dezelfde techniek als de site.
**Nadelen:** de teksten in TypeScript hebben toch een `t()` nodig, dus twee systemen in de game. Valt af.

### Bibliotheek of eigen functie

i18next brengt meervouden, interpolatie en namespaces. Bureau X heeft daarvan bijna niets nodig: enkele meervouden en datums, en die dekken `Intl.PluralRules` en `toLocaleDateString` al. Een eigen `t()` met getypeerde woordenboeken is klein, zonder afhankelijkheid. Daarom de eigen functie.

## Trade-offs

- **Build-time tegenover runtime.** Publieke pagina's moeten vindbaar zijn, dus build-time. Gamepagina's zijn dynamisch en niet vindbaar, dus runtime. Twee technieken, elk waar ze het best past.
- **Symmetrie tegenover risico.** Alle tekst in woordenboeken (B1) is netter, maar verandert de huidige site en vraagt dieper ingrijpen in Vite. De Nederlandse HTML als bron houden (B2) is veiliger en minder werk, ten koste van een controle-script.
- **Plugin tegenover framework.** Astro of Eleventy geven meer kant-en-klaar, maar vragen eerst een migratie. Met vier publieke pagina's weegt dat niet op. Groeit de site sterk, dan is dit het eerste om opnieuw te bekijken.
- **Dezelfde slugs in elke taal.** Vertaalde slugs helpen licht voor SEO, maar maken links, Analytics en de sitemap ingewikkelder. Niet de moeite bij deze omvang.

## Gevolgen

**Makkelijker:**

- Een nieuwe taal toevoegen is een woordenboek schrijven, zonder de opmaak aan te raken.
- Een opmaakwijziging gebeurt één keer en geldt voor alle talen.
- Ontbrekende en verouderde vertalingen worden automatisch gemeld.

**Moeilijker:**

- Elke wijziging in de Nederlandse tekst vraagt ook een update in de andere talen.
- Teksten in de game staan niet meer in de HTML maar in woordenboeken.

**Aan te passen in bestaande onderdelen:**

- **Metadata per taal:** `canonical` en `og:url` naar de eigen taalversie (nooit naar Nederlands), `og:locale` plus `og:locale:alternate`, wederkerige hreflang inclusief de pagina zelf, `html lang`, en JSON-LD met de juiste `inLanguage`. Nakijken of de og-afbeeldingen Nederlandse tekst bevatten.
- **Boeking en Make:** velden `taal` en `speltaal`. Make bewaart `speltaal` in de sessie, zet `&taal=` in de link en kiest de mailtemplate op `taal`. De datumtekst (`landing.ts` gebruikt vast `nl-BE`) en de Make-fallback ("zodra jullie klaar zijn") worden per taal. De contracttest krijgt de nieuwe velden.
- **Firebase:** de databaseregels krijgen een veld `taal` met `^(nl|en|fr)$`, plus tests in `test:rules`. Oude sessies zonder veld zijn Nederlands.
- **P1 per taal herontwerpen:** een eigen briefzin, een eigen hamerset, eigen hashes en een databaseregel die per taal de juiste letters aanvaardt. Ook de hints en het raadsel van P2 vertalen. P5 heeft alleen vertaalde labels nodig.
- **Cookiebanner en privacyverklaring:** vertaald, met de vermelding dat de Nederlandse versie voorgaat bij twijfel. De cookiekeuze in `localStorage` geldt voor alle talen.
- **Sitemap en llms.txt:** de sitemap wordt tijdens de build gegenereerd met hreflang-alternatieven. llms.txt en de FAQ-antwoorden over taal worden aangepast, met een Engelse sectie in llms.txt.
- **Tooling:** `lint:html`, Prettier en de e2e-tests nemen de gegenereerde mappen mee of sluiten ze bewust uit. Een 404-pagina per taal.
- **Analytics:** de taal volgt uit het pad (`experienceUitPad` werkt al met `/en/dua/`). Game-events krijgen een parameter `speltaal`.
- **Blijft Nederlands:** host panel, reviews (in hun originele taal) en interne documentatie.

**Later opnieuw bekijken:**

- Frans voor D.U.A., zodra de Engelse versie werkt.
- Kamer 14 vertalen: het spel heeft stemopnames, dus dat is duurder.
- Nieuwe puzzels meteen taalneutraal ontwerpen (cijfers, symbolen, kaarten).
- Astro of Eleventy, als het aantal publieke pagina's sterk groeit.

## Fasering en inschatting

De publieke D.U.A.-pagina in het Engels gaat pas zonder waarschuwing live samen met de Engelse game. Tot dan meldt ze, net als Kamer 14, dat het spel Nederlandstalig is.

| Fase              | Inhoud                                                                        | Inschatting                |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------- |
| 1. Structuur      | prebuild-script, `t()`, metadata, taalknop, sitemap, controle-script, tooling | 8 à 12 uur                 |
| 2. Engelse site   | vertaling en nalezen van 4.800 woorden, cookiebanner, privacy                 | 4 à 6 uur                  |
| 3. Engelse D.U.A. | teksten naar `t()`, P1 herontwerpen, boekingsketen, testspellen               | 15 à 25 uur                |
| 4. Franse site    | vertaling, nalezing door een Franstalige moedertaalspreker                    | 4 à 6 uur, plus de nalezer |

## Actiepunten

1. [x] Prebuild-script: leest `data-i18n` uit de Nederlandse HTML, schrijft `fr/` en `en/`, vult metadata en hreflang in, faalt bij ontbrekende of overbodige sleutels. Glob-ingangen in `vite.config.ts`, gegenereerde mappen in `.gitignore`.
2. [x] Controle-script voor vertaaldrift in CI.
3. [x] Sleutels toevoegen aan home, D.U.A.-pagina, Kamer 14-pagina en privacy. Controleren dat de Nederlandse output identiek blijft.
4. [x] Taalknop, suggestiebalk, cookiebanner vertaald. De 404-pagina is één `404.html` voor de hele site, want GitHub Pages kent er maar één. `js/niet-gevonden.ts` zet ze in het Engels als het gezochte pad met `/en/` begint.
5. [x] Sitemap genereren, llms.txt en FAQ over taal bijwerken.
6. [x] Engelse vertaling van de publieke pagina's, met de Nederlandstalig-melding bij beide spellen.
7. [ ] `shared/js/i18n.ts` met getypeerde `t()` en tests, woordenboeken per taal apart geladen.
8. [ ] Boekingsformulier met `taal` en `speltaal`. Make-scenario, mailtemplates, databaseregels, regeltests en contracttest aanpassen.
9. [ ] D.U.A.: teksten naar `t()`, taal uit de sessie met URL-hint, P1 per taal, P5-labels.
10. [ ] Engelse D.U.A. testen met twee volledige spellen, daarna de melding op `/en/dua/` weghalen.
11. [ ] Franse vertaling van de publieke pagina's, nagelezen door een moedertaalspreker.
12. [ ] e2e-test per taal: juiste `lang`, canonical, hreflang, en boeking stuurt de juiste velden.

## Uitvoering fase 1 en 2

- `i18n/config.ts`: talen en publieke pagina's, ook gebruikt in de browser.
- `scripts/i18n-sleutels.ts` (`pnpm i18n:sleutels`): geeft nieuwe Nederlandse tekst een sleutel.
- `scripts/i18n-paginas.ts`, gestart via `scripts/i18n.ts` (`pnpm i18n`, `i18n:controle`, `i18n:bevestig <sleutel>`): genereert `en/`, de sitemap en de drift-controle. Tijdens `pnpm dev` worden de vertaalde pagina's opnieuw gemaakt zodra een bronpagina of vertaling verandert.
- `scripts/vite-i18n.ts`: hreflang, `og:locale:alternate`, de taalknop, en haalt de sleutels uit de HTML voor de bezoeker.
- `i18n/paginas/en.ts`: vertaling van de pagina's. `i18n/teksten/`: teksten die JavaScript toont, getypeerd.
- `shared/js/i18n.ts` en `shared/js/taal-suggestie.ts`: taal van de pagina, lokale paden, taalknop onthouden en de suggestie.
- Afwijking: de JavaScript-teksten van de site worden niet per taal apart geladen. Ze zijn klein; voor de games (fase 3) blijft apart laden de bedoeling.
