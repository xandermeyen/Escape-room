# Beveiliging: Firebase rules, beheerders en App Check

Dit document beschrijft hoe de Realtime Database beveiligd is, wat je in de
Firebase-console moet instellen en hoe je de rules test.

## Waarom dit nodig was

Tot oktober 2026 stond `sessions/$sessie` op `".write": true`. Dat gebeurde
bewust (commit 7e7df54): Make.com maakte sessies aan via de REST API met een
legacy database secret, die secret werkte niet meer, en `auth != null` gaf dan
permission denied. Het gevolg was dat iedereen met de database-URL elke sessie
kon aanpassen of verwijderen.

Daarnaast telde elke e-mail/wachtwoordgebruiker als host. Zolang registratie
in Firebase Auth openstaat, kan iedereen met de (publieke) API-key zo'n account
aanmaken. Daarom hangt host-toegang nu af van `beheerders/` en niet meer van
het type login.

## Het model

| Wie                        | Hoe herkend                     | Mag                                                                                                                    |
| -------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Bezoeker zonder login      | `auth == null`                  | een losse sessie lezen (lobby), goedgekeurde reviews lezen, de tijdsverdeling (`verdeling/`) lezen                     |
| Speler                     | anonieme login (`auth != null`) | bestaande sessies bijwerken binnen strikte regels, één review schrijven                                                |
| Beheerder (host, Make.com) | `beheerders/<uid> === true`     | alles: sessies aanmaken, resetten, verwijderen, alle sessies en reviews lezen, reviews goedkeuren, `verdeling/` vullen |

`beheerders/` is niet schrijfbaar vanuit de client. Je beheert het enkel in de
Firebase-console.

Wat een speler mag (zie `firebase/database.rules.json`):

- `puzzels/pX` (p0 tot p6): alleen van `false` naar `true`, of aanmaken.
- `spelers/<rol>`: één keer claimen met `"bezet"`. Vrijgeven kan alleen een beheerder.
- `timerGestart`, `geopendOp`: één keer, en de waarde moet de servertijd zijn.
- `rapport`: één keer indienen, daarna ligt het vast. Alleen gekende velden.
- `rapport/fouten` (Kamer 14): aantal foute rapporten van de sessie, alleen +1 en
  maximaal 2. Staat de teller op 2 (einde "Vermist"), dan kan niemand nog een
  rapport indienen. Zo delen beide spelers dezelfde twee kansen.
- `actief`: alleen naar `false` (sessie sluiten), nooit terug naar `true`.
- `aangemaakt`, `ervaringsId`, `aantalSpelers`, `demo`: niet aan te passen.
- `dua/*`: per veld begrensd (hamers enkel de zes letters, kluisnummer twee
  cijfers en daarna vast, verstopplek alleen gekende plekken, tijdstraf en
  hintteller kunnen alleen stijgen, insignes in `dua/badges` alleen op `true`, ...).
- `stats/*`: zie [speldata](#speldata).
- Niets verwijderen, behalve de D.U.A.-verstopplek en -pin zolang die puzzel nog
  open staat (2034 wist ze als 1934 een slechte plek koos).

Elke schrijfregel van een speler eist bovendien dat de sessie al bestaat
(`aangemaakt` is gezet), zodat niemand losse nepsessies kan aanmaken.

### Wat nog openstaat

Een speler kan elke sessie aanpassen waarvan hij de code kent, binnen de regels
hierboven: rollen claimen, puzzels op opgelost zetten of de sessie sluiten.
Codes zijn daarom willekeurig, nooit oplopend:

- Boekingen (Kamer 14 en D.U.A.) krijgen hun code van Make.com: 8 hex-tekens uit
  een `uuid`, ongeveer 4,3 miljard mogelijkheden. De PUT gebruikt
  `if-match: null_etag`, zodat een (onwaarschijnlijke) botsing nooit een bestaande
  sessie overschrijft (zie
  [make-scenario.md](make-scenario.md#module-2-set-variables-met-filter-geldige-boeking)).
- Het host-paneel maakt codes zoals `KQM-473` (Kamer 14) of `DUA-KQM-473`
  (D.U.A.), ongeveer 7 miljoen mogelijkheden (`nieuweSessieCode()` in
  `shared/js/host-sessies.ts`). Tot november 2026 liepen D.U.A.-codes uit het
  host-paneel op (`DUA-2026-001`, ...); oude sessies kunnen die vorm nog hebben.

Wil je het nog strenger: bij `claimRol` de `auth.uid` opslaan
(`spelers/<rol>: uid`) en schrijfregels laten eisen dat je een van de
deelnemers bent.

## Speldata

Per sessie bewaart het spel in `sessions/<code>/stats/<puzzel>` hoe lang een
puzzel duurde, hoeveel foute en bijna-juiste pogingen er waren, wat er fout
ingetikt werd en welke hintstap elke rol wanneer opende. Geen namen of
e-mailadressen, enkel de sessiecode.

| Veld                  | Regel                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `start`, `opgelost`   | één keer, alleen servertijd                                                                                             |
| `fout`, `bijna`       | alleen +1 (ServerValue.increment), max. 1000                                                                            |
| `hints/<rol>`         | 1 tot 10, alleen stijgend                                                                                               |
| `hintTijd/<rol>/<nr>` | één keer per rol en stap (1 tot 10), alleen servertijd                                                                  |
| `invoer/<pushId>`     | nieuw item `{ w, o, t }`: tekst max. 40 tekens, `o` is `fout` of `bijna`, `t` servertijd; nooit wijzigen of verwijderen |

- Alleen voor `p0` tot `p6`, en nooit in demo-sessies (`demo: true`).
- `invoer` is vrije tekst van spelers. Het host-paneel toont die altijd via
  `escHtml`. Iedereen met de sessiecode kan de sessie lezen, dus ook deze invoer.
- `verdeling/<ervaring>/duren` bevat enkel de duur van afgeronde sessies (geen
  codes). Alleen een beheerder schrijft die lijst, iedereen mag ze lezen voor
  "sneller dan X% van de groepen" op het eindscherm.

## Uitrol: volgorde is belangrijk

Doe dit in deze volgorde, anders kan Make.com geen sessies meer aanmaken of
kunnen spelers niet meer schrijven.

### 1. Firebase Authentication

1. **Authentication > Sign-in method**: _Anonymous_ en _Email/Password_ staan aan.
2. **Authentication > Settings > User actions**: laat **Enable create (sign-up)**
   **aan staan**. Uitvinken blokkeert ook anonieme logins
   (`auth/admin-restricted-operation`), waardoor nieuwe spelers niets meer
   kunnen schrijven (Sentry JAVASCRIPT-4, 8 oktober 2026). Open registratie is
   geen risico: wie zelf een account aanmaakt, staat niet in `beheerders/` en
   heeft dus enkel spelersrechten.
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

Zie [make-scenario.md](make-scenario.md#module-3-inloggen): in het
boekingsscenario logt een HTTP-module in met het Make-account, de PUT gebruikt
daarna `?auth=<idToken>`.

### 4. Code deployen

Push naar `main`. De site deployt automatisch zodra de volledige CI geslaagd is.

### 5. Rules deployen

Gebeurt automatisch: een push naar `main` die `firebase/database.rules.json`
wijzigt, start de workflow "Firebase rules deployen". Die draait eerst de
rules-tests tegen de emulator en deployt pas als ze slagen. Handmatig kan
ook: **Actions > "Firebase rules deployen" > Run workflow** (bv. na een
terugrol).

### 6. Testen

Loop de [checklist](#handmatige-checklist) hieronder af.

### 7. App Check (optioneel, staat uit)

App Check is bewust niet in gebruik: Fraud Defense (reCAPTCHA Enterprise) is
(of kan worden) betalend, en Bureau X blijft bij gratis diensten. De rules
hierboven zijn de echte beveiliging; App Check zou enkel een extra laag tegen
scripts zijn.

De code staat wel klaar en blijft slapen zolang `VITE_RECAPTCHA_SITE_KEY` leeg
is: geen App Check, en de reCAPTCHA-melding in de lobby's en het privacybeleid
blijft verborgen. Zorg dus dat de GitHub-secret `VITE_RECAPTCHA_SITE_KEY` niet
bestaat of leeg is.

Wil je het later toch aanzetten:

1. **Google Cloud-console** (project `bureau-x`): zet de _reCAPTCHA Enterprise
   API_ aan en maak onder _Security > reCAPTCHA_ een **website**-sleutel aan
   voor `bureau-x.be`, zonder checkbox-uitdaging.
2. **Firebase-console > App Check > Apps**: registreer de web-app met
   **Fraud Defense** en die sitesleutel.
3. GitHub: zet de sitesleutel in de repository-secret `VITE_RECAPTCHA_SITE_KEY`.
   De deploy-workflow geeft hem door aan de build.
4. Laat App Check eerst op **monitoren** staan
   (_App Check > APIs > Realtime Database_).
5. **Enforcement aanzetten blokkeert Make.com**: een REST-call met een ID-token
   heeft geen App Check-token. Zet enforcement pas aan als Make met een service
   account werkt (OAuth2 `access_token`).

Lokaal met enforcement: zet `VITE_APPCHECK_DEBUG_TOKEN` in `.env.development`
en registreer dat token onder _App Check > Apps > Debugtokens beheren_.

## Bewaking

- **Rookproef** (`.github/workflows/rookproef.yml`, `scripts/rookproef.ts`): logt
  elk uur (minuut 17) anoniem in op productie, leest `DEMO-K14` en verwijdert de
  testgebruiker. Faalt dat, dan mailt GitHub. Vangt instellingen in de
  Firebase-console die spelers blokkeren, zoals de sign-up hierboven.
- **Sentry**: de regel "Send a notification for high priority issues" mailt bij
  een nieuwe fout, ook bij een mislukte anonieme login (tag
  `context: anonieme-login`).

## Rules testen

Automatisch, tegen de Realtime Database-emulator:

```bash
pnpm test:rules
```

Dat start de emulator via `firebase-tools` (Java 21 nodig) en draait
`tests/database-rules.test.ts`. In CI draait dit in een aparte job, en de
workflow "Firebase rules deployen" draait het opnieuw voor hij deployt. Zonder
emulator slaat de gewone `pnpm test` dit bestand over.

### Handmatige checklist

Na het deployen van de rules, met de live site:

- [ ] Een boeking via het formulier (Kamer 14 én D.U.A.) toont meteen de link en de spelers krijgen hun mail.
- [ ] Host-paneel: inloggen lukt, sessielijst laadt, sessie aanmaken lukt.
- [ ] Host-paneel met een account dat niet in `beheerders` staat: melding
      "geen beheerdersrechten", geen data.
- [ ] Kamer 14 van begin tot einde (twee browsers): code, rol, puzzels, rapport,
      briefkaart, review. Geen rode balk "Verbinding mislukt".
- [ ] D.U.A. van begin tot einde met 1934 en 2034, inclusief een fout gekozen
      verstopplek (wordt gewist en opnieuw gekozen).
- [ ] Host-paneel, sessiedetails: na een foute poging en een geopende hint staan
      de foute invoer onder "Fout" en de hinttijden onder "Hints".
- [ ] Rol vrijgeven en sessie deactiveren vanuit het host-paneel.
- [ ] Host-paneel (Kamer 14 en D.U.A.): "Verlopen sessies sluiten" zet sessies die meer dan 24 uur
      geleden geopend werden en geen rapport hebben op `actief: false` (demo's niet).
- [ ] Review goedkeuren in het host-paneel, verschijnt op de homepage.
- [ ] Browserconsole zonder login (incognito, op een andere site):
      `fetch('<database-url>/sessions/<code>.json', {method: 'DELETE'})`
      geeft 401.
- [ ] `fetch('<database-url>/reviews.json')` geeft 401 (alleen goedgekeurde
      reviews via de query zijn publiek).

## Terugrollen

Draai de rules-commit terug (`git revert`) en run de workflow opnieuw. De
client-code werkt ook met de oude rules, behalve dat de nieuwe speldata
(`invoer`, `hintTijd`) dan stil geweigerd wordt.
