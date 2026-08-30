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

### Beitragsprüfung im Content Studio testen
Die Prüfung ist publiziert, aber **noch nie gelaufen**. Ein Testlauf erzeugt echte Artefakte: einen Eintrag in `content_packages`, eine E-Mail und einen Buffer-Entwurf.

Zu prüfen sind zwei Fälle: ein Beitrag, der durchgeht, und einer, der am Antwortblock scheitert. Der zweite lässt sich erzwingen, indem `Lesbarkeit pruefen` vorübergehend eine engere Wortgrenze bekommt — nicht, indem der COPY-Prompt verbogen wird.

Zu belegen: `qa_passed`, die Zahl der Befunde, und dass bei einer Ablehnung **kein** Buffer-Entwurf entsteht, aber eine Telegram-Meldung ankommt.


### Contract Loader publizieren - wartet auf Mistral-Token
**Der Umbau steht als unveroeffentlichter Entwurf** in `661BDwEditNicEc0`, 30 Nodes statt 36. Aufbau und Entscheidungen: [flows/rwg-vertragsdaten/README.md](flows/rwg-vertragsdaten/README.md).

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

**Der Flow bleibt bewusst stillgelegt**, bis Sebastian ihn aktiviert. Er ist belegt funktionsfaehig (Lauf 110370). Wie er scharfgeschaltet wird, steht in [flows/prozesshub-sharepoint/README.md](flows/prozesshub-sharepoint/README.md).

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

### Zwei EK-Ordner in Confluence
Beide liegen im Bereich `ProzessHub` und unterscheiden sich nur im Strich:

| Ordner | Zeichen | zuletzt geaendert |
|---|---|---|
| [EK – Einkauf](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/folder/438468881) | Gedankenstrich `–` | 15.08.2026 |
| [EK - Einkauf](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/folder/442531841) | Bindestrich `-` | 17.08.2026 |

Die Prozessseiten selbst fuehren durchgaengig den **Gedankenstrich**: [EK-01 – Lieferantenmanagement](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/438992990), [EK-02 – Beschaffungsabwicklung](https://rwg-r.atlassian.net/wiki/spaces/ProzessHub/pages/442400769). Danach ist `EK – Einkauf` der Ordner, der zur Namenskonvention passt.

Die EK-02-Familie wird gerade bearbeitet (zuletzt am 29.08.), die EK-01-Familie steht seit dem 15.08. Der Flow meldet die Dublette und legt beide zusammen ab - technisch unauffaellig, fachlich zu bereinigen.

## SharePoint Schulungen

### Vier leere Ordner - Entscheidung offen
Alle vier liegen in der Bibliothek `Schulungen` und sind seit ihrer Anlage leer geblieben. Sie sehen nach vorbereiteter Struktur aus, nicht nach Rest - deshalb wurden sie bei der Bereinigung am 30.08. stehen gelassen.

| Ordner | angelegt |
|---|---|
| [Baustoff Prozesse](https://rwgrheinland.sharepoint.com/sites/rwgintranet/Schulungen/Shared%20Documents/Baustoff%20Prozesse) | 16.05.2024 |
| [Dispo Prozesse](https://rwgrheinland.sharepoint.com/sites/rwgintranet/Schulungen/Shared%20Documents/Dispo%20Prozesse) | 16.05.2024 |
| [Videos/Gebuchte Belege stornieren](https://rwgrheinland.sharepoint.com/sites/rwgintranet/Schulungen/Shared%20Documents/Videos/Gebuchte%20Belege%20stornieren) | 20.06.2024 |
| [Baumarkt Prozesse](https://rwgrheinland.sharepoint.com/sites/rwgintranet/Schulungen/Shared%20Documents/Baumarkt%20Prozesse) | 08.05.2025 |

Zwei davon sind seit zwei Jahren leer, einer seit gut einem. Nicht angefasst: Die Bibliothek `Inventur` derselben Untersite traegt 333 oberste Leerordner, `Archiv Zaehlprotokolle` ist vollstaendig leer.

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

**Der Sperrdatei-Filter liegt als unveroeffentlichter Entwurf** in `RAG - SharePoint Ingest`. Er greift erst mit dem naechsten Publizieren.

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

### Use Cases: der Nachschub ist versiegt
Zwei Stellen: Die Idee entsteht im Marketing Scout (`objM2PQrcTpEzik7`), ausformuliert wird sie im Content Studio (`bBBybznNNCnU2nOJ`). Positionierung auf Buero, Handwerk und CAD-/PDM-Prozesse.

**Der Bestand ist nicht alt, er waechst nur nicht mehr.** Alle 50 Eintraege stammen aus einem Fenster vom 10. bis 20.08.2026. Seither: nichts.

| Saeule | new | used | rework | retired |
|---|---|---|---|---|
| buero | 17 | 2 | 2 | 8 |
| engineering | 15 | 1 | - | - |
| fertigung | 3 | - | - | - |
| handwerk | - | 2 | - | - |

**Die Ursache ist gemessen, nicht vermutet.** Der Scout laeuft taeglich um 04:20 und meldet Erfolg - zuletzt Lauf 110182 am 29.08. In diesem Lauf bekommt der Business Scout **21 Kandidaten** und gibt `[]` zurueck. Der Knoten `use_cases aufbereiten` liefert entsprechend null Items. Neun Laeufe in Folge, kein einziger neuer Use Case.

Das Modell verwirft alle 21, und zwar zu Recht: Die Kandidaten sind Fachpresse - neues Hochdruckreiniger-Zubehoer, Arbeitgeberpreise Rheinland-Pfalz, Ruesten von Werkzeugmaschinen. Darin steckt kein Automatisierungs-Use-Case fuer Buero, Handwerk oder CAD/PDM.

**Damit ist es kein Prompt-Problem, sondern ein Quellenproblem.** Die Feeds in `content_sources` liefern Branchennachrichten, gesucht werden aber Prozessgeschichten. Am Prompt zu drehen aendert daran nichts.

**Was der Bestand inhaltlich hergibt** (Sichtung vom 29.08.): Keiner der 15 `engineering`-Eintraege handelt von CAD oder PDM - es geht um Projektkoordination, Compliance, Kundenkommunikation, also Bueroarbeit mit dem Etikett "Ingenieurbueros". Fuenf Eintraege behandeln EU AI Act und KI-Compliance, drei die Belegverarbeitung. Vier Titel nennen Fremdprodukte (Power Automate, DocuWare, Zapier, n8n), die der Redaktions-Check im Beitragstext hart sperrt. Und "zeitaufwendig und fehleranfaellig" steht sechsmal als Problembeschreibung - der Check verlangt aber ein benanntes Dokument oder einen benannten Arbeitsschritt.

**Zu entscheiden:** Quellen erweitern, damit der Scout ueberhaupt passendes Material bekommt - oder Use Cases fuer die drei Saeulen von Hand setzen und den Scout auf das Beobachten von Trends beschraenken.

### `builtInTools` — geprüft, nicht lösbar

Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update.

**Am 29.08. versucht:** Das Feld enthält überall ein leeres Objekt, es war nie etwas konfiguriert. Die Warnung entsteht aber durch das **Vorhandensein** des Feldes, nicht durch seinen Inhalt — und über die MCP-Schnittstelle lässt sich ein Feld nur überschreiben, nicht entfernen. Es zu beseitigen hieße, den kompletten Parameterblock der Modell-Nodes neu zu setzen. Das Risiko an produktiven Modell-Nodes steht in keinem Verhältnis zu einer kosmetischen Warnung.

Bleibt liegen, bis diese Nodes ohnehin angefasst werden.


## Später


### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
