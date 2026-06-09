# Make.com booking-automatisering

Dit document beschrijft het Make.com-scenario dat boekingen omzet in een speelbare
sessie. Het scenario zelf leeft volledig binnen Make.com. Als Make wegvalt, je de
toegang verliest, of je het opnieuw moet opbouwen, is dit het referentiepunt.

> Scenario: **"Mail versturen met sessiecode"** (Make zone `eu1.make.com`)
> Ingevuld vanuit de blueprint-export. Connectie-credentials (Gmail-login,
> SMTP-login, Firebase auth-secret) staan hier bewust **niet** in.

---

## Overzicht

De modulevolgorde in het Make-canvas (van links naar rechts):

```
1.  Gmail        : Watch emails         (trigger: mail van noreply@formspree.io)
12. Tools        : Set variable         (sessiecode genereren)
2.  HTTP         : Make a request (PUT) (sessie aanmaken in Firebase REST API)
7.  Text parser  : Match pattern        (e-mail speler 1 uit de mailbody)
8.  Text parser  : Match pattern        (naam uit de mailbody)
9.  Text parser  : Match pattern        (datum uit de mailbody)
13. Text parser  : Match pattern        (e-mail speler 2 uit de mailbody)
10. Email        : Send an Email        (SMTP, beide spelers met de sessielink)
```

(De nummers zijn de interne module-ID's uit Make, niet de uitvoeringsvolgorde.
De uitvoering loopt links naar rechts zoals hierboven.)

De spelers krijgen een link met `?sessie=CODE`, zodat ze direct op het
rolkeuzescherm landen zonder handmatig een code in te tikken.

Scheduling staat op **elk uur** (ingesteld in de Make-UI, niet in de blueprint-flow).
Een bevestigingsmail komt dus binnen ~60 minuten na de boeking aan.

---

## Module 1: Gmail > Watch emails (trigger)

- Connectie: Gmail (`My Gmail connection`)
- Map: `INBOX`
- Filtertype: Simple filter
- Afzender (`from`): `noreply@formspree.io`
- Has the words (`includeWords`): `Kamer 14 Reservaties`
- Content format: Full content (levert o.a. `fullTextBody`, de platte-tekst body)
- Criteria: All messages
- Mark as read when fetched: ja
- Limit: 1 per run

Alle parsers verderop lezen uit `{{1.fullTextBody}}` (de platte-tekst body van deze
mail).

---

## Module 12: Tools > Set variable (sessiecode)

- Variabelenaam: `sessieCode`
- Levensduur: One cycle (`roundtrip`)
- Waarde:

```
{{upper(substring(md5(now); 1; 7))}}
```

Oftewel: MD5-hash van het huidige tijdstip, daarvan de eerste 7 tekens, in
hoofdletters. Resultaat is 7 hex-tekens uppercase (`[0-9A-F]`), bijvoorbeeld
`A3F9C20`.

Dit valt binnen wat de Firebase-rules eisen voor een sessiesleutel
(`^[A-Z0-9-]{3,20}$`), dus dat is consistent.

> Aandachtspunt: er is **geen botsingscontrole**. Twee boekingen in dezelfde
> seconde zouden dezelfde code krijgen. De kans is klein (7 hex-tekens is ongeveer
> 268 miljoen mogelijkheden, en het scenario draait per uur batchgewijs), maar het
> is niet uitgesloten. Bij meer volume: code uitbreiden of een bestaanscheck via
> Firebase toevoegen.

---

## Module 2: HTTP > Make a request (PUT, sessie aanmaken)

- Methode: `PUT`
- URL:

```
https://bureau-x-default-rtdb.europe-west1.firebasedatabase.app/sessions/{{12.sessieCode}}.json?auth=<firebase-auth-secret>
```

- Authenticatie: de auth gebeurt via de `?auth=`-querystring (Firebase database
  secret). De module zelf staat op "No authentication".
- Body content type: JSON, als raw JSON-string ingevoerd
- Stop on HTTP error: ja
- Body:

```json
{
  "aangemaakt": { ".sv": "timestamp" },
  "actief": true,
  "ervaringsId": "kamer-14",
  "puzzels": { "p1": false, "p2": false, "p3": false, "p4": false, "p5": false },
  "rapport": { "ingediend": false, "inhoud": {} },
  "timerGestart": null
}
```

Deze body is identiek aan wat `maakSessie()` in `shared/js/session.ts` schrijft en
voldoet aan de security rules (`firebase/database.rules.json`): de vereiste velden
`actief`, `aangemaakt`, `ervaringsId`, `puzzels`, `rapport` en `timerGestart` zijn
allemaal aanwezig. `timerGestart` blijft `null` en wordt later door `timer.ts`
gezet zodra de eerste speler laadt.

> Wijzigt het datamodel, dan moeten deze PUT-body, `maakSessie()` en de rules samen
> mee.
>
> Veiligheid: de `<firebase-auth-secret>` staat in de echte module in platte tekst
> in de URL. Behandel de blueprint-export als gevoelig en roteer de secret als die
> ergens publiek terecht is gekomen.

---

## Modules 7, 8, 9, 13: Text parser > Match pattern

Vier regex-parsers, elk op `{{1.fullTextBody}}`, niet-globaal (eerste match),
hoofdletter-ongevoelig. Elk geeft zijn match terug als `$1`.

| Module | Haalt eruit | Pattern |
|---|---|---|
| 7  | E-mail speler 1 | `([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})` |
| 8  | Naam            | `naam:[\r\n]+([^\r\n]+)` |
| 9  | Datum           | `datum:[\r\n]+([^\r\n]+)` |
| 13 | E-mail speler 2 | `email_speler_2:[\r\n]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})` |

Wat dit zegt over het Formspree-mailformaat: de body bevat labels op een eigen
regel met de waarde op de volgende regel, o.a. `naam:`, `datum:` en
`email_speler_2:`. Module 7 pakt simpelweg het **eerste e-mailadres** dat ergens in
de body voorkomt (= speler 1).

> Twee kanttekeningen:
> - Module 8 (naam) wordt wel geparset maar **niet gebruikt** in de mail (zie
>   module 10). Ofwel naam toevoegen aan de template, ofwel deze parser verwijderen.
> - Module 7 vertrouwt erop dat het eerste e-mailadres in de body dat van speler 1
>   is. Verandert Formspree de mail-layout, dan kan dat misgaan. Een expliciet label
>   (`email_speler_1:`) zou robuuster zijn, net als bij speler 2.

---

## Module 10: Email > Send an Email (SMTP)

- Connectie: SMTP (`info@bureau-x.be`, via Combell, `smtp-auth.mailprotect.be:587`)
- Aan (`to`):
  - `{{7.$1}}`: e-mail speler 1
  - `{{13.$1}}`: e-mail speler 2
- Onderwerp: `Jouw spellink voor Kamer 14`
- Content type: HTML
- Save message after sending: nee

In de HTML-template gebruikte variabelen:

- `{{9.$1}}`: de datum ("U bent verwacht op ...")
- `{{12.sessieCode}}`: de sessiecode (getoond als code en in de link)
- De knop/link: `https://bureau-x.be/experiences/kamer-14/?sessie={{12.sessieCode}}`

De volledige HTML-template staat in de mailmodule zelf. De link en de twee
variabelen hierboven zijn het enige dynamische deel.

---

## Aandachtspunten

- Het scenario draait op de Make **free plan** (polling per uur, geen webhooks).
- Sessies worden nooit automatisch opgeruimd door Make. Voltooide sessies worden
  in de app op `actief: false` gezet (`einde.ts` na rapport-indiening en
  `tijd-voorbij` bij tijdsoverschrijding), maar blijven in de database staan.
- Geen botsingsdetectie voor sessiecodes, zie module 12.
- Naam wordt geparset maar niet gebruikt; speler 1 wordt via een generiek
  e-mailpatroon herkend, zie modules 7 en 8.

---

## Bijlage: bewaar de blueprint

Make.com kan het scenario als blueprint (JSON) exporteren
(scenario openen, **Edit**, onderaan **More**, **Export Blueprint**). Bewaar die
export naast dit document, bijvoorbeeld als `docs/make-scenario.blueprint.json`,
zodat het scenario herbouwbaar is.

> Maskeer voor het committen de `?auth=`-secret in de HTTP-module en eventuele
> andere geheimen. De rest van de blueprint is veilig te bewaren.
