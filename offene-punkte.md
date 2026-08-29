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

### Aufräumen: `builtInTools`
Vier Modell-Nodes im Content Studio und je zwei in den KI-Daily-Flows tragen das Feld `builtInTools`, obwohl die Responses-API abgeschaltet ist. n8n ignoriert es, der Validator meldet es bei jedem Update. Rückstand aus der Zeit vor der Umstellung.

### Eigener Repo-Ordner
Die drei Marketing-Flows haben noch keinen Ordner unter `flows/`. Fällig, sobald an ihnen mehr als punktuell gearbeitet wird.

## Später

### `ideen.md` im Repo
Für Vorhaben, die noch keine Aufgabe sind. Bisher genannt: KAPA-Blogbeitrag; Post-Idee per Telegram direkt in die Marketinganalyse, mit Vorrang und Rückfragen, nur für die Geschäftsführung von KAPA Digital.

### Startseite der SharePoint-Site
Ob eingeladene Nutzer die Bereiche samt Unterseiten dynamisch sehen, ließe sich über das Dokumentbibliothek-Webpart mit der Ansicht *Alle Dokumente ohne Ordner* lösen — ohne Code. Eine Navigation, die der Flow mitpflegt, gäbe es damit aber nicht; dafür müsste er zusätzlich eine Übersichtsseite schreiben.
