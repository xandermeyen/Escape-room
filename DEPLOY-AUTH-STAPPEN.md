# Uitrol: anonieme auth + service-account deploy

Datum: 16 juni 2026

## Wat er in de code is gebeurd (klaar en geverifieerd)

- `app` wordt nu geexporteerd uit `shared/js/firebase-config.ts`.
- Nieuw bestand `shared/js/auth.ts`: start een anonieme login en exporteert
  `authReady`. De promise resolveert altijd, ook bij mislukking, zodat het spel
  blijft werken zolang de rules nog soepel staan.
- 19 schrijf-functies (in `session.ts`, `timer.ts`, `dua-session.ts`,
  `reviews.ts`) awaiten nu `authReady` voor ze naar Firebase schrijven.
- `firebase/database.rules.json`: de write-rule voor sessions staat nu op
  `auth != null` (was: ook open voor iedereen).
- `.github/workflows/deploy-rules.yml`: gebruikt nu een service-account in plaats
  van het verwijderde `--token`.
- De tests zijn bijgewerkt met een mock voor `auth.ts`.

Eindcontrole: `tsc` 0 fouten, 43 van 43 tests groen, build OK.

## Uitrolvolgorde - LEES DIT, de vololgorde is belangrijk

Als je de strengere rules live zet terwijl de Anonymous-provider nog uit staat,
kunnen spelers niet meer schrijven en is het spel stuk. Houd daarom deze volgorde
aan.

### Stap 1 - Anonymous provider aanzetten (Firebase-console)
Authentication > Sign-in method > Anonymous > Enable.

### Stap 2 - Service-account secret aanmaken
1. Firebase-console > Projectinstellingen > Service accounts >
   "Genereer nieuwe privesleutel". Er wordt een JSON-bestand gedownload.
2. GitHub-repo > Settings > Secrets and variables > Actions > New repository secret:
   - Naam: `FIREBASE_SERVICE_ACCOUNT`
   - Waarde: plak de VOLLEDIGE inhoud van het JSON-bestand.
3. `VITE_FIREBASE_PROJECT_ID` bestaat al, die laat je staan.
4. Bewaar het JSON-bestand veilig en zet het NOOIT in git.
   (Het oude `FIREBASE_TOKEN`-secret mag je daarna verwijderen.)

### Stap 3 - Code pushen
Push alles naar main. De site deployt automatisch. Vanaf nu loggen spelers
anoniem in. De strengere rules staan nog NIET live (die komen in stap 5), dus het
spel blijft sowieso werken.

### Stap 4 - Testen voor de rules-wijziging
Speel een sessie door (lobby > rol kiezen > een puzzel oplossen). Kijk in de
browserconsole (F12) of er geen melding "Anonieme login mislukt" staat. Werkt
alles? Dan door naar stap 5.

### Stap 5 - Strengere rules deployen
Actions-tab > "Firebase rules deployen" > Run workflow. Dit gebruikt nu de
service-account en zet de `auth != null` rule live.

### Stap 6 - Opnieuw testen
Speel nog een volledige sessie (beide spelers; ook D.U.A. als je die gebruikt).
Spelers moeten nog steeds kunnen schrijven dankzij de anonieme login.

## Als er iets misgaat (terugrol)

- Draai de rules terug: zet in `database.rules.json` de write-regel tijdelijk op
  `"auth != null || newData.exists()"` en run de workflow opnieuw, of doe
  `git revert` op de rules-commit.
- De client-kant (anonieme login) breekt niets bij de oude rules, dus die hoef je
  niet terug te draaien.

## Eerlijk over wat dit wel en niet oplost

Anonieme auth stopt scripts en drive-by writes, en is de standaard basislaag.
Maar iemand die het echt wil, kan ook een anoniem token halen. Wil je een echt
slot per sessie, dan is de volgende stap: bij het claimen van een rol de uid van
de speler opslaan en in de rules afdwingen dat alleen die uids mogen schrijven.
Dat is meer werk en meer testen; zeg het als je die kant op wil.
