# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Umzug der RWG-Datenbank

**Abgeschlossen.** Das alte Projekt `zjabiweaihsezjjeycko` ist samt Zugang geloescht; die Gesundheitspruefung danach (Lauf 110871) trifft alle Erwartungswerte: 21 323 Chunks, 0 ohne Embedding, Bucket 7 384 Objekte, 0 Altverweise. Vorgehen und Abnahme stehen in [migration/README.md](migration/README.md).

Was daraus offen blieb:

- **Drei Tabellen ohne bekannten Schreiber - Herkunft inzwischen erkennbar.** Sie liegen im Projekt `zckaxkpycyyxaymmkmvu`, Schema `public`:

  | Tabelle | Zeilen | Geschrieben | Was drinsteht |
  |---|---|---|---|
  | `agent_ticket_dialogs` | 2 | 15.07.2026 | Dialogstand eines Jira-Ticket-Agenten: `agent_key`, `conversation_id`, `draft`, `missing_fields`, `jira_ticket_key` |
  | `documentation_findings` | 10 | 13.-16.08.2026 | Abweichungen zwischen Jira und Confluence, etwa `confluence_outdated` oder `jira_maybe_done`, mit Quelle A gegen Quelle B und Empfehlung |
  | `documentation_review_state` | 17 | 13.-16.08.2026 | Pruefstand je Quelle: wann zuletzt gesehen, wann zuletzt geprueft, `review_status` |

  Erkennbar ein Vorhaben, das Jira und Confluence auf widerspruechliche Dokumentation abgleicht. Es lief an drei Tagen im August und seither nicht mehr - kein Flow der Instanz schreibt dort hinein. Zu entscheiden: wiederbeleben oder entfernen. Bei 29 Zeilen ist der Datenverlust ueberschaubar, die Idee dahinter aber moeglicherweise nicht.
- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geaendert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile - semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent, falls es sauber sein soll.


## Zuerst

### Zwei Ingest-Flows - Laufbeleg steht aus
**Mit der Loeschung des alten Supabase-Projekts ist auch dessen Zugang `11jCRVtytAyrsu96` verschwunden.** Der `RAG-JIRA-Ingest` hing noch daran und scheiterte bei jedem Jira-Webhook mit `Credential with ID "11jCRVtytAyrsu96" does not exist for type "supabaseApi"`.

Die Adressen aller Nodes zeigen korrekt aufs neue Projekt - nur die Zugangsbindung war alt. Da die MCP-Schnittstelle Credentials nicht ausliest, liess sich nicht feststellen, welcher Node betroffen war; deshalb wurde der richtige Zugang `H1j5n8gUPkmrE97X` auf **allen** Nodes mit Supabase-Bezug ausdruecklich gesetzt. Beide Flows sind publiziert, `versionId` und `activeVersionId` stimmen ueberein:

| Flow | Nodes mit Supabase-Bezug | aktive Version |
|---|---|---|
| `RAG-JIRA-Ingest` (`ESVtaoyTfaP3jm2G`) | 3 Supabase-Nodes + 18 HTTP-Nodes = 21 | `5826aa4c-4a0a-45a0-94b9-dd0cfdcc085b` |
| `RAG - SharePoint Ingest` (`BBhGCRsQ8pdNSxTi`) | 17 HTTP-Nodes | `cd924752-af5a-410e-8be6-863b80fbe3e7` |

Die Zugaenge haengen fast alle an HTTP-Nodes mit `nodeCredentialType: supabaseApi`, nicht an Supabase-Nodes. Im Export taucht der Fix deshalb gar nicht auf - Credentials sind nicht Teil des Exports.

**Beide Flows sind durch einen Lauf belegt.**

- **Jira** (`110886`): Eine Prioritaetsaenderung an SSD-9192 lief bis `Workflow Summary` durch. `Get Existing Ticket` - genau der Node, der zuvor starb - antwortete in 155 ms. Bestand 21323 auf 21326.
- **SharePoint** (`110888`): Der Delta-Lauf um 17:00 fand fuenf Loeschmeldungen und fasste damit fuenf Nodes mit `supabaseApi` an, alle erfolgreich - darunter `Wissensbasis-Bestand` und `Chunkzahlen laden`.

Anzustossen war keiner der beiden per MCP: Der Jira-Trigger gilt der MCP-Ausfuehrung nicht als Trigger, und beim SharePoint-Ingest ergibt ein Handstart laut Code-Node `Steuerung` immer `laufart: delta`.

Im selben Entwurf des SharePoint-Ingests steckt der Filter fuer Office-Sperrdateien. Er ist der einzige inhaltliche Unterschied zum vorigen Export.


### Loeschschleife des SharePoint-Ingests bricht nach der ersten Aufgabe ab
Gemessen in Lauf `110888`. `Aufgaben bestimmen` meldete `zu_loeschen: 5`, abgearbeitet wurde **eine**. Der Ablauf endet bei `Delete All SharePoint Chunks`: Der PostgREST-DELETE findet zu der `doc_id` keine Chunks und gibt ein leeres Array zurueck. Ein Node ohne Ausgabeitems stoppt in n8n den nachfolgenden Zweig - die Rueckverbindung `Delete SharePoint Source` nach `Delete Workflow Summary` nach `Je Aufgabe` wird nie erreicht. Im gespeicherten Kontext bleiben vier Aufgaben mit `done: false` stehen, der Lauf gilt als erfolgreich.

**Warum das zaehlt:** Graph meldet eine Loeschung genau einmal. Kommen mehrere Loeschungen in einer Delta-Meldung und die erste hat keine Entsprechung in der Wissensbasis, sind die uebrigen fort. Der naechtliche Abgleich faengt Verwaiste wieder auf, deshalb heilt es sich - aber nicht am selben Tag.

**Hier ohne Datenverlust:** betroffen waren vier leere Ordner und eine Datei, die alle keinen Eintrag in der Wissensbasis hatten.

Nicht angefasst. Zu entscheiden, ob der Zweig gegen leere Ausgaben abgesichert wird.

### 14 SharePoint-Dokumente ohne Chunks
Der Lauf meldet `rag_dokumente: 266` gegen `rag_mit_chunks: 252`. Die Gegenmessung in der Datenbank ergibt dieselbe Zahl: 14 Eintraege in `sharepoint_documents`, zu denen kein einziger Chunk in `document_chunks` steht. In der Wissenssuche sind sie unsichtbar, gelten dem Ingest aber als vorhanden.

Der Delta-Lauf erkennt sie nicht - `unvollstaendig_gefunden` bleibt 0, weil er nur die Items der Delta-Meldung bewertet. Der naechtliche Abgleich soll unvollstaendige Eintraege nachholen; ob er das tut, ist am Lauf um 03:30 zu pruefen.


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
Der Flow `RWG Wartung - SharePoint Bestand analysieren` (`OQh5K8D1UrQK9fPQ`) liest die Bibliothek `Schulungen` in einem Zug und wertet sie aus. Lauf 110875:

| | |
|---|---|
| Eintraege gesamt | 1 900 (479 Ordner, 1 421 Dateien, 12,9 GB) |
| davon verwertbar | **499 Dateien** |
| nicht verwertbar | 922 Dateien |

**Zwei Drittel der Bibliothek tragen keinen durchsuchbaren Text.** 402 Windows-Verknuepfungen (`.lnk`) und 89 Weblinks (`.url`) - zusammen 35 Prozent aller Dateien. Dazu 263 Bilder (3,6 GB), 101 Videos (5,7 GB), 8 DVD-Spuren (3,2 GB), 26 `.db` und 10 `.tmp`. Von den 12,9 GB sind 12,4 GB Medien.

**Vor dem Einlesen zu bereinigen:**

| Befund | Anzahl | Was dahintersteckt |
|---|---|---|
| Office-Sperrdateien `~$…` | 42 | 162 Byte je Stueck, tragen die Endung des Dokuments und liefen bisher mit in die OCR. **Behoben** - der Ingest filtert sie jetzt, siehe unten. |
| inhaltsgleiche Kopien | 27 ueberzaehlige in 21 Gruppen | dieselbe Datei in mehreren Ordnern, etwa `Lagerplaene 2023` und `2024` |
| namensgleich, Inhalt verschieden | 63 | `Debitorencockpit.pdf` liegt viermal mit unterschiedlichem Inhalt |
| ueber 40 MB | 1 | `Praesentation Mitarbeiterversammlung 05.02.2024.pptx`, 45 MB - faellt aus dem Ingest |

**Kein Altbestand.** Keine einzige verwertbare Datei ist aelter als drei Jahre; die aeltesten stammen von Mai 2024. Die Frage nach veralteten Dokumenten beantwortet sich damit von selbst - ueber das Aenderungsdatum ist nichts auszusortieren.

**Was das fuer die OCR bedeutet:** 499 verwertbare Dateien, nach Abzug der 27 inhaltsgleichen Kopien **472**. Die 42 Sperrdateien sind darin nicht enthalten, weil der Filter sie bereits abfaengt. Bei 30 je Nacht rund sechzehn Naechte.

**Der Sperrdatei-Filter ist publiziert** und steht im Code-Node `Aufgaben bestimmen` des `RAG - SharePoint Ingest`. Wirksam wird er beim naechsten Lauf, der Dateien sieht.

Offen zu entscheiden bleibt, ob die 27 inhaltsgleichen Kopien in SharePoint bereinigt werden oder ob der Ingest sie ueber den Inhaltshash von sich aus ueberspringt. Letzteres waere weniger Eingriff, laesst die Doubletten aber in SharePoint stehen.


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
