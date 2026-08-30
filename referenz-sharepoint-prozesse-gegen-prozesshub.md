# SharePoint-Prozessdokumente gegen den ProzessHub

Die Ausgangsfrage: In SharePoint liegen Prozessdokumente, die aelter sind als der
Confluence-Bereich ProzessHub. Gibt es sie dort inzwischen auch?

**Die Altersvermutung stimmt.** Der ProzessHub traegt 248 Seiten, **alle seit dem
15.08.2026** angelegt. Die SharePoint-Dokumente stammen aus 2024 und 2025. Die
SharePoint-Ablage ist die Ausgangsbasis.

## Wie gemessen wurde

Ein Abgleich ueber Titel ist unmoeglich: Der ProzessHub folgt einem strengen
Schema (AGR-20-01, INV-05-02, RM-21-01), SharePoint hat sprechende Dateinamen.
Ein erster Versuch ueber die deutsche Volltextsuche mit ts_rank war unbrauchbar -
bei langen Anfragen saettigt die Bewertung, und "Bruch Schwund Buchung" landete
bei "Hardware ausgeben".

Belastbar ist der Vergleich ueber die **Vektoren der Wissensbasis**: Fuer jedes
SharePoint-Dokument wurde der erste Inhaltschunk gegen alle ProzessHub-Chunks
gestellt und der kleinste Kosinusabstand genommen.

**Was der Abstand aussagt und was nicht:** Er misst thematische Naehe, nicht
inhaltliche Deckung. Die ProzessHub-Seiten beschreiben Prozesse - Rollen,
Schritte, BPMN. Die SharePoint-Dokumente sind klickgenaue BC-Anleitungen mit
Bildschirmfotos. Ein kleiner Abstand heisst also "dasselbe Thema", nicht
"derselbe Inhalt". Die beiden Bestaende sind vermutlich eher **ergaenzend als
doppelt**.

## Geprueft: 25 von 34

| SharePoint-Dokument | naechste ProzessHub-Seite | Abstand |
|---|---|---|
| Prozessbeschreibungen benutzen | 00.04 - So liest du eine Prozessseite | 0,269 |
| Auftraege Lager | LOG-02-01 - Ware kommissionieren und bereitstellen | 0,303 |
| Einkaufsbestellungen Strecke | AGR-20-02 - Streckengeschaeft abwickeln | 0,309 |
| Energie Tankstelle | EN-20-02 - RWG-Tankkarte verwalten | 0,311 |
| Eigenverbrauch Standard | AGR-05-02 - Eigenverbrauch erfassen | 0,312 |
| Anfrage | WAWI-01-01 - Artikelanfrage bearbeiten | 0,319 |
| Einkaufsbestellungen Lager | RM-02-01 - Bestellung ausloesen | 0,320 |
| Wareneingangsvorschau | BS-02-02 - Wareneingang erfassen | 0,328 |
| Eigenverbrauch Erweitert | AGR-05-02 - Eigenverbrauch erfassen | 0,333 |
| Barverkauf inkl Kassenabschluss | RM-21-01 - Kassen-/Tagesabschluss durchfuehren | 0,334 |
| Angebote | BS-01-01 - Angebot erstellen | 0,335 |
| Tankstelle AHL AZE Erkelenz | EN-20-03 - Tankstellenumsaetze uebernehmen | 0,336 |
| POS Barverkauf inkl Kassenabschluss | RM-21-01 - Kassen-/Tagesabschluss durchfuehren | 0,355 |
| Wiegekarte | AGR-22-01 - Lohnwiegung durchfuehren | 0,355 |
| Kontrakt VK | AGR-20-03 - Bezugskontrakt abwickeln | 0,363 |
| Bestellung stapelbuchen | BS-02-01 - Bestellung ausloesen | 0,389 |
| Minusbestandsliste | AGR-05-03 - Bestand korrigieren | 0,394 |
| Sammelrechnung | WAWI-02-01 - Warenrechnung verarbeiten | 0,400 |

Diese achtzehn haben eine fachlich einleuchtende Entsprechung.

## Ohne erkennbares Gegenstueck

Sieben Dokumente finden nichts Passendes - der naechste Treffer ist beliebig:

| SharePoint-Dokument | naechster Treffer | Abstand | Bewertung |
|---|---|---|---|
| Bruch Schwund Buchung | FI-04-03 - Kundeninsolvenz bearbeiten | 0,391 | **Fehltreffer** trotz kleinem Abstand |
| Arbeitsstation wechseln | AS-01-03 - Arbeitsschutzstandards | 0,406 | kein Gegenstueck |
| Gebuchte Belege stornieren | LOG-01-04 - Liefernachweis archivieren | 0,410 | kein Gegenstueck |
| MDE BC Anbindung | RM-02-02 - Wareneingang erfassen | 0,452 | kein Gegenstueck |
| Sortieren Suchen und Filtern in BC | RWG ProzessHub | 0,452 | kein Gegenstueck |
| Etikettendruck | 00.06 - Templates und Standards | 0,468 | kein Gegenstueck |
| POS-Kurzwahlen Einrichtung | RM-22-01 - Warenplatzierung | 0,479 | kein Gegenstueck |
| Shortcuts RTC BC | 00.06 - Templates und Standards | 0,516 | kein Gegenstueck |

Das Muster ist erkennbar: Es fehlen die **Werkzeug- und Bedienthemen** -
Etikettendruck, Tastenkuerzel, MDE-Anbindung, Arbeitsstation, Sortieren und
Filtern in BC. Der ProzessHub beschreibt Geschaeftsprozesse, nicht die Bedienung
des Systems. **Bruch und Schwund** ist der einzige echte Prozess ohne
Entsprechung.

## Nicht geprueft: 9 von 34

Diese Dateien sind noch nicht in der Wissensbasis, ueber sie laesst sich nichts
sagen:

- /Agrar Prozesse/AHL-Tankstelle/Tankstelle AHL AZE Erkelenz.docx
- /Agrar Prozesse/EDI/Agrar EDI Bestellausgang Fehlerpruefung.docx
- /Bereichsuebergreifende Prozesse/A6-Etiketten drucken.pdf
- /Bereichsuebergreifende Prozesse/Aktuellen Auftrag kopieren.docx
- /Bereichsuebergreifende Prozesse/Bereichsuebergreifend Artikelbestand Uebersicht.docx
- /Bereichsuebergreifende Prozesse/Bereichsuebergreifend Minusbestandsliste Artikelbestandsuebersicht.docx
- /Bereichsuebergreifende Prozesse/Korrektur Eigenverbrauch.docx
- /Bereichsuebergreifende Prozesse/Lagerzuordnung Warenausgabeschein drucken Ein- Aus-schalten.docx
- /Bereichsuebergreifende Prozesse/d.3One_prozessdoku.docx (5 MB)

Sie kommen mit der Erstbefuellung, sobald das Mistral-Kontingent wieder laeuft.

## Was daraus folgt

**Nicht loeschen.** Auch bei den achtzehn mit Entsprechung ist nicht belegt, dass
der ProzessHub den Inhalt wirklich traegt - nur, dass er dasselbe Thema behandelt.
Die klickgenauen Anleitungen mit Bildschirmfotos sind in den Prozessseiten
vermutlich nicht enthalten.

**Zu klaeren waere fachlich:** Soll der ProzessHub die Bedienanleitungen
aufnehmen, oder bleiben sie bewusst in SharePoint und werden von dort verlinkt?
Davon haengt ab, ob die sieben ohne Gegenstueck eine Luecke sind oder Absicht.
