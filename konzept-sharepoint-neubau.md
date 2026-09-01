# SharePoint-Ingest neu schneiden

Bauplan für die Ablösung von `RAG - SharePoint Ingest` (`BBhGCRsQ8pdNSxTi`) durch zwei Flows.
Entschieden am 01.09.2026. Die Verarbeitung wird **umgezogen, nicht neu geschrieben**.

## Stand 01.09.2026

**Etappen 0 bis 3 sind vollzogen: gebaut, belegt und am 01.09. um 18:25 umgeschaltet.**

| | | Nodes | Stand |
|---|---|---|---|
| ① | [RAG - SharePoint Steuerung](flows/rag-sharepoint-steuerung/README.md) `PAqphQur0CTQRypM` | 23 | publiziert und aktiv, beide Zeitpläne registriert |
| ② | [RAG - SharePoint Verarbeitung](flows/rag-sharepoint-verarbeitung/README.md) `coDhu7pIaI2bpmGZ` | 82 | publiziert und aktiv, heißt in n8n `RAG - SharePoint Ingest` |
| — | Vorgänger `BBhGCRsQ8pdNSxTi` | 109 | **deaktiviert**, heißt jetzt `… OLD` |

**Genau eine Steuerung ist aktiv.** Der Rückweg bleibt der alte Flow: aktivieren, ① abschalten —
nie beide gleichzeitig, sie tragen dieselben Cron-Zeiten und denselben Anker.

Belegte Läufe stehen in [tests/laufprotokoll.csv](tests/laufprotokoll.csv): Trockenlauf-Gegenprobe
(`112947`), PDF (`112948`), Arbeitsmappe (`112951`), Word über PDF-Wandlung (`112958`), Löschzweig
mit Pin-Daten (`112957`) und der erste Lauf über die volle Kette nach dem Publizieren (`112961`,
drei Dokumente).

**Der kritischste Punkt ist gemessen:** Der Inhaltshash ist zeichengleich geblieben, obwohl die
Hash-Quelle sich geändert hat. Belegt über zwei inhaltsgleiche Kopien mit identischem `content_hash`
— die eine vom alten Flow, die andere von der neuen Kette. Beim Umschalten gilt damit kein
Bestandsdokument fälschlich als geändert.

**Offen: Etappe 4 und 5** — eine Nacht beobachten, Mengenbremse neu ausloten, aufräumen. Die
Schritte stehen in
[offene-punkte.md](offene-punkte.md#der-ingest-ist-in-zwei-flows-geschnitten---am-0109-umgeschaltet).

**Abweichungen vom Plan unten**, bewusst und belegt:

- `Normalize SharePoint Input` **behält seinen Namen**, statt in der Verarbeitung aufzugehen. Neun
  Knoten lesen ihn über `$('Normalize SharePoint Input')`; ihn umzubenennen hätte neun
  Codeänderungen gekostet, ohne etwas zu verbessern.
- `Was tun` ist **ein** Switch mit drei Ausgängen (`datei`, `arbeitsmappe`, `loeschen`) statt zweier
  hintereinander.
- `Startbereiche` kennt zusätzlich **Startparameter für den Handstart** (`nurDatei`, `nurBereich`,
  `maxJeLauf`, `verarbeiten`, `zustandSchreiben`). `verarbeiten: false` + `zustandSchreiben: false`
  ergeben den Trockenlauf, der die Gegenprobe aus Etappe 2 überhaupt erst gefahrlos möglich machte.
- Der **Verwaist-Befund greift nur beim vollen Bestand** — ein auf einen Dateinamen eingeschränkter
  Lauf sieht die übrigen Dokumente nicht und darf sie nicht für verwaist halten. Im Vorgängerflow
  konnte der Fall nicht auftreten.

---

---

## Warum

Gemessen am Export vom 31.08.: 109 Nodes, davon 46 Code-Nodes mit 2 475 Zeilen, 127 Kanten.

Die Größe ist nicht das Problem. Das Problem ist, dass zwei Aufgaben in einem Canvas ineinander
verwoben sind:

- `Config` wird von **drei** Stellen angesprungen — vom abgeschalteten Webhook, aus der
  Aufgabenschleife über `Uebergabe brauchbar` und über `Loeschmeldung bauen`.
- **Vier** verschiedene Enden der Verarbeitung führen zurück in die Schleife `Je Aufgabe`:
  `Workflow Summary`, `Delete Workflow Summary`, `Ingest Error Summary`, `No Change Summary`.
- Die Beschaffung ist geteilt. Der Scanner lädt die Datei als Base64 und baut bei Arbeitsmappen
  die CSV selbst (168 Zeilen) — die Formatlogik liegt damit an zwei Orten, `Route Spreadsheet Type`
  in der Verarbeitung und `Tabelle als CSV bauen` im Scanner.
- Der Base64-Umweg kostet vier Nodes, die es nur wegen des falschen Schnitts gibt:
  `Nach Base64` → `Uebergabe Datei` → `Convert Source To Binary` → `Restore Metadata After Binary`.
  Die Datei wird binär geholt, zu Text gemacht, durch JSON geschoben und wieder binär gemacht.
- `Normalize SharePoint Event` (104 Zeilen) vereinheitlicht Webhook- und Schleifenformat.
  Ohne Webhook hat der Node keinen Zweck mehr.
- Die Laufart wird geraten statt gesetzt: `Steuerung` fragt `isExecuted` dreier Trigger ab, weil
  n8n beim Handstart den erstbesten Trigger nimmt.

Das Muster für den sauberen Schnitt läuft im Haus schon: `RWG Steuerung - Confluence Bereiche`
(`MNQGEjBNyaYhkbSy`) ruft `RAG-Confluence-Ingest` je Bereich auf. SharePoint ist der einzige
Ingest, der beides in einem Flow hält.

---

## Zielbild — zwei Flows

```
┌─ ① RAG - SharePoint Steuerung ────────────┐   ┌─ ② RAG - SharePoint Verarbeitung ─┐
│  Stuendlich / Taeglich / Manuell          │   │  Auftrag rein, Ergebnis raus      │
│  Startbereiche (1..n)                     │   │                                   │
│  Bestand ab Startordner (Graph delta)     │   │  Beschaffen                       │
│  Aufgaben bestimmen                       │   │  Zu Text machen                   │
│  Mengenbremse, Notbremse                  │   │  In die Wissensbasis              │
│  Je Auftrag ──────── Auftrag ─────────────┼──▶│                                   │
│           ◀───────── Ergebnis ────────────┼───┤  ein Ausgang: Ergebnis            │
│  Anker fortschreiben, Laufbilanz, Meldung │   │                                   │
└───────────────────────────────────────────┘   └───────────────────────────────────┘
```

Der Zeitplan und der Anstoß von Hand liegen im selben Flow ①. Die Urbefüllung ist **kein eigener
Zweig** — sie ist derselbe Lauf mit anderen Startparametern: Startbereich gesetzt, Anker ignoriert,
`maxJeLauf` hoch. Ein Weg statt zwei, die auseinanderlaufen können.

---

## Der Auftrag — der Vertrag zwischen beiden

Ein Objekt je Datei. **Nichts Binäres über die Flowgrenze.** ② holt die Datei anhand von
`driveId` und `itemId` selbst.

```
aktion    anlegen | aktualisieren | loeschen
bereich   driveId, startordner, bezeichnung, siteUrl
datei     itemId, name, pfad, endung, groesse, geaendert_am, etag, webUrl
ziel      doc_id, alt_doc_id?
lauf      lauf_id, grund: delta | abgleich | urbefuellung | handstart
vorgaben  audience, maxDateiMb, maxZeilenJeBlatt
```

Die Antwort, ebenfalls ein Objekt:

```
status    eingelesen | unveraendert | geloescht | zurueckgestellt | fehler
doc_id, datei, chunks, bilder, grund, dauer_ms
```

`status` ist die einzige Grundlage der Laufbilanz. `zurueckgestellt` bleibt von `fehler` getrennt,
wie heute.

---

## ① RAG - SharePoint Steuerung

```
Stuendlich (Delta)  ─→ Laufart delta ──┐
Taeglich (Abgleich) ─→ Laufart abgleich┼─→ Startbereiche ─→ Anker laden
Manueller Start ────→ Laufart handstart┘                        ↓
                                                        SharePoint-Bestand   (Graph delta, paginiert)
                                                        Bestand filtern      (Typen, ~$-Sperrdateien, Größe)
                                                        Wissensbasis-Bestand
                                                        Chunkzahlen laden
                                                        Aufgaben bestimmen
                                                        Notbremse            (>20 % verwaist → melden)
                                                        Mengenbremse
                                                              ↓
                                                        Etwas zu tun ─[nein]─────────┐
                                                              ↓ [ja]                 │
                                                        Je Auftrag (batchSize 1)     │
                                                          → Verarbeitung aufrufen    │
                                                          → Ergebnis merken          │
                                                              ↓ [fertig]             │
                                                        Anker sichern → Anker fortschreiben
                                                              ↓                      │
                                                        Laufbilanz ◀─────────────────┘
                                                        Etwas zurueckgestellt → Rueckstellung melden
```

**Keine Bereichsschleife.** `Startbereiche` gibt ein Item je Bereich aus; die HTTP- und
Data-Table-Nodes dahinter laufen ohnehin je Item. Die Zuordnung der Antworten zum Bereich läuft
über `parentReference.driveId` aus der Graph-Antwort und über `drive_id` in der Ankerzeile.
Sollte sich das beim Bau als unzuverlässig erweisen, ist eine Schleife um den Block der Rückfallweg.

**Die Laufart wird gesetzt, nicht geraten.** Je Trigger ein Set-Node. Damit entfällt die
`isExecuted`-Abfrage samt ihrem Kommentar.

**Der Startbereich auf hoher Ebene** ist der einzige Unterschied zum heutigen Abruf: statt
`/drives/{driveId}/root/delta` heißt es `/drives/{driveId}/items/{ordnerItemId}/delta`. Alles
darunter kommt paginiert nach — die Schleife über den Ordner ist die Paginierung, die schon steht.
Ob Graph Delta auf einem Unterordner zuverlässig liefert, ist beim Bau zu **belegen**; der
Rückfallweg ist `/root/delta` mit einem Pfadfilter auf `parentReference.path`.

---

## ② RAG - SharePoint Verarbeitung

```
Auftrag (Execute Workflow Trigger)
  → Auftrag pruefen        Vertrag prüfen, Vorgaben ergänzen
  → Vorgaben               Chunkgröße, Embedding-Modell, Bucket   (das heutige Config)
  → Was tun ─┬─ loeschen ──→ Bildchunks finden → Speicher leeren → Chunks löschen
             │                 → Eintrag löschen ──────────────────────────────┐
             └─ einlesen ↓                                                     │
  → Beschaffen (Switch nach Familie)                                           │
       pdf, txt, csv          Datei holen  /content                            │
       docx, doc, pptx, ppt   Datei holen  /content?format=pdf                 │
       xlsx, xlsm             Blattnamen → Blaetter auffaechern → Blattwerte   │
       sonst                  Nicht unterstuetzt ───────────────────────┐      │
  → Zu Text machen                                                      │      │
       OCR-Strecke      Upload → Signed URL → OCR      (Fehlerausgang ┐)│      │
       Tabellenstrecke  CSV bauen, Kopfzeile suchen                   ││      │
       Textstrecke      Kodierung erkennen                            ││      │
       ⇒ Kanonischer Inhalt { text, bilder[], metadaten }             ││      │
  → Inhalt brauchbar? ─[nein]───────────────────────────────────┐     ││      │
       ↓ [ja]                                                   │     ││      │
  → Hash bilden → Bestand pruefen → Neuaufbau noetig?           │     ││      │
       [nein] Zeitstempel auffrischen ────────────────────┐     │     ││      │
       [ja]  Eintrag vormerken → Bilder hochladen         │     │     ││      │
             → Chunks bauen → Embedding-Schleife          │     │     ││      │
             → Chunks schreiben → Verwaistes raeumen      │     │     ││      │
             → Eintrag abschliessen ─────────────────┐    │     │     ││      │
                                                     ↓    ↓     ↓     ↓↓      ↓
                                                   ═══ Ergebnis ═══════════════
```

**Ein Ausgang.** Alle sieben Wege — eingelesen, unverändert, gelöscht, zurückgestellt,
nicht brauchbar, nicht unterstützt, Fehler — münden in einen `Ergebnis`-Node. Das ersetzt die
heutigen vier Rückkanten in die Schleife.

**Die Naht zwischen Extraktion und Persistenz ist der kanonische Inhalt.** Sie existiert heute
schon: `Build OCR Canonical Content` und `Build Tabular Canonical Content` münden beide in
`IF Content Usable`. Sie wird nur nicht als Grenze behandelt. Wenn später ein quellenneutraler
Schreiber für Confluence und Jira gebaut wird, ist das die Stelle zum Aufschneiden — heute nicht.

---

## Was aus den 109 Nodes wird

| Alt | Neu | |
|---|---|---|
| `Steuerung`, `Anker laden`, `SharePoint-Bestand`, `Wissensbasis-Bestand`, `Chunkzahlen laden`, `Aufgaben bestimmen`, `Etwas zu tun`, `Aufgaben auffaechern`, `Je Aufgabe`, `Anker sichern`, `Ankerzeile bauen`, `Anker fortschreiben`, `Laufbilanz`, `Etwas zurueckgestellt`, `Rueckstellung melden` | ① | bleiben inhaltlich, `Steuerung` verliert das Trigger-Raten |
| `Was tun`, `Datei holen`, `Blattnamen holen`, `Blaetter auffaechern`, `Blattwerte holen`, `Tabelle als CSV bauen`, `Loeschmeldung bauen` | ② | wandern — Beschaffung gehört zur Verarbeitung |
| die gesamte Verarbeitungskette von `Normalize SharePoint Input` bis `Finalize SharePoint Source`, der Löschzweig, die OCR-Strecke, `Dienst nicht verfuegbar`, `Log Ingest Error To Supabase` | ② | unverändert übernommen |
| `Config` | ② | wird zu `Vorgaben` |
| `Webhook SharePoint`, `Aufruf aus Delta-Leser` | — | entfallen ersatzlos |
| `Normalize SharePoint Event` (104 Zeilen) | — | entfällt mit dem Webhook |
| `Nach Base64`, `Uebergabe Datei`, `Uebergabe brauchbar`, `Convert Source To Binary`, `Restore Metadata After Binary` | — | entfallen mit dem Base64-Umweg |
| `Workflow Summary`, `Delete Workflow Summary`, `Ingest Error Summary`, `No Change Summary` | ② | werden **ein** `Ergebnis`-Node |

Grob geschätzt bleiben rund 20 Nodes in ① und rund 60 in ②. Die Zahl der Rückkanten fällt von
vier auf null, die der Einsprungstellen in die Verarbeitung von drei auf eine.

---

## Etappen

**Etappe 0 — Gerüst.** Braucht keine OCR, kann sofort laufen.
② anlegen mit `Auftrag (Execute Workflow Trigger)`, `Auftrag pruefen`, `Vorgaben`, `Was tun`,
`Beschaffen` und einem vorläufigen `Ergebnis`. Test gegen gepinnte Aufträge: eine PDF, eine DOCX,
eine XLSX. Abnahme: die Datei kommt binär beim Extraktionseingang an, die Metadaten stehen daneben.

**Etappe 1 — Verarbeitung vollständig.** Braucht laufendes Mistral-Abo.
Die Verarbeitungskette 1:1 übernehmen, alle Enden auf `Ergebnis` führen.
Abnahme: je ein Lauf für PDF, DOCX, PPTX, XLSX, TXT, Löschung, unveränderte Datei und einen
erzwungenen OCR-Ausfall. Jeder Lauf mit Execution-ID in `tests/laufprotokoll.csv`.

**Etappe 2 — Steuerung.** ① neu bauen, ohne Zeitplan, nur Handstart.
Abnahme in zwei Schritten: erst `nurDatei` auf eine einzelne Datei, dann ein **Trockenlauf mit
`verarbeiten: false`** — die Aufgabenliste muss der des alten Flows entsprechen. Das ist die
entscheidende Gegenprobe; sie kostet nichts und deckt Abweichungen in `Aufgaben bestimmen` auf.

**Etappe 3 — Umschalten.** Alter Flow deaktiviert, Zeitpläne in ①. Eine Nacht beobachten.
Der Rückweg ist billig: beide schreiben in dieselben Tabellen und denselben Anker, kein Datenumbau.
Rückfall heißt alten Flow aktivieren, ① abschalten.

**Etappe 4 — Mengenbremse neu ausloten.** Ohne den flowweiten Code-Node-Sammler entfällt der
Grund für `maxJeLauf: 3`. Wie weit die Grenze steigen kann, ist zu **messen**, nicht zu schätzen.
Hier entscheidet sich, ob die Erstbefüllung von rechnerisch 130 Nächten herunterkommt.

**Etappe 5 — Bereinigung.** Siehe unten.

---

## Bereinigung

- **Power-Automate-Flow in SharePoint entfernen.** Er zeigt auf
  `.../webhook/8e16e07b-d272-4147-a2a2-80694afd9007`. Liegt außerhalb von n8n und muss dort
  abgeschaltet werden — erst danach kann die Webhook-Ecke ersatzlos verschwinden.
- **Alter Flow** `BBhGCRsQ8pdNSxTi` archivieren, nicht sofort löschen. Nach einer Woche ohne
  Rückfall löschen.
- **Repo:** `flows/rag-sharepoint-steuerung/` und `flows/rag-sharepoint-verarbeitung/` anlegen,
  `flows/rag-sharepoint-ingest/` auflösen. Die Betriebserfahrung aus dessen README — Bildfehler,
  Dienstausfall, die zwei Fallstricke — wandert in die README von ②, die Delta-Erklärung in die von ①.
  README-Tabelle im Wurzelverzeichnis nachziehen.
- **`alt_doc_id`-Heilung** bleibt, solange Dokumente mit `RWGID`-Kennung in der Wissensbasis
  stehen. Sie fällt weg, sobald das gemessen null ist — nicht vorher, und nicht auf Verdacht.

---

## Was bewusst nicht dazugehört

- **Kein quellenneutraler Schreiber** für Confluence und Jira. Wäre sauberer, greift aber in zwei
  laufende Ingests ein. Die Naht wird vorbereitet, nicht aufgeschnitten.
- **Kein Webhook**, in keiner Form, auch nicht als Rückweg.
- **Keine Änderung an den Tabellen** der Wissensbasis. Beide Flows schreiben, was heute geschrieben
  wird. Der Umbau ist umkehrbar, solange das so bleibt.
- **Kein OCR-Zwischenspeicher.** Hebel 1 aus [konzept-ocr-schonen.md](konzept-ocr-schonen.md)
  bleibt ein eigenes Vorhaben; er braucht eine Freigabe für eine neue Tabelle und hat mit dem
  Schnitt nichts zu tun.
