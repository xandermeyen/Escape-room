# Make.com booking-automatisering

Dit document beschrijft de twee Make.com-scenario's die boekingen omzetten in een
speelbare sessie. De scenario's zelf leven volledig binnen Make.com. Als Make
wegvalt, je de toegang verliest, of je ze opnieuw moet opbouwen, is dit het
referentiepunt.

> Scenario's (Make zone `eu1.make.com`, team "My Team"):
>
> - **"Mail versturen Kamer 14"** (id 6098475)
> - **"Mail versturen DUA"** (id 6199301)
>
> Ingevuld vanuit de blueprints (stand van november 2026). Connectie-credentials
> (Gmail-login, SMTP-login, wachtwoord van het Make-account) staan hier bewust
> **niet** in.

---

## Overzicht

Beide scenario's hebben hetzelfde begin. Daarna verschilt het aantal spelers.

```
1.  Gmail        : Watch emails          (trigger: mail van noreply@formspree.io)
12. Tools        : Set variable          (sessiecode genereren)
30. HTTP         : Make a request (POST) (inloggen met het Make-account → idToken)

Kamer 14:
2.  HTTP         : Make a request (PUT)  (sessie aanmaken in Firebase REST API)
7.  Text parser  : Match pattern         (e-mail speler 1)
8.  Text parser  : Match pattern         (naam)
9.  Text parser  : Match pattern         (datum)
13. Text parser  : Match pattern         (e-mail speler 2)
10. Email        : Send an Email         (SMTP, beide spelers)

D.U.A.:
7, 8, 9, 13      : zelfde parsers als Kamer 14
14. Text parser  : Match pattern         (e-mail speler 3, mag ontbreken)
15. Text parser  : Match pattern         (e-mail speler 4, mag ontbreken)
17. Router       : 3 routes, elk met een eigen PUT en mail
    4 spelers    : 2 (PUT, aantalSpelers 4)  → 10 (mail)
    3 spelers    : 22 (PUT, aantalSpelers 3) → 20 (mail)
    2 spelers    : 23 (PUT, aantalSpelers 2) → 21 (mail)
```

(De nummers zijn de interne module-ID's uit Make, niet de uitvoeringsvolgorde.
De uitvoering loopt van boven naar onder zoals hierboven.)

De spelers krijgen een link met `?sessie=CODE`, zodat ze direct in de lobby
landen zonder handmatig een code in te tikken.

Scheduling staat op **elke 2 uur** (`interval: 7200`, ingesteld in de Make-UI).
Een bevestigingsmail komt dus binnen ongeveer 2 uur na de boeking aan.

---

## Module 1: Gmail > Watch emails (trigger)

- Connectie: Gmail
- Map: `INBOX`
- Filtertype: Simple filter
- Afzender (`from`): `noreply@formspree.io`
- Has the words (`includeWords`):
  - Kamer 14: `Kamer 14 Reservaties`
  - D.U.A.: `DUA Reservaties`
- Content format: Full content (levert o.a. `fullTextBody`, de platte-tekst body)
- Criteria: All messages
- Mark as read when fetched: ja
- Limit: 1 per run

De woorden komen uit het verborgen veld `_subject` van het Formspree-formulier
op `experiences/kamer-14/index.html` en `experiences/dua/index.html`. Wijzig je
dat onderwerp, pas dan ook deze trigger aan.

Alle parsers verderop lezen uit `{{1.fullTextBody}}`.

> Limit 1 per run en een run om de 2 uur betekent: komen er meer dan 12
> boekingen per dag binnen, dan loopt de wachtrij op.

---

## Module 12: Tools > Set variable (sessiecode)

- Variabelenaam: `sessieCode`
- Levensduur: One cycle (`roundtrip`)
- Waarde:

```
{{upper(substring(md5(now); 1; 7))}}
```

`substring` is in Make 0-gebaseerd en het einde telt niet mee. Dit geeft dus
**6 hex-tekens** in hoofdletters (tekens 2 tot 7 van de MD5-hash), bijvoorbeeld
`1BF23F` of `078391`. Dat zijn ongeveer 16,7 miljoen mogelijkheden.

Dit valt binnen wat de Firebase-rules eisen voor een sessiesleutel
(`^[A-Z0-9-]{3,20}$`).

> Aandachtspunten:
>
> - Er is **geen botsingscontrole**. Twee runs met dezelfde `now` krijgen dezelfde
>   code, en de PUT overschrijft dan zonder waarschuwing de eerste sessie. Met
>   één boeking per run is dat onwaarschijnlijk.
> - Robuuster: `{{upper(substring(replace(uuid; "-"; ""); 0; 8))}}`, en bij de PUT
>   de header `if-match: null_etag`, zodat Firebase een bestaande sessie nooit
>   overschrijft.

---

## Module 30: HTTP > Make a request (POST, inloggen)

Sinds oktober 2026 mag alleen een beheerder sessies aanmaken (zie
[beveiliging.md](beveiliging.md)). Make logt daarom bij elke run in met een
eigen account `make@bureau-x.be`, waarvan de uid in `beheerders/` staat. In het
canvas heet deze module "Inloggen als make@bureau-x.be".

- Methode: `POST`
- URL:

```
https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<VITE_FIREBASE_API_KEY>
```

- Body content type: JSON (raw)
- Timeout: 40 s
- Parse response: ja
- Stop on HTTP error: ja
- Body:

```json
{ "email": "make@bureau-x.be", "password": "<wachtwoord>", "returnSecureToken": true }
```

Het antwoord bevat `idToken` (één uur geldig, ruim genoeg voor één run).

> Het wachtwoord staat nu als platte tekst in de body van deze module, in beide
> scenario's. Behandel een blueprint-export daarom als gevoelig, en wijzig het
> wachtwoord (in Firebase én in beide modules) als het ergens publiek terechtkomt.

---

## Module 2: HTTP > Make a request (PUT, sessie aanmaken)

Bij D.U.A. zijn dit drie modules (2, 22 en 23), één per route van de router.

- Methode: `PUT`
- URL:

```
https://bureau-x-default-rtdb.europe-west1.firebasedatabase.app/sessions/{{12.sessieCode}}.json?auth={{30.data.idToken}}
```

- Authenticatie: de `?auth=`-querystring bevat het ID-token uit module 30. De
  oude legacy database secret wordt niet meer gebruikt.
- Body content type: JSON, als raw JSON-string ingevoerd
- Stop on HTTP error: ja

### Body Kamer 14

```json
{
  "aangemaakt": { ".sv": "timestamp" },
  "actief": true,
  "ervaringsId": "kamer-14",
  "puzzels": {
    "p0": false,
    "p1": false,
    "p2": false,
    "p3": false,
    "p4": false,
    "p5": false,
    "p6": false
  },
  "rapport": { "ingediend": false, "inhoud": {} },
  "timerGestart": null
}
```

### Body D.U.A. (per route, hier voor 4 spelers)

```json
{
  "aangemaakt": { ".sv": "timestamp" },
  "actief": true,
  "ervaringsId": "dua",
  "aantalSpelers": 4,
  "puzzels": {
    "p0": false,
    "p1": false,
    "p2": false,
    "p3": false,
    "p4": false,
    "p5": false
  },
  "rapport": { "ingediend": false, "inhoud": {} },
  "timerGestart": null
}
```

In het D.U.A.-scenario zit deze PUT in elke route van de router (modules 2, 22
en 23), met `aantalSpelers` 4, 3 of 2. Zo laat de lobby precies zoveel spelers
toe als er geboekt werden. Een boeking zonder geldig e-mailadres voor speler 1
of 2 stopt bij de parsers, vóór er een sessie wordt aangemaakt.

Beide voldoen aan de security rules (`firebase/database.rules.json`) en komen
overeen met wat `maakSessie()` in `shared/js/session.ts` (het host-paneel)
schrijft. `timerGestart` blijft `null` en wordt gezet zodra de eerste speler
laadt.

> Wijzigt het datamodel, dan moeten deze PUT-bodies (3 bij D.U.A.),
> `maakSessie()` en de rules samen mee.

---

## Parsers (Text parser > Match pattern)

Elk op `{{1.fullTextBody}}`, niet-globaal (eerste match), hoofdletter-ongevoelig.
Elk geeft zijn match terug als `$1`.

| Module | Haalt eruit     | Pattern                                                                    | Scenario's            |
| ------ | --------------- | -------------------------------------------------------------------------- | --------------------- |
| 7      | E-mail speler 1 | `([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})`                       | beide                 |
| 8      | Naam            | `naam:[\r\n]+([^\r\n]+)`                                                   | beide                 |
| 9      | Datum           | `datum:[\r\n]+([^\r\n]+)`                                                  | beide                 |
| 13     | E-mail speler 2 | `email_speler_2:[\r\n]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})` | beide                 |
| 14     | E-mail speler 3 | `email_speler_3:[\r\n]+(...)`, zelfde e-mailpatroon                        | D.U.A., mag ontbreken |
| 15     | E-mail speler 4 | `email_speler_4:[\r\n]+(...)`, zelfde e-mailpatroon                        | D.U.A., mag ontbreken |

De Formspree-mail zet elk label op een eigen regel met de waarde op de volgende
regel. Module 7 pakt het **eerste e-mailadres** in de body (= speler 1).
Bij 14 en 15 staat "Continue when no result" aan, zodat een boeking voor 2 of 3
spelers niet stilvalt.

> Kanttekeningen:
>
> - Module 8 (naam) wordt geparset maar **niet gebruikt** in de mails.
> - Module 7 vertrouwt erop dat het eerste e-mailadres dat van speler 1 is. Een
>   expliciet label (`email_speler_1:`) zou robuuster zijn.

---

## Mails (Email > Send an Email, SMTP)

- Connectie: SMTP (`info@bureau-x.be`, via Combell, `smtp-auth.mailprotect.be:587`)
- Content type: HTML
- Save message after sending: nee

### Kamer 14: module 10

- Aan: `{{7.$1}}`, `{{13.$1}}`
- Onderwerp: `Jouw spellink voor Kamer 14`
- Link: `https://bureau-x.be/experiences/kamer-14/?sessie={{12.sessieCode}}`
- Variabelen in de template: `{{9.$1}}` (datum) en `{{12.sessieCode}}`.
- De mail beschrijft het huidige verhaal (Lena, 60 minuten, één speler aan het
  bureau van het OPZ, de ander in haar kamer).

### D.U.A.: router (module 17)

| Route | Filter                          | PUT | Mail | Aan                  |
| ----- | ------------------------------- | --- | ---- | -------------------- |
| 1     | speler 3 en speler 4 bestaan    | 2   | 10   | spelers 1, 2, 3 en 4 |
| 2     | speler 3 bestaat, speler 4 niet | 22  | 20   | spelers 1, 2 en 3    |
| 3     | speler 3 en speler 4 ontbreken  | 23  | 21   | spelers 1 en 2       |

- Onderwerp (alle routes): `Jouw opdracht van Bureau X: D.U.A.`
- Link: `https://bureau-x.be/experiences/dua/?sessie={{12.sessieCode}}`
- Elke route legt de rolverdeling uit voor dat aantal spelers (1934: Schrijver
  en Loper, 2034: Archivaris en Restaurateur).

---

## Aandachtspunten

- De scenario's draaien op het **free plan** (polling om de 2 uur, geen webhooks).
- Make ruimt sessies nooit op. Voltooide sessies gaan in de app op
  `actief: false` (na het rapport of bij tijd voorbij), en het host-paneel heeft
  een knop "Verlopen sessies sluiten" voor sessies die langer dan 24 uur open
  staan.
- Geen botsingsdetectie voor sessiecodes, zie module 12.
- App Check staat uit (zie [beveiliging.md](beveiliging.md#7-app-check-optioneel-staat-uit)).
  Zou je enforcement ooit aanzetten, dan weigert Firebase de PUT-calls.

---

## Bijlage: bewaar de blueprints

Make.com kan elk scenario als blueprint (JSON) exporteren (scenario openen,
**Edit**, onderaan **More**, **Export Blueprint**). Bewaar die exports naast dit
document, bijvoorbeeld als `docs/make-kamer14.blueprint.json` en
`docs/make-dua.blueprint.json`, zodat de scenario's herbouwbaar zijn.

> Vervang voor het committen het wachtwoord in module 30 door `<wachtwoord>`. De
> rest van de blueprint is veilig te bewaren.
