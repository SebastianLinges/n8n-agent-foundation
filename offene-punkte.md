# Offene Punkte

Was ansteht, warum es ansteht, und was zum Abarbeiten gebraucht wird. Erledigtes wird gelöscht, nicht abgehakt — der Verlauf steht in `tests/laufprotokoll.csv` und in der Git-Historie.

## Umzug der RWG-Datenbank

**Vollzogen und abgenommen.** Daten, Bilder und Flows liegen im Projekt `zckaxkpycyyxaymmkmvu` (RWG Rheinland eG / RAG). Vorgehen und Abnahme stehen in [migration/README.md](migration/README.md).

Was noch aussteht:

- **Das alte Projekt `zjabiweaihsezjjeycko` loeschen. Alle Bedingungen sind erfuellt, es fehlt nur die Ausfuehrung.** Der Abgleich um 03:30 (Lauf 110522) scheiterte zwar an einem Netzabbruch zu Cloudflare, lag aber **vor** dem Umzug — Trigger 03:30 MESZ, Workflow umgestellt 11:18 MESZ — und lief daher noch gegen die alte Adresse. Die zwoelf Stundenlaeufe danach sind alle bestanden, instanzweit kein einziger Fehlerlauf seit dem Umzug. Die Gesundheitspruefung (Lauf 110825) trifft alle vier Erwartungswerte exakt: 21323 Chunks, 0 ohne Embedding, Bucket 7384 Objekte, 0 Verweise aufs alte Projekt.

  Nebenbefund: n8n hat den **Service-Role-Key des alten Projekts im Klartext** in den Ausfuehrungsdaten abgelegt, in `apikey` und `Authorization`. Mit dem Loeschen des Projekts wird der Schluessel wertlos — ein Grund mehr.
- **Vier Tabellen ohne bekannten Schreiber:** `agent_ticket_dialogs` (2 Zeilen), `documentation_findings` (10), `documentation_review_state` (17). Dazu `agent_jira_create_requests` — die wird von `RWG Sub - Jira Issue Create` gebraucht und bleibt. Bei den drei uebrigen ist die Herkunft zu klaeren, bevor etwas verschwindet.
- **Embeddings der Bildchunks.** Beim Umschreiben der Adressen wurde der Text geaendert, der Vektor nicht. Betrifft 4 091 Chunks, nur die Adresszeile — semantisch unerheblich. Eine Neuberechnung kostet rund vier Cent, falls es sauber sein soll.


## Zuerst

### Beitragsprüfung im Content Studio testen
Die Prüfung ist publiziert, aber **noch nie gelaufen**. Ein Testlauf erzeugt echte Artefakte: einen Eintrag in `content_packages`, eine E-Mail und einen Buffer-Entwurf.

Zu prüfen sind zwei Fälle: ein Beitrag, der durchgeht, und einer, der am Antwortblock scheitert. Der zweite lässt sich erzwingen, indem `Lesbarkeit pruefen` vorübergehend eine engere Wortgrenze bekommt — nicht, indem der COPY-Prompt verbogen wird.

Zu belegen: `qa_passed`, die Zahl der Befunde, und dass bei einer Ablehnung **kein** Buffer-Entwurf entsteht, aber eine Telegram-Meldung ankommt.


### Contract Loader publizieren - wartet auf Mistral-Token
**Der Umbau steht als unveroeffentlichter Entwurf** in `661BDwEditNicEc0`, 30 Nodes statt 36. Aufbau und Entscheidungen: [flows/rwg-vertragsdaten/README.md](flows/rwg-vertragsdaten/README.md).

Belegt im Gesamtlauf 110831: SharePoint-Abruf, Download, SHA-256, Zeile anlegen, Mistral-Upload, signierte URL, OCR und das Sichern des OCR-Textes. Beide Dokumente vollstaendig gelesen - 46 Seiten mit 20630 Woertern und 1 Seite mit 190 Woertern.

**Gescheitert ist die Extraktion**: `Forbidden` vom Mistral-Chat-Endpunkt. Ursache ist nicht der Umbau, sondern das Kontingent - die Token des Mistral-Zugangs sind bis zum **01.09.2026** aufgebraucht. Der OCR-Endpunkt desselben Zugangs laeuft weiter, OCR und Chat werden getrennt abgerechnet. Zur Sicherheit gegengeprueft (Lauf 110833): Konto `rwg-r.de` antwortet `Forbidden`, Konto `gmx.de` antwortet `Payment required`.

Der Fehlerweg hat dabei genau so gegriffen wie entworfen: `status = 'fehler'`, Meldung in `fehler_text`, beide Dateien unveraendert im Eingang. Beim naechsten Lauf werden sie erneut geholt, ohne neue OCR-Kosten - `ocr_text` steht ja schon.

**Nachtraeglich eingebaut** (Lauf 110838, 30 Nodes): Steht `ocr_text` schon, wird die OCR uebersprungen - ohne das lief ein liegengebliebenes Dokument stuendlich erneut durch die Erkennung und wurde jedes Mal neu bezahlt. Dazu ein Zaehler `versuche`: Nach drei Fehlversuchen wandert die Datei nach `/IMPORTER/CONTRACT/FEHLER`, den der Flow selbst anlegt. In der Excel stehen `status` und `versuche` vorn, Fertiges zuoberst.

**Zum Abarbeiten ab dem 01.09.:** Lauf anstossen, die Extraktion an den beiden Dokumenten pruefen, dann publizieren. Erst nach dem Publizieren geht der Export ins Git.

Noch unbelegt sind vier Nodes, die nur hinter der Extraktion liegen: `Ergebnis auswerten`, `Vertragsdaten schreiben`, `Nach DONE verschieben`, `Ablage vermerken`. Die Umwandlungen in `Ergebnis auswerten` sind einzeln gegen Testwerte geprueft, die Spaltenliste des grossen `UPDATE` gegen `information_schema` und `jsonb_to_record`. Ein Lauf ersetzt das nicht.

### Zwei Hinterlassenschaften von Power Automate wegraeumen
`RWG_n8n_Trigg` hat um 12:28:27 - kurz vor seiner Loeschung - noch zweimal zugegriffen. Beides ist an der App-Kennung `Microsoft Power Platform` (`7ab7862c-...`) belegt; alles, was der n8n-Flow anlegt, traegt dagegen `n8n-SharePoint` (`676b0b05-...`).

**Ein gespiegelter Leerpfad.** In der Bibliothekswurzel steht ein Ordner `Shared Documents`, darunter `IMPORTER` und weiter. Power Automate hat den vollstaendigen serverrelativen Pfad `/Shared Documents/IMPORTER/CONTRACT/...` als **relatives** Ziel benutzt - die Wurzel *ist* aber bereits Shared Documents, also entstand der Pfad ein zweites Mal darunter. Groesse durchgehend 0 Bytes, Graph rechnet rekursiv: keine einzige Datei darin. Kann samt Unterordnern geloescht werden.

**Eine ueberholte Excel.** Die erste `Vertragsuebersicht.xlsx` liegt in `DONE`, weil Power Automate sie kurz nach dem Erzeugen dorthin verschob. Lauf 110838 hat eine neue Fassung in den Eingang geschrieben, und dort ist sie geblieben - damit ist zugleich belegt, dass der Power-Automate-Flow wirklich weg ist. Die Fassung in `DONE` kann weg.

### Altbestand in DONE nachziehen
Elf Dokumente liegen in `/IMPORTER/CONTRACT/DONE` und stehen nicht in `vertraege`. Ein Einmallauf ueber den Ordner holt das nach; der Hash-Schutz macht ihn gefahrlos wiederholbar. Bewusst zurueckgestellt, bis der Eingang belegt ist.

Offen bleibt daneben, ob der Bestand der alten Data Table `CEz5GXpTS7yHhjqS` (`RWG Vertraege`) uebernommen wird.


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


### Power-Automate-Flow entfernen
**Der Ingest holt sich seine Aenderungen seit dem 30.08. selbst.** Webhook und Delta-Leser-Eingang sind deaktiviert, der getrennte Delta-Leser ist archiviert.

Was bleibt: Der Power-Automate-Flow selbst liegt ausserhalb von n8n und muss dort entfernt werden. Er ist am Ziel erkennbar: `.../webhook/8e16e07b-d272-4147-a2a2-80694afd9007`. Solange er laeuft, schickt er ins Leere - der Webhook nimmt nichts mehr an.

**Nicht zu verwechseln mit `RWG_n8n_Trigg`.** Das war der zweite Power-Automate-Flow: Er ueberwachte `/IMPORTER/CONTRACT` und fuetterte den Webhook des alten Contract Loaders. Er hat am 30.08. um 12:28 noch gefeuert und ist seither geloescht. Damit ueberwacht nur noch n8n diesen Ordner.

### Dokumenteintrag vor den Chunks - Reihenfolge im Ingest
Der Ingest legt den Dokumenteintrag an, **bevor** er die Chunks schreibt. Bricht ein Lauf dazwischen ab, bleibt ein Eintrag ohne Chunks stehen - in der Wissenssuche unsichtbar. Stand 30.08.: neun solcher Eintraege (Lauf 110771), acht davon bildreiche Regaletiketten-PDFs.

**Abgefangen ist es**: Der Abgleich erkennt sie ueber den fehlenden Kopfsatz (`chunk_index = 0`) und liest sie neu ein - mit Vorrang, weil sie sonst dauerhaft einen Platz blockieren.

Sauberer waere, den Eintrag erst nach den Chunks zu schreiben. Das ist ein Umbau an der Verarbeitung und bleibt offen. Die Nachpruefung im Abgleich faengt den Fall zuverlaessig ab, also nicht dringend.


### Erstbefuellung laeuft an - 458 Dateien fehlen noch
Von 499 verwertbaren Dateien in Shared Documents stehen erst wenige unter einer Graph-Kennung in der Wissensbasis. Power Automate hatte nur PDF und Excel geschickt, Word und PowerPoint nie.

Der naechtliche Abgleich holt jetzt **30 je Nacht** nach - gut zwei Wochen bis zur Vollstaendigkeit. Wer schneller will, setzt `maxJeLauf` in der Steuerung hoeher; jede Datei kostet einen OCR-Durchlauf bei Mistral.

Die 247 Dokumente mit Power-Automate-Kennung bleiben unangetastet, bis ihre Datei erneut eingelesen wird - dann entfernt der Uebergangsmechanismus die Altfassung.

**Der Abgleich feuert belegt zur Ortszeit.** Acht Word-Dateien laufen in zwei Minuten durch. Was den Durchsatz jetzt bestimmt, sind die bildreichen Gross-PDFs: Sie kosten Minuten und haben den ersten Lauf an einem Netzabbruch beim Bild-Upload abgebrochen. Der Bildzweig ist seither ausfalltolerant.


### Tabellendaten abfragbar machen
Die Hoffnung war, spaeter nach Umsaetzen oder Kennzahlen fragen zu koennen und aus Tabellen eine Antwort zu bekommen. **Das leistet Vektorsuche nicht.** Sie findet aehnliche Texte, sie rechnet nicht.

Was heute geht: Punktabfragen. Der Ingest macht jede Tabellenzeile selbsttragend - `### Zeile 47 / - Blatt: Januar / - Standort: ... / - Betrag: ...`. Eine Frage nach einem benannten Standort oder Vorgang findet ihre Zeile.

Was nicht geht: Aggregationen. `Wie hoch war der Gesamtumsatz` oder `welcher Kunde war am staerksten` verlangt, alle Zeilen zu sehen und zu rechnen. Die Suche liefert aber nur die aehnlichsten Treffer - bei 5000 Zeilen vielleicht zwanzig.

Dafuer braeuchte es einen zweiten Weg: Tabellendaten strukturiert ablegen und dem Agenten ein Werkzeug geben, das zaehlen und summieren kann - so wie es der Jira-Agent mit `RWG Sub - Jira Query` bereits hat. Eigenes Vorhaben, kein Nachbessern am RAG.

Zu klaeren waere zuerst: Welche Tabellen sind ueberhaupt gemeint, und wie stabil ist ihre Struktur? Die Sichtung vom 30.08. zeigt, dass viele Excel-Blaetter gar keine Tabellen sind, sondern Formulare und Notizen.


### Formatpaare und unklare Doubletten - fachlich zu entscheiden
Bei der Bereinigung am 30.08. blieben zwei Gruppen absichtlich stehen:

**23 Formatpaare**: Dieselbe Unterlage liegt in SharePoint als `pptx` und als `pdf`, meist Regalplaene. Beide Eintraege sind technisch richtig. Ob beide im Wissensspeicher stehen sollen, ist eine fachliche Frage - doppelter Inhalt verwaessert die Suche, aber die Formate koennen unterschiedlich aktuell sein.

**5 unklare Faelle**: Gleicher Dateiname, deutlich verschiedener Inhalt. Etwa `Debitorencockpit.pdf` mit 2495 gegen 480 Woerter oder `Aufteilung Standorte.xlsx` mit 795 gegen 432. Da steckt Unterschiedliches drin; welche Fassung gilt, kann nur der Fachbereich sagen.

Der Wartungsflow `RWG Wartung - RAG-Bestand pruefen` (`O5FKXpsz2UfcjNQg`) listet beide Gruppen bei jedem Lauf auf.

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
