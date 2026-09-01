# RAG - SharePoint Verarbeitung

Nimmt **einen Auftrag je Datei** (`coDhu7pIaI2bpmGZ`, 82 Nodes), beschafft die Datei aus SharePoint,
macht sie zu Text und schreibt sie in die Wissensbasis. Aufgerufen von
[RAG - SharePoint Steuerung](../rag-sharepoint-steuerung/README.md) über einen Execute-Workflow-Trigger.

Hervorgegangen aus dem Vorgängerflow (`BBhGCRsQ8pdNSxTi`) — die Verarbeitungskette ist
übernommen, nicht neu geschrieben. Der Bauplan steht in
[konzept-sharepoint-neubau.md](../../konzept-sharepoint-neubau.md).

**Der Flow heißt in n8n `RAG - SharePoint Ingest`**, der abgelöste Vorgänger `RAG - SharePoint Ingest OLD`.
Maßgeblich ist die ID, nicht der Name. Publiziert und aktiv seit dem 01.09.

## Der Vertrag

**Rein** — ein Objekt je Datei. Nichts Binäres über die Flowgrenze:

```
aktion    einlesen | loeschen
item_id   Graph-Item-ID der Datei          (Pflicht)
drive_id  Laufwerk der Bibliothek          (Pflicht bei einlesen)
filename, endung, bytes, file_path, department, sharepoint_url
site_url, bereich, audience
author_name, author_email, last_modified_by, created_at_sp, last_modified_sp, etag
alt_doc_id?, grund, lauf_id, quelle
```

**Raus** — eine einzige Antwortform, egal welcher Weg gelaufen ist:

```
status    eingelesen | unveraendert | geloescht | zurueckgestellt | uebersprungen | fehler
doc_id, filename, aktion, grund, chunks, bilder, woerter, lauf_id, roh_status, fertig_am
```

`zurueckgestellt` bleibt von `fehler` getrennt — ein ausgefallener Dienst ist kein Dokumentfehler.

## Aufbau

```
Auftrag → Vorgaben → Auftrag pruefen → Was tun ─┬ datei        → Datei holen ──────────────┐
                                                ├ arbeitsmappe → Blattnamen → Blaetter     │
                                                │                → Blattwerte → CSV bauen  │
                                                │                → CSV nach Datei ─────────┤
                                                └ loeschen     → [Löschzweig] ─────────┐   │
                                                                                       │   ↓
                                              Normalize SharePoint Input ◀─────────────┼───┘
                                                        ↓                              │
                                              Route File Family ─┬ DOCUMENT_AI  → OCR-Strecke
                                                                 ├ SPREADSHEET  → Extract
                                                                 ├ TEXT         → Decode
                                                                 └ UNSUPPORTED  → Fehler
                                                        ↓                              │
                                              IF Content Usable → Hash → Bestand prüfen │
                                                        ↓                              │
                                              Neuaufbau? ─┬ nein → Zeitstempel          │
                                                          └ ja   → Bilder → Chunks      │
                                                                   → Embedding → Räumen │
                                                        ↓                              ↓
                                                    ═══════════ Ergebnis ═══════════════
```

**Ein Ausgang.** Alle Wege münden in `Ergebnis`. Im Vorgängerflow sprangen vier verschiedene Enden
zurück in die Schleife des Scanners — das war der Hauptgrund für seine Undurchsichtigkeit.

## Drei Wege je Dokument

**Datei** — PDF, Text und alles Übrige direkt über `/content`. **Word und PowerPoint** bekommen
`?format=pdf` angehängt: Microsoft wandelt sie selbst um, und sie laufen durch dieselbe OCR-Strecke
wie die PDFs. Bei PowerPoint zahlt sich das besonders aus — Mistral erfasst dann auch die Folienbilder.

Anders als früher wird die PDF-Wandlung **nicht mehr an den ersten Base64-Zeichen erraten**.
`Auftrag pruefen` weiß aus der Endung, ob `?format=pdf` angefordert wurde, und setzt `ext` entsprechend.

**Arbeitsmappe** — `xlsx` und `xlsm` laufen über die Workbook-API, Blatt für Blatt. Der Extract-Node
kennt nur `sheetName` für ein einzelnes Blatt und liest sonst lautlos nur das erste. Alle Blätter
werden zu einer CSV mit dem Blattnamen als erster Spalte.

Dabei wird jedes Blatt eingeschätzt: Echte Tabellen kommen mit ihren Spalten, Notizen und Formulare
als Text unter `Blatt / Zeile / Inhalt`. **Die Kopfzeile wird gesucht, nicht angenommen** — sie steht
selten in Zeile 1, darüber liegen Titel und Leerzeilen.

Ab `Tabelle als CSV bauen` ist das Dokument eine CSV: Name, Endung und Weg werden umgestellt
(`Datei.xlsx` → `Datei (xlsx, Tabellen und Text).csv`). `Normalize SharePoint Input` erkennt das am
Merkmal `_mappe` und nimmt die umgestellten Angaben statt der des Auftrags.

**Löschen** — braucht nur die Kennung. Der Zweig sammelt die Speicherpfade aus zwei Quellen: aus dem
`images`-Feld der Dokumentzeile **und** aus den Bildchunks. Dann Speicher leeren, Chunks löschen,
Eintrag löschen. Er ist idempotent — ein Auftrag für ein längst gelöschtes Dokument läuft sauber durch.

## Der Inhaltshash

`Create Source Binary Hash` bildet SHA256 über den **Base64-Text** der Datei. Dieser Wert entscheidet
in `Decide Rebuild Or Skip`, ob ein Dokument neu aufgebaut wird.

Der Vorgängerflow bekam den Base64-Text über die Flowgrenze gereicht. Hier kommt die Datei binär an,
und `Normalize SharePoint Input` stellt den Wert aus den Binärdaten wieder her. **Das musste zeichengleich
sein** — sonst hätte jedes Dokument im Bestand als geändert gegolten und wäre erneut durch die OCR gelaufen.

**Gemessen und belegt:** Die beiden inhaltsgleichen Kopien von
`Bestätigung persönliche Unterweisung Fahrer Pellets.pdf` tragen denselben `content_hash`
`0fb9492426ac546cc9095069f30dae5b752321ca52b2f03abe923b52b7e5c695` — die eine vom alten Flow am 30.08.,
die andere von dieser Kette am 01.09.

## Ein gescheitertes Bild beendet den Lauf nicht

Große PDFs bringen hunderte Bilder mit, die einzeln in den Speicher-Bucket wandern. Ein einziger
Netzabbruch dabei hat den **gesamten nächtlichen Abgleich** mitgerissen — inklusive aller Dateien,
die noch drankommen sollten.

`Upload Extracted Image To Supabase` läuft deshalb bei Fehler weiter, statt abzubrechen, und wiederholt
fünfmal im Abstand von fünf Sekunden. `Build Uploaded Image Metadata` sortiert die gescheiterten Zeilen
aus — sonst stünde im Chunk ein Speicherpfad, unter dem nichts liegt. Zugeordnet wird über den Index,
deshalb wird erst abgebildet und dann gefiltert.

Scheitern **alle** Bilder eines Dokuments, liefert `Collect Uploaded Images` dank `alwaysOutputData`
trotzdem ein Item. `Build All SharePoint Chunk Rows` behandelt einen fehlenden Bildsatz als leere Liste
— das Dokument bekommt seinen Text und seine Chunks, nur ohne Bilder.

**Der Preis:** Ein verlorenes Bild fällt nicht auf. Es gibt keine Meldung, nur eine kürzere Bildliste
am Dokument. Das ist bewusst so — ein durchgelaufener Abgleich mit einem fehlenden Bild ist mehr wert
als ein abgebrochener mit vollständigen Bildern.

## Ein ausgefallener Dienst beendet den Lauf nicht

Die OCR hängt an einem einzigen Anbieter. Ist der nicht erreichbar — Kontingent erschöpft, Abo
abgelaufen, Ratengrenze —, scheitert **jede** Aufgabe, die durch die OCR muss.

`Upload Source To Mistral`, `Get Mistral Signed URL` und `Mistral OCR And Visual Annotations` gehen
deshalb bei Fehler in ihren Fehlerausgang. `Dienst nicht verfuegbar` ordnet den Ausfall ein,
protokolliert ihn nach `ingestion_errors` und führt über `Ingest Error Summary` zum `Ergebnis`.
Die Aufgabe gilt als **zurückgestellt**, nicht als gescheitert.

**Eingeordnet wird über den Meldungstext, nicht über den HTTP-Code.** Der Fehlerausgang liefert weder
`httpCode` noch den Knotennamen mit — der Knoten kommt deshalb aus `$prevNode`. Unterschieden werden
`KONTINGENT_ERSCHOEPFT`, `RATE_LIMIT`, `ZUGANG` und `DIENST_GESTOERT`.

**Übernommen wird nur Meldung, Knotenname und HTTP-Code.** Das Rohobjekt bleibt außen vor: n8n legt
bei HTTP-Fehlern das komplette Request-Objekt samt Zugangsdaten im Klartext ab, und diese Zeile geht
in die Datenbank.

Gemeldet wird die Rückstellung von der Steuerung, nicht von hier — sie kennt den ganzen Lauf.

## Was aus dem Vorgängerflow nicht mitgewandert ist

| Weggefallen | Warum |
|---|---|
| `Webhook SharePoint` | Power Automate wird nicht mehr gebraucht. |
| `Normalize SharePoint Event` (104 Zeilen) | Vereinheitlichte Webhook- und Schleifenformat. Ohne Webhook zwecklos. |
| `Nach Base64`, `Uebergabe Datei`, `Convert Source To Binary`, `Restore Metadata After Binary` | Der Base64-Umweg über die Flowgrenze. Die Datei wird jetzt binär geholt und bleibt binär. |
| `Workflow Summary`, `Delete Workflow Summary`, `Ingest Error Summary`, `No Change Summary` als vier Rückwege | Münden jetzt alle in einen `Ergebnis`-Knoten. |

Der größte Teil von `Normalize SharePoint Input` ist ebenfalls entfallen: Er musste ein Dutzend
Feldnamen erraten, weil Power Automate sie unterschiedlich schrieb. Der Vertrag kennt genau einen
Namen je Feld. Der Knoten **behält seinen Namen**, weil neun Knoten der Verarbeitung ihn über
`$('Normalize SharePoint Input')` lesen — ihn umzubenennen hätte neun Codeänderungen gekostet,
ohne etwas zu verbessern.

## Zugänge

| Zweck | Credential |
|---|---|
| Microsoft Graph | `OAuth2 API: Entra-SharePoint-RWG` (`mClncgXjqvaJjfm4`) |
| Wissensbasis und Bucket | `Supabase account: Org_RWG_Project_RAG` (`H1j5n8gUPkmrE97X`) |
| OCR | `Mistral Cloud account: Sebastian.Linges@rwg-r.de` (`tv4AxZ1FALgZCIVK`) |
| Embedding | `OpenAi account: RWG` (`juS4DUwSrEAgbvG3`) |

## Belegte Läufe

| Lauf | Was | Ergebnis |
|---|---|---|
| `112948` | PDF, 61 kB | 3 Chunks, 198 Wörter, alle mit Embedding |
| `112951` | `Shortcuts.xlsx`, Arbeitsmappe | 34 Zeilen, 8 Chunks, Name auf `(xlsx, Tabellen und Text).csv` umgestellt |
| `112958` | `.docx` über PDF-Wandlung | `file_extension: pdf`, `document_ai`, 3 Chunks |
| `112957` | Löschzweig, Logik echt / HTTP simuliert | `DONE_DELETED`, zwei Speicherpfade erkannt |

## Noch nicht belegt

- **PowerPoint** — derselbe Weg wie Word, aber ungetestet.
- **Textdateien** (`txt`, `csv` als Datei) — `Decode Text Like File` ist 1:1 übernommen, aber in
  dieser Fassung nicht gelaufen.
- **OCR-Ausfall** — die Rückstellungsstrecke ist übernommen, ließ sich aber nicht auslösen, weil das
  Mistral-Abo am 01.09. wieder offen war.
- **Löschzweig gegen echte Daten** — bewusst nicht getestet, weil es keinen gefahrlosen Kandidaten gab.
