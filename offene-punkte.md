# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Umzug der RWG-Datenbank

**Abgeschlossen.** Das alte Projekt `zjabiweaihsezjjeycko` ist samt Zugang geloescht; die Gesundheitspruefung danach (Lauf 110871) trifft alle Erwartungswerte: 21 323 Chunks, 0 ohne Embedding, Bucket 7 384 Objekte, 0 Altverweise. Vorgehen und Abnahme stehen in [migration/README.md](migration/README.md).

Was daraus offen blieb:

- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geaendert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile - semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent, falls es sauber sein soll.


## Zuerst

### 14 SharePoint-Dokumente ohne Chunks - Ursache geklaert
14 Eintraege in `sharepoint_documents` tragen keinen einzigen Chunk. Gemessen ueber `metadata->>'doc_id'` und ueber die Spalte `source_ref` - beide Wege ergeben dieselben 14. In der Wissenssuche sind sie unsichtbar, gelten dem Ingest aber als vorhanden. Keine Zwillingszeile traegt die fehlenden Chunks, `ingestion_errors` ist leer.

**Zwei Gruppen:**

| Gruppe | Anzahl | `ingestion_count` | Merkmal |
|---|---|---|---|
| Regaletiketten-PDFs | 7 | 0 | sechs aus der Power-Automate-Zeit (22.08.), eine ueber Graph. `00_lev…` steht unter beiden Herkuenften. Nie fertiggestellt. |
| `Bereichsuebergreifend ….docx` | 7 | 2 | Text vollstaendig da (4 449 bis 22 460 Zeichen), `content_hash` gesetzt, 4 bis 47 Bilder je Dokument |

**Die Ursache der zweiten Gruppe ist belegt.** Der naechtliche Abgleich `110522` vom 30.08., 01:30 UTC lief 9 min 45 s und scheiterte. Lauf `110524` des Fehler-Workflows nennt den Grund: letzter Node `Upload Extracted Image To Supabase`, `NodeApiError ETIMEDOUT` gegen `zjabiweaihsezjjeycko.supabase.co` - das alte, inzwischen geloeschte Projekt, mit dem alten Zugang. Der Lauf starb beim Bildupload; die sieben bildreichen `.docx` blieben ohne Chunks zurueck.

**Nichts zu tun.** Beide Voraussetzungen haben sich seither geaendert: Der Node zeigt aufs neue Projekt mit gueltigem Zugang und traegt `onError: continueRegularOutput` - ein einzelner Bildfehler reisst den Lauf nicht mehr mit. Der Abgleich um 03:30 ist die erste Probe unter den neuen Bedingungen und sollte die sieben `.docx` nachziehen. Danach zu pruefen, ob die sieben Regaletiketten-PDFs uebrig bleiben.

**Nebenbefund, bekannt und hier bestaetigt:** In den Fehlerdaten von `110522` steht das komplette Request-Objekt samt `apikey` und `Authorization` im Klartext. Der Schluessel gehoert zum geloeschten Projekt und ist damit wertlos.


### Beitragsprüfung im Content Studio testen
Die Prüfung ist publiziert, aber **noch nie gelaufen**. Ein Testlauf erzeugt echte Artefakte: einen Eintrag in `content_packages`, eine E-Mail und einen Buffer-Entwurf.

Zu prüfen sind zwei Fälle: ein Beitrag, der durchgeht, und einer, der am Antwortblock scheitert. Der zweite lässt sich erzwingen, indem `Lesbarkeit pruefen` vorübergehend eine engere Wortgrenze bekommt — nicht, indem der COPY-Prompt verbogen wird.

Zu belegen: `qa_passed`, die Zahl der Befunde, und dass bei einer Ablehnung **kein** Buffer-Entwurf entsteht, aber eine Telegram-Meldung ankommt.


### Contract Loader publizieren - wartet auf Mistral-Token
**Der Umbau steht als unveroeffentlichter Entwurf** in `661BDwEditNicEc0`, 30 Nodes statt 36. Aufbau und Entscheidungen: [flows/rwg-contract-loader/README.md](flows/rwg-contract-loader/README.md).

Belegt im Gesamtlauf 110831: SharePoint-Abruf, Download, SHA-256, Zeile anlegen, Mistral-Upload, signierte URL, OCR und das Sichern des OCR-Textes. Beide Dokumente vollstaendig gelesen - 46 Seiten mit 20630 Woertern und 1 Seite mit 190 Woertern.

**Gescheitert ist die Extraktion**: `Forbidden` vom Mistral-Chat-Endpunkt. Ursache ist nicht der Umbau, sondern das Kontingent - die Token des Mistral-Zugangs sind bis zum **01.09.2026** aufgebraucht. Der OCR-Endpunkt desselben Zugangs laeuft weiter, OCR und Chat werden getrennt abgerechnet. Zur Sicherheit gegengeprueft (Lauf 110833): Konto `rwg-r.de` antwortet `Forbidden`, Konto `gmx.de` antwortet `Payment required`.

Der Fehlerweg hat dabei genau so gegriffen wie entworfen: `status = 'fehler'`, Meldung in `fehler_text`, beide Dateien unveraendert im Eingang. Beim naechsten Lauf werden sie erneut geholt, ohne neue OCR-Kosten - `ocr_text` steht ja schon.

**Nachtraeglich eingebaut** (Lauf 110838, 30 Nodes): Steht `ocr_text` schon, wird die OCR uebersprungen - ohne das lief ein liegengebliebenes Dokument stuendlich erneut durch die Erkennung und wurde jedes Mal neu bezahlt. Dazu ein Zaehler `versuche`: Nach drei Fehlversuchen wandert die Datei nach `/IMPORTER/CONTRACT/FEHLER`, den der Flow selbst anlegt. In der Excel stehen `status` und `versuche` vorn, Fertiges zuoberst.

**Zum Abarbeiten ab dem 01.09.:** Lauf anstossen, die Extraktion an den beiden Dokumenten pruefen, dann publizieren. Erst nach dem Publizieren geht der Export ins Git.

Noch unbelegt sind vier Nodes, die nur hinter der Extraktion liegen: `Ergebnis auswerten`, `Vertragsdaten schreiben`, `Nach DONE verschieben`, `Ablage vermerken`. Die Umwandlungen in `Ergebnis auswerten` sind einzeln gegen Testwerte geprueft, die Spaltenliste des grossen `UPDATE` gegen `information_schema` und `jsonb_to_record`. Ein Lauf ersetzt das nicht.

### Altbestand in DONE nachziehen
Elf Dokumente liegen in `/IMPORTER/CONTRACT/DONE` und stehen nicht in `vertraege`. Ein Einmallauf ueber den Ordner holt das nach; der Hash-Schutz macht ihn gefahrlos wiederholbar. Bewusst zurueckgestellt, bis der Eingang belegt ist.

Offen bleibt daneben, ob der Bestand der alten Data Table `CEz5GXpTS7yHhjqS` (`RWG Vertraege`) uebernommen wird.


## ProzessHub nach SharePoint

**Der Flow bleibt bewusst stillgelegt**, bis Sebastian ihn aktiviert. Er ist belegt funktionsfaehig (Lauf 110370). Wie er scharfgeschaltet wird, steht in [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

## SharePoint Schulungen

### Dokumenteintrag vor den Chunks - Reihenfolge im Ingest
Der Ingest legt den Dokumenteintrag an, **bevor** er die Chunks schreibt. Bricht ein Lauf dazwischen ab, bleibt ein Eintrag ohne Chunks stehen - in der Wissenssuche unsichtbar. Stand 30.08.: neun solcher Eintraege (Lauf 110771), acht davon bildreiche Regaletiketten-PDFs.

**Abgefangen ist es**: Der Abgleich erkennt sie ueber den fehlenden Kopfsatz (`chunk_index = 0`) und liest sie neu ein - mit Vorrang, weil sie sonst dauerhaft einen Platz blockieren.

Sauberer waere, den Eintrag erst nach den Chunks zu schreiben. Das ist ein Umbau an der Verarbeitung und bleibt offen. Die Nachpruefung im Abgleich faengt den Fall zuverlaessig ab, also nicht dringend.


### Erstbefuellung - erst aufraeumen, dann lesen
Der Flow `RWG Wartung - SharePoint Bestand analysieren` (`OQh5K8D1UrQK9fPQ`) liest die Bibliothek `Schulungen` in einem Zug und wertet sie aus. Lauf 110893:

| | |
|---|---|
| Eintraege gesamt | 1 896 (475 Ordner, 1 421 Dateien, 12,9 GB) |
| davon verwertbar | **499 Dateien** |
| nicht verwertbar | 922 Dateien |

**Zwei Drittel der Bibliothek tragen keinen durchsuchbaren Text.** 402 Windows-Verknuepfungen (`.lnk`) und 89 Weblinks (`.url`) - zusammen 35 Prozent aller Dateien. Dazu 263 Bilder (3,6 GB), 101 Videos (5,7 GB), 8 DVD-Spuren (3,2 GB), 26 `.db` und 10 `.tmp`. Von den 12,9 GB sind 12,4 GB Medien.

**Vor dem Einlesen zu bereinigen:**

| Befund | Anzahl | Was dahintersteckt |
|---|---|---|
| Office-Sperrdateien `~$…` | 42 unter 2 kB | 162 Byte je Stueck, tragen die Endung des Dokuments. **Behoben** - der Ingest filtert sie jetzt. Sie zaehlen aber in den 499 verwertbaren mit. |
| inhaltsgleiche Kopien | 17 ueberzaehlige in 15 Gruppen | dieselbe Datei in mehreren Ordnern, meist `Lagerplaene 2023` gegen `2024`. Zusammen 10 MB. Liste unten. |
| davon Sperrdatei-Doubletten | 10 ueberzaehlige in 6 Gruppen | nicht zu bereinigen - der Filter faengt sie ohnehin ab |
| namensgleich, Inhalt verschieden | 63 | `Debitorencockpit.pdf` liegt viermal mit unterschiedlichem Inhalt |
| ueber 40 MB | 1 | `Praesentation Mitarbeiterversammlung 05.02.2024.pptx`, 45 MB - faellt aus dem Ingest |

**Kein Altbestand.** Keine einzige verwertbare Datei ist aelter als drei Jahre; die aeltesten stammen von Mai 2024. Die Frage nach veralteten Dokumenten beantwortet sich damit von selbst - ueber das Aenderungsdatum ist nichts auszusortieren.

**Was das fuer die OCR bedeutet:**

| | |
|---|---|
| verwertbare Dateien | 499 |
| abzueglich Sperrdateien | -42 |
| abzueglich ueber 40 MB | -1 |
| abzueglich echter Doubletten | -17 |
| **tatsaechlich einzulesen** | **rund 439** |

Bei 30 je Nacht rund **fuenfzehn Naechte**.

Die frueher genannten 472 waren zu hoch: Die Sperrdateien tragen die Endung des Dokuments und stecken deshalb sehr wohl in den 499 verwertbaren - sie wurden zuvor faelschlich als bereits abgezogen behandelt. Zugleich waren von den 27 inhaltsgleichen Kopien 10 selbst Sperrdateien und damit doppelt gezaehlt.

**Eine Unschaerfe bleibt:** Der Analyseflow meldet 42 Dateien unter 2 kB, gibt die Liste aber nur bis 20 aus. Von diesen 20 sind 19 Sperrdateien, eine ist 37 Byte gross. Die genaue Zahl der Sperrdateien ist aus dem Lauf also nicht ableitbar - 42 ist die Obergrenze.

**Der Sperrdatei-Filter ist publiziert** und steht im Code-Node `Aufgaben bestimmen` des `RAG - SharePoint Ingest`. Wirksam wird er beim naechsten Lauf, der Dateien sieht.

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

### Doubletten in der Wissensbasis - loesen sich groesstenteils selbst
Die Wissensbasis traegt 29 Dateinamen mehrfach. Die Herkunft klaert das Bild:

| Herkunft | Dokumente | eingelesen |
|---|---|---|
| Power-Automate-Kennung (`RWGID…`) | 247 | 13.07. bis 22.08. |
| Graph-Kennung | 19 | 29./30.08. |

Von den 61 Zeilen hinter den 29 doppelten Namen tragen **60 eine Power-Automate-Kennung**. Es sind also keine Format- oder Fachdoubletten, sondern Mehrfachsendungen aus der Power-Automate-Zeit: dieselbe Datei kam unter verschiedenen Kennungen an.

**Das loest sich mit der Erstbefuellung.** Jede Datei, die ueber Graph neu eingelesen wird, ersetzt ihre Altfassung. Stehen bleiben nur Eintraege, deren Datei es in SharePoint nicht mehr gibt - die faengt der Verwaist-Befund des Abgleichs ab.

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

### `builtInTools` — geprüft, nicht lösbar

Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update.

**Am 29.08. versucht:** Das Feld enthält überall ein leeres Objekt, es war nie etwas konfiguriert. Die Warnung entsteht aber durch das **Vorhandensein** des Feldes, nicht durch seinen Inhalt — und über die MCP-Schnittstelle lässt sich ein Feld nur überschreiben, nicht entfernen. Es zu beseitigen hieße, den kompletten Parameterblock der Modell-Nodes neu zu setzen. Das Risiko an produktiven Modell-Nodes steht in keinem Verhältnis zu einer kosmetischen Warnung.

Bleibt liegen, bis diese Nodes ohnehin angefasst werden.


## Später


### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
