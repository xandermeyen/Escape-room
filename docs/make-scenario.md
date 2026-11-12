# Make.com: boekingen via webhook

Eén scenario zet een boeking om in een speelbare sessie, voor beide experiences.
Het scenario leeft in Make.com. Dit document is het referentiepunt als Make
wegvalt, je de toegang verliest of het opnieuw moet opbouwen.

> Make-zone `eu1.make.com`, team "My Team".
>
> - Scenario **"Boekingen (webhook)"** (id 8536413)
> - Webhook **"Bureau X boekingen"** (id 4092683):
>   `https://hook.eu1.make.com/i3kal4r1xmikgdfm2cyre7i6acx8j8cx`
>
> De oude scenario's "Mail versturen Kamer 14" (6098475) en "Mail versturen DUA"
> (6199301) lazen om de 2 uur Formspree-mails uit Gmail. Ze zijn vervangen door dit
> scenario en mogen uit blijven.

Connectie-credentials (SMTP-login, wachtwoord van make@bureau-x.be) staan hier
bewust **niet** in.

---

## Waarom een webhook

|                          | Vroeger (Formspree + Gmail-polling)   | Nu (webhook)                         |
| ------------------------ | ------------------------------------- | ------------------------------------ |
| Speler krijgt link       | na maximaal 2 uur, per mail           | meteen op het scherm, plus mail      |
| Plafond                  | 50 boekingen/maand (Formspree free)   | ± 150/maand (1000 Make-credits)      |
| Credits zonder boekingen | ± 940/maand (polling)                 | 0                                    |
| Uitlezen gegevens        | regex op de platte tekst van een mail | gestructureerde formuliervelden      |
| Codebotsing              | `md5(now)`, PUT overschrijft stil     | `uuid`, PUT weigert als code bestaat |

---

## Overzicht

```
1.  Webhooks     : Custom webhook          (Bureau X boekingen)
12. Router
    ├─ filter "Ping (bewaking)" (experience = ping)
    │   11. Webhooks : Webhook response   {"pong":true}
    └─ (alle andere)
        2.  Tools    : Set variables      filter "Geldige boeking"
        3.  HTTP     : POST inloggen als make@bureau-x.be → idToken
        4.  Router
            ├─ filter "Kamer 14"  (experience = kamer-14)
            │   5.  HTTP     : PUT sessie (if-match: null_etag)
            │   6.  Webhooks : Webhook response   {sessieCode, link}
            │   7.  Email    : mail naar speler 1 en 2
            └─ filter "D.U.A."    (experience = dua)
                8.  HTTP     : PUT sessie met aantalSpelers (if-match: null_etag)
                9.  Webhooks : Webhook response   {sessieCode, link}
                10. Email    : mail naar alle opgegeven spelers
```

Scheduling: **Immediately** (instant trigger). Een boeking kost ongeveer 6 credits,
een ping 2.

De volledige blueprint (zonder wachtwoord) staat in
[make-boekingen.blueprint.json](make-boekingen.blueprint.json).
`tests/make-contract.test.ts` controleert die tegen de site: veldnamen in de
formulieren, de vorm van het antwoord, de puzzels per experience en de ping.

---

## Wat de website stuurt

Het formulier op `/kamer-14/` en `/dua/` post naar de webhook-URL (staat in het
`action`-attribuut van `#boekForm`). Zie `koppelBoekformulier` in `js/landing.ts`.

- Type: `application/x-www-form-urlencoded`, zonder eigen headers. Zo is het een
  CORS "simple request" en is er geen preflight nodig.
- Velden:

| Veld                      | Voorbeeld             | Opmerking                                      |
| ------------------------- | --------------------- | ---------------------------------------------- |
| `experience`              | `kamer-14` of `dua`   | verborgen veld                                 |
| `naam`                    | `Jan Janssen`         | contactpersoon (niet gebruikt in de mail)      |
| `datum`                   | `2026-11-20`          | optioneel                                      |
| `datumTekst`              | `vrijdag 20 november` | door de browser opgemaakt, leeg als geen datum |
| `email_speler_1` t/m `_4` | `a@b.be`              | 3 en 4 enkel bij D.U.A., anders leeg           |
| `_gotcha`                 | (leeg)                | honeypot: ingevuld = spam                      |
| `aantal_spelers`          | `2`                   | enkel D.U.A., informatief (zie module 8)       |

De website rekent een boeking pas als gelukt als het antwoord JSON is met een
geldige `sessieCode` en een `link` die begint met
`https://bureau-x.be/experiences/`. Al het andere toont de foutmelding met
info@bureau-x.be.

---

## Module 2: Set variables (met filter "Geldige boeking")

Filter, twee OF-groepen:

- **Kamer 14**: `_gotcha` is leeg, `experience` = `kamer-14`, e-mail 1 en 2
  voldoen aan `^[^@\s]+@[^@\s]+\.[^@\s]+$`.
- **D.U.A.**: `_gotcha` is leeg, `experience` = `dua`, e-mail 1 en 2 geldig,
  e-mail 3 en 4 leeg of geldig.

Faalt het filter, dan stopt de run zonder sessie en zonder response. Make
antwoordt dan zelf met "Accepted", wat de website als fout behandelt.

Variabelen (levensduur: one cycle):

| Naam              | Waarde                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| `sessieCode`      | `{{upper(substring(replace(uuid; "-"; emptystring); 0; 8))}}` (8 hex-tekens)          |
| `ontvangersTekst` | `{{1.email_speler_1}},{{1.email_speler_2}},{{1.email_speler_3}},{{1.email_speler_4}}` |
| `datumTekst`      | `{{ifempty(1.datumTekst; "zodra jullie klaar zijn")}}`                                |

De code voldoet aan de validatie in `session.ts` en de database-rules
(`^[A-Z0-9-]{3,20}$`).

## Module 3: inloggen

`POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<VITE_FIREBASE_API_KEY>`
met body `{ "email": "make@bureau-x.be", "password": "<wachtwoord>", "returnSecureToken": true }`.
Het antwoord bevat `idToken` (een uur geldig). make@bureau-x.be staat in
`beheerders/<uid>`, dus enkel dit account mag sessies aanmaken.

> Het wachtwoord staat als platte tekst in deze module. Behandel een
> blueprint-export als gevoelig en wijzig het wachtwoord (in Firebase én hier) als
> het ergens publiek terechtkomt.

## Modules 5 en 8: sessie aanmaken

`PUT https://bureau-x-default-rtdb.europe-west1.firebasedatabase.app/sessions/{{2.sessieCode}}.json?auth={{3.data.idToken}}`

- Header `if-match: null_etag`: Firebase schrijft enkel als er op die plek nog
  niets staat. Bestaat de code al, dan antwoordt Firebase met 412 en stopt de run
  in plaats van een lopende sessie te overschrijven.
- Kamer 14:

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

- D.U.A.: zelfde vorm met `"ervaringsId": "dua"`, puzzels `p0` t/m `p5` en
  `"aantalSpelers": {{length(remove(split(2.ontvangersTekst; ","); emptystring))}}`.
  Het aantal spelers telt dus de ingevulde e-mailadressen, niet het verborgen veld.

## Modules 6 en 9: Webhook response

- Status 200
- Body: `{"sessieCode":"{{2.sessieCode}}","link":"https://bureau-x.be/experiences/<kamer-14|dua>/?sessie={{2.sessieCode}}"}`
- Headers: `Content-Type: application/json`, `Access-Control-Allow-Origin: *`

De response komt **vóór** de mail, zodat de speler niet op de SMTP-server wacht.

## Modules 7 en 10: mail

- Connectie: Others (SMTP), info@bureau-x.be (Combell)
- Kamer 14: onderwerp `Jouw spellink voor Kamer 14`, aan speler 1 en 2, link
  `https://bureau-x.be/experiences/kamer-14/?sessie={{2.sessieCode}}`.
- D.U.A.: onderwerp `Jouw opdracht van Bureau X: D.U.A.`, aan
  `{{remove(split(2.ontvangersTekst; ","); emptystring)}}`. De rolverdeling in de
  tekst komt uit één `switch()` op het aantal spelers (2, 3 of 4), in plaats van
  drie aparte routes zoals vroeger.

---

## Aandachtspunten

- **Gratis plan**: maximaal 2 actieve scenario's en 1000 credits per maand.
  Credits staan in Make onder Organization > Subscription.
- **Fouten en bewaking**: na 3 opeenvolgende fouten zet Make het scenario uit
  (`maxErrors`). De site weigert dan elke boeking netjes met de foutmelding. De
  workflow **"Boekingen bewaken"** (`.github/workflows/boeking-ping.yml`) stuurt
  elke ochtend `experience=ping` en faalt als er geen `{"pong":true}` terugkomt;
  GitHub mailt je dan. Zet het scenario in dat geval meteen terug aan.
- **Spam**: de webhook-URL is publiek. Het filter en de honeypot vangen simpele
  bots. Komt er toch spam, voeg dan Cloudflare Turnstile toe (gratis, zonder
  cookies) en controleer het token in een extra HTTP-module vóór module 2.
- **Opruimen**: Make ruimt sessies nooit op. Voltooide sessies gaan in de app op
  `actief: false`, en het host-paneel heeft een knop "Verlopen sessies sluiten".
- **App Check** staat uit (zie [beveiliging.md](beveiliging.md#7-app-check-optioneel-staat-uit)).
  Zou je enforcement ooit aanzetten, dan weigert Firebase de PUT-calls.

## Blueprint bewaren

Pas je het scenario aan in Make, exporteer het dan opnieuw: scenario openen,
**Edit**, onderaan **More**, **Export Blueprint**. Overschrijf
`docs/make-boekingen.blueprint.json` en vervang eerst het wachtwoord in module 3
door `<wachtwoord>` (de contracttest faalt anders). Draai daarna `pnpm test`.
