# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Umzug der RWG-Datenbank

**Abgeschlossen.** Das alte Projekt `zjabiweaihsezjjeycko` ist samt Zugang geloescht; die Gesundheitspruefung danach (Lauf 110871) trifft alle Erwartungswerte: 21 323 Chunks, 0 ohne Embedding, Bucket 7 384 Objekte, 0 Altverweise. Vorgehen und Abnahme stehen in [migration/README.md](migration/README.md).

Was daraus offen blieb:

- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geaendert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile - semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent, falls es sauber sein soll.


## Zuerst

**Stand zum Feierabend am 01.09.** Drei Vorhaben sind an diesem Tag live gegangen, alle drei belegt:

| Was | Stand |
|---|---|
| **SharePoint-Ingest neu geschnitten** | seit 18:25 live, beide Flows publiziert, Vorgänger abgeschaltet |
| **Mengenbremse `maxJeLauf` 3 → 15** | gemessen an Lauf `113044`, publiziert |
| **ProzessHub: Umbenennungen** | Ablageort wird vorn berechnet, Aufräumer gegen den Ist-Bestand, publiziert |

Nichts hängt in Arbeit. Was von allein weiterläuft: der neue SharePoint-Ingest stündlich und um 03:30,
ProzessHub-Spiegelung nachts um 02, Contract Loader stündlich mit leerem Eingang. Der Content Studio
läuft erst wieder am **Mi 02.09. um 08:00**; dort ist zu prüfen, ob ein Buffer-Entwurf entsteht und ob
die Bildstrecke trägt, die bisher ungeprüft ist.

**Morgen früh zuerst:** der Abgleich um 03:30. Er ist die erste volle Nacht der neuen Ingest-Kette
**und** die erste Nacht mit 15 statt 3 Einlesungen. Danach lohnt ein Blick auf den Mistral-Verbrauch,
bevor die 15 stehen bleiben.

**Die OCR ist wieder offen.** Belegt in Lauf `112948` vom 01.09., 17:05: `Bestätigung persönliche
Unterweisung Fahrer Pellets.pdf` (61 kB) lief in 7,5 Sekunden komplett durch — Upload, signierte URL,
OCR, Chunks, Embedding, 198 Wörter, 3 Chunks, keiner ohne Embedding. Kein `402`, kein `ECONNRESET`.
Der Lauf ging über die **neue** Verarbeitung; der alte Flow ist damit nicht gegengeprüft, nutzt aber
dasselbe Credential (`tv4AxZ1FALgZCIVK`).

**Die Rückstellung hat ihre erste Probe im Betrieb bestanden.** Der Nachtlauf `112030` um 03:30 lag
noch vor der Freischaltung. Er ist **grün** geblieben und hat drei Dateien zurückgestellt — in
`ingestion_errors` stehen sie um 03:30 mit `OCR-Strecke nicht verfuegbar: Payment required`. Vor dem
31.08. hätte derselbe Fall den ganzen Lauf gerissen.

### Der Neuschnitt ist live — eine Nacht beobachten

**Am 01.09. um 18:25 umgeschaltet.** Der Wechsel ist vollzogen:

| Flow | ID | Stand |
|---|---|---|
| `RAG - SharePoint Ingest OLD` | `BBhGCRsQ8pdNSxTi` | umbenannt, **deaktiviert** seit 17:19 |
| `RAG - SharePoint Ingest` (die Verarbeitung) | `coDhu7pIaI2bpmGZ` | publiziert und aktiv |
| `RAG - SharePoint Steuerung` | `PAqphQur0CTQRypM` | **publiziert und aktiv**, beide Trigger registriert |

Genau eine Steuerung ist aktiv — der Vorgänger bleibt aus. Beide tragen dieselben Cron-Zeiten und
denselben Delta-Anker; nie beide gleichzeitig. Der Rückweg bleibt billig: alten Flow aktivieren,
Steuerung abschalten. Beide schreiben in dieselben Tabellen, kein Datenumbau.

**Das stündliche Delta läuft belegt.** Zwei planmäßige Läufe nach dem Umschalten: `113028` um 19:00
in 1,6 Sekunden, `113035` um 20:00 in 1,0 Sekunden, beide grün. Ohne Änderungen in SharePoint ist der
Delta-Lauf nach einer Sekunde fertig — der erwartete Normalfall.

**Was noch aussteht:**

1. **Der Abgleich um 03:30.** Die erste vollständige Nacht der neuen Kette. Erwartet: Status
   `success`, **15** Einlesungen (`maxJeLauf`), `anker_geschrieben: true`, keine Rückstellung. Kommt
   eine Telegram-Meldung mit `[ZURUECKGESTELLT]`, ist die OCR wieder zu.
2. **Die Mengenbremse steht jetzt auf 15** statt 3 — gemessen und publiziert, Einzelheiten unten
   unter [Die Mengenbremse ist gemessen](#die-mengenbremse-ist-gemessen--3-ist-nicht-mehr-begründet).
   Der Abgleich um 03:30 ist damit zugleich die erste Probe des neuen Werts: Erwartet werden **15**
   Einlesungen statt drei.

**Belegt vor dem Umschalten:** Handstart `112961` um 17:19 über die volle Kette — drei Dokumente
eingelesen (`Handout Einführung in die Arbeitssicherheit.pdf` mit 5 Chunks, zweimal
`Checkliste neue Mitarbeiter _ Praktikanten.docx` mit je 3), keines ohne Embedding.

### Die Mengenbremse ist gemessen — 3 ist nicht mehr begründet

**Lauf `113044` am 01.09., 21:07.** Handstart im Entwurf mit `maxJeLauf: 10` und
`zustandSchreiben: false`; die publizierte Fassung blieb bei 3, der Delta-Anker unangetastet.

| | |
|---|---|
| 10 Dokumente gesamt | **69,4 s** |
| davon Bestandsabgleich über 1 651 Einträge | 12,4 s (fester Aufschlag je Lauf) |
| Summe der Teilläufe | 55,8 s |
| je Dokument | min 3,6 s · **Mittel 5,6 s** · max 9,2 s |

Alle zehn Teilläufe grün, alle zehn Dokumente mit Chunks in der Wissensbasis.

**Die alte Begründung ist entfallen.** Die 3 stammten aus der 300-Sekunden-Grenze des Task-Runners je
Code-Node — sie galt dem flowweiten Sammler im alten Ingest. Jede Datei läuft jetzt in einer eigenen
Ausführung mit eigenem Zeitbudget. Bindend ist nur noch der Ausführungs-Timeout der Steuerung von
**3 600 s**.

**Was die Messung nicht hergibt.** Die Stichprobe trug ausschließlich kleine Dokumente, 162 bis
1 107 Wörter. Der schwere Fall — Regaletiketten mit über 300 Chunks — war nicht dabei. Aus 5,6 s
Mittel darf man deshalb **nicht** auf 600 Dokumente je Nacht schließen; die Obergrenze bestimmt der
langsamste Fall, nicht der Durchschnitt.

**Gesetzt ist 15**, publiziert am 01.09. Nicht die technische Grenze — die läge höher —, sondern die
Kostenbremse: Sebastian hat auf 15 begrenzt, damit das Mistral-Kontingent nicht verbrennt. Aus rund
390 fehlenden Dateien werden damit etwa **26 Nächte** statt 130. Der Wert steht in `Startbereiche`
unter `vorgaben.maxJeLauf`, die Begründung als Kommentar daneben.

**Begrenzend ist damit das Kontingent, nicht die Technik.** Wer die Zahl später anfassen will, muss
zuerst den Mistral-Verbrauch je Nacht kennen, nicht die Laufzeit.

**Sauberer als jede Stückzahl wäre ein Zeitbudget**: die Schleife bricht ab, wenn der Lauf eine
gesetzte Dauer überschreitet. Das ist ein Umbau, kein Parameter — erst sinnvoll, wenn die Stückzahl
sich als untauglich erweist.

### Vier Regaletiketten einlesen, dann zwei Altzeilen löschen

Am 01.09. gemessen: In `sharepoint_documents` stehen **nur noch sechs** Zeilen ohne einen einzigen
Chunk, alle mit Power-Automate-Kennung, alle Regaletiketten-PDFs. Die sieben bildreichen
`Bereichsuebergreifend ….docx` sind geheilt.

| Altzeile ohne Chunks | Graph-Fassung | Was zu tun ist |
|---|---|---|
| `00_lev…`, `16_ber…` | vorhanden, 150 bzw. 163 Chunks | **löschbar**, die Bedingung ist erfüllt |
| `01_wip…`, `15_lin…`, `17_erk…`, `22_hei…` | fehlt | erst über Graph einlesen, dann löschen |

Der Abgleich heilt sie nicht: Er ordnet über die Graph-`doc_id` zu, findet keine Entsprechung und legt
die Datei **daneben** als neue Zeile an, statt die alte zu ersetzen.

### OCR schonen — drei Hebel liegen noch

Aus dem Konzept [konzept-ocr-schonen.md](konzept-ocr-schonen.md):

- **Hebel 1, der OCR-Zwischenspeicher.** Der größte Hebel: Bei vier von sechs Rebuild-Gründen ist die Datei unverändert, und trotzdem läuft die komplette OCR erneut. **Braucht eine Freigabe für eine neue Supabase-Tabelle** und sorgfältige Behandlung des Bucket-Aufräumens.
- **Hebel 3, der native Textpfad** für die gemessenen 21 % bildloser Dokumente. Vor dem Bau zu messen, wie viele der fehlenden PDF eine Textebene tragen — die Gegenprobe braucht ein OCR-Ergebnis zum Vergleich. Seit dem 01.09. steht dem nichts mehr im Weg.
- **Hebel 4, ein Seitendeckel** für Dokumente wie die Regaletiketten. Fachliche Entscheidung, keine technische.


### Beitragsprüfung im Content Studio — Absatzregel gefixt, Retry offen
Die Prüfung ist einmal gelaufen und hat den Lauf abgebrochen: **111258 am 31.08., 08:00, kein Buffer-Entwurf.** Harter Befund im Code-Node `Lesbarkeit pruefen`: „Antwortblock zu kurz (21 Woerter, mindestens 30)". Der vorgelagerte `Redaktions-Check` war grün.

**Die Schwelle war unter dem damaligen COPY-Prompt nicht erreichbar.** Der System-Prompt von `COPY (Text)` forderte „Absaetze aus 1-2 Saetzen, Leerzeile dazwischen", ohne Ausnahme für den ersten Absatz. `Lesbarkeit pruefen` splittet am Doppel-Umbruch, meint also dieselbe Texteinheit, und verlangt dort 30 bis 80 Wörter. Bei gemessener Satzlänge 13,2 Wörter ergeben zwei Sätze rund 26 Wörter — die Obergrenze der Prompt-Regel lag unter der Untergrenze des Gates. Das Modell hat nicht versagt, es hat die falsche Anweisung befolgt.

**Der Prompt ist korrigiert und publiziert** (31.08., Version `211428cf`). Die Regel „Absaetze aus 1-2 Saetzen" gilt jetzt ausdrücklich erst ab dem zweiten Absatz; der erste trägt die Kernaussage in 3 bis 4 Sätzen mit 30 bis 80 Wörtern. Der Selbsttest am Prompt-Ende fragt die Wortzahl zusätzlich ab. Das Gate blieb unverändert. Rechnerisch landen 3–4 Sätze × 13,2 Wörter bei 40–53 Wörtern, mittig im Band, und die 700–1300 Zeichen bleiben eingehalten.

**Belegt in Lauf 111879** (Testlauf mit Pin-Daten auf allen Datenbank- und Netzzugriffen, Modelle liefen echt, Eingabe war derselbe Use-Case wie in 111258): `qa_antwortblock_woerter` **44** statt 21, Satzlänge 14,8, drei Absätze. Der Befund „Antwortblock zu kurz" ist weg. Nebenbefund: `CREATIVE (Bildidee)` und `Bild generieren` haben nicht ausgeführt — die Sperre sitzt belegt vor der Bilderzeugung.

Der Lauf fiel dabei noch an einer zweiten Stelle durch — die ist inzwischen ebenfalls behoben, siehe den nächsten Abschnitt.

### Fremdprodukt-Prüfung meldet, statt zu blockieren
Der `Redaktions-Check` zerlegt `uc_technology` in Tokens und sucht jedes davon im Beitragstext. Alles, was nicht in einer STOP-Liste generischer Wörter steht, galt als Fremdprodukt und brach den Lauf ab.

**Das trägt nicht.** Bei `uc_1786422016792_0` steht in `technology` „KI-gestützte Bildverarbeitung und maschinelles Lernen." — **kein einziger Produktname**, nur Allerweltsbegriffe. Zwei Testläufe haben das der Reihe nach vorgeführt: `111879` scheiterte an `KI-gestützte`, nach dem Entfernen des Bindestrichs aus dem Trennmuster scheiterte `111892` an `Bildverarbeitung`. Eine Liste generischer Wörter kann nie vollständig sein.

**Der Befund meldet jetzt, er blockiert nicht mehr** — `soft` statt `issues`, umbenannt in „Begriff aus dem Technologiefeld im Text". Echte Marken hält weiterhin die Blocklist-Prüfung im selben Node hart auf (`Gesperrte Marke im Text`, gespeist aus `competitor`/`consulting`/`vendor_sales`). Der Bindestrich bleibt aus dem Trennmuster heraus, damit der Befund wenigstens an sinnvollen Tokens ansetzt.

**Belegt in Lauf 111893:** `qa_passed: true`, `Freigabe erteilt` leitet auf Ausgang 0, `CREATIVE (Bildidee)` läuft, die `content_packages`-Zeile steht auf `ready_for_review`. Der Lauf endete rot an `Zuschnitt 1:1` — Artefakt der Pin-Daten, das gepinnte `Bild generieren` liefert keine Bilddatei. **Die Bildstrecke selbst ist damit weiter ungeprüft**, alles davor ist belegt.

Publiziert als `eba7a53a`. Nebenwirkung des Weges über die MCP-Schnittstelle: die 28 Unicode-Escapes im Quelltext des Nodes stehen jetzt als echte Umlaute — in JavaScript gleichbedeutend, auf Zeichensalat gegengeprüft.

**Nachgerechnet auf die vier Vorläufe** hätte die Regel ausnahmslos gegriffen: 100455 → 25 Wörter, 106294 → 19, 108062 → 27, 111258 → 21. Null von vier.

`Lesbarkeit pruefen` und das IF `Freigabe erteilt` wurden zwischen dem 27. und 29.08. eingebaut — in den älteren Läufen fehlen beide in `runData`. 111258 ist der erste Produktivlauf durch das Gate.

**Das Gate selbst bleibt richtig.** Vorher wurde `qa_passed` nirgends ausgewertet: 100455 und 108062 trugen den harten Befund „Fremdprodukt im Text genannt" und haben trotzdem einen Buffer-Entwurf erzeugt. Falsch ist nur die Kalibrierung.

**`uc_1786422016792_0` ist weiter offen.** `use_case abschliessen` hängt nur am Erfolgspfad, der Use-Case wurde also nicht abgeschlossen und kein `content_package` geschrieben. Er wird am Mittwoch erneut gezogen — jetzt allerdings gegen den korrigierten Prompt. Zu beachten: Die Zeile trägt die Säule `fertigung` bei Zielgruppe „Ingenieurbueros", der Widerspruch aus dem Abschnitt [Use Cases](#use-cases-bestand-bereinigt-handwerk-bleibt-die-luecke) steckt also weiter darin.

**Abzuarbeiten, ohne Termin:**

1. **Retry als Netz.** Der Prompt allein macht die Wortzahl nicht deterministisch. False-Route einmal zurück auf `COPY (Text)` mit den Befunden im Prompt, Zähler hart auf einen Versuch, erst beim zweiten Fehlschlag an Telegram. **Fallstrick:** `COPY parsen` verwirft die Analysefelder (`kernaussage`, `gewaehlte_perspektive`, `kapa_bruecke`, `takeaway`). Ein naiver Rücksprung generiert mit leerem Analyseblock und wäre schlechter als der erste Versuch — der Retry-Node muss sie aus `$('Analyse parsen').first().json` zurückholen.
2. **Zahlen-Check im `Redaktions-Check` erweitern.** Er prüft rein numerisch gegen `belegte_zahlen`. In 111258 stand „erhebliche Kosteneinsparungen" bei leerem Beleg-Feld — eine ausgeschriebene Mengenangabe, die der Prompt ausdrücklich verbietet, und im Effekt dasselbe Reputationsrisiko wie eine erfundene Zahl. Wortliste erheblich/deutlich/massiv/drastisch/signifikant/spürbar, aktiv nur bei leerem `belegte_zahlen`.

Nach jeder Änderung publizieren, exportieren, Läufe ins `tests/laufprotokoll.csv`.


### Contract Loader zu Ende belegen - die Dateien muessen erst zurueck in den Eingang
**Der Umbau steht als unveroeffentlichter Entwurf** in `661BDwEditNicEc0`, 30 Nodes statt 36; aktiv ist weiter die alte Fassung. Aufbau und Entscheidungen: [flows/rwg-contract-loader/README.md](flows/rwg-contract-loader/README.md).

Belegt im Gesamtlauf 110831: SharePoint-Abruf, Download, SHA-256, Zeile anlegen, Mistral-Upload, signierte URL, OCR und das Sichern des OCR-Textes. Beide Dokumente vollstaendig gelesen - 46 Seiten mit 20630 Woertern und 1 Seite mit 190 Woertern. **Gescheitert ist allein die Extraktion**, damals am aufgebrauchten Mistral-Kontingent. Das ist seit dem 01.09. keine Huerde mehr.

**Nur liegen die beiden Dokumente nicht mehr im Eingang.** In `vertraege` stehen sie auf `status = 'fehler'` mit `versuche = 3` - der Zaehler war voll, die Dateien sind nach `/IMPORTER/CONTRACT/FEHLER` gewandert. Der Eingang ist seither leer, jeder stuendliche Lauf ist nach einer halben Sekunde fertig (zuletzt `113012`).

**Zum Abarbeiten:** die beiden Dateien aus `FEHLER` zurueck in `/IMPORTER/CONTRACT` legen und `versuche` zuruecksetzen, sonst wandern sie sofort wieder hinaus. `ocr_text` steht in beiden Zeilen schon - die Erkennung laeuft nicht erneut, es kostet also keine OCR. Dann Lauf anstossen, die Extraktion pruefen, publizieren. Erst nach dem Publizieren geht der Export ins Git.

**Zur Mechanik**, nachtraeglich eingebaut (Lauf 110838): Steht `ocr_text` schon, wird die OCR uebersprungen - ohne das lief ein liegengebliebenes Dokument stuendlich erneut durch die Erkennung und wurde jedes Mal neu bezahlt. Der Zaehler `versuche` schiebt die Datei nach drei Fehlversuchen nach `/IMPORTER/CONTRACT/FEHLER`, den der Flow selbst anlegt. In der Excel stehen `status` und `versuche` vorn, Fertiges zuoberst.

Noch unbelegt sind vier Nodes, die nur hinter der Extraktion liegen: `Ergebnis auswerten`, `Vertragsdaten schreiben`, `Nach DONE verschieben`, `Ablage vermerken`. Die Umwandlungen in `Ergebnis auswerten` sind einzeln gegen Testwerte geprueft, die Spaltenliste des grossen `UPDATE` gegen `information_schema` und `jsonb_to_record`. Ein Lauf ersetzt das nicht.

### Altbestand in DONE nachziehen
Elf Dokumente liegen in `/IMPORTER/CONTRACT/DONE` und stehen nicht in `vertraege`. Ein Einmallauf ueber den Ordner holt das nach; der Hash-Schutz macht ihn gefahrlos wiederholbar. Bewusst zurueckgestellt, bis der Eingang belegt ist.

Offen bleibt daneben, ob der Bestand der alten Data Table `CEz5GXpTS7yHhjqS` (`RWG Vertraege`) uebernommen wird.


## ProzessHub nach SharePoint

**Der Flow ist aktiv.** Publiziert am 31.08., Nachttrigger 02 Uhr scharf. Anlegen, Aktualisieren und Entfernen sind an vier Läufen belegt (111432, 111433, 111440, 111456), die Titelspalte in SharePoint zeigt die Umlaute wieder richtig. Aufbau und Belege in [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

**Umbenennungen sind erledigt.** Der Flow rechnet den Ablageort seit dem 01.09. in `Zielpfade bestimmen` am Anfang aus, `Abgleich` vergleicht ihn mit, und ein Aufräumer hält den Ist-Bestand in SharePoint gegen die Soll-Liste. Belegt an den Läufen `113059`, `113060` und `113061` mit einer Wegwerfseite. Aufbau und Sicherungen: [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

Was daraus offen blieb:

- **Die Wegwerfseite `470188033` steht noch in Confluence**, Titel `ZZ Testseite Umbenennung – bitte loeschen`. Sie wird nicht mehr gespiegelt, muss aber von Hand gelöscht werden — ein Löschwerkzeug für Confluence-Seiten gibt es über MCP nicht.
- **Leere Ordner bleiben stehen.** Der Aufräumer entfernt nur Dateien. Nach einer Gruppen-Umbenennung bleibt der alte, dann leere Ordner sichtbar zurück.
- **`sicherName()` steht jetzt zweimal im Flow** — in `Zielpfade bestimmen` und in `Dokument bauen`. Beide müssen zeichengleich bleiben, sonst räumt der Aufräumer weg, was derselbe Lauf geschrieben hat. Sie zusammenzuführen hieße, den 280-Zeilen-Knoten `Dokument bauen` anzufassen; das war es heute nicht wert.

Was daneben offen bleibt:

### Titelspalte gegenprüfen
Sebastian hat die Bibliotheksansicht nach dem Neuaufbau als „besser" beschrieben. Ob sie damit **richtig** ist, ist nicht beantwortet. Zeigt noch ein Titel zerlegte Umlaute, reicht der BOM nicht, und es braucht zusätzlich ein `PATCH {site}/drive/items/{item-id}/listItem/fields` mit ausdrücklich gesetztem `Title`. Die `sp_item_id` je Seite steht seit dem 31.08. in der Data Table — der Nachtrag wäre billig.

### Null-Zeilen in der Data Table aufräumen
Rund 370 Zeilen ohne `page_id` stehen in `prozesshub_spiegel` — Rückstand aus der Zeit, als `Bestand fortschreiben` in jede Spalte `null` schrieb. Wirkungslos, weil `Bestand laden` auf `space_key = ProzessHub` filtert und sie nicht findet. Aufzuräumen nur über die n8n-Oberfläche und **nicht** pauschal über alle Zeilen: die 175 echten stehen daneben.

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

## SharePoint Schulungen

### Der Ingest ist in zwei Flows geschnitten - am 01.09. umgeschaltet

**Am 01.09. entschieden, gebaut und belegt.** Der Vorgaenger trug Scanner und Verarbeitung in
einem Canvas: 109 Nodes, 46 Code-Nodes mit 2 475 Zeilen, `Config` von drei Stellen angesprungen,
vier Rueckkanten in die Aufgabenschleife. Bauplan und Etappenstand:
[konzept-sharepoint-neubau.md](konzept-sharepoint-neubau.md).

| Flow in n8n | Ordner | ID | Nodes | Stand |
|---|---|---|---|---|
| RAG - SharePoint Steuerung | [rag-sharepoint-steuerung](flows/rag-sharepoint-steuerung/README.md) | `PAqphQur0CTQRypM` | 23 | publiziert, aktiv |
| RAG - SharePoint Ingest | [rag-sharepoint-verarbeitung](flows/rag-sharepoint-verarbeitung/README.md) | `coDhu7pIaI2bpmGZ` | 82 | publiziert, aktiv |
| RAG - SharePoint Ingest OLD | [rag-sharepoint-ingest](flows/rag-sharepoint-ingest/README.md) | `BBhGCRsQ8pdNSxTi` | 109 | deaktiviert |

**Achtung bei den Namen:** Die Verarbeitung traegt in n8n den Namen des Vorgaengers
(`RAG - SharePoint Ingest`), der Vorgaenger heisst jetzt `… OLD`. Massgeblich ist die ID, nicht der
Name. Die Ordner im Repo behalten ihren Schnitt: `rag-sharepoint-verarbeitung` ist die Verarbeitung.

**Belegt** (Laeufe im Protokoll): Trockenlauf-Gegenprobe gegen den alten Flow trifft alle Zahlen
(1 411 Dateien, 922 falscher Typ, 39 Sperrdateien, 402 fehlend, 0 verwaist). PDF, Arbeitsmappe und
Word ueber die PDF-Wandlung laufen durch und schreiben dieselben Ergebnisse wie der alte Flow.
Der Loeschzweig ist mit Pin-Daten geprueft. **Der Inhaltshash ist zeichengleich geblieben** - belegt
ueber zwei inhaltsgleiche Kopien mit identischem `content_hash`, die eine vom alten Flow, die andere
von der neuen Kette. Damit gilt beim Umschalten kein Bestandsdokument faelschlich als geaendert.
Dazu der erste echte Kettenlauf `112961` mit drei eingelesenen Dokumenten.

**Was nach dem Umschalten bleibt:**

1. **Eine Nacht beobachten** - siehe [Der Neuschnitt ist live](#der-neuschnitt-ist-live--eine-nacht-beobachten).
   Rueckweg ist billig: alten Flow aktivieren, neuen abschalten - beide schreiben in dieselben
   Tabellen, kein Datenumbau. **Nie beide Steuerungen gleichzeitig aktiv**: gleiche Cron-Zeiten,
   gleicher Delta-Anker in `sharepoint_delta`.
2. **`maxJeLauf` neu ausloten.** Steht auf 3, begruendet mit der 300-Sekunden-Grenze des
   Task-Runners je Code-Node. Bei rund 400 fehlenden Dateien sind das rechnerisch ueber 130 Naechte.
   Jetzt laeuft jede Datei in einer eigenen Ausfuehrung - wie weit die Grenze steigen kann, ist zu
   **messen**, nicht zu schaetzen.
3. **Danach aufraeumen:** Power-Automate-Flow in SharePoint entfernen (Ziel
   `.../webhook/8e16e07b-d272-4147-a2a2-80694afd9007`), alten Flow archivieren, nach einer Woche
   loeschen, `flows/rag-sharepoint-ingest/` aufloesen.

**Offen geblieben ist der Mehrbereichs-Fall.** Die Bereichsliste steht in `Startbereiche`, aber der
`@odata.deltaLink` einer Antwortseite traegt selbst keine Laufwerkskennung - er wird dem Bereich
zugeordnet, dessen Eintraege auf derselben Seite lagen. Bei einem Bereich exakt, beim zweiten zu
pruefen.

### Dokumenteintrag vor den Chunks - Reihenfolge im Ingest
Der Ingest legt den Dokumenteintrag an, **bevor** er die Chunks schreibt. Bricht ein Lauf dazwischen ab, bleibt ein Eintrag ohne Chunks stehen - in der Wissenssuche unsichtbar. Stand 30.08.: neun solcher Eintraege (Lauf 110771), acht davon bildreiche Regaletiketten-PDFs.

**Abgefangen ist es**: Der Abgleich erkennt sie ueber den fehlenden Kopfsatz (`chunk_index = 0`) und liest sie neu ein - mit Vorrang, weil sie sonst dauerhaft einen Platz blockieren.

Sauberer waere, den Eintrag erst nach den Chunks zu schreiben. Das ist ein Umbau an der Verarbeitung und bleibt offen. Die Nachpruefung im Abgleich faengt den Fall zuverlaessig ab, also nicht dringend.


### Erstbefuellung - erst aufraeumen, dann lesen
Zwei Leseflows werten die Bibliothek `Schulungen` aus: `RWG Wartung - SharePoint Bestand analysieren` (`OQh5K8D1UrQK9fPQ`) fuer Doubletten und Formate, `RWG Wartung - SharePoint Struktur` (`Izrp4qA84wuAGN8O`) fuer die Ordnerstruktur.

**Achtung bei den Zahlen des ersten Flows:** Er entdoppelt nicht. Der Graph-Delta-Abruf liefert einen Eintrag mehrfach, wenn er sich mehrmals geaendert hat - 1 876 gelieferte Zeilen gegen 1 650 verschiedene Item-IDs, 226 Mehrfachlieferungen. Bei den Ordnern verdoppelt das die Zahl fast. Massgeblich sind die entdoppelten Werte aus Lauf 110913:

| | ungefiltert | **entdoppelt** |
|---|---|---|
| Eintraege gesamt | 1 876 | **1 650** |
| Ordner | 475 | **239** |
| Dateien | 1 421 | **1 411** |
| davon verwertbar | 499 | **489** |
| Office-Sperrdateien | hoechstens 42 | **39** |

Die vollstaendige Struktur Ebene fuer Ebene steht in `sharepoint-struktur-schulungen.xlsx`.

**Zwei Drittel der Bibliothek tragen keinen durchsuchbaren Text.** 402 Windows-Verknuepfungen (`.lnk`) und 89 Weblinks (`.url`) - zusammen 35 Prozent aller Dateien. Dazu 263 Bilder (3,6 GB), 101 Videos (5,7 GB), 8 DVD-Spuren (3,2 GB), 26 `.db` und 10 `.tmp`. Von den 12,9 GB sind 12,4 GB Medien.

**Vor dem Einlesen zu bereinigen:**

| Befund | Anzahl | Was dahintersteckt |
|---|---|---|
| Office-Sperrdateien `~$…` | 39 | 162 Byte je Stueck, tragen die Endung des Dokuments. **Behoben** - der Ingest filtert sie jetzt. Sie zaehlen aber in den 489 verwertbaren mit. |
| inhaltsgleiche Kopien | 17 ueberzaehlige in 15 Gruppen | dieselbe Datei in mehreren Ordnern, meist `Lagerplaene 2023` gegen `2024`. Zusammen 10 MB. Liste unten. |
| davon Sperrdatei-Doubletten | 10 ueberzaehlige in 6 Gruppen | nicht zu bereinigen - der Filter faengt sie ohnehin ab |
| namensgleich, Inhalt verschieden | 63 | `Debitorencockpit.pdf` liegt viermal mit unterschiedlichem Inhalt |
| ueber 40 MB | 1 | `Praesentation Mitarbeiterversammlung 05.02.2024.pptx`, 45 MB - faellt aus dem Ingest |

**Kein Altbestand.** Keine einzige verwertbare Datei ist aelter als drei Jahre; die aeltesten stammen von Mai 2024. Die Frage nach veralteten Dokumenten beantwortet sich damit von selbst - ueber das Aenderungsdatum ist nichts auszusortieren.

**Was das fuer die OCR bedeutet:**

| | |
|---|---|
| verwertbare Dateien | 489 |
| abzueglich Sperrdateien | -39 |
| abzueglich ueber 40 MB | -1 |
| abzueglich echter Doubletten | -17 |
| **tatsaechlich einzulesen** | **432** |

Der Trockenlauf `112947` zaehlte davon **402** noch fehlende Dateien; am 01.09. sind sechs dazugekommen. Bei `maxJeLauf` auf 3 waeren das rechnerisch ueber 130 Naechte - deshalb steht das Neuausloten der Mengenbremse oben in der Umschaltliste.

Zwei Korrekturen stecken darin. Erstens tragen die Sperrdateien die Endung des Dokuments und stecken deshalb sehr wohl in den verwertbaren - sie wurden zuvor faelschlich als bereits abgezogen behandelt, und von den 27 inhaltsgleichen Kopien waren 10 selbst Sperrdateien. Zweitens waren alle Ausgangszahlen durch die Mehrfachlieferung des Delta-Abrufs zu hoch.

**Der Sperrdatei-Filter** steht im Code-Node `Aufgaben bestimmen` und ist mit dem Neuschnitt in die `RAG - SharePoint Steuerung` gewandert.

**Offen zu entscheiden:** ob die 17 ueberzaehligen Kopien in SharePoint bereinigt werden oder ob der Ingest sie ueber den Inhaltshash von sich aus ueberspringt. Letzteres waere weniger Eingriff, laesst die Doubletten aber in SharePoint stehen. Es geht um 17 Dateien und 10 MB - der Gewinn liegt nicht im Platz, sondern in siebzehn gesparten OCR-Durchlaeufen und einer Wissensbasis ohne Mehrfachtreffer.

Die 15 Gruppen im Einzelnen, jeweils Dateiname und die Ordner, in denen sie liegt:

- **2023 DOKU_Lageplan Lg 20 draussen 4xxx.pdf** — 2 Fassungen, je 2.7 MB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/20-Willich/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/20-Willich/`
- **RTC Prozessbeschreibung lose Schüttgüter Artikelbestand übersicht.pdf** — 2 Fassungen, je 1.7 MB
  - `/Allgemeine Informationen/Prozessbeschreibungen/Inventur MDE RTC/`
  - `/Allgemeine Informationen/Prozessbeschreibungen/Inventur MDE RTC/alt/`
- **RTC Übergabe der Manuellen-Inventurlisten.pdf** — 2 Fassungen, je 1.6 MB
  - `/Allgemeine Informationen/Prozessbeschreibungen/Inventur MDE RTC/`
  - `/Allgemeine Informationen/Prozessbeschreibungen/Inventur MDE RTC/alt/`
- **2023 DOKU_Lageplan Lg 20 innen Hallen 5xxx RM 3xxx.pdf** — 2 Fassungen, je 1.3 MB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/20-Willich/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/20-Willich/`
- **Tastenkombinationen RTC.pdf** — 3 Fassungen, je 251 kB
  - `/Allgemeine Informationen/Prozessbeschreibungen/`
  - `/Allgemeine Informationen/Prozessbeschreibungen/Prozessbeschreibung Landwirtschaft/Zusatzinfos/`
  - `/Allgemeine Informationen/Prozessbeschreibungen/Prozessbeschreibungen Bestellung etc/Tastenkomb., Einstieg Dok., Deb.-cockpit/`
- **Kompetenzregeln_Kreditlimit_Stand 03.07.2023.pdf** — 2 Fassungen, je 494 kB
  - `/Allgemeine Informationen/Formulare Kundenneuanlage 2022/`
  - `/Allgemeine Informationen/Kreditlimit/`
- **Debitorencockpit.pdf** — 2 Fassungen, je 452 kB
  - `/Allgemeine Informationen/Prozessbeschreibungen/`
  - `/Allgemeine Informationen/Prozessbeschreibungen/Prozessbeschreibung Landwirtschaft/Einstieg/`
- **12_ove_regaletiketten_online_individuell_1_bis_214.pdf** — 2 Fassungen, je 394 kB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2022/12-Overath/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/12-Overath/`
- **Regalplan Wuppertal 2022.pdf** — 2 Fassungen, je 381 kB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/24-Wuppertal/old/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/24-Wuppertal/old/`
- **Lagerplan Burscheid 2022.pdf** — 3 Fassungen, je 152 kB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2022/05-Burscheid/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/05-Burscheid/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/05-Burscheid/`
- **35-2019-Nitroverduennungen.pdf** — 2 Fassungen, je 126 kB
  - `/Allgemeine Informationen/Alles für Vorgesetzte/Onboarding/Sicherheitsunterweisung bei neuen Mitarbeitern/NEUE MitArbeiter BAUSTOFFE/Betriebsanweisung MA Baustoffe/`
  - `/Allgemeine Informationen/Alles für Vorgesetzte/Onboarding/Sicherheitsunterweisung bei neuen Mitarbeitern/NEUE MitArbeiter FAHRER BAUSTOFFE  AGRAR/BETRIEBSANWEISUNGEN FAHRER BAU/`
- **Bestätigung persönliche Unterweisung Fahrer Pellets.pdf** — 2 Fassungen, je 60 kB
  - `/Allgemeine Informationen/Alles für Vorgesetzte/Onboarding/Sicherheitsunterweisung bei neuen Mitarbeitern/NEUE MitArbeiter FAHRER BAUSTOFFE  AGRAR/`
  - `/Allgemeine Informationen/Alles für Vorgesetzte/Onboarding/Sicherheitsunterweisung bei neuen Mitarbeitern/NEUE MitArbeiter FAHRER ENERGIE/`
- **Anlage 1 zum Arbeitsvertrag Gratifikation RWG 2024_ 20.12.2023.pdf** — 2 Fassungen, je 49 kB
  - `/Allgemeine Informationen/Richtlinien, DSGVO und Anlage 1/`
  - `/Allgemeine Informationen/Zum Arbeitsvertrag - Jahressonderzahlung, Richtlinien, DSGVO/`
- **Anleitung und Skripte.txt** — 2 Fassungen, je 3 kB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/Makros um Text oder Tabelleninhalte zu löschen/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/Makros um Text oder Tabelleninhalte zu löschen/`
- **Regalplan Wuppertal 2022 [Automatisch gespeichert].pptx** — 2 Fassungen, je 0 kB
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2023/24-Wuppertal/old/`
  - `/Allgemeine Informationen/Lagerpläne/Lagerpläne 2024/24-Wuppertal/old/`


### Tabellendaten abfragbar machen - Plan
**Das Problem.** Vektorsuche findet aehnliche Texte, sie rechnet nicht. Punktabfragen gehen heute schon: Der Ingest macht jede Tabellenzeile selbsttragend (`### Zeile 47 / - Blatt: Januar / - Standort: … / - Betrag: …`), eine Frage nach einem benannten Standort findet ihre Zeile. Aggregationen gehen nicht - `Wie hoch war der Gesamtumsatz` verlangt, alle Zeilen zu sehen und zu rechnen, und die Suche liefert nur die aehnlichsten zwanzig.

**Der Weg: ein zweiter, rechnender Pfad neben der Vektorsuche.** Nicht statt ihr - Punktabfragen bleiben dort besser aufgehoben.

**1. Ablage.** Eine generische Tabelle statt je Mappe eine eigene:

```
tabellen_zeilen (id, quelle_id, mappe, blatt, zeile_nr, daten jsonb, angelegt_am)
```

Mit GIN-Index auf `daten`. Der Grund fuer generisch: Die Sichtung vom 30.08. zeigt, dass viele Excel-Blaetter gar keine Tabellen sind, sondern Formulare und Notizen. Ein festes Schema je Mappe waere Pflegeaufwand ohne Nutzen.

**2. Katalog.** `tabellen_katalog` haelt fest, welche Mappe welches Blatt mit welchen Spalten und wie vielen Zeilen fuehrt. Ohne ihn weiss der Agent nicht, wonach er fragen kann.

**3. Werkzeug.** Ein Subflow `RWG Sub - Tabellen abfragen`, gebaut wie `RWG Sub - Jira Query`: nimmt die Frage, sucht im Katalog das passende Blatt, baut die Abfrage, fuehrt sie aus, gibt Zahlen zurueck.

**4. Absicherung.** Kein freies SQL des Modells gegen die Datenbank. Ein eigener, nur lesender Zugang mit `statement_timeout` und Zeilenobergrenze, beschraenkt auf `tabellen_zeilen` und den Katalog.

**Was es kostet:**

| | |
|---|---|
| Speicher | wenige MB. Heute erzeugen 27 Mappen 2 088 Zeilen-Chunks mit 3,1 MB Text; als jsonb mit Index bleibt das unter 10 MB. Zum Vergleich: `document_chunks` belegt 407 MB, davon 190 MB Indizes. |
| Embeddings | **keine.** Strukturierte Zeilen werden nicht vektorisiert - das ist der eigentliche Kostenvorteil. Kein OpenAI-Aufruf, kein Wachstum des Vektorindex. |
| OCR | keine. Die Mappen werden ohnehin ueber die Workbook-API gelesen, nicht ueber die Erkennung. |
| laufend | nur die Modellaufrufe beim Fragen: einmal Abfrage bauen, einmal Antwort formulieren. |

Der Aufwand steckt nicht im Speicher, sondern im Bau: Ablage, Katalog, Subflow und die Anbindung an den Agenten.

**Vor dem Bau zu klaeren:** Welche Mappen sind ueberhaupt gemeint? Von 42 Mappen in der Bibliothek sind viele Formulare. Eine Handvoll benannter Mappen, an denen sich der Nutzen zeigen laesst, ist der bessere Anfang als der Vollausbau.

### Doubletten in der Wissensbasis - die Altzeilen bleiben stehen
Die Wissensbasis traegt 29 Dateinamen mehrfach. Die Herkunft klaert das Bild:

| Herkunft | Dokumente | eingelesen |
|---|---|---|
| Power-Automate-Kennung (`RWGID…`) | 247 | 13.07. bis 22.08. |
| Graph-Kennung | 19 | 29./30.08. |

Von den 61 Zeilen hinter den 29 doppelten Namen tragen **60 eine Power-Automate-Kennung**. Es sind also keine Format- oder Fachdoubletten, sondern Mehrfachsendungen aus der Power-Automate-Zeit: dieselbe Datei kam unter verschiedenen Kennungen an.

**Das loest sich nicht von selbst - diese Annahme ist widerlegt.** Eine ueber Graph neu eingelesene Datei ersetzt ihre Altfassung **nicht**, sie stellt sich daneben: Der Abgleich ordnet ueber die Graph-`doc_id` zu, findet zur Power-Automate-Kennung keine Entsprechung und legt eine zweite Zeile an. Belegt an `00_lev…` und `16_ber…`, die beide unter beiden Herkuenften stehen - die Graph-Fassung mit 150 bzw. 163 Chunks, die Altzeile weiter bei null. Die Altzeilen sind also von Hand zu loeschen, sobald die Graph-Fassung nachweislich Chunks traegt. Der Verwaist-Befund faengt sie nicht ab: Er ruehrt bewusst nichts an, was keine Graph-Item-ID traegt.

Fachlich zu entscheiden bleibt allein, was in SharePoint selbst mehrfach liegt: 27 inhaltsgleiche Kopien und 63 namensgleiche mit verschiedenem Inhalt. Siehe den Abschnitt zur Erstbefuellung.

## Content Studio, weitere Themen

### Use Cases: Bestand bereinigt, Handwerk bleibt die Luecke
Zwei Stellen: Die Idee entsteht im Marketing Scout (`objM2PQrcTpEzik7`), ausformuliert wird sie im Content Studio (`bBBybznNNCnU2nOJ`).

**Der Scout laeuft, verwirft aber alles.** Taeglich um 04:20, zuletzt Lauf 110182: Der Business Scout bekommt 21 Kandidaten und gibt `[]` zurueck. Neun Laeufe in Folge ohne Zugang.

**Das ist kein Fehler, sondern die Regel.** Sein Auftrag endet ausdruecklich mit „Wenn nichts wirklich Konkretes dabei ist, gib [] zurueck. Ein leeres Ergebnis ist besser als ein austauschbarer Use-Case." Die Kandidaten sind Fachpresse - Hochdruckreiniger-Zubehoer, Arbeitgeberpreise, Werkzeugmaschinen-Ruesten. Daraus laesst sich kein konkreter Prozess-Use-Case destillieren, und die Strenge ist genau dafuer gebaut worden.

**Der Bestand wurde bereinigt.** Von 35 Eintraegen mit Status `new` trugen zwoelf Merkmale, an denen der Redaktions-Check scheitert: vier ein Fremdprodukt im Titel (Power Automate, DocuWare, Zapier, n8n), sechs einen generischen Namen wie „Workflow-Automatisierung", neun eine austauschbare Problembeschreibung wie „zeitaufwendig und fehleranfaellig". Sie stehen jetzt auf `rework` statt `new` - nicht geloescht, sondern aus dem Zugriff genommen.

**Stand danach:**

| Saeule | verfuegbar | nachzuarbeiten | verbraucht | ausgemustert |
|---|---|---|---|---|
| buero | 10 | 9 | 2 | 8 |
| engineering | 10 | 5 | 1 | 0 |
| fertigung | 3 | 0 | 0 | 0 |
| **handwerk** | **0** | 0 | 2 | 0 |

Bei drei Beitraegen je Woche reichen 23 saubere Eintraege rund sieben Wochen. Das Studio hungert also nicht.

**Die eine echte Luecke ist handwerk.** Der Dienstagsslot „Werkstatt & Produktion" fuehrt `handwerk,fertigung,engineering` - da handwerk leer ist, greift dort immer die Ersatzsaeule. Und keiner der zehn `engineering`-Eintraege handelt von CAD oder PDM; es geht um Projektkoordination und Bueroarbeit mit dem Etikett „Ingenieurbueros".

**Zu entscheiden:** Der Scout kann Handwerk nicht aus Branchennachrichten erfinden. Entweder Quellen ergaenzen, die Prozessgeschichten statt Produktmeldungen liefern - oder eine Handvoll Handwerks-Use-Cases von Hand setzen und den Scout auf das Beobachten beschraenken.

**Am 31.08. zum ersten Mal sichtbar geworden, was die Luecke kostet.** Lauf 111258 fiel im Dienstagsslot auf die Ersatzsaeule zurueck (`selection_note`: „keine Use-Cases mehr in handwerk") und zog `uc_1786422016792_0` — pillar `fertigung`, aber `target_group` „Ingenieurbueros". `Thema waehlen` waehlt ueber die Saeule aus und reicht die Zielgruppe unveraendert durch, der Prompt bekommt dadurch zwei einander widersprechende Rahmen. Das Modell ist der Zielgruppe gefolgt und schreibt ueber Fertigungsstuecke in Ingenieurbueros. Der Filter `zielgruppePasst` greift nicht, weil Ingenieurbueros eine legitime KAPA-Zielgruppe ist — nur nicht zu dieser Saeule. Datenpflege, kein Logikfehler; abzustellen entweder durch eine Plausibilitaetspruefung Saeule↔Zielgruppe bei der Auswahl oder durch Korrektur der Zeile.

### `builtInTools` — geprüft, nicht lösbar

Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update.

**Am 29.08. versucht:** Das Feld enthält überall ein leeres Objekt, es war nie etwas konfiguriert. Die Warnung entsteht aber durch das **Vorhandensein** des Feldes, nicht durch seinen Inhalt — und über die MCP-Schnittstelle lässt sich ein Feld nur überschreiben, nicht entfernen. Es zu beseitigen hieße, den kompletten Parameterblock der Modell-Nodes neu zu setzen. Das Risiko an produktiven Modell-Nodes steht in keinem Verhältnis zu einer kosmetischen Warnung.

Bleibt liegen, bis diese Nodes ohnehin angefasst werden.


## Später


### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.

## Lead Intake von der Website: die zwei Mails sind zwei Empfaenger

Flow `KAPA Digital - Lead Intake from Website`
([HW170WdNT9yQGErU](https://n8n.srv1307521.hstgr.cloud/workflow/HW170WdNT9yQGErU)). Am 01.09.
gemeldet und am selben Tag an Lauf `112933` untersucht.

### Es gibt keinen Doppelversand - die Vermutung ist widerlegt

`Interne Meldung per E-Mail` ist im Lauf **genau einmal** gelaufen: ein einziger Eintrag in den
Laufdaten, eine `messageId` (`<fac67e10-…>`), eine SMTP-Quittung (`queued as 4hZ7fd6nCfzyc0`).

Der Grund fuer zwei Mails im Postfach steht im Code-Node `Score berechnen und Wiedervorlage setzen`:

```
empfaengerIntern: 'info@kapa-digital.de, sebastian.linges@kapa-digital.de'
```

**Eine Nachricht an zwei Adressen** - der SMTP-Server hat beide angenommen
(`accepted: [info@kapa-digital.de, sebastian.linges@kapa-digital.de]`). Sebastian liest beide
Postfaecher und sieht deshalb dieselbe Mail zweimal, gleicher Betreff, gleiche Minute. Telegram geht
dagegen an **eine** Chat-ID, daher genau eine Meldung. Kein Knoten laeuft doppelt, kein Item wird
doppelt verarbeitet.

**Zu entscheiden, keine Fehlersuche mehr:** Sollen beide Adressen die interne Meldung bekommen? Wenn
`info@` ohnehin bei Sebastian landet, ist die zweite Adresse zu streichen - eine Zeile.

### Der Spamverdacht kam vom Modell, nicht von einer Regel

`istSpam` uebernimmt schlicht das Urteil der Analyse: `analyse.spam_verdacht === true`. Es gibt keine
Stichwort- oder Themenliste, die zu breit greifen koennte.

**Auf die eingereichten Daten gesehen war das Urteil vertretbar.** Der Freitext lautete
`Das ist ein Test nfedehuwehdfwe dde Ende`; die Einschaetzung des Modells: „Der Freitext enthält
keine relevanten Informationen und deutet auf eine Testanfrage hin." Bewertung 0, Einstufungsvorschlag
`e_pruefen`. Es war tatsaechlich eine Testanfrage mit Buchstabensalat - das Modell hat sie als solche
erkannt.

**Offen ist damit nicht die Erkennung, sondern die Beschriftung.** Eine erkannte Testanfrage bekommt
heute die Kopfzeile `SPAMVERDACHT - bitte pruefen`. Die Kategorie `unbewertet` gibt es im selben Code
bereits; eine Testanfrage koennte dorthin laufen, statt als Spam ueberschrieben zu werden. Ob sich
das lohnt, entscheidet sich an einem echten Fall - **ein einzelner Testlauf ist keine Messgrundlage.**

### Entwurfsstand aufgeraeumt

Der Flow trug einen nicht veroeffentlichten Entwurf. Der Vergleich gegen die aktive Fassung zeigte:
**kein einziger Unterschied** - 31 Knoten, Verbindungen und Knotengruppen zeichengleich, auch die
Positionen. Es war ein Autosave vom Oeffnen des Editors um 16:35, eine Minute nach dem Testlauf.

Am 01.09. publiziert, damit `versionId` und `activeVersionId` wieder zusammenfallen. Am Verhalten
aendert das nichts.

**Kein Ordner im Repo.** Der Flow gehoert zu den KAPA-Digital-Flows ohne eigenen Ordner, es gibt also
keinen Export. Wenn er weiter angefasst wird, gehoert einer angelegt.
