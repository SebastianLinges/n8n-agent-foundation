# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Zuerst

### Beitragsprüfung im Content Studio testen
Die Prüfung ist publiziert, aber **noch nie gelaufen**. Ein Testlauf erzeugt echte Artefakte: einen Eintrag in `content_packages`, eine E-Mail und einen Buffer-Entwurf.

Zu prüfen sind zwei Fälle: ein Beitrag, der durchgeht, und einer, der am Antwortblock scheitert. Der zweite lässt sich erzwingen, indem `Lesbarkeit pruefen` vorübergehend eine engere Wortgrenze bekommt — nicht, indem der COPY-Prompt verbogen wird.

Zu belegen: `qa_passed`, die Zahl der Befunde, und dass bei einer Ablehnung **kein** Buffer-Entwurf entsteht, aber eine Telegram-Meldung ankommt.

### Termine auf Di/Do/Fr umstellen
Gepostet werden soll Di/Do/Fr, das Content Studio läuft Di/Mi/Do (`0 8 * * 2,3,4`). Damit der Entwurf am Vortag fertig ist, muss es Mo/Mi/Do laufen.

Der Zeitplan in `content_schedule` steuert über den Wochentag, welche Säule drankommt — aktuell weekday 2, 3, 4. Zwei Wege, die Entscheidung steht aus:

- **Zeitplan meint den Posttag:** `content_schedule` auf weekday 2, 4, 5, und `Saeule bestimmen` schaut auf morgen statt heute. Die Tabelle bleibt lesbar als Redaktionsplan.
- **Zeitplan meint den Lauftag:** `content_schedule` auf weekday 1, 3, 4, Slotnamen wandern mit. Keine Codeänderung, aber die Tabelle sagt dann „Montag = Werkstatt", obwohl dienstags gepostet wird.

Beides schreibt in Supabase und braucht Freigabe.

## ProzessHub nach SharePoint

### Voller Durchlauf
Bisher wurden nur einzelne Bereiche gespiegelt und wieder entfernt. Für den echten Bestand: `bereichFilter` in `Config` leeren, laufen lassen, Ergebnis prüfen. Danach `Naechtlicher Lauf 02 Uhr` aktivieren und den Flow publizieren.

### PDF-Layout beurteilen
`pdfErzeugen` steht auf `false`, die beiden PDF-Nodes sind deaktiviert. Die Konvertierung funktioniert belegt (Lauf 110365: 173 KB aus 19 KB HTML), aber **wie das PDF aussieht, ist ungeprüft**. Offen ist, ob die `@media print`-Regeln des Templates im Renderer von SharePoint ankommen.

### Dienstkonto statt persönlichem Zugang
Der Flow schreibt unter `Sebastian.Linges`. Ändert sich das Passwort oder verlässt die Person das Unternehmen, bricht die Spiegelung. Sauberer wäre ein Dienstkonto mit Zugriff auf die Site *Qualitätsmanagement und Prozessbeschreibungen*.

### Workflow-Export ins Repo
`flows/prozesshub-sharepoint/` enthält die README, aber kein `workflow.json`. Nachziehen, sobald der Flow publiziert ist.

### Zwei EK-Ordner in Confluence
`EK – Einkauf` und `EK - Einkauf` unterscheiden sich nur im Bindestrich. `EK-01` hängt im einen, `EK-02` im anderen. Der Flow meldet die Dublette in `bereichsordner_dubletten` und legt beide zusammen ab — technisch unauffällig, fachlich zu bereinigen.

## Content Studio, weitere Themen

### Beiträge auf Use Cases ausrichten
Zwei Stellen: Die Idee entsteht im Marketing Scout (`objM2PQrcTpEzik7`), ausformuliert wird sie im Content Studio (`bBBybznNNCnU2nOJ`). Positionierung auf Büro, Handwerk und CAD-/PDM-Prozesse.

Vor der Umsetzung zu klären: In `use_cases` liegen bereits **35 Einträge mit `status = new`** — maschinell erzeugt vom Business Scout. Die Zuarbeit „drei bis fünf echte Use Cases je Segment" trifft also auf einen gefüllten Topf. Sinnvoller wäre vermutlich, die vorhandenen zu sichten und die schwachen zu verwerfen, statt neue danebenzulegen.

### Aufräumen: `builtInTools`
Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update. Rückstand aus der Zeit vor der Umstellung.

### Eigener Repo-Ordner
Die drei Marketing-Flows haben noch keinen Ordner unter `flows/`. Fällig, sobald an ihnen mehr als punktuell gearbeitet wird.

## Später

### `ideen.md` im Repo
Für Vorhaben, die noch keine Aufgabe sind. Bisher genannt: KAPA-Blogbeitrag; Post-Idee per Telegram direkt in die Marketinganalyse, mit Vorrang und Rückfragen, nur für die Geschäftsführung von KAPA Digital.

### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
