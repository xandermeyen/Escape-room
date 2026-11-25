# AGENTS.md

Instructies voor AI-assistenten (Claude Code, Codex, Copilot) die in deze repo werken.
Voor mensen: zie README.md.

## Project in het kort

Bureau X (bureau-x.be): gratis online escape rooms voor 2 tot 4 spelers, elk op een eigen
scherm. Statische site met Vite en TypeScript, realtime sync via Firebase Realtime Database,
boekingen via een Make.com-webhook. Hosting op GitHub Pages. Dit is een hobbyproject, geen
bedrijf: schrijf nergens "ons bedrijf" of verkooptaal.

Twee experiences: **Kamer 14** (Geel, NL) en **D.U.A.** (Gent, NL en EN).

## Taal en stijl

- Code, commentaar, commits, bestandsnamen en docs zijn in het **Nederlands**
  (`speldata.ts`, `rookproef`, `i18n:bevestig`). Houd dat aan, ook voor nieuwe namen.
- Geen em-dashes in teksten. Schrijf natuurlijk en concreet, geen marketingtaal.
- Commitberichten: korte Nederlandse zin, eventueel met prefix van het onderdeel.
  Bijvoorbeeld `D.U.A.: hints pas laden bij openen` of `Host-paneel: speeltijd per sessie`.

## Commando's

```bash
pnpm install
pnpm dev            # http://localhost:5173 (genereert eerst /en/)
pnpm lint && pnpm typecheck && pnpm test && pnpm format:check
pnpm i18n:controle  # faalt bij ontbrekende of verouderde vertalingen
pnpm lint:html
pnpm build
pnpm test:e2e       # Playwright tegen de nep-Firebase in e2e/fake-firebase
pnpm test:rules     # database-rules, vraagt Java 21
```

Draai voor je klaar bent minstens: `lint`, `typecheck`, `test`, `format:check`,
`i18n:controle` en `build`. Dat is ook wat CI controleert.

## Structuur

| Map                               | Wat                                                  |
| --------------------------------- | ---------------------------------------------------- |
| `index.html`, `kamer-14/`, `dua/` | Sitepagina's (Nederlands, de map bepaalt de URL)     |
| `experiences/<naam>/`             | Spelpagina's met eigen `css/` en `js/`               |
| `shared/js/`                      | Gedeelde spellogica: sessie, timer, hulp, host, demo |
| `i18n/`, `scripts/`               | Vertalingen en de scripts die `en/` genereren        |
| `firebase/database.rules.json`    | Database-rules, de echte beveiliging                 |
| `tests/`, `e2e/`                  | Vitest en Playwright                                 |
| `docs/`                           | Beveiliging, Make-scenario, ADR's                    |

`en/` wordt gegenereerd. Bewerk het nooit met de hand.

## Harde regels

1. **Nooit antwoorden in de code.** Puzzelantwoorden staan alleen als SHA-256-hash in
   `experiences/<naam>/js/*-config.ts`. Zet geen platte antwoorden, oplossingen of
   volledige hints in broncode, tests, commits, screenshots of docs.
2. **Geen ongesanitiseerde `innerHTML`.** ESLint blokkeert dit. Gebruik `textContent`
   of DOM-methodes. Leegmaken met `el.innerHTML = ''` mag.
3. **Rules wijzigen = rules testen.** Pas je `firebase/database.rules.json` aan, voeg dan
   een test toe in `tests/database-rules.test.ts` en draai `pnpm test:rules`. Een push
   naar `main` deployt de rules automatisch.
4. **Nederlandse tekst wijzigen = i18n bijwerken.** Na een tekstwijziging:
   `pnpm i18n:sleutels`, vertaling aanvullen in `i18n/paginas/en.ts`, dan
   `pnpm i18n:bevestig <sleutel>`. Zie docs/adr/001-meertaligheid.md.
5. **Geen secrets.** Geen API-keys, webhook-URL's met tokens of Firebase-credentials in
   commits. Config komt uit `.env.development` (zie `.env.example`).
6. **Geen betaalde diensten toevoegen.** Kies gratis opties of vraag het eerst.
7. **Spelerpagina's blijven `noindex`.** Lobby, spelerpagina's, eindschermen en het
   host-paneel horen niet in Google.
8. **Toegankelijkheid behouden:** alles bedienbaar met het toetsenbord, contrast minstens
   4,5:1, klikdoelen op gsm minstens 44 px.

## Git-werkwijze

GitHub Flow: `main` is altijd live. Werk op een korte branch vanaf `main` en open een PR.
Deploy gebeurt pas als de volledige CI slaagt.

Branchnamen: `feature/...`, `fix/...`, `docs/...`, `chore/...`.

## Waar staat wat

- Plannen en volgorde van werk: ROADMAP.md
- Architectuurbeslissingen: docs/adr/
- Beveiligingsmodel en testchecklist: docs/beveiliging.md
- Boekingsflow in Make.com: docs/make-scenario.md
