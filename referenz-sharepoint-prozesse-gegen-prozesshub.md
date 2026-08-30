# Alte PDF in der ProzessHub-Zielablage

Die Frage: In der SharePoint-Ablage, in die der ProzessHub-Flow seine
HTML-Seiten spiegelt, liegen noch ein paar alte Prozessbeschreibungen als PDF.
Gibt es die inzwischen in Confluence?

**Antwort: sechs von sieben ja, eine nein.**

## Die Ablage

Ziel des Flows `RWG ProzessHub nach SharePoint` (`Muss6GBGPuG9fjE2`):

```
sites/rwgrheinland.sharepoint.com,b9765620-0ca2-4e4c-9cdb-ff6befc8cb7b,bf523aab-454e-4dfa-b651-c44e32067ba7
   -> /drive/root:/{Bereichsordner}/{Gruppe}/{Datei}.html
```

Stand: **253 Eintraege, 87 Ordner, 166 Dateien** - davon **159 HTML** aus der
Spiegelung und **7 PDF** aus der Zeit davor.

## Die sieben PDF

| PDF | ProzessHub-Seite | Zeichen | Version |
|---|---|---|---|
| `/Human Resources (HR)/PB-HR-4-1_PreBoarding.pdf` | [HR-04-01 – Preboarding durchfuehren](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438698153) | 6 158 | 2 |
| `/Human Resources (HR)/PB-HR-4-2_OnBoarding.pdf` | [HR-04-02 – Onboarding-Plan umsetzen](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438468763) | 3 706 | 2 |
| `/Human Resources (HR)/PB-HR-12-1_Ausloesung des Austrittsprozesses.pdf` | [HR-12-01 – Austrittsprozess einleiten](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438632532) | 6 150 | 1 |
| `/IT-Management/PB_IT-1-1_Hardware-Ausgabe.pdf` | [IT-01-01 – Hardware ausgeben](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438960129) | 3 977 | 3 |
| `/IT-Management/PB_IT-1-2_Inventarisierung.pdf` | [IT-01-02 – Hardware inventarisieren](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438534392) | 4 925 | 3 |
| `/Warenwirtschaft (WaWi)/PB-WaWi-1-4_Artikelanfrage.pdf` | [WAWI-01-01 – Artikelanfrage bearbeiten](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/439189507) | 3 639 | 2 |
| `/App - RWG IT-Ticketmeldung.pdf` | **keine** | - | - |

Alle sechs Zielseiten tragen echten Inhalt zwischen 3 639 und 6 158 Zeichen und
wurden zwischen dem 15. und 18.08.2026 zuletzt geaendert.

**Vorsicht bei der Nummer.** `PB-WaWi-1-4_Artikelanfrage` heisst nach Nummer
WAWI-01-04, das waere "Artikelstammdaten aendern". Inhaltlich gehoert es zu
WAWI-01-01. Die alte Nummerierung deckt sich also **nicht** mit der neuen -
massgeblich ist der Titel, nicht die Nummer.

## Die eine ohne Entsprechung

`/App - RWG IT-Ticketmeldung.pdf` (02.08.2025, im Wurzelverzeichnis) beschreibt,
wie ein Anwender eine IT-Stoerung meldet. Der ProzessHub hat dazu nur
`IT-04-01 – IT-First-Level-Support leisten` - das ist dieselbe Sache aus Sicht
der IT, nicht aus Sicht des Anwenders. Ob das eine Luecke ist oder Absicht, ist
eine fachliche Frage.

## Was NICHT geprueft wurde

**Der Inhalt.** Die sieben PDF liegen in einer Bibliothek, die der RAG-Ingest
nicht erfasst - er deckt nur `Schulungen` ab. In der Wissensbasis sind sie
deshalb mit **null** Treffern vertreten. Verglichen wurden Titel und Nummer,
nicht der Text. Dass die ProzessHub-Seite denselben Sachverhalt vollstaendig
abdeckt, ist damit **nicht belegt** - nur, dass es sie zum selben Thema gibt.

Wer sicher gehen will, muss die sechs PDF gegen ihre Seiten lesen. Sieben
Dokumente sind dafuer eine ueberschaubare Menge.

## Nebenbefund: drei Ordner ausserhalb der Namenskonvention

Die Bereichsordner der obersten Ebene heissen `KUERZEL - Klartext`
(`HR - Human Resources`, `IT - Informationstechnologie`, `WAWI - Warenwirtschaft`).
Drei Ordner folgen dem nicht - und genau in ihnen liegen sechs der sieben PDF:

- `Human Resources (HR)` - 3 PDF
- `IT-Management` - 2 PDF
- `Warenwirtschaft (WaWi)` - 1 PDF

Der Flow bemerkt das selbst: Sein Code-Node `Seiten normalisieren` sammelt
solche Ordner in `ordner_ohne_kuerzel` und ueberspringt sie, weil ihre Seiten
keinen Zielpfad finden. Die drei sind also **Altordner neben den neuen**, keine
Zielordner. Fuer HR, IT und WaWi existieren die richtig benannten Ordner
daneben und sind gefuellt.

**Zu entscheiden:** Die drei Altordner samt PDF nach Pruefung entfernen - oder
die PDF in den jeweils richtigen Bereichsordner verschieben, falls sie als
Anlage erhalten bleiben sollen.
