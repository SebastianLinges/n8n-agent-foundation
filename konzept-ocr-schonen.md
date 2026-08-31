# Mistral schonen, ohne Bilder zu verlieren

Konzept für `RAG - SharePoint Ingest` (`BBhGCRsQ8pdNSxTi`). Hebel 2 ist gebaut, belegt und publiziert; Hebel 1, 3 und 4 sind Vorschläge.

---

## Warum "OCR durch etwas Kostenloses ersetzen" der falsche Ansatz ist

Gemessen an den 258 SharePoint-Dokumenten, die über die OCR-Strecke (`extraction_mode: document_ai`) eingelesen wurden:

| Originalformat | Dokumente | mit Bildern | ohne Bilder | Bildchunks |
|---|---|---|---|---|
| pdf | 225 | 178 | 47 | 3 354 |
| docx | 32 | 24 | 8 | 499 |
| pptx | 1 | 1 | 0 | 20 |
| **gesamt** | **258** | **203 (79 %)** | **55 (21 %)** | **3 873** |

Im Schnitt 15 Bilder je Dokument, im Spitzenfall 289.

**Vier von fünf Dokumenten tragen Bilder, und die Bilder tragen den Inhalt.** Die Bibliothek besteht in weiten Teilen aus klickgenauen Anleitungen mit Bildschirmfotos — der Text daneben lautet oft nur „wie folgt vorgehen". Ein nativer Textpfad würde bei diesen Dokumenten den eigentlichen Wissensgehalt wegwerfen, und zwar unsichtbar: Der Lauf bliebe grün, die Chunkzahl fiele nur etwas kleiner aus.

Ein reiner Textextraktor ist deshalb kein Ersatz für die OCR, sondern nur eine Ergänzung für einen genau abgegrenzten Teil des Bestands.

**Die tragende Idee ist daher nicht, die OCR zu ersetzen, sondern sie nicht zu wiederholen.**

---

## Hebel 1 — OCR-Ergebnisse zwischenspeichern (größter Hebel, kein Qualitätsverlust)

`Decide Rebuild Or Skip` löst aus sechs Gründen einen Neuaufbau aus:

| Grund | Datei verändert? | OCR nötig? |
|---|---|---|
| `NEW_SOURCE` | ja, neu | **ja** |
| `CONTENT_CHANGED` | ja | **ja** |
| `RECOVERY_MISSING_CHUNKS` | nein | nein |
| `AUDIENCE_CHANGED` | nein | nein |
| `FLOW_VERSION_UPGRADE` | nein | nein |
| `METADATA_REPAIR` | nein | nein |

**Bei vier von sechs Gründen ist die Datei unverändert** — der Inhalts-Hash ist derselbe — und trotzdem läuft die komplette OCR erneut.

Das ist kein Randfall. Die Heilungsaktion am 30.08. hat 35 Dokumente wiederhergestellt, deren Dateien sich nie geändert hatten: 35 volle OCR-Aufträge für ein Ergebnis, das Mistral schon einmal geliefert hatte. Jede künftige Flow-Version, jede Änderung an `audience` und jede Reparatur löst dasselbe erneut aus.

**Vorschlag:** eine Tabelle `ocr_cache` in Supabase, Schlüssel ist der bereits berechnete `content_hash` aus `Create Source Binary Hash`. Inhalt ist das kanonische OCR-Ergebnis: Markdown je Seite, dazu die Bildliste mit den Annotationen und den Bucket-Pfaden. Vor der OCR-Strecke wird nachgeschlagen; bei Treffer wird sie umgangen und das gespeicherte Ergebnis eingespeist.

**Einbaustelle:** zwischen `Decide Rebuild Or Skip` und `Route File Family`, als zusätzlicher Zweig an `IF Rebuild Required`.

**Der Fallstrick beim Bau:** `Plan SharePoint Storage Cleanup` und `Delete Stale SharePoint Image` räumen beim Neuaufbau die alten Bilddateien aus dem Bucket. Bei einem Cache-Treffer dürfen sie das nicht — sonst verweisen die neu geschriebenen Bildchunks auf gelöschte Dateien, und niemand merkt es, weil der Lauf grün bleibt. Der Aufräumzweig braucht die Cache-Entscheidung als Bedingung.

**Was der Cache nicht leistet:** Die Erstbefüllung der 402 fehlenden Dateien fällt vollständig unter `NEW_SOURCE`. Dafür hilft er nicht. Er wirkt ab dem zweiten Anfassen einer Datei.

**Voraussetzung:** eine neue Tabelle heißt Schreibzugriff auf Supabase — nur nach Freigabe und über `apply_migration`.

---

## Hebel 2 — Der Lauf stirbt nicht mehr an einer gesperrten API (erledigt)

Vor dieser Änderung riss ein einzelner Fehler bei `Upload Source To Mistral` den ganzen Lauf mit. Belegt in `111062` und `111286`: Der Abgleich hatte drei Aufgaben, scheiterte an der ersten und hat die beiden anderen nie angefasst — obwohl darunter ein `.xlsx` sein kann, das Mistral gar nicht braucht.

**Zwei Folgen, die schwerer wiegen als die verlorene Aufgabe:**

- Die Schleife `Je Aufgabe` bricht ab, `Laufbilanz` läuft nie, es gibt keine Bilanz des Laufs.
- `Anker fortschreiben` wird nicht erreicht. Ein abgebrochener Lauf schreibt den Delta-Anker nicht fort — genau der Fallstrick, der tagelang unbemerkt bleibt.

**Gebaut:** `onError: continueErrorOutput` an den drei Mistral-Nodes, dahinter der Code-Node `Dienst nicht verfuegbar`, der einordnet, nach `ingestion_errors` protokolliert und über `Ingest Error Summary` in die Schleife zurückführt. Die Laufbilanz zählt `zurueckgestellt` getrennt von `fehler`. Aufbau und Fallstricke stehen in [flows/rag-sharepoint-ingest/README.md](flows/rag-sharepoint-ingest/README.md).

**Belegt** in den Läufen 111419 und 111424: derselbe Fall, der vorher rot abbrach, endet grün mit `zurueckgestellt: 1`, `fehler: 0` und geschriebenem Anker. Die Fehlerzeile enthält keine Zugangsdaten.

**Publiziert.** Dazu meldet der Flow zurückgestellte Dateien per Telegram, damit ein grüner Lauf mit liegengebliebener Arbeit nicht lautlos bleibt.

Das spart kein Kontingent, aber es sorgt dafür, dass eine Sperre nur die OCR-Aufgaben kostet und nicht die Nacht.

---

## Hebel 3 — Nativer Textpfad für nachweislich bildlose Dokumente

Für die gemessenen 21 % ohne Bilder ist die OCR reine Verschwendung — und ausgerechnet die teuersten Aufträge fallen darunter: Die Regaletiketten-PDF tragen 3 640 bis 11 541 Wörter über hunderte Seiten und **null Bilder**. Mistral rechnet nach Seiten; das sind die größten Rechnungen im Bestand für Etikettentext.

n8n kann das nativ: `Extract From File` liest die Textebene eines PDF ohne API und ohne Kontingent — derselbe Node-Typ, der im Flow schon für CSV und XLSX arbeitet.

**Die Entscheidung muss vor dem Upload fallen, sonst ist sie wertlos.** Zwei Prüfungen, beide auf den bereits geladenen Bytes, ohne Fremddienst:

- **docx und pptx** sind ZIP-Dateien. Die enthaltenen Pfade stehen im Klartext im Verzeichnis der Datei — die Suche nach `word/media/` beziehungsweise `ppt/media/` beantwortet zuverlässig, ob überhaupt Bilder enthalten sind.
- **PDF:** Bild-XObjects hinterlassen `/Subtype/Image` im Dateikopfbereich. Das ist eine Heuristik, keine Garantie.

**Regel:** nur wenn die Datei keine Bilder trägt **und** der native Extract eine belastbare Textmenge liefert, wird der native Pfad genommen. Liefert er wenig oder nichts, ist es ein Scan — dann führt kein Weg an der OCR vorbei.

**Ungeprüft und vor dem Bau zu messen:** ob die PDF-Heuristik trägt, und wie viele der 186 noch fehlenden PDF eine Textebene haben. Beides ist an ein paar Dateien messbar, sobald das Abo wieder läuft — die Gegenprobe braucht ein OCR-Ergebnis zum Vergleich.

**Grenze:** Nach der Graph-Wandlung nach PDF ist das Originalformat nicht mehr erkennbar — in der Wissensbasis tragen alle 258 Dokumente `file_extension: pdf`. Die Prüfung muss deshalb vor der Wandlung an der Originaldatei stattfinden.

---

## Hebel 4 — Deckel für Riesendokumente

Ein Dokument mit hunderten Etikettenseiten verbraucht ein Vielfaches eines normalen Dokuments und trägt wenig Wissen bei. Eine Obergrenze für Seiten je Dokument in der `Steuerung`, die solche Fälle bewusst zurückstellt statt sie durchzuschieben, wäre billig zu bauen. Ob sie gewollt ist, ist eine fachliche Entscheidung, keine technische.

---

## Was nichts bringt

`include_image_base64: false` zu setzen spart kein Kontingent — es ändert nur, ob die Bilder mitgeliefert werden. Ohne sie entfielen die Bildchunks, und das ist genau das, was nicht passieren soll.

---

## Reihenfolge

1. **Hebel 2** ist erledigt.
2. **Hebel 1** als eigentliche Ersparnis. Braucht eine Freigabe für die neue Tabelle und sorgfältige Behandlung des Bucket-Aufräumens.
3. **Hebel 3** erst nach einer Messung an echten Dateien. Ohne diese Messung ist er eine Vermutung.
4. **Hebel 4** nur, wenn du die Etikettendokumente überhaupt im Bestand haben willst.
