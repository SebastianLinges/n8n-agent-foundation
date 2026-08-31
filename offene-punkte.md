# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Umzug der RWG-Datenbank

**Abgeschlossen.** Das alte Projekt `zjabiweaihsezjjeycko` ist samt Zugang geloescht; die Gesundheitspruefung danach (Lauf 110871) trifft alle Erwartungswerte: 21 323 Chunks, 0 ohne Embedding, Bucket 7 384 Objekte, 0 Altverweise. Vorgehen und Abnahme stehen in [migration/README.md](migration/README.md).

Was daraus offen blieb:

- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geaendert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile - semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent, falls es sauber sein soll.


## Zuerst

**Zwei Dinge sind für den 01.09.2026 gesetzt:** das Mistral-Kontingent prüfen und die Kette daran abarbeiten, und die Waisen im ProzessHub abstellen. Die Waisen hat Sebastian ausdrücklich auf den 01.09. gelegt.

**Der Prompt-Fix im Content Studio ist am 31.08. publiziert** — die Terminsache vor dem Lauf am Mittwoch ist damit erledigt. Was daran offen bleibt, steht unter [Beitragsprüfung im Content Studio](#beitragsprüfung-im-content-studio--absatzregel-gefixt-retry-offen).

### Morgen zuerst: Mistral prüfen, dann die Kette abarbeiten

**Das Mistral-Abo ist abgelaufen und läuft ab dem 01.09.2026 wieder.** Gemessen am 31.08.: Die API antwortet auf den Datei-Upload mit `402 Payment required` — nicht mehr mit `ECONNRESET` wie bei der bloßen Pause. Belegt in den Läufen `111062` (nachts 03:30) und `111286` (morgens 08:42, dieselbe Antwort elf Stunden später). Gesperrt ist inzwischen die ganze API, nicht nur der Chat-Endpunkt.

**Erster Handgriff:** ein Abgleich mit `nurDatei` auf eine kleine PDF — etwa `fahrer pellets`, 61 kB. Dauert 40 Sekunden und beantwortet mit einer Messung statt einer Vermutung, ob die OCR wieder offen ist. Danach `nurDatei` wieder leeren.

**Läuft die OCR, hängt daran diese Kette:**

1. **Die fünf verbliebenen Regaletiketten einlesen**, danach die sechs Altzeilen löschen — aber erst, wenn die jeweilige Graph-Fassung nachweislich Chunks trägt. Die Altzeilen sind Power-Automate-Leichen mit `RWGID`-Kennung; der Abgleich ordnet über die Graph-`doc_id` zu und legt daneben eine zweite Zeile an, statt sie zu heilen.
2. **Contract Loader zu Ende belegen** (`661BDwEditNicEc0`): Lauf anstoßen, Extraktion an den beiden liegengebliebenen Dokumenten prüfen, publizieren, exportieren. Vier Nodes sind noch ungetestet, alle hinter der Extraktion. Der Umbau ist unveröffentlichter Entwurf, die alte Fassung ist aktiv.
3. **Erstbefüllung läuft von selbst weiter** — 402 Dateien fehlen noch, drei je Nacht.

**Unabhängig davon zu prüfen: der Nachtlauf um 03:30.** Er ist die erste Probe der heute publizierten Absicherung. Erwartet wird: Status `success` statt `error`, in der Laufbilanz `zurueckgestellt` statt `fehler`, `anker_geschrieben: true` — und eine Telegram-Meldung mit der Kopfzeile `[ZURUECKGESTELLT]`, die die liegengebliebenen Dateien nennt. Bleibt die Meldung aus, obwohl Dateien zurückgestellt wurden, klemmt der Telegram-Node, nicht der Ingest.

**Aus dem Konzept [konzept-ocr-schonen.md](konzept-ocr-schonen.md) offen:**

- **Hebel 1, der OCR-Zwischenspeicher.** Der größte Hebel: Bei vier von sechs Rebuild-Gründen ist die Datei unverändert, und trotzdem läuft die komplette OCR erneut. **Braucht eine Freigabe für eine neue Supabase-Tabelle** und sorgfältige Behandlung des Bucket-Aufräumens.
- **Hebel 3, der native Textpfad** für die gemessenen 21 % bildloser Dokumente. Vor dem Bau zu messen, wie viele der fehlenden PDF eine Textebene tragen — die Gegenprobe braucht ein OCR-Ergebnis zum Vergleich, geht also erst mit laufendem Abo.
- **Hebel 4, ein Seitendeckel** für Dokumente wie die Regaletiketten. Fachliche Entscheidung, keine technische.


### Morgen erledigen: ProzessHub verliert Dateien bei Umbenennungen

**Von Sebastian für den 01.09. gesetzt.** Der Flow läuft seit dem 31.08. nächtlich um 02 Uhr und legt an, aktualisiert und entfernt sauber — mit einer Lücke: **Umbenennungen hinterlassen Waisen.**

Ändert sich in Confluence ein Seiten- oder Gruppentitel, ändert sich der Zielpfad. Die Datei entsteht am neuen Ort, die alte bleibt liegen — der Löschpfad greift nicht, weil die `page_id` weiter existiert. Bei einem Gruppentitel wandert der ganze Ordner, dann bleibt der alte vollständig zurück. Das Tückische daran: Die Waisen tragen dasselbe Layout und dieselbe Kopfzeile wie die gültigen Fassungen, niemand erkennt sie als veraltet.

**Noch nicht eingetreten.** Zwischen Lauf 110822 und 111432 ist kein einziger der 159 Pfade gewandert. Ein einziger korrigierter Titel im ProzessHub löst es aus.

**Die Ursache ist die Stelle, an der der Zielpfad entsteht.** `Dokument bauen` berechnet ihn — also erst, nachdem `Abgleich` seine Entscheidung längst getroffen hat. Der Abgleich kann deshalb gar nicht wissen, dass eine Seite umgezogen ist.

**Der Umbau, vier Schritte:**

1. **`sicherName()` und die Pfadbildung nach `Seiten normalisieren` verlegen.** Dort stehen alle Bestandteile bereit: `bereich_ordner`, `gruppe_nr`, `gruppe_titel`, `prozess_nr`, `klartext`. Auf die Reihenfolge achten — `gruppe_titel` steht erst nach dem zweiten Durchgang fest, die Pfade gehören also in einen letzten Durchgang danach. Ergebnis je Seite: `sp_ordner`, `sp_datei`, `sp_pfad`, `sp_pfad_url`.
2. **`Abgleich` vergleicht alt gegen neu.** Zu jeder Seite mit `aktion: spiegeln` liegt die Bestandszeile bereits vor. Ist `alt.sp_ordner + '/' + alt.sp_datei` ungleich dem neuen `sp_pfad`, kommt ein zusätzliches Item mit `aktion: 'entfernen'` und dem **alten** Pfad dazu.
3. **Die Bestandszeile darf dabei nicht mitgelöscht werden.** `Datei entfernen` führt zu `Bestandszeile entfernen`, und das filtert über `page_id`. Das Umzugs-Item bekommt deshalb eine Kennung, die keine echte Zeile trifft, etwa `page_id: '__pfadwechsel__'` — die richtige Zeile hebt `Bestand fortschreiben` im selben Lauf auf den neuen Pfad. **Vor dem Bau zu prüfen:** dass der Data-Table-Node bei einem Filter ohne Treffer nichts löscht und nicht etwa alles.
4. **`Dokument bauen` rechnet nicht mehr selbst**, sondern nimmt `sp_ordner` und `sp_datei` aus dem Datensatz — auch für die Linkkarte, sonst laufen interne Verweise gegen zwei verschiedene Wahrheiten.

**Die Löschsicherung darf davon nichts mitbekommen.** Sie rechnet ihren Anteil über die in Confluence fehlenden Seiten. Die Umzugs-Items gehören **hinter** diese Prüfung, sonst schlägt ein umbenannter Gruppentitel mit all seinen Seiten in die 35-Prozent-Schwelle und blockiert den ganzen Lauf.

**Abnahme:** eine Testseite im ProzessHub umbenennen, Lauf starten, dann dreierlei belegen — die Datei liegt unter dem neuen Namen, die alte ist weg, und in `prozesshub_spiegel` steht genau **eine** Zeile für diese `page_id`. Damit ist nebenbei auch das Löschen einer real vorhandenen Datei gemessen, das bisher fehlt.

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


### Beitragsprüfung im Content Studio — Absatzregel gefixt, Retry offen
Die Prüfung ist einmal gelaufen und hat den Lauf abgebrochen: **111258 am 31.08., 08:00, kein Buffer-Entwurf.** Harter Befund im Code-Node `Lesbarkeit pruefen`: „Antwortblock zu kurz (21 Woerter, mindestens 30)". Der vorgelagerte `Redaktions-Check` war grün.

**Die Schwelle war unter dem damaligen COPY-Prompt nicht erreichbar.** Der System-Prompt von `COPY (Text)` forderte „Absaetze aus 1-2 Saetzen, Leerzeile dazwischen", ohne Ausnahme für den ersten Absatz. `Lesbarkeit pruefen` splittet am Doppel-Umbruch, meint also dieselbe Texteinheit, und verlangt dort 30 bis 80 Wörter. Bei gemessener Satzlänge 13,2 Wörter ergeben zwei Sätze rund 26 Wörter — die Obergrenze der Prompt-Regel lag unter der Untergrenze des Gates. Das Modell hat nicht versagt, es hat die falsche Anweisung befolgt.

**Der Prompt ist korrigiert und publiziert** (31.08., Version `211428cf`). Die Regel „Absaetze aus 1-2 Saetzen" gilt jetzt ausdrücklich erst ab dem zweiten Absatz; der erste trägt die Kernaussage in 3 bis 4 Sätzen mit 30 bis 80 Wörtern. Der Selbsttest am Prompt-Ende fragt die Wortzahl zusätzlich ab. Das Gate blieb unverändert. Rechnerisch landen 3–4 Sätze × 13,2 Wörter bei 40–53 Wörtern, mittig im Band, und die 700–1300 Zeichen bleiben eingehalten.

**Noch unbelegt.** Es gab keinen Lauf nach der Änderung — der nächste ist der Regeltermin am **Mi 02.09., 08:00**. Zu prüfen sind dort `qa_antwortblock_woerter` (soll 30–80) und ob ein Buffer-Entwurf entsteht.

**Nachgerechnet auf die vier Vorläufe** hätte die Regel ausnahmslos gegriffen: 100455 → 25 Wörter, 106294 → 19, 108062 → 27, 111258 → 21. Null von vier.

`Lesbarkeit pruefen` und das IF `Freigabe erteilt` wurden zwischen dem 27. und 29.08. eingebaut — in den älteren Läufen fehlen beide in `runData`. 111258 ist der erste Produktivlauf durch das Gate.

**Das Gate selbst bleibt richtig.** Vorher wurde `qa_passed` nirgends ausgewertet: 100455 und 108062 trugen den harten Befund „Fremdprodukt im Text genannt" und haben trotzdem einen Buffer-Entwurf erzeugt. Falsch ist nur die Kalibrierung.

**`uc_1786422016792_0` ist weiter offen.** `use_case abschliessen` hängt nur am Erfolgspfad, der Use-Case wurde also nicht abgeschlossen und kein `content_package` geschrieben. Er wird am Mittwoch erneut gezogen — jetzt allerdings gegen den korrigierten Prompt. Zu beachten: Die Zeile trägt die Säule `fertigung` bei Zielgruppe „Ingenieurbueros", der Widerspruch aus dem Abschnitt [Use Cases](#use-cases-bestand-bereinigt-handwerk-bleibt-die-luecke) steckt also weiter darin.

**Abzuarbeiten, ohne Termin:**

1. **Retry als Netz.** Der Prompt allein macht die Wortzahl nicht deterministisch. False-Route einmal zurück auf `COPY (Text)` mit den Befunden im Prompt, Zähler hart auf einen Versuch, erst beim zweiten Fehlschlag an Telegram. **Fallstrick:** `COPY parsen` verwirft die Analysefelder (`kernaussage`, `gewaehlte_perspektive`, `kapa_bruecke`, `takeaway`). Ein naiver Rücksprung generiert mit leerem Analyseblock und wäre schlechter als der erste Versuch — der Retry-Node muss sie aus `$('Analyse parsen').first().json` zurückholen.
2. **Zahlen-Check im `Redaktions-Check` erweitern.** Er prüft rein numerisch gegen `belegte_zahlen`. In 111258 stand „erhebliche Kosteneinsparungen" bei leerem Beleg-Feld — eine ausgeschriebene Mengenangabe, die der Prompt ausdrücklich verbietet, und im Effekt dasselbe Reputationsrisiko wie eine erfundene Zahl. Wortliste erheblich/deutlich/massiv/drastisch/signifikant/spürbar, aktiv nur bei leerem `belegte_zahlen`.

Nach jeder Änderung publizieren, exportieren, Läufe ins `tests/laufprotokoll.csv`.


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

**Der Flow ist aktiv.** Publiziert am 31.08., Nachttrigger 02 Uhr scharf. Anlegen, Aktualisieren und Entfernen sind an vier Läufen belegt (111432, 111433, 111440, 111456), die Titelspalte in SharePoint zeigt die Umlaute wieder richtig. Aufbau und Belege in [flows/rwg-prozesshub-sharepoint/README.md](flows/rwg-prozesshub-sharepoint/README.md).

**Umbenennungen hinterlassen Waisen.** Der Umbau steht oben unter [Morgen erledigen](#morgen-erledigen-prozesshub-verliert-dateien-bei-umbenennungen) — er ist für den 01.09. gesetzt.

Was daneben offen bleibt:

### Titelspalte gegenprüfen
Sebastian hat die Bibliotheksansicht nach dem Neuaufbau als „besser" beschrieben. Ob sie damit **richtig** ist, ist nicht beantwortet. Zeigt noch ein Titel zerlegte Umlaute, reicht der BOM nicht, und es braucht zusätzlich ein `PATCH {site}/drive/items/{item-id}/listItem/fields` mit ausdrücklich gesetztem `Title`. Die `sp_item_id` je Seite steht seit dem 31.08. in der Data Table — der Nachtrag wäre billig.

### Null-Zeilen in der Data Table aufräumen
Rund 370 Zeilen ohne `page_id` stehen in `prozesshub_spiegel` — Rückstand aus der Zeit, als `Bestand fortschreiben` in jede Spalte `null` schrieb. Wirkungslos, weil `Bestand laden` auf `space_key = ProzessHub` filtert und sie nicht findet. Aufzuräumen nur über die n8n-Oberfläche und **nicht** pauschal über alle Zeilen: die 175 echten stehen daneben.

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

## SharePoint Schulungen

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

Bei 30 je Nacht rund **fuenfzehn Naechte**.

Zwei Korrekturen stecken darin. Erstens tragen die Sperrdateien die Endung des Dokuments und stecken deshalb sehr wohl in den verwertbaren - sie wurden zuvor faelschlich als bereits abgezogen behandelt, und von den 27 inhaltsgleichen Kopien waren 10 selbst Sperrdateien. Zweitens waren alle Ausgangszahlen durch die Mehrfachlieferung des Delta-Abrufs zu hoch.

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

**Am 31.08. zum ersten Mal sichtbar geworden, was die Luecke kostet.** Lauf 111258 fiel im Dienstagsslot auf die Ersatzsaeule zurueck (`selection_note`: „keine Use-Cases mehr in handwerk") und zog `uc_1786422016792_0` — pillar `fertigung`, aber `target_group` „Ingenieurbueros". `Thema waehlen` waehlt ueber die Saeule aus und reicht die Zielgruppe unveraendert durch, der Prompt bekommt dadurch zwei einander widersprechende Rahmen. Das Modell ist der Zielgruppe gefolgt und schreibt ueber Fertigungsstuecke in Ingenieurbueros. Der Filter `zielgruppePasst` greift nicht, weil Ingenieurbueros eine legitime KAPA-Zielgruppe ist — nur nicht zu dieser Saeule. Datenpflege, kein Logikfehler; abzustellen entweder durch eine Plausibilitaetspruefung Saeule↔Zielgruppe bei der Auswahl oder durch Korrektur der Zeile.

### `builtInTools` — geprüft, nicht lösbar

Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update.

**Am 29.08. versucht:** Das Feld enthält überall ein leeres Objekt, es war nie etwas konfiguriert. Die Warnung entsteht aber durch das **Vorhandensein** des Feldes, nicht durch seinen Inhalt — und über die MCP-Schnittstelle lässt sich ein Feld nur überschreiben, nicht entfernen. Es zu beseitigen hieße, den kompletten Parameterblock der Modell-Nodes neu zu setzen. Das Risiko an produktiven Modell-Nodes steht in keinem Verhältnis zu einer kosmetischen Warnung.

Bleibt liegen, bis diese Nodes ohnehin angefasst werden.


## Später


### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
