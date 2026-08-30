# Übergabe an den nächsten Chat

Diese Datei ist als Eingangsnachricht für eine neue Sitzung gedacht. Sie ersetzt keine Recherche — der aktuelle Stand steht im Repo und in n8n, nicht hier.

---

## Wer und was

Sebastian Linges, Geschäftsführer KAPA Digital, arbeitet für RWG Rheinland eG. n8n-Instanz `https://n8n.srv1307521.hstgr.cloud`. Zugriff per MCP auf n8n, Jira/Confluence (Atlassian), Supabase.

**Zwei getrennte Welten in derselben Instanz.** Alle KAPA-Digital-Flows heißen `KAPA Digital - …` und hängen an den Supabase-Projekten `glhqajoxbscriskwzhbr` (Kapa-Core) und `ouccmqkwgdxjnplblnzk` (Marketing). Alles Übrige gehört zur RWG und hängt an `zckaxkpycyyxaymmkmvu` (Organisation RWG Rheinland eG, Projekt RAG). Die beiden Welten werden nie vermischt.

## Arbeitsregeln

- **Native n8n-Nodes vor Code-Nodes.**
- **Keine Versionsangaben und keine Änderungshistorie in der Doku.** Immer nur der aktuelle Stand, keine Altlasten.
- **Nach jedem Publish geht der Export ins Git.**
- **Supabase nur lesen.** Änderungen nur nach Freigabe und Quercheck.
- **Code-Nodes nach der Übertragung byte-identisch zurücklesen** und mit `node --check` prüfen. Die MCP-Übertragung verfälscht sonst still.
- **Jeden Test mit n8n-Execution-ID ins Laufprotokoll**, auch die bestandenen. Der Befund enthält den Messwert, nicht die Deutung.
- **Behauptungen belegen.** „Läuft" gilt erst mit einem Lauf, nicht mit einer schlüssigen Diagnose.
- **Kein Publish ohne das ausdrückliche Wort „Publizieren".**
- **Alle Node-Änderungen eines Workflows in einem `operations`-Array.** Getrennte `update_workflow`-Calls überschreiben sich gegenseitig.
- Arbeitsrhythmus: **Block für Block** — erklären, Information holen, freigeben lassen.

## Bewusst so entschieden

Nicht aufwerfen, das ist geklärt:

- **Graph läuft über den persönlichen Zugang `Sebastian.Linges`**, nicht über ein Dienstkonto. Bewusst so, bleibt so.
- **Der ProzessHub-Flow (`Muss6GBGPuG9fjE2`) bleibt stillgelegt**, bis Sebastian ihn aktiviert. Er ist belegt funktionsfähig.
- **Der Ablageordner des Contract Loaders heißt `DONE`**, nicht `Erledigt` — er bestand bereits und war gefüllt.
- **Die Excel-Übersicht wird je Lauf neu erzeugt**, nicht fortgeschrieben, und enthält Fertiges wie Fehlerfälle mit `status` als erster Spalte.

## Teuer erkaufte technische Regeln

- **Niemals `temperature` an GPT-5-Modellen.** Ungleich null scheitert immer; 0 läuft nur über Chat Completions.
- **Niemals `responsesApiEnabled` zusammen mit `outputParserStructured`.** Der Parser bekommt dann die API-Hülle statt des JSON. Das hat den Jira-Agenten anderthalb Tage lahmgelegt.
- **Tool-Beschreibungen setzen sich gegen den Systemprompt durch.**
- **„Null Ausführungen" heißt nicht „läuft nicht"** — bei `saveDataSuccessExecution: none` werden Erfolge nicht gespeichert.
- **n8n-MCP `sourceOutput` bei IF/Switch ist unzuverlässig** (landet immer auf Index 0). Auch `removeConnection` ignoriert den Ausgangsindex.
- **Der n8n-Server läuft auf UTC.** Ein Schedule-Trigger ohne `timezone` in den Workflow-Einstellungen feuert nach Serverzeit.
- **In Schleifen liefert `$('Node').all()` nur den letzten Durchlauf.** Der zweite Parameter ist der Durchlaufindex.
- **Ein Subworkflow bekommt alle Items auf einmal.** Liest er mit `$input.first()`, verarbeitet er nur das erste.
- **PostgREST liefert höchstens 1000 Zeilen je Anfrage.** Ein `limit` im Querystring hebt das nicht auf.
- **Ein HTTP-Node ohne `onError` beendet den ganzen Lauf.** In einer Schleife über viele Dokumente reißt ein einzelner Netzabbruch alles Übrige mit.
- **n8n legt bei HTTP-Fehlern das komplette Request-Objekt in den Ausführungsdaten ab**, samt `apikey` und `Authorization` im Klartext.
- **Der Supabase-MCP-Zugang liest nur.** `execute_sql` scheitert bei jedem Schreibversuch mit `cannot execute DROP TABLE in a read-only transaction`. DDL geht ausschliesslich ueber `apply_migration`.
- **Der Postgres-Node durchsucht den gesamten Abfragetext nach Dollar-Platzhaltern** — auch in Zeichenketten und **in Kommentaren**. Ein `$1` in einem Kommentar bricht die Abfrage mit `out of range`; ein `$` ohne Ziffer wird still verschluckt (ein Zeilenende-Anker in einem regulären Ausdruck verschwand samt Anführungszeichen). Platzhalter zur Laufzeit aus `chr(36)` bauen, Daten immer über `queryReplacement` binden.
- **Ein Node ohne Ausgabeitems stoppt seinen Zweig.** Ein PostgREST-`DELETE` oder `PATCH` ohne Treffer liefert mit `Prefer: return=representation` ein leeres Array — n8n macht daraus null Items, und alles Nachfolgende läuft nicht mehr. In einer Schleife bleibt der Rest der Aufgaben liegen, und der Lauf gilt trotzdem als erfolgreich. Gegenmittel ist `alwaysOutputData` am betroffenen Node — aber nur, wenn die nachgelagerten Nodes aus **benannten Vorgängern** lesen. Hängt dahinter ein Aggregate-Node oder etwas, das Items zählt, verfälscht das eingefügte Leer-Item die Zahl.
- **Eine verschachtelte `splitInBatches` behält ihren Zustand über die äußere Schleife hinweg.** Ab dem zweiten Durchlauf der äußeren Schleife gilt sie als fertig, schleift die neuen Daten nicht mehr durch — und feuert trotzdem ihren Fertig-Ausgang. Alles im Schleifenkörper läuft dann gar nicht, alles dahinter normal weiter. Der Lauf meldet Erfolg und `fehler: 0`. Gegenmittel ist `options.reset` mit einer Bedingung, die nur beim Eintritt von aussen wahr ist, etwa `={{ $prevNode.name === 'Prepare Embedding Batches' }}`. Belegt im Sandkasten `RWG Wartung - Schleifenzugriff pruefen` (`570pf10JA7wnY8e7`), Läufe 110971 und 110972.
- **`$('Node').first()` ist in einer einfachen Schleife korrekt** und liefert den aktuellen Durchlauf — ebenso `.all()` und `.item`. Gemessen in Lauf 110970. Wer einen Schleifenfehler sucht, sollte hier nicht anfangen.
- **Ein Code-Node darf höchstens 300 Sekunden laufen.** Der Task-Runner bricht ihn dann mit `Task execution timed out after 300 seconds` ab und reisst den ganzen Lauf mit — unabhängig vom Workflow-Timeout. In einer Schleife über viele Dokumente ist das die eigentliche Obergrenze, nicht die Stunde in den Workflow-Einstellungen.
- **Der Graph-Delta-Abruf liefert Einträge mehrfach.** Ein Item, das sich mehrmals geändert hat, kommt mehrfach zurück. Ungefiltert zählt man die Ordner fast doppelt — gemessen 1 876 gelieferte Zeilen gegen 1 650 verschiedene Item-IDs. Immer über die Item-ID entdoppeln.
- **Ein abgebrochener Lauf friert den Delta-Anker ein.** Wird der Anker erst am Ende der Schleife geschrieben, schreibt ihn ein vorzeitiger Abbruch nie fort. Der nächste Lauf liest dasselbe Fenster erneut — tagelang, ohne dass etwas auffällt, weil jeder Lauf grün ist.
- **`queryBatching: single` verfälscht SQL**, wenn mehrere Anweisungen zusammengefasst werden. Immer `independently`.
- **Große Ausführungen sind per MCP nicht abrufbar** — `get_execution` mit `includeData` reißt bei OCR- und bildlastigen Läufen die Sitzung ab. Die Ursache steht stattdessen in der Ausführung des Fehler-Workflows `pMGm0LaxRTldvPKEkmkzC`.
- **n8n weist Credentials automatisch zu**, wenn nur eine des Typs existiert. Bei zwei Datenbanken ist das gefährlich — nach jedem `create_workflow_from_code` die Zuordnung prüfen.
- **Die MCP-Schnittstelle liest Credentials nicht aus.** `get_workflow_details` liefert bei jedem Node `credentials: null`, auch wenn eine zugewiesen ist. Daraus lässt sich also *nicht* schließen, dass eine fehlt — und man kann auch nicht sehen, welche dranhängt. Der einzige Weg ist, sie mit `setNodeCredential` ausdrücklich zu setzen.
- **Wird ein Supabase-Projekt gelöscht, verschwindet auch sein Zugang aus n8n.** Jeder Flow, der ihn noch referenziert, scheitert ab dem nächsten Lauf mit `Credential with ID … does not exist`. Bei webhook- oder ereignisgetriebenen Flows fällt das sofort auf, bei Delta-Läufen ohne Änderungen erst Tage später — die betroffenen Nodes werden dann gar nicht angefasst. **Vor dem Löschen eines Projekts auf allen Flows den neuen Zugang setzen**, nicht nur die Adressen umstellen.

---

## Stand: die RWG-Wissensbasis

Drei Ingest-Flows füllen dieselbe Tabelle `document_chunks`, unterschieden über `source_type`:

| Quelle | Chunks | Dokumente |
|---|---|---|
| `jira` | 10 548 | 1 467 |
| `sharepoint` | 7 287 | 253 |
| `confluence` | 3 512 | 611 |

Dazu der Bucket `rag` mit rund 7 384 Bildern. Gelesen wird über `RWG Sub - Wissenssuche` (Hybrid aus Vektor- und deutscher Volltextsuche mit RRF und Cohere-Rerank), den Jira-Agenten und den Teams-Agenten.

Die Zahlen sind am 30.08. abends gemessen, **während der Abgleich noch lief** — sie sind inzwischen höher.

**Gesundheitsprüfung:** Flow `RWG Wartung - Funktionen pruefen` (`h4uVcnxF5jbRUPHZ`) beantwortet in einer halben Sekunde, ob die Wissensbasis intakt ist — Bestand, Embeddings, Indizes, Bucket und ob noch Verweise aufs alte Projekt existieren. Keine publizierte Fassung, im Manuell-Modus starten.

## Als Erstes in der neuen Sitzung

1. **Das Mistral-Kontingent ist aufgebraucht — Zurücksetzung am 31.08.2026.** Die Abrechnungsmail sagt es wörtlich: 100 Prozent der enthaltenen API-Nutzung erreicht, Zugriff pausiert. **Die pausierte API wirft die Verbindung weg, statt einen 403 zu senden** — der Knoten `Upload Source To Mistral` meldet dann `ECONNRESET` mit *„The connection to the server was closed unexpectedly"*, und die drei Wiederholungen laufen alle ins Leere. Ein Abrechnungsproblem sieht dadurch wie ein Netzabbruch aus.

   **Solange das gilt, kann der Ingest keine Datei einlesen, die durch die OCR muss.** Der nächtliche Abgleich läuft, findet Aufgaben und scheitert an der ersten. Das ist erwartet, kein Defekt.

   **Was ohne Mistral trotzdem geht:** `.txt`, `.csv` (Textpfad) und `.xlsx` (Workbook-API). Nur PDF, Word und PowerPoint brauchen die OCR.

2. **Sechs Altzeilen ohne Chunks sind nicht heilbar, sondern zu löschen.** Es sind Power-Automate-Zeilen mit `RWGID`-Kennung. Der Abgleich ordnet über die Graph-`doc_id` zu und findet keine Entsprechung — er liest die Datei stattdessen als **neue** ein und legt eine zweite Zeile an. Belegt an `16_ber_regaletiketten…`: Die Graph-Fassung hat jetzt 163 Chunks, die Altzeile steht weiter bei null.

   Das widerlegt die Annahme in `offene-punkte.md`, eine über Graph neu eingelesene Datei ersetze ihre Altfassung. Sie stellt sich daneben. Betroffen sind potenziell alle **247** Zeilen, die Lauf `110947` als `rag_nicht_zuordenbar` zählte.

   **Zu tun, sobald Mistral wieder läuft:** die fünf verbliebenen Regaletiketten einlesen, danach die sechs Altzeilen löschen — aber erst, wenn die jeweilige Graph-Fassung nachweislich Chunks trägt.

3. **Ist der 31.08. erreicht?** Dann laufen die Mistral-Token wieder, und der Contract Loader lässt sich zu Ende belegen — siehe unten.
3. **Gesundheitsprüfung** als Routine vor größeren Eingriffen.

## Offene Themen

Die vollständige Liste steht in [offene-punkte.md](offene-punkte.md). Nach Dringlichkeit:

**Wartet auf Sebastian**
- **Doubletten in SharePoint:** 17 überzählige Kopien in 15 Gruppen, zusammen 10 MB. Die vollständige Liste mit Ordnern steht in `offene-punkte.md`. Zwei davon liegen in einem Ordner `alt` und sollen weg — dafür fehlt ein Werkzeug, siehe unten. Die sieben Gruppen unter `/Lagerpläne/` bleiben ausdrücklich unangetastet.
- **Beitragsprüfung im Content Studio testen.** Erzeugt echte Artefakte. Der Ablauf ist geklärt: `Freigabe erteilt` ist eine reine Maschinenprüfung auf `qa_passed`, es gibt **keinen menschlichen Freigabeschritt in n8n**. Geht der Beitrag durch, entstehen E-Mail, `content_packages`-Zeile und ein Buffer-Entwurf — die Freigabe passiert dann in Buffer. Fällt er durch, kommt **nur** eine Telegram-Meldung, sonst nichts. Für den Fehlerfall im Code-Node `Lesbarkeit pruefen` die Mindestwortzahl `30` vorübergehend hochsetzen, danach zurückstellen.
- **Handwerks-Use-Cases.** Die Säule `handwerk` steht auf 0. Der Grund ist strukturell: `KI Daily - Collect [WF-1]` zieht nur aus GitHub, Tavily und Hacker News — angelsächsische Tech-Presse, aus der kein deutscher Handwerksprozess entstehen kann. Vorschlag: fünf bis acht Use-Cases von Hand setzen (das entsperrt den Dienstagsslot sofort), danach die Tavily-Abfrage um deutsche Quellen ergänzen — Mittelstand-Digital Zentren, Handwerkskammern Köln und Düsseldorf, ZDH. Welche davon brauchbare Feeds haben, ist **ungeprüft**.

**Was mir fehlt**
- **Kein Werkzeug zum Löschen von SharePoint-Dateien.** Der einzige Weg wäre ein Wegwerf-Flow gegen die Graph-API mit Hash-Prüfung vor dem Löschen — so wie das Ordner-Werkzeug vom 30.08. Für zwei Dateien lohnt es kaum; wenn mehr wegsollen, ist es gebaut.
- **Redaction ist nicht verfügbar.** In den Workflow-Einstellungen sind `Redact production execution data` und `Redact manual execution data` ausgegraut und tragen ein `Upgrade`-Abzeichen. Damit bleibt der bekannte Klartext-Effekt bei HTTP-Fehlern bestehen. Gemessen: der **lebende** Zugang ist in keiner Ausführung gelandet — nur der Schlüssel des gelöschten Projekts, und der ist wertlos.

**Das größte offene Vorhaben: Contract Loader zu Ende belegen**

`RWG Contract Loader` (`661BDwEditNicEc0`) ist umgebaut: 30 Nodes statt 36, liest aus SharePoint `/IMPORTER/CONTRACT`, schreibt nach `public.vertraege`, legt die Datei nach `DONE` und erzeugt die Excel-Übersicht neu. Aufbau, Entscheidungen und Fallstricke: [flows/rwg-contract-loader/README.md](flows/rwg-contract-loader/README.md).

**Der Umbau ist unveröffentlichter Entwurf.** Die alte Fassung ist noch die aktive.

Belegt (Lauf 110831): SharePoint-Abruf, Download, Hash, Zeile anlegen, Mistral-Upload, OCR, OCR-Text sichern — beide Dokumente vollständig gelesen. **Offen ist die Extraktion**: Die Mistral-Token sind bis zum **31.08.2026** aufgebraucht, der Chat-Endpunkt antwortet `Forbidden`. Der OCR-Endpunkt läuft weiter.

**Zum Abarbeiten ab dem 01.09.:** Lauf anstoßen, Extraktion an den beiden liegengebliebenen Dokumenten prüfen, publizieren, danach Export ins Git. Vier Nodes sind noch ungetestet, alle hinter der Extraktion.

**Technisch offen**
- Erstbefüllung: **432** Dateien einzulesen, 30 je Nacht — etwa fünfzehn Nächte
- **6 Altzeilen ohne Chunks** — Power-Automate-Leichen, siehe oben. Nicht heilbar, sondern zu löschen. Alle echten unvollständigen Einträge sind geheilt.
- Embeddings von 4 091 Bildchunks nach der Adressänderung nicht neu berechnet (rund vier Cent)
- Dokumenteintrag vor den Chunks — abgefangen, aber unsauber
- Tabellendaten abfragbar machen: **vertagt** — Sebastian erwägt einen eigenen SQL-Weg. Nicht unaufgefordert weiterbauen.

## Was im Repo liegt

| Datei | Inhalt |
|---|---|
| `README.md` | alle Flows mit n8n-ID, Datenbankzuordnung und Zusammenhängen |
| `migration/` | Umzug: Befund, Abnahme, Struktur der alten Datenbank |
| `offene-punkte.md` | was ansteht und was fehlt |
| `ideen.md` | was noch keine Aufgabe ist |
| `referenz-dokumentationsbefunde.md` | offene Korrekturen an Confluence-Seiten und Jira-Vorgängen |
| `sharepoint-struktur-schulungen.xlsx` | die Bibliothek Schulungen Ebene für Ebene, 1 650 Einträge mit Links |
| `tests/laufprotokoll.csv` | jeder Lauf mit Execution-ID und Befund |
| `flows/*/README.md` | je Flow: Aufbau, Entscheidungen, Fallstricke |

## Erster Schritt

Hol dir den Stand aus dem Repo und aus n8n, statt dich auf diese Zusammenfassung zu verlassen.
