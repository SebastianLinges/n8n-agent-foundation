# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

**Modellkosten haben eine eigene Liste:** [konzept-token-sparen.md](konzept-token-sparen.md) — alle Flows, nach gemessenem Tokenverbrauch sortiert, Stand 04.09.2026.

## Zuerst: SQL-Konzept für Reporting, Controlling und Fibu

**Das ist ab der nächsten Sitzung das Hauptthema.** Bisher existiert dazu kein Konzept im Repo, nur die Richtung: SQL Server → n8n → SharePoint.

**Zu klären, bevor gebaut wird:**

1. **Welche Berichte?** Namen, Empfänger, Rhythmus. Ein Bericht, an dem sich der Weg zeigen lässt, ist der bessere Anfang als der Vollausbau.
2. **Welche Quelle genau?** Welcher SQL Server, welche Datenbank, welche Tabellen oder Sichten. Gibt es bereits Auswertungen, die nur automatisiert werden sollen, oder wird fachlich neu geschnitten?
3. **Welcher Zugang?** n8n hat heute **keine** Credential für einen SQL Server — die vorhandenen Postgres-Zugänge zeigen auf Supabase. Ein Lesezugang mit eigenem Konto, `statement_timeout` und Zeilenobergrenze ist der Anfang.
4. **Wohin das Ergebnis?** Eine Excel je Lauf wie beim Contract Loader, eine fortgeschriebene Mappe, oder eine SharePoint-Liste. Das entscheidet den Bau.
5. **Fibu getrennt betrachten.** Finanzdaten sind heikler als Controlling-Kennzahlen: Wer darf sie sehen, wo dürfen sie liegen, wie lange.

**Was aus dem Bestand hilft:** Der Contract Loader zeigt den Weg von Daten nach SharePoint samt Excel-Erzeugung. Der Abschnitt [Tabellendaten abfragbar machen](#tabellendaten-abfragbar-machen---plan) enthält Vorarbeit zu strukturierten Daten neben der Vektorsuche — sie zielt auf Excel-Mappen aus SharePoint, nicht auf den SQL Server, überschneidet sich aber in der Frage, wie ein Agent rechnende Abfragen sicher stellt.

## Danach: Artikeldaten

**Artikelabfragen sowie Bereinigung, Neuanlage und Update von Artikeldaten.** Folgt auf das SQL-Konzept.

**Noch nichts davon ist im Repo vorbereitet.** Zu klären, sobald das Thema dran ist: aus welchem System die Artikeldaten kommen, was „Bereinigung" fachlich heißt, und ob Schreibzugriffe in das führende System gehen sollen oder nur Vorschläge zur Freigabe.

**Zu beachten:** Ein Flow, der Stammdaten anlegt oder ändert, braucht dieselbe Sorgfalt wie das Verschiebe-Werkzeug — einen Probelauf, der nur zeigt was er täte, und einen Filter, der leer nichts trifft.

## In Beobachtung — die nächsten Tage

Nichts davon ist zu tun, alles davon ist nachzusehen.

| Was | Wann | Worauf |
|---|---|---|
| Jira-Nachzügler | alle 30 Min | Bilanzen mit `gefunden: 0`. Steht dort eine Zahl, zeigt sie vor dem Scharfschalten, welchen Vorgang er anfassen würde |
| Contract Loader | stündlich | erster Lauf mit einer **echten neuen Datei** unter `mistral-medium-latest` — das ist der ausstehende Beleg |
| Content Studio | Mo 07.09. 08:00 | Seit dem 03.09. abends live (`369b664c`): Videostrang weg, ein Bildformat, Ankerfilter und Eignungsrangfolge in der Themenwahl, eine Regelquelle. Nachzusehen: ob der Lauf ueberhaupt einen Kandidaten findet (`available_use_cases` in `Thema waehlen`), ob `eignung` beim gewaehlten Thema ueber 40 liegt, ob der Buffer-Entwurf **mit Bild** entsteht - das ist das Abbruchkriterium fuer A2 - und ob die Wochenvorschau in E-Mail und Telegram steht. Ausserdem der erste Lauf mit der Mengenangaben-Regel, die bis heute nie gegriffen hat |
| SharePoint-Abgleich | 03:30 | 15 Einlesungen, Rückstand danach rund 356 Dateien |
| Jira-Feldpflege | bei jedem Ticketereignis | Seit dem 03.09. abends live (`1e43e7b3`): Signaturbereinigung, Sammelfenster, und Maschinentickets wie Tickets in einem Done-Status werden nicht mehr bewertet (beides bewusst nicht ergebnisneutral). Vier Dinge nachsehen: Läufe unter 100 ms mit `lastNodeExecuted: Ticketereignis pruefen` — das sind die verworfenen Klassen; `bereinigung.verworfen` am Node `Ticketkontext aufbereiten` (deutlich über null heißt, die Muster greifen nicht); Läufe unter 100 ms mit `lastNodeExecuted: Anspruch erhalten?` — das sind die eingesparten Schwarm-Aufrufe, der Beleg dafür, dass das Fenster im Echtbetrieb wirkt; und ob eine Einstufung von der bisherigen abweicht. Die Tabelle `jira_feldpflege_state` sollte nur Tickets in Bearbeitung enthalten |

| Jira-Agent | nächster Ticketlauf | Seit dem 04.09. live (`23b634fd`): `Jira-Altfall lesen` filtert mit `allFilters` statt mit der ODER-Vorgabe. Nachzusehen ist am nächsten Lauf, in dem der Agent das Werkzeug ruft: Kommt der Vorgang zurück, nach dem er gefragt hat? Vorher kam ein beliebiger. Zu finden über `get_execution` am Knoten `Jira-Altfall lesen` - der angefragte `ticket_key` steht im `inputOverride`, der gelieferte in der Ausgabe |

**Danach scharf schalten:** `probelauf` im Jira-Nachzügler auf `false`. Eine Zeile in `Nachzuegler Steuerung`. Solange er auf `true` steht, meldet der Zweig nur.

## Wartet auf eine Entscheidung

- **17 Doubletten in SharePoint**, 15 Gruppen, zusammen 10 MB. Zwei liegen in einem Ordner `alt` und sollen weg — dafür fehlt ein Löschwerkzeug, das bewusst nicht gebaut wurde. Die sieben Gruppen unter `/Lagerpläne/` bleiben ausdrücklich unangetastet.
- **Handwerks-Use-Cases.** Die Säule `handwerk` steht auf 0, weil `KI Daily - Collect` nur aus GitHub, Tavily und Hacker News zieht — angelsächsische Tech-Presse, aus der kein deutscher Handwerksprozess entsteht. Vorschlag: fünf bis acht Use-Cases von Hand setzen, das entsperrt den Dienstagsslot sofort.
- **Zweite Empfängeradresse im Lead Intake.** `empfaengerIntern` trägt `info@kapa-digital.de` **und** `sebastian.linges@kapa-digital.de`. Kein Doppelversand, sondern zwei Adressaten in einer Nachricht. Ob die zweite bleibt, ist offen.
- **Testlead in Kapa-Core aufräumen.** Der Testlauf `113882` hat einen zweiten Lead zur echten Anfrage vom 02.09. erzeugt: `lead_id 4c80f3ec-e9a5-4368-8be5-e984485f6864`, `contact_id 671b1e04-21a3-40dd-86ad-89dae29b5672`, drei Aufgaben. Vor dem Löschen ansehen, welcher der beiden Datensätze der bessere ist — der zweite trägt die korrigierte Bewertung, der erste die richtige Eingangszeit. Braucht eine Freigabe für den Schreibzugriff.
- **Tabellendaten** — vertagt, siehe unten. Sebastian erwägt einen eigenen SQL-Weg; nicht unaufgefordert weiterbauen.
- **Content Studio: fünf Entscheidungen.** Die entscheidungsfreien Pakete sind am 03.09. gebaut und publiziert (A1, A2, A3, A5, A6, A7, dazu A8 als eine Regelquelle - Abschnitt 8 im Auftrag). Offen bleiben: Bildqualität `medium` oder `low`, LinkedIn-Format 1:1 oder 1,91:1, ob COPY weiterhin Instagram- und Facebook-Texte schreibt, obwohl beide Kanäle ruhen, Quellen von WF-1 (14 von 22 Auslösern sind Herstellerpresse), und die Kandidatenschleife A4 erst nach der Messung. Der Auftrag mit Befunden, Messwerten und Umsetzungsstand liegt in [flows/kapa-content-studio/auftrag-content-studio.md](flows/kapa-content-studio/auftrag-content-studio.md).
- **Lösungscache im Jira-Ingest wird von der Sammelschließung entwertet.** Jeden Abend um 18:00 schließt eine Automatisierung alle erledigten Tickets (gemessen am 03.09.: 34 Tickets in vier Sekunden). Jeder Übergang Erledigt → Geschlossen erreicht `RAG-JIRA-Ingest` als Ereignis, und weil der Lösungsschlüssel `status` und `resolution` enthält, folgt je Ticket eine **vollständige Neuextraktion mit gpt-4.1-mini** — obwohl sich am Inhalt nichts geändert hat. Der Schlüssel wurde bewusst so gebaut, weil Status und Resolution wörtlich im Chunktext stehen. Zu entscheiden: ob der Statuswechsel Erledigt → Geschlossen den Chunk wirklich neu erzeugen muss, oder ob ein Metadaten-PATCH reicht. Sprengweite: nur die Lösungschunks mit Schlüssel (115 von 1.389 am 03.09.), nicht `content_hash`.

## Technische Restposten

Kleinteilig, ohne Termin, keines davon dringend.

- **`siem` ohne Wortgrenze im Ingest-Filter.** `Filter Automated Ticket Creator` in `RAG-JIRA-Ingest` prüft die Zusammenfassung mit `/(…|siem|…)/i` — das trifft auch „Siemensring". Ein Ticket „Drucker am Siemensring defekt" gilt dort als Maschinenticket und fehlt in der Wissensbasis. Die Feldpflege verwendet dieselbe Regel mit `\bsiem\b`; der Ingest sollte nachziehen. Zu prüfen, wie viele Tickets betroffen sind: `summary ~* 'siemens'` in `jira_tickets` gegen `document_chunks`.
- **`Auto Leasing Vertrag.pdf`** liefert bei 718 Wörtern nur sieben Rohfelder — keine Laufzeit, kein Preis, kein Intervall. Für einen Leasingvertrag wenig; möglicherweise ist die Datei nur ein Deckblatt. Am `ocr_text` derselben Zeile in einer Minute zu klären.
- **Drei Alteinträge in `agent_requests`** tragen eine Abo-ID statt einer Nachrichten-ID (unter 808 Zeilen, seit dem 15.07.). Wirkungslos — zu ihnen gehört keine Nachricht. Seit dem 02.09. entstehen keine neuen mehr.
- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geändert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile — semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent.
- **Retry als Netz im Content Studio.** Der Prompt allein macht die Wortzahl nicht deterministisch. False-Route einmal zurück auf `COPY (Text)` mit den Befunden im Prompt, Zähler hart auf einen Versuch. **Fallstrick:** `COPY parsen` verwirft die Analysefelder (`kernaussage`, `gewaehlte_perspektive`, `kapa_bruecke`, `takeaway`) — der Retry-Node muss sie aus `$('Analyse parsen').first().json` zurückholen, sonst ist der zweite Versuch schlechter als der erste.
- **Zeitzone in den Workflows nicht gesetzt.** Die Flows erben die der Instanz, und die steht auf `Europe/Berlin` — am 04.09. an zwei Crons nachgemessen. Ausdrücklich setzen ist deshalb wirkungsfrei und gefahrlos; es schützt nur davor, dass eine Änderung der Instanzvorgabe alle Zeitpläne still verschiebt. Betrifft Content Studio und die übrigen Zeitplan-Flows.
- **`uc_1786422016792_0` ist nicht abgeschlossen.** `use_case abschliessen` hängt nur am Erfolgspfad. Die Zeile trägt die Säule `fertigung` bei Zielgruppe „Ingenieurbueros" — der Widerspruch aus dem Use-Case-Abschnitt steckt weiter darin.
- **404 im Jira-Agent umgehen.** Bei fehlendem Anfragetyp auf `/rest/api/3/issue/{key}/comment` ausweichen statt auf die Service-Desk-Schnittstelle. **Vor dem Bau zu prüfen:** ob der Kommentar dann wirklich intern bleibt — der native Jira-Node kann die JSM-Sichtbarkeit nicht setzen, ein unbedachter Wechsel macht interne Kommentare für Anwender sichtbar. Betrifft rund ein bis zwei Tickets pro Woche.

## Jira-Agent: was vom 02.09. übrig bleibt

Aufbau, Nachzügler-Zweig und die Fallstricke stehen in [flows/rwg-jira-agent/README.md](flows/rwg-jira-agent/README.md). Hier nur, was noch offen ist.

**Die 45 hängengebliebenen Vorgänge bleiben liegen.** 20 auf `processing` (17.07.–27.08.), 25 auf `failed` (13.07.–28.08.). Die Entscheidung, sie nicht nachzuziehen, steht in der Flow-README und gilt weiter: Kunden bekämen sonst heute Antworten auf wochenalte Tickets. Der Nachzügler-Zweig hält sie über das 24-Stunden-Fenster bewusst draußen.

**Eine latente Falle in der Maschinenticket-Weiche.** Das Muster `siem` steht in `Maschinen- oder Fachticket` ohne Wortgrenze in der Liste bekannter Systemmeldungen — es würde damit auch **Siemens** treffen und ein echtes Ticket aussortieren. In den 75 prüfbaren übersprungenen Tickets ist das bisher nicht passiert (74 echte Systemmeldungen, eines über das Absenderkonto erkannt). Die Falle ist gestellt, aber nicht zugeschnappt.

**Der Vermerk steht im falschen Feld.** Übersprungene Maschinentickets bekommen `last_error = 'skipped:machine_ticket'` — 269 von 305 „Fehlern" in `jira_agent_events` sind deshalb gar keine. Jede Fehlerabfrage zählt sie mit. Ein eigenes Feld oder ein Präfix wäre ehrlicher.

## ProzessHub nach SharePoint

**Der Flow ist aktiv.** Publiziert am 31.08., Nachttrigger 02 Uhr scharf. Anlegen, Aktualisieren und Entfernen sind an vier Läufen belegt (111432, 111433, 111440, 111456), die Titelspalte in SharePoint zeigt die Umlaute wieder richtig. Aufbau und Belege in [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

**Umbenennungen sind erledigt.** Der Flow rechnet den Ablageort seit dem 01.09. in `Zielpfade bestimmen` am Anfang aus, `Abgleich` vergleicht ihn mit, und ein Aufräumer hält den Ist-Bestand in SharePoint gegen die Soll-Liste. Belegt an den Läufen `113059`, `113060` und `113061` mit einer Wegwerfseite. Aufbau und Sicherungen: [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

Was daraus offen blieb:

- **Leere Ordner bleiben stehen.** Der Aufräumer entfernt nur Dateien. Nach einer Gruppen-Umbenennung bleibt der alte, dann leere Ordner sichtbar zurück.
- **`sicherName()` steht jetzt zweimal im Flow** — in `Zielpfade bestimmen` und in `Dokument bauen`. Beide müssen zeichengleich bleiben, sonst räumt der Aufräumer weg, was derselbe Lauf geschrieben hat. Sie zusammenzuführen hieße, den 280-Zeilen-Knoten `Dokument bauen` anzufassen; das war es heute nicht wert.

Was daneben offen bleibt:

### Titelspalte gegenprüfen
Sebastian hat die Bibliotheksansicht nach dem Neuaufbau als „besser" beschrieben. Ob sie damit **richtig** ist, ist nicht beantwortet. Zeigt noch ein Titel zerlegte Umlaute, reicht der BOM nicht, und es braucht zusätzlich ein `PATCH {site}/drive/items/{item-id}/listItem/fields` mit ausdrücklich gesetztem `Title`. Die `sp_item_id` je Seite steht seit dem 31.08. in der Data Table — der Nachtrag wäre billig.

### Null-Zeilen in der Data Table aufräumen
Rund 370 Zeilen ohne `page_id` stehen in `prozesshub_spiegel` (`4akduDBG2tJrtKw4`) — Rückstand aus der Zeit, als `Bestand fortschreiben` in jede Spalte `null` schrieb. Wirkungslos, weil `Bestand laden` auf `space_key = ProzessHub` filtert und sie nicht findet.

**Sie lassen die Tabelle in der Oberfläche leer aussehen** — beim Draufschauen am 02.09. entstand deshalb der Eindruck, sie werde nicht mehr gebraucht. Sie wird: Der Nachtlauf `113204` meldet `unveraendert: 260`, und das ist nur möglich, wenn zu jeder dieser 260 Seiten ein Spiegeleintrag existiert. Wäre die Tabelle leer, stünde dort `neu: 260` und der Flow baute jedes Dokument neu.

**Aufzuräumen nur über die n8n-Oberfläche** und **nicht** pauschal über alle Zeilen: die **260** echten (85 Gruppen, 175 Prozesse) stehen daneben. Über MCP geht es nicht — es gibt kein Werkzeug zum Löschen von Data-Table-Zeilen. Ein Wartungsflow mit dem Data-Table-Node könnte es gezielt über `page_id ist leer`, falls das Aufräumen von Hand zu mühsam wird.

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

## SharePoint Schulungen

### OCR schonen — drei Hebel liegen noch

Aus dem Konzept [konzept-ocr-schonen.md](konzept-ocr-schonen.md):

- **Hebel 1, der OCR-Zwischenspeicher.** Der größte Hebel: Bei vier von sechs Rebuild-Gründen ist die Datei unverändert, und trotzdem läuft die komplette OCR erneut. **Keine neue Tabelle nötig** — `sharepoint_documents` trägt `content_hash`, `content_text` und `images` bereits für alle Dokumente; nachgeschlagen wird über den Hash. Damit entfällt auch die Supabase-Freigabe. Vor dem Bau zu prüfen: ob `content_text` reicht, um die Chunks identisch neu zu bauen. Der Fallstrick bleibt das Bucket-Aufräumen bei einem Treffer.
- **Hebel 3, der native Textpfad** für die gemessenen 21 % bildloser Dokumente. Vor dem Bau zu messen, wie viele der fehlenden PDF eine Textebene tragen — die Gegenprobe braucht ein OCR-Ergebnis zum Vergleich. Seit dem 01.09. steht dem nichts mehr im Weg.
- **Hebel 4, ein Seitendeckel** für Dokumente wie die Regaletiketten. Fachliche Entscheidung, keine technische.

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

**Das loest sich nicht von selbst - diese Annahme ist widerlegt.** Eine ueber Graph neu eingelesene Datei ersetzt ihre Altfassung **nicht**, sie stellt sich daneben: Der Abgleich ordnet ueber die Graph-`doc_id` zu, findet zur Power-Automate-Kennung keine Entsprechung und legt eine zweite Zeile an. Der Verwaist-Befund faengt sie nicht ab - er ruehrt bewusst nichts an, was keine Graph-Item-ID traegt. Altzeilen sind deshalb von Hand zu loeschen.

**Die sechs leeren Altzeilen sind am 01.09. geloescht** (Migration `altzeilen_regaletiketten_ohne_chunks_entfernen`): Regaletiketten-PDFs mit 0 Chunks, 0 Bildern, `ingestion_count 0` und ohne `content_hash` - reine Huellen, an denen nichts hing. Die Dateien liegen weiter in SharePoint und werden von der Erstbefuellung regulaer gelesen. **Seither steht die Zahl der Dokumente ohne Chunks auf null.** Die verbliebenen 241 Power-Automate-Zeilen tragen alle Inhalt.

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
