# SharePoint Delta nach RAG

Zuleitungsflow (`iWTELblNOt46LhhF`). Er holt die Änderungen aus einer SharePoint-Bibliothek und übergibt jedes Dokument an [RAG - SharePoint Ingest](https://n8n.srv1307521.hstgr.cloud/workflow/BBhGCRsQ8pdNSxTi). Damit löst er Power Automate ab.

Takt: stündlich (`0 * * * *`) — **der Trigger ist deaktiviert**, solange nicht alle Dateitypen einzeln belegt sind.

## Warum überhaupt

Bis heute schiebt ein Power-Automate-Flow jede Änderung als Webhook nach n8n, mit der Datei als Base64 im Text. Das funktioniert, hat aber drei Nachteile: Der Umfang steht außerhalb von n8n und ist von hier nicht einsehbar, ein Ausfall fällt niemandem auf, und was in der Ausfallzeit passiert, ist verloren.

Der Delta-Abruf von Microsoft Graph arbeitet stattdessen mit einem **Zustandsanker**. Jeder Abruf endet mit einem `deltaLink`, der nächste Abruf mit diesem Link liefert genau das, was sich seither geändert hat.

**Der Zeitplan bestimmt damit die Verzögerung, nicht die Vollständigkeit.** Läuft der Flow drei Tage nicht, holt der nächste Abruf drei Tage nach. Es gibt kein Zeitfenster, aus dem etwas herausfallen kann.

## Was der Delta-Abruf liefert

| Fall | Wie er erkannt wird |
|---|---|
| Löschung | Der Eintrag trägt einen `deleted`-Vermerk |
| Neuanlage | Der Eintrag kommt, hat aber keine Entsprechung in `sharepoint_documents` |
| Änderung | Der Eintrag kommt, der Inhalts-Hash weicht ab |
| Verschiebung | Der Eintrag kommt, der Hash ist gleich — nur Pfad und Name werden nachgezogen |

Die Unterscheidung zwischen Neuanlage und Änderung trifft der Ingest ohnehin selbst über den Inhalts-Hash. Unersetzlich ist nur die Löschmeldung, und die liefert Delta.

## Aufbau

```
Manueller Start ─┐
Stuendlich [AUS] ─┴→ Config → Zustand laden → Delta abrufen
                     → Kandidaten bestimmen → Verarbeiten ─┬ [nein] Zusammenfassung
                                                            └ [ja]  Kandidaten auffaechern
                                                                    → Je Dokument (Schleife)
                                                                      → Datei holen → Nach Base64
                                                                      → Uebergabe bauen
                                                                      → Ingest aufrufen ─┬ [ja]   RAG-Ingest
                                                                                          └ [nein] Nur vorgemerkt
```

## Drei Schalter steuern, wie weit ein Lauf geht

Sie stehen in `Config` und sind der Grund, warum sich jeder Dateityp einzeln prüfen lässt, ohne den Bestand zu bewegen:

| Schalter | Wirkung |
|---|---|
| `verarbeiten: false` | Nur sichten. Es wird keine Datei geholt. |
| `ingestAufrufen: false` | Dateien werden geholt, aber nicht übergeben. |
| `zustandSchreiben: false` | Der Anker bleibt stehen — der nächste Lauf sieht dasselbe. |

Dazu `aktiveTypen` und `maxJeTyp`: Der Flow verarbeitet nur die genannten Endungen und davon höchstens so viele je Typ. **Es wird nicht eingelesen, was da ist** — der Bestand kommt nach und nach.

## Word und PowerPoint über die PDF-Wandlung

`Datei holen` hängt für `docx`, `doc`, `pptx` und `ppt` ein `?format=pdf` an die Graph-URL. Microsoft wandelt die Datei dann selbst um, und sie läuft durch dieselbe OCR-Strecke wie die PDFs — kein zweiter Extraktionsweg, kein zweites Risiko.

Belegt mit Lauf 110388: 56 KB `docx` ergeben ein echtes PDF mit 108 414 Bytes und dem Dateikopf `%PDF-`.

Der Ingest erkennt das PDF an seinen ersten Bytes und routet korrekt, obwohl der Dateiname weiter auf `.docx` endet. Das ist gewollt — der Anwender soll den Originalnamen sehen.

## Metadaten kommen aus dem Delta

Power Automate liefert heute Autor, Bereich, Version und Zeitstempel frei Haus. Ohne Ersatz verlöre der Agent genau die Felder, mit denen er Treffer einordnet. Der Delta-Abruf liefert sie mit:

- `createdBy` / `lastModifiedBy` → Autor und letzter Bearbeiter
- `createdDateTime` / `lastModifiedDateTime` → Zeitstempel
- `webUrl` → anklickbare Dokument-URL
- `eTag` → Version
- **Bereich** wird aus dem obersten Ordner unter der Bibliothekswurzel abgeleitet

## Der zweite Eingang am Ingest

Der Ingest-Flow hat einen zusätzlichen Trigger `Aufruf aus Delta-Leser` bekommen, der neben dem Webhook in `Config` mündet. Beide Wege übergeben dieselben Feldnamen und laufen von dort identisch. Der Webhook bleibt unberührt — Power Automate kann weiterlaufen, bis umgeschaltet wird.

## Zustandsspeicher

Data Table `sharepoint_delta` (`RbdhNeubkrmgZkOC`), eine Zeile je Bibliothek: `drive_id`, `drive_name`, `delta_link`, `aktualisiert_am`, `letzte_items`, `letzte_uebergeben`.

`Zustand laden` trägt `alwaysOutputData`, weil eine leere Tabelle sonst kein Item liefert und die Kette dort endet.

## Stand der Dateitypen

| Typ | Stand |
|---|---|
| `txt` | belegt, Lauf 110396 — zwei Dokumente eingelesen |
| `xlsx` | belegt, Lauf 110401 — ein Dokument, 2 189 Wörter, `relational` |
| `xls` | belegt, Lauf 110404 |
| `pdf` | **blockiert** — Lauf 110391 endete mit HTTP 402 von `api.mistral.ai` |
| `docx`, `pptx` | blockiert, laufen über dieselbe OCR-Strecke |
| `csv`, `xlsm` | nicht prüfbar — in der Bibliothek liegt keine einzige Datei davon |

Die Sperre bei PDF, Word und PowerPoint liegt **nicht an diesem Flow**. Das Guthaben bei Mistral steht auf null; die Kette läuft nachweislich bis dorthin.

## Was noch offen ist

`xlsx` liest bisher nur das erste Blatt. Der Extract-Node kennt nur `sheetName` für ein einzelnes Blatt, keine Option für alle. Die Workbook-API von Graph liefert die Blattnamen — belegt mit Lauf 110400 — der Umbau steht aber noch aus.
