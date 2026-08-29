# SharePoint Delta nach RAG

Zuleitungsflow (`bvmSDgOm1T5ciKqk`). Er holt die Änderungen aus einer SharePoint-Bibliothek und übergibt jedes Dokument an [RAG - SharePoint Ingest](https://n8n.srv1307521.hstgr.cloud/workflow/BBhGCRsQ8pdNSxTi). Er ersetzt den Power-Automate-Webhook.

Takt: stündlich (`0 * * * *`) — **der Trigger ist deaktiviert**, solange nicht jeder Dateityp einzeln belegt ist.

## Der Zustandsanker

Der Delta-Abruf von Microsoft Graph arbeitet nicht mit einem Zeitfenster, sondern mit einem **Anker**. Jeder Abruf endet mit einem `deltaLink`, der nächste Abruf mit diesem Link liefert genau das, was sich seither geändert hat.

**Der Zeitplan bestimmt damit die Verzögerung, nicht die Vollständigkeit.** Läuft der Flow drei Tage nicht, holt der nächste Abruf drei Tage nach. Es gibt kein Fenster, aus dem etwas herausfallen kann.

Belegt mit den Läufen 110436 und 110437: Der erste setzte den Anker, der zweite sah `items_im_delta: 0` statt vorher 1 752 — Graph meldete dazu ausdrücklich `syncStatus: NoChanges`.

Der Anker rückt **nur vor, wenn tatsächlich verarbeitet wurde**. Ein Trockenlauf lässt ihn stehen, sonst gingen ungelesene Änderungen verloren.

### `ankerIgnorieren` — der Rückweg

Nach dem ersten Anker sieht der Flow nur noch Änderungen. Ein PDF, das seit Monaten unverändert liegt, taucht im Delta nicht mehr auf. Soll ein bisher ausgesetzter Dateityp nachgeholt werden, erzwingt `ankerIgnorieren: true` einen Vollabruf, ohne den gespeicherten Anker zu löschen.

## Drei Schalter steuern, wie weit ein Lauf geht

| Schalter | Wirkung |
|---|---|
| `verarbeiten: false` | Nur sichten. Es wird keine Datei geholt. |
| `ingestAufrufen: false` | Verarbeiten, aber nicht übergeben. |
| `zustandSchreiben: false` | Der Anker bleibt stehen — der nächste Lauf sieht dasselbe. |

Dazu `aktiveTypen`, `maxJeTyp` und `nurDatei` (Namensfilter für gezielte Tests). **Es wird nicht eingelesen, was da ist** — der Bestand kommt nach und nach.

## Drei Wege

```
Je Aufgabe → Was tun ─┬ [datei]    Datei holen → Nach Base64 → Uebergabe Datei ─┐
                      ├ [tabelle]  Blattnamen holen → Blaetter auffaechern      │
                      │            → Blattwerte holen → Tabelle als CSV bauen ──┤
                      └ [loeschen] Loeschmeldung bauen ─────────────────────────┤
                                                                                 ↓
                                                              Ingest aufrufen ─┬ [ja]   RAG-Ingest
                                                                                └ [nein] Nur vorgemerkt
```

### Datei

PDF, Text und alles Übrige direkt über `/content`. **Word und PowerPoint** bekommen `?format=pdf` angehängt — Microsoft wandelt sie selbst um, und sie laufen durch dieselbe OCR-Strecke wie die PDFs. Kein zweiter Extraktionsweg, kein zweites Risiko.

Belegt mit Lauf 110388: 56 KB `docx` ergeben ein echtes PDF mit 108 414 Bytes und dem Dateikopf `%PDF-`. Der Ingest erkennt das PDF an seinen ersten Bytes und routet korrekt.

### Tabelle

**Der Extract-Node kann nur ein Blatt.** Er kennt `sheetName` für ein einzelnes Blatt und liest sonst lautlos nur das erste — die übrigen fehlen ohne jede Fehlermeldung.

Arbeitsmappen laufen deshalb über die Workbook-API von Graph: erst die Blattnamen, dann Blatt für Blatt der befüllte Bereich. Alle Blätter werden zu **einer CSV** zusammengefasst, mit dem Blattnamen als erster Spalte. Der Ingest verarbeitet sie über seine bestehende Tabellenstrecke, wo jede Zeile ihre Spaltennamen mitbekommt — ein Chunk-Schnitt mitten in der Tabelle zerstört so keine Bedeutung.

Der Übergabename trägt die Herkunft sichtbar: `Ergebnisse Mitarbeiterversammlung 05.02.2024 (xlsx, alle Blaetter).csv`. So rätselt im RAG niemand, woher eine CSV kommt, die es in SharePoint gar nicht gibt.

Belegt mit Lauf 110430: Eine Mappe mit **12 Blättern und 1 930 Zeilen** landete als ein Dokument mit 35 077 Wörtern im Wissensspeicher. Vorher wäre nur das erste Blatt gelesen worden.

Ausgeblendete Blätter bleiben außen vor — sie sind bewusst versteckt. Leere Blätter werden als Hinweis gemeldet, nicht als Fehler.

### Löschen

Delta meldet entfernte Einträge mit einem `deleted`-Vermerk und ohne Namen. Ohne Weitergabe blieben ihre Chunks in der Wissensbasis stehen, und der Agent antwortete aus Dokumenten, die es nicht mehr gibt. Der Ingest hat dafür einen eigenen Zweig; er braucht nur die Kennung und die Absicht.

## Metadaten aus dem Delta

Power Automate liefert heute Autor, Bereich, Version und Zeitstempel frei Haus. Ohne Ersatz verlöre der Agent genau die Felder, mit denen er Treffer einordnet:

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

**Alle vorhandenen Typen sind einzeln belegt.**

| Typ | Lauf | Ergebnis |
|---|---|---|
| `pdf` | 110458 | 174 Wörter, 3 Chunks, `mistral-ocr-latest` |
| `docx` | 110460 | 158 Wörter — über `format=pdf` gewandelt |
| `pptx` | 110462 | 1 360 Wörter, 9 Textstücke **und 20 beschriebene Bilder** |
| `txt` | 110432 | eine Datei, `semantic` |
| `xls` | 110432 | 2 555 Wörter, `relational` |
| `xlsx` | 110430 | 12 Blätter, 1 930 Zeilen, 35 077 Wörter |
| `csv`, `xlsm` | — | in der Bibliothek liegt keine Datei davon. Die Wege sind gebaut, aber nicht an echten Daten belegt |

Bei PowerPoint zeigt sich der Vorteil der PDF-Wandlung am deutlichsten: Die Folien werden gerendert, und Mistral erfasst nicht nur den Text, sondern beschreibt auch die 20 enthaltenen Bilder. Ein direkter `pptx`-Weg hätte das nicht geliefert.

### Zum Scharfschalten

1. `verarbeiten`, `ingestAufrufen` und `zustandSchreiben` auf `true`
2. Trigger `Stuendlich` aktivieren, Flow publizieren

Für eine **Erstbefüllung des Altbestands** zusätzlich `ankerIgnorieren: true` — sonst sieht der Flow nur Änderungen, und die 499 vorhandenen Dateien tauchen nie auf. Vorher die Doubletten-Frage klären.


## Ein Fallstrick, der zweimal zuschlug

In einer `splitInBatches`-Schleife liefert `$('Node').all()` **nur den letzten Durchlauf**. Die Zusammenfassung zeigte deshalb bei vier Dokumenten nur das vierte — die drei davor fehlten lautlos, ebenso Ingest-Ergebnisse und Fehlermeldungen. Die Sammelfunktion in `Zusammenfassung` zählt jetzt den Durchlaufindex hoch, bis kein Durchlauf mehr kommt.
