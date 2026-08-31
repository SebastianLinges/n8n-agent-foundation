# RWG ProzessHub nach SharePoint

Spiegelt den Confluence-Bereich **ProzessHub** als HTML-Dokumente in eine SharePoint-Bibliothek, damit Beschäftigte ohne Confluence-Lizenz die Prozessbeschreibungen lesen können (`Muss6GBGPuG9fjE2`).

Der Flow ist **autark**: eigener Zustand in der n8n Data Table `prozesshub_spiegel`, kein Bezug zum RAG-Ingest und keine gemeinsame Datenhaltung mit ihm. Eine spätere Erweiterung auf weitere Bereiche mit eigenen Regeln ist vorgesehen.

**Stand: aktiv.** Publiziert, `Naechtlicher Lauf 02 Uhr` scharf. Belegt an vier Läufen vom 31.08.: `111432` baute den Bereich vollständig auf — 260 Seiten erkannt, 175 Prozessdokumente abgelegt, 1,99 MB, 16,7 Sekunden. `111433` schrieb unmittelbar danach nichts mehr (2,6 Sekunden, 260-mal `unveraendert`). `111440` und `111456` belegen den Löschpfad.

## Aufbau

`Manueller Start` → `Config` → `Bereich aufloesen` → `Bereichsordner laden` → `Seiten laden` → `Seiten normalisieren` → `Bestand laden` → `Abgleich` → `Was ist zu tun`

Der Wegweiser hat drei Ausgänge:

| Ausgang | Kette |
|---|---|
| **spiegeln** | `Dokument bauen` → `Datei schreiben` → `Bestand fortschreiben` → `Zusammenfassung` |
| **entfernen** | `Datei entfernen` → `Bestandszeile entfernen` |
| **nichts zu tun** | direkt → `Zusammenfassung` |

Der dritte Ausgang ist kein Beiwerk: Ohne ihn endet ein Lauf, in dem sich nichts geändert hat, stumm am Wegweiser und hinterlässt keine Meldung.

## Die drei Ebenen des ProzessHubs

Der Bereich ist dreistufig aufgebaut, und die oberste Ebene verhält sich anders als die beiden darunter:

| Ebene | Beispiel | Was es in Confluence ist |
|---|---|---|
| **H1 Bereich** | `AS – Arbeitsschutz & ASA` | **Ordner**, keine Seite |
| **H2 Prozessgruppe** | `AS-01 – Arbeitsschutzorganisation & ASA` | Seite mit eigenem Inhalt |
| **H3 Prozess** | `AS-01-01 – ASA-Sitzung durchführen` | Seite |

Weil die H1-Ebene aus Ordnern besteht, taucht sie in **keiner Seitenliste** auf. Deshalb holt `Bereichsordner laden` sie getrennt über die Nachfahren der Bereichs-Startseite. Es gibt **keine gepflegte Bereichstabelle** im Code — die Namen kommen aus Confluence und können dort nicht veralten.

`Seiten normalisieren` ordnet Seiten und Ordner über das Kürzel im Titel einander zu (`AS-01-01` → `AS`) und bricht ab, wenn zu einem Kürzel kein Ordner existiert.

## Zielstruktur in SharePoint

Site *Qualitätsmanagement und Prozessbeschreibungen*, Bibliothek **Freigegebene Dokumente** (in der Oberfläche als *Dokumente* beschriftet). Angesprochen wird sie über die Graph-Site-ID, nicht über den Pfad — der Pfadzugriff scheitert an Sonderzeichen im Site-Namen. Die Bereichsordner entstehen direkt darin, ohne Zwischenebene:

```
<H1-Bereichsordner>/
   <H2-Gruppenordner>/
      <H3-Prozess>.html
```

Beispiel aus Lauf 110360:

```
IT - Informationstechnologie/IT-04 IT-Support und Service Management/IT-04-01 IT-First-Level-Support leisten.html
```

**Die H2-Gruppenseite wird nur zum Ordner, nicht zum Dokument.** Sie liefert den Ordnernamen und wird dafür weiterhin gelesen — abgelegt wird sie nicht. Der Schalter `gruppenseitenSpiegeln` in `Config` kehrt das um, falls ihr fachlicher Inhalt später doch gebraucht wird; er steht auf `false`.

**Leere Gruppenordner entstehen nicht.** Graph legt einen Ordner erst an, wenn eine Datei hineingeschrieben wird. Im IT-Lauf gab es zehn Gruppen, aber nur sechs Ordner — vier Gruppen haben in Confluence noch keine Prozessseiten.

**Die Ordner legt Graph selbst an.** Beim pfadbasierten Schreiben entstehen fehlende Zwischenebenen automatisch — belegt am Testlauf, der `ZZ TEST n8n/Unterordner/probe.html` in einem Zug erzeugt hat. Ein eigener Node zum Anlegen der Ordner ist deshalb nicht nötig und wurde wieder entfernt.

Ordner- und Dateinamen laufen durch `sicherName()`: Die in SharePoint verbotenen Zeichen `" * : < > ? / \ |` werden zu Bindestrichen, Gedankenstriche ebenso, `&` wird zu „und". Aus `GF – Unternehmenssteuerung / Geschäftsführung` wird `GF - Unternehmenssteuerung - Geschäftsführung`.

## Was ausgeklammert bleibt

- Seiten mit Präfix `00` (Orientierung und Allgemeines)
- Alles, dessen Titel der Systematik `KÜRZEL-NN[-NN] – Klartext` nicht folgt, etwa `TEST SEITE BPMN`
- Bereiche ohne Seiten, etwa `VK – Vertrieb` und `QM – Qualitätsmanagement`

## Änderungserkennung

`Seiten normalisieren` bildet je Seite einen `content_hash` aus Titel und Inhalt. `Abgleich` vergleicht ihn mit dem Bestand des letzten Laufs und setzt je Seite `aktion` auf `spiegeln`, `entfernen` oder `nichts`.

Belegt in Lauf 111433: Der ganze Bereich ein zweites Mal gelaufen ergab 260-mal `nichts` und keine einzige Neuaufbereitung — 2,6 Sekunden statt 16,7.

### Warum der Zustand vorher leer blieb

`Bestand fortschreiben` schrieb bis zum 31.08. in **jede Spalte `null`**. Der Grund steckt in der Reihenfolge: `Datei schreiben` ist ein HTTP-Node, und seine Graph-Antwort **ersetzt** die Item-Daten. Zwei Nodes weiter griff `$json.page_id` deshalb ins Leere — ebenso die Filterbedingung des Upserts und dieselbe Stelle in `Bestandszeile entfernen`.

Die Folge war doppelt. Die Änderungserkennung lief leer, jeder Lauf schrieb alle Dokumente neu. Und der **Löschpfad war tot**, weil `Abgleich` ohne Bestand nie eine fehlende Seite finden konnte — eine in Confluence gelöschte Seite wäre für immer in SharePoint stehen geblieben.

Alle Feldbezüge in `Bestand fortschreiben` zeigen jetzt auf `$('Dokument bauen').item.json`, `sp_item_id` kommt aus `$('Datei schreiben').item.json.id`. `Bestandszeile entfernen` filtert über `$('Was ist zu tun').item.json.page_id`. **Wer hier etwas anfasst, muss das im Kopf behalten: hinter einem HTTP-Node ist `$json` die Antwort des Dienstes, nicht mehr der eigene Datensatz.**

**`neuAufbauen` in `Config`** erzwingt das Neuschreiben aller Seiten, auch wenn sich der Inhalt nicht geändert hat. Der `content_hash` bildet nämlich nur die Confluence-Seite ab, nicht die Aufbereitung — ohne diesen Schalter bliebe eine Änderung am Template unsichtbar. Nach Gebrauch wieder auf `false` setzen, sonst schreibt jeder Lauf alles neu.

## Bereiche ohne Ordner

Ein Kürzel ohne passenden Ordner auf der H1-Ebene **hält den Lauf nicht an.** Die betroffenen Seiten werden übersprungen und in der Zusammenfassung gemeldet:

```
uebersprungen_bereiche_ohne_ordner: ["UWP"]
uebersprungen_seiten: 4
ordner_ohne_kuerzel_im_namen: ["Unternehmensweite Prozesse"]
```

Das war zuerst anders gebaut — ein fehlender Ordner brach den ganzen Lauf ab. Der erste vollständige Durchlauf zeigte, warum das falsch ist: Ein einziger neu angelegter Bereich hätte die Spiegelung aller übrigen 15 blockiert.

Abgebrochen wird nur noch, wenn **keine einzige** Seite einen Zielpfad hat — dann stimmt etwas Grundsätzliches nicht.

## Löschsicherung

Übernommen aus dem RAG-Ingest, wo sie sich bewährt hat. Zwei Riegel in `Abgleich`:

- **`LOESCHSCHUTZ_CONFLUENCE_LEER`** — der Bestand ist gefüllt, Confluence liefert null Seiten. Bricht ab, statt alles zu entfernen.
- **`LOESCHSCHUTZ_ANTEIL`** — mehr als 35 Prozent des Bestands fehlen. Greift erst ab 20 bestehenden Seiten, damit kleine Bereiche nicht blockieren.

Gelöschte Seiten werden im Ziel **entfernt**, nicht archiviert.

`Datei entfernen` trägt `onError: continueRegularOutput` und drei Wiederholungen. Ein `404 itemNotFound` — die Datei ist bereits weg — darf den nächtlichen Lauf nicht reißen; die Bestandszeile wird dann trotzdem entfernt, was in genau diesem Fall richtig ist. Belegt in Lauf 111440: eine künstliche Bestandszeile auf einen nicht existierenden Pfad, `zu_entfernen: 1`, Löschsicherung durchgelassen (1 von 176 sind 0,6 Prozent gegen erlaubte 35), 404 abgefangen, Zeile entfernt, die 175 echten Dokumente unberührt.

## Aufbereitung ins RWG-Blatt

`Dokument bauen` erzeugt ein vollständiges HTML-Dokument je Seite:

- Kopf mit `RWG Rheinland eG`, Bereichspfad, Prozesskürzel und Stand
- selbst erzeugtes Inhaltsverzeichnis aus den H2-Überschriften, mit Ankern
- Tabellen bekommen einheitliche Kopfzellen. Confluence liefert die Kopfzeile als `<tr><th>` **ohne** `<thead>` — wer auf `thead` stylt, trifft nichts
- Panels werden zu Hinweiskästen
- Fußzeile mit dem Hinweis, dass Änderungen in den ProzessHub gehören, nicht in die Datei — und dass **Änderungen am ProzessHub ausschließlich durch Sebastian Linges nach Rücksprache erfolgen**
- `@media print`-Regeln, damit später ein PDF aus derselben Datei entstehen kann

### Was Confluence tatsächlich liefert

Der ProzessHub mischt zwei Formate, und beide brauchen eigene Behandlung:

**Klassische Makros** wie `info` kommen als `<ac:structured-macro>` mit `<ac:rich-text-body>`.

**ADF-Panels** kommen als `<ac:adf-extension>` und tragen ihren Inhalt **doppelt**:

```xml
<ac:adf-extension>
  <ac:adf-node type="panel">
    <ac:adf-attribute key="panel-type">note</ac:adf-attribute>
    <ac:adf-content>...der Text...</ac:adf-content>
  </ac:adf-node>
  <ac:adf-fallback>...derselbe Text mit Inline-Styles...</ac:adf-fallback>
</ac:adf-extension>
```

**Umlaute stehen als Entities da**, nicht als Zeichen: `<h1>&Auml;nderungshistorie</h1>`, `Qualit&auml;tsziele`. Zwei Fallen folgen daraus. Ein Regex, der nach `Ä` sucht, findet nichts. Und wer den Text für das Inhaltsverzeichnis ein zweites Mal maskiert, macht aus `&auml;` ein sichtbares `&amp;auml;`. Der Verzeichnistext wird deshalb unverändert übernommen — er ist bereits gültiges HTML.

Wer hier nur die Tags abräumt, bekommt drei Fehler auf einmal: das Wort `note` erscheint als Text, der Absatz steht zweimal da, und die Inline-Styles des Fallbacks überschreiben die eigene Gestaltung. Die Aufbereitung ersetzt deshalb den **ganzen Block** durch den Inhalt von `adf-content` und verwirft Attribut und Fallback. Anschließend fliegen alle verbliebenen `style`-Angaben raus.

Die beiden Makro-Platzhalter am Seitenanfang (Inhaltsverzeichnis, Änderungshistorie) werden entfernt. Der Bereinigungsteil kennt **beide** Schreibweisen — Storage-Format mit `ac:structured-macro` und ADF-Ausgabe mit `data-type`-Divs —, weil sich erst am Bereich entscheidet, welche ankommt.

### Farben

Gestaltung nach KAPA Digital, Werte aus dem Content Studio:

| Token | Wert | Verwendung | Weißer Text darauf |
|---|---|---|---|
| `--marke` | `#1B4FD8` | Kopflinie, Tabellenköpfe, Prozesskürzel, Textfarbe | 6,65 : 1 |
| `--marke-tief` | `#0D2B55` | Überschriften der Abschnitte | 14,06 : 1 |
| `--akzent` | `#0891B2` | Kanten von Verzeichnis und Hinweiskasten | 3,68 : 1 |
| `--marke-hell` | `#E8EEFC` | Hintergrund für Kennblock und Hinweise | — |

Das Cyan trägt **keinen Text**: 3,68 : 1 gegen geforderte 4,5 : 1. Es steht deshalb ausschließlich an Kanten. Primär- und Dunkelblau tragen weißen Text mit Reserve.

### Interne Links

Verweise auf Seiten, die mitgespiegelt werden, zeigen als relativer Pfad auf die Zieldatei. Verweise auf nicht gespiegelte Confluence-Seiten werden zu Text mit Erklärungstitel — sie sollen niemanden in eine Anmeldemaske schicken. Externe Links bleiben unangetastet.

## PDF neben HTML

**Microsoft Graph konvertiert HTML beim Abruf nach PDF** — kein Renderer, kein zusätzlicher Container, kein externer Dienst. Der Schalter `pdfErzeugen` in `Config` steuert es:

`Datei schreiben` → `PDF gewuenscht` → `Als PDF abrufen` → `PDF ablegen` → `Bestand fortschreiben`

Steht der Schalter auf `false`, führt der IF-Node direkt zu `Bestand fortschreiben`, und es entsteht nur HTML. Das PDF liegt neben der HTML-Datei, gleicher Name mit anderer Endung.

Zwei Messwerte aus Lauf 110365 an derselben Seite:

| Format | Größe |
|---|---|
| HTML | 19.026 Bytes |
| PDF | **173.325 Bytes** |

Das PDF ist rund **neunmal so groß**. Bei 157 Prozessseiten stehen grob 27 MB gegen 3 MB, und es fällt ein zusätzlicher Graph-Aufruf je Seite an.

Das Layout der Konvertierung entsteht im Renderer von SharePoint. Ob die `@media print`-Regeln des Templates dabei greifen, ist offen und lässt sich nur am fertigen PDF beurteilen.

## Datenhaltung

n8n Data Table **`prozesshub_spiegel`** (`4akduDBG2tJrtKw4`), Projekt *Sebastian Linges*.

| Spalte | Inhalt |
|---|---|
| `page_id` | Schlüssel, Confluence-Seiten-ID |
| `space_key`, `titel`, `ebene`, `bereich`, `gruppe_nr`, `prozess_nr` | Einordnung |
| `content_hash` | Grundlage der Änderungserkennung |
| `sp_ordner`, `sp_datei`, `sp_item_id` | wo die Datei liegt |
| `status`, `geaendert_am`, `gespiegelt_am` | Zustand und Zeitpunkte |

`Bestand laden` steht auf `alwaysOutputData`, weil die Tabelle beim ersten Lauf leer ist und ein Node ohne Ausgabe die Kette sonst dort beendet. Der `Abgleich` verwirft ein leeres Item.

## Zugänge

| Zweck | Credential | Konto |
|---|---|---|
| Confluence lesen | `jiraSoftwareCloudApi` | Sebastian.Linges |
| SharePoint schreiben | `oAuth2Api` (generisch, Scope `https://graph.microsoft.com/.default`) | Sebastian.Linges |

Die SharePoint-Ablage läuft über **Microsoft Graph**, nicht über die SharePoint-REST-API.

Das Konto **RWG.Automate hat keine Confluence-Lizenz** und bekommt auf jeden Confluence-Aufruf `403 Current user not permitted to use Confluence`. Über die v2-API äußert sich das als `404`, was die Ursache verdeckt.

## Zum Ausweiten

1. In `Config` `bereichFilter` auf den gewünschten Bereich setzen, oder leeren für alle 15
2. Lauf starten und die Zusammenfassung prüfen
3. Erst wenn ein voller Durchlauf getragen hat, publizieren — der Nachttrigger läuft bereits

## Offene Punkte

- **Umbenennungen hinterlassen Waisen.** Ändert sich in Confluence ein Seiten- oder Gruppentitel, ändert sich der Zielpfad: Die Datei entsteht am neuen Ort, die alte bleibt liegen. Der Löschpfad greift nicht, weil die `page_id` weiter existiert. Sauber wäre, den Zielpfad einmalig in `Seiten normalisieren` zu bestimmen — dann könnte `Abgleich` den gespeicherten gegen den neuen Pfad halten und den alten zum Entfernen anmelden. Zwischen Lauf 110822 und 111432 ist kein Pfad gewandert, eingetreten ist der Fall also noch nicht.
- **Null-Zeilen in `prozesshub_spiegel`.** Aus der Zeit vor der Reparatur stehen rund 370 Zeilen ohne `page_id` in der Tabelle. Wirkungslos, weil `Bestand laden` auf `space_key = ProzessHub` filtert und sie nicht findet — aufzuräumen sind sie trotzdem. Geht nur über die n8n-Oberfläche, und **nicht** pauschal über alle Zeilen: die echten stehen daneben.
- **Bilder und BPMN-Diagramme** werden nicht mitgespiegelt. Der ProzessHub hat eine eigene Orientierungsseite zu BPMN-Standards, die Diagramme sind also gewollt und zahlreich.
- **Kein Logo im Kopf.** Bisher steht dort nur der Schriftzug.
- **Die Freigabefrage.** Der ProzessHub ist im RAG-Ingest als `it_internal` eingestuft. Eine Spiegelung für alle Beschäftigten hebt das faktisch auf.
