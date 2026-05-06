# Voice lines — Kamer 14

Plaats hier je .mp3-opnames per karakter. De speler-bestanden roepen `speelStem(karakter, fragment)` aan vanuit `audio.js`.

---

## Verwachte bestandsstructuur

```
game/audio/stemmen/
  an-vermeersch/
    notitie-1.mp3     → "Op vraag van Lena akkoord gegaan om leefgeld voortaan wekelijks zelf te bewaren. Bedrag: vijfendertig euro per week."
    notitie-2.mp3     → "Atelier vandaag. Lena werkte aan een tekening van een stadsplein. Ze zei: ik ben er ooit geweest."
    notitie-3.mp3     → "Lena vroeg of ze mij iets mocht vragen. Ze vroeg hoe je iemand kunt opzoeken van wie je het adres niet meer hebt."

  katrijn/
    logboek-1.mp3     → "Dinsdag 6 mei. Lena niet aan het ontbijt. Bed opgemaakt. Jas weg. Geen briefje. Gebeld naar OPZ om kwart over acht."
    logboek-2.mp3     → "Zondag 27 april. Lena vroeg aan tafel of Diest ver was. Ik zei: drie kwartier met de bus. Ze knikte en zei niets meer."
    logboek-3.mp3     → "Vrijdag 25 april. Lena's bijdrage voor de boodschappen niet gegeven deze week."

  lena/
    briefkaart.mp3    → "Lieve Katrijn en kinderen. Ik heb Marie gevonden. Ze woont boven een bloemenzaak. We hebben thee gedronken en ze huilde een beetje. Ik ook. Ik kom donderdag terug voor het ontbijt. Ik heb de sleutel bij mij. — Lena"
```

---

## Technische vereisten

- Formaat: **MP3** (of .ogg als fallback)
- Sample rate: 44.1 kHz, stereo of mono
- Volume: normaliseer op -3 dBFS
- Geen harde pauzes aan het begin of einde

---

## Waar worden ze aangeroepen?

| Fragment              | Aangeroepen in       | Trigger                          |
|-----------------------|----------------------|----------------------------------|
| an-vermeersch/notitie-1 | speler-a.js        | Tabblad "Dossiernotities" openen |
| an-vermeersch/notitie-2 | speler-a.js        | Tabblad "Atelier" openen         |
| an-vermeersch/notitie-3 | speler-a.js        | Tabblad "Atelier" openen (na #2) |
| katrijn/logboek-1     | speler-b.js          | Tabblad "Logboek" openen         |
| katrijn/logboek-2     | speler-b.js          | Tabblad "Logboek" openen (na #1) |
| lena/briefkaart       | einde.js             | Briefkaart omdraaien             |

---

*Zolang de .mp3-bestanden ontbreken, speelt de game gewoon door zonder geluid.*
