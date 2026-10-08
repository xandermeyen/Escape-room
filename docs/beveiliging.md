# Beveiliging: Firebase rules, beheerders en App Check

Dit document beschrijft hoe de Realtime Database beveiligd is, wat je in de
Firebase-console moet instellen en hoe je de rules test.

## Waarom dit nodig was

Tot oktober 2026 stond `sessions/$sessie` op `".write": true`. Dat gebeurde
bewust (commit 7e7df54): Make.com maakte sessies aan via de REST API met een
legacy database secret, die secret werkte niet meer, en `auth != null` gaf dan
permission denied. Het gevolg was dat iedereen met de database-URL elke sessie
kon aanpassen of verwijderen. D.U.A.-codes zijn bovendien opeenvolgend en dus
te raden.

Daarnaast telde elke e-mail/wachtwoordgebruiker als host. Zolang registratie
in Firebase Auth openstaat, kan iedereen met de (publieke) API-key zo'n account
aanmaken.

## Het model

| Wie                        | Hoe herkend                     | Mag                                                                                               |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Bezoeker zonder login      | `auth == null`                  | een losse sessie lezen (lobby), goedgekeurde reviews lezen                                        |
| Speler                     | anonieme login (`auth != null`) | bestaande sessies bijwerken binnen strikte regels, één review schrijven                           |
| Beheerder (host, Make.com) | `beheerders/<uid> === true`     | alles: sessies aanmaken, resetten, verwijderen, alle sessies en reviews lezen, reviews goedkeuren |

`beheerders/` is niet schrijfbaar vanuit de client. Je beheert het enkel in de
Firebase-console.

Wat een speler mag (zie `firebase/database.rules.json`):

- `puzzels/pX`: alleen van `false` naar `true` (of aanmaken als `false`).
- `spelers/<rol>`: één keer claimen met `"bezet"`. Vrijgeven kan alleen een beheerder.
- `timerGestart`, `geopendOp`: één keer, en de waarde moet de servertijd zijn.
- `rapport`: één keer indienen, daarna ligt het vast. Alleen gekende velden.
- `actief`: alleen naar `false` (sessie sluiten), nooit terug naar `true`.
- `aangemaakt`, `ervaringsId`, `aantalSpelers`: niet aan te passen.
- `dua/*`: per veld begrensd (kluisnummer twee cijfers en daarna vast, verstopplek
  alleen gekende plekken, tijdstraf en hintteller kunnen alleen stijgen, ...).
- `stats/*`: zie [speldata](#speldata).
- Niets verwijderen, behalve de D.U.A.-verstopplek en -pin zolang die puzzel nog
  open staat (2034 wist ze als 1934 een slechte plek koos).

## Speldata

Per sessie bewaart het spel in `sessions/<code>/stats/<puzzel>` hoe lang een
puzzel duurde, hoeveel foute en bijna-juiste pogingen er waren en welke
hintstap elke rol opende. Geen namen of e-mailadressen, enkel de sessiecode.

| Veld                | Regel                                        |
| ------------------- | -------------------------------------------- |
| `start`, `opgelost` | één keer, alleen servertijd                  |
| `fout`, `bijna`     | alleen +1 (ServerValue.increment), max. 1000 |
| `hints/<rol>`       | 1 tot 10, alleen stijgend                    |

Elke schrijfregel van een speler eist bovendien dat de sessie al bestaat
(`aangemaakt` is gezet), zodat niemand losse nepsessies kan aanmaken.

## Uitrol: volgorde is belangrijk

Doe dit in deze volgorde, anders kan Make.com geen sessies meer aanmaken of
kunnen spelers niet meer schrijven.

### 1. Firebase Authentication

1. **Authentication > Sign-in method**: _Anonymous_ en _Email/Password_ staan aan.
2. **Authentication > Settings > User actions**: vink **Enable create (sign-up)**
   uit. Jij kan in de console nog altijd gebruikers toevoegen.
3. **Authentication > Users > Add user**: maak `make@bureau-x.be` aan met een
   lang, willekeurig wachtwoord. Noteer de **User UID**.
4. Noteer ook de User UID van je eigen host-account.

### 2. Beheerders aanduiden

**Realtime Database > Data**: voeg toe aan de root:

```json
"beheerders": {
  "<jouw-uid>": true,
  "<make-uid>": true
}
```

### 3. Make.com omzetten

Zie [make-scenario.md](make-scenario.md#module-14-http--make-a-request-post-inloggen):
een extra HTTP-module logt in met het Make-account, de PUT gebruikt daarna
`?auth=<idToken>`. Doe een testrun (onder de oude rules werkt dit al).

### 4. Code deployen

Push naar `main`. De site deployt automatisch.

### 5. Rules deployen

**Actions > "Firebase rules deployen" > Run workflow.**

### 6. Testen

Loop de [checklist](#handmatige-checklist) hieronder af.

### 7. App Check (reCAPTCHA Enterprise / Fraud Defense)

reCAPTCHA Classic (v3) is uitgefaseerd, daarom gebruikt de site de
Enterprise-provider (in de console nu "Fraud Defense").

1. **Google Cloud-console** (project `bureau-x`): zet de _reCAPTCHA Enterprise
   API_ aan en maak onder _Security > reCAPTCHA_ een **website**-sleutel aan
   voor `bureau-x.be`, zonder checkbox-uitdaging. Er is enkel een sitesleutel,
   geen geheime sleutel.
2. **Firebase-console > App Check > Apps**: registreer de web-app met
   **Fraud Defense** en die sitesleutel.
3. GitHub: voeg de repository-secret `VITE_RECAPTCHA_SITE_KEY` toe (dezelfde
   sitesleutel). De deploy-workflow geeft hem door aan de build.
4. Laat App Check eerst een week op **monitoren** staan
   (_App Check > APIs > Realtime Database_): je ziet dan welk deel van het
   verkeer een geldig token heeft.
5. **Enforcement aanzetten blokkeert ook Make.com**: een REST-call met een
   ID-token heeft geen App Check-token. Zet enforcement pas aan als Make met een
   service account werkt (OAuth2 `access_token`, valt buiten App Check), of
   laat het op monitoren staan. De rules hierboven zijn de echte beveiliging;
   App Check is een extra laag tegen scripts.

Lokaal ontwikkelen met enforcement aan: zet `VITE_APPCHECK_DEBUG_TOKEN` in
`.env.development` en registreer dat token onder _App Check > Apps >
Debugtokens beheren_.

## Rules testen

Automatisch, tegen de Realtime Database-emulator:

```bash
pnpm test:rules
```

Dat start de emulator via `firebase-tools` (Java 21 nodig) en draait
`tests/database-rules.test.ts`. In CI draait dit in een aparte job. Zonder
emulator slaat de gewone `pnpm test` dit bestand over.

### Handmatige checklist

Na het deployen van de rules, met de live site:

- [ ] Make.com maakt een sessie aan (testrun) en de spelers krijgen hun mail.
- [ ] Host-paneel: inloggen lukt, sessielijst laadt, sessie aanmaken lukt.
- [ ] Host-paneel met een account dat niet in `beheerders` staat: melding
      "geen beheerdersrechten", geen data.
- [ ] Kamer 14 van begin tot einde (twee browsers): code, rol, puzzels, rapport,
      briefkaart, review. Geen rode balk "Verbinding mislukt".
- [ ] D.U.A. van begin tot einde met 1934 en 2034, inclusief een fout gekozen
      verstopplek (wordt gewist en opnieuw gekozen).
- [ ] Rol vrijgeven en sessie deactiveren vanuit het host-paneel.
- [ ] Kamer 14-host-paneel: "Verlopen sessies sluiten" zet sessies die meer dan 24 uur
      geleden geopend werden en geen rapport hebben op `actief: false` (demo's niet).
- [ ] Review goedkeuren in het host-paneel, verschijnt op de homepage.
- [ ] Browserconsole zonder login (incognito, op een andere site):
      `fetch('<database-url>/sessions/<code>.json', {method: 'DELETE'})`
      geeft 401.
- [ ] `fetch('<database-url>/reviews.json')` geeft 401 (alleen goedgekeurde
      reviews via de query zijn publiek).

## Terugrollen

Draai de rules-commit terug (`git revert`) en run de workflow opnieuw. De
client-code werkt ook met de oude rules.
