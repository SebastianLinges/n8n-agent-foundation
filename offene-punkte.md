# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Zuerst

### Beitragsprüfung im Content Studio testen
Die Prüfung ist publiziert, aber **noch nie gelaufen**. Ein Testlauf erzeugt echte Artefakte: einen Eintrag in `content_packages`, eine E-Mail und einen Buffer-Entwurf.

Zu prüfen sind zwei Fälle: ein Beitrag, der durchgeht, und einer, der am Antwortblock scheitert. Der zweite lässt sich erzwingen, indem `Lesbarkeit pruefen` vorübergehend eine engere Wortgrenze bekommt — nicht, indem der COPY-Prompt verbogen wird.

Zu belegen: `qa_passed`, die Zahl der Befunde, und dass bei einer Ablehnung **kein** Buffer-Entwurf entsteht, aber eine Telegram-Meldung ankommt.


## ProzessHub nach SharePoint

### Scharfschalten
Der Flow ist belegt funktionsfaehig (Lauf 110370: 234 Seiten erkannt, 157 Dokumente abgelegt, 16,9 Sekunden), aber **stillgelegt**: Nachttrigger deaktiviert, Flow unpubliziert, Testdaten aus SharePoint entfernt.

Zum Scharfschalten zwei Handgriffe: `Naechtlicher Lauf 02 Uhr` aktivieren, Flow publizieren. Die Voraussetzungen stehen: Der Ordner heisst jetzt `UWP - Unternehmensweite Prozesse`, seine beiden Prozessseiten werden erkannt.


### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

### Dienstkonto statt persönlichem Zugang
Der Flow schreibt unter `Sebastian.Linges`. Ändert sich das Passwort oder verlässt die Person das Unternehmen, bricht die Spiegelung. Sauberer wäre ein Dienstkonto mit Zugriff auf die Site *Qualitätsmanagement und Prozessbeschreibungen*.


### Zwei EK-Ordner in Confluence
`EK – Einkauf` und `EK - Einkauf` unterscheiden sich nur im Bindestrich. `EK-01` hängt im einen, `EK-02` im anderen. Der Flow meldet die Dublette in `bereichsordner_dubletten` und legt beide zusammen ab — technisch unauffällig, fachlich zu bereinigen.

## SharePoint Schulungen

### Vier leere Ordner - Entscheidung offen
In Shared Documents sind die 18 Reste unter `Allgemeine Informationen` entfernt (Lauf 110380, nachgemessen mit 110382: keine Datei verloren). Stehen geblieben sind vier, weil sie nach vorbereiteter Struktur aussehen und nicht nach Rest:

- `/Baumarkt Prozesse`
- `/Baustoff Prozesse`
- `/Dispo Prozesse`
- `/Videos/Gebuchte Belege stornieren`

Sebastian entscheidet, ob sie bleiben. Der Aufraeumflow ist archiviert, laesst sich aber jederzeit wiederholen - das Praefix in `Config` ist die einzige Stellschraube.

Nicht angefasst: Die Bibliothek `Inventur` derselben Untersite traegt 333 oberste Leerordner, `Archiv Zaehlprotokolle` ist vollstaendig leer. Beides war nicht Teil der Freigabe.


### Doubletten beim Umschalten - vor dem Produktivgang klaeren
**Power Automate und der Delta-Leser vergeben unterschiedliche doc_ids fuer dieselbe Datei.** Belegt mit Lauf 110451: Die Testdatei stand zweimal im RAG - einmal mit Graph-Item-ID (`01SZZYEH...`), einmal mit der Kennung von Power Automate (`RWGID-197270985-1845`).

Solange beide Wege laufen, entstehen bei jeder Aenderung Doubletten. Und beim Umschalten wuerden die 259 Altdokumente ein zweites Mal angelegt, weil der Delta-Leser sie nicht wiedererkennt.

Drei Wege stehen offen:

- Power Automate abschalten und den Altbestand einmal leeren, dann mit `ankerIgnorieren` neu einlesen. Sauber, aber die 499 Dateien laufen einmal komplett durch.
- Den Altbestand stehen lassen und nur Neues ueber den Delta-Leser einlesen. Dann bleiben Altdokumente ohne Aktualisierung liegen.
- Eine Zuordnung zwischen beiden Kennungen bauen. Aufwendig und nur sinnvoll, wenn der Altbestand gross ist.

Mein Vorschlag ist der erste Weg.


### Delta-Leser scharfschalten
Der Flow steht (`bvmSDgOm1T5ciKqk`) und **alle vorhandenen Dateitypen sind einzeln belegt**: pdf, docx, pptx, txt, xls, xlsx. Fuer csv und xlsm liegt keine Datei in der Bibliothek.

Ebenfalls belegt: Mehrblatt-Erkennung mit Unterscheidung Tabelle/Notiz, Loeschzweig, Zustandsanker, inkrementeller Betrieb.

Zum Scharfschalten: drei Schalter in der Config auf true, Trigger aktivieren, publizieren. Vorher die Doubletten-Frage entscheiden.

Der Webhook von Power Automate bleibt bis dahin unberuehrt - beide Wege stoeren sich nicht, erzeugen aber Doubletten.

**Export ins Repo fehlt noch**: `flows/sharepoint-delta-rag/workflow.json`.


## Content Studio, weitere Themen

### Beiträge auf Use Cases ausrichten

Zwei Stellen: Die Idee entsteht im Marketing Scout (`objM2PQrcTpEzik7`), ausformuliert wird sie im Content Studio (`bBBybznNNCnU2nOJ`). Positionierung auf Büro, Handwerk und CAD-/PDM-Prozesse.

**Der Bestand wurde am 29.08. gesichtet. Er trägt die Positionierung nicht.** 35 Einträge mit `status = new`, verteilt so:

| Säule | Anzahl | Score-Schnitt |
|---|---|---|
| buero | 17 | 7,9 |
| engineering | 15 | 7,9 |
| fertigung | 3 | 8,7 |
| **handwerk** | **0** | — |

Vier Befunde:

**Handwerk ist leer.** Der Zeitplan sieht Dienstag als „Werkstatt & Produktion" mit den Säulen handwerk, fertigung, engineering vor. Für handwerk gibt es nichts, für fertigung drei Einträge — von denen zwei die Zielgruppe „Ingenieurbüros" tragen. In der Praxis greift dort also immer die Ersatzsäule.

**Die engineering-Einträge sind keine Engineering-Themen.** Kein einziger der 15 handelt von CAD oder PDM. Es geht um Projektkoordination, Compliance, Kundenkommunikation, Lead-Management, Terminplanung — durchweg Büroarbeit, nur mit „Ingenieurbüros" als Etikett. Genau das Segment, das die Positionierung meint, fehlt vollständig.

**Mehrfachbelegung statt Vielfalt.** Fünf Einträge behandeln EU AI Act und KI-Compliance, drei die Rechnungs- und Belegverarbeitung, drei die Workflow-Automatisierung, zwei die Kundenkommunikation. Als Themenvorrat für drei Beiträge pro Woche ist das schmaler, als die Zahl 35 vermuten lässt.

**Produktnamen im Titel.** „Automatisierung von E-Mails mit Microsoft Power Automate", „Workflow-Automatisierung mit DocuWare", „Lead-Management-Automatisierung mit Zapier", „Workflow-Automatisierung mit n8n". Der Redaktions-Check sperrt Fremdprodukte im Beitragstext hart — solche Use Cases führen mit hoher Wahrscheinlichkeit zu einem abgelehnten Beitrag.

Dazu kommt: Die Probleme sind austauschbar formuliert. „Zeitaufwendig und fehleranfällig" steht sechsmal da. Der Redaktions-Check verlangt aber ein **benanntes Dokument oder einen benannten Arbeitsschritt** als harte Regel. Aufmaß, Prüfprotokoll, Stückliste, Zeichnungsfreigabe — nichts davon kommt vor.

**Folgerung:** Sichten und Verwerfen genügt nicht. Für Handwerk und für CAD/PDM muss neu erhoben werden, und zwar an benannten Arbeitsschritten entlang statt an Technologiebegriffen. Die Zuarbeit „drei bis fünf echte Use Cases je Segment" bleibt also nötig — sie trifft nur nicht auf einen leeren Topf, sondern auf einen falsch gefüllten.

Zu klären wäre außerdem, ob der Business Scout so weiterlaufen soll. Sein `score` liegt bei allen 35 Einträgen zwischen 7 und 9 — dasselbe Muster, das den `content_score` im Redaktions-Check unbrauchbar macht.

### `builtInTools` — geprüft, nicht lösbar

Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update.

**Am 29.08. versucht:** Das Feld enthält überall ein leeres Objekt, es war nie etwas konfiguriert. Die Warnung entsteht aber durch das **Vorhandensein** des Feldes, nicht durch seinen Inhalt — und über die MCP-Schnittstelle lässt sich ein Feld nur überschreiben, nicht entfernen. Es zu beseitigen hieße, den kompletten Parameterblock der Modell-Nodes neu zu setzen. Das Risiko an produktiven Modell-Nodes steht in keinem Verhältnis zu einer kosmetischen Warnung.

Bleibt liegen, bis diese Nodes ohnehin angefasst werden.


## Später


### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
