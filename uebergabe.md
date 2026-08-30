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
| `jira` | 10 544 | 1 466 |
| `sharepoint` | 7 267 | 252 |
| `confluence` | 3 512 | 611 |

Dazu der Bucket `rag` mit 7 384 Bildern (452 MB). Gelesen wird über `RWG Sub - Wissenssuche` (Hybrid aus Vektor- und deutscher Volltextsuche mit RRF und Cohere-Rerank), den Jira-Agenten und den Teams-Agenten.

**Der Umzug ist am 30.08. vollzogen, abgenommen und abgeschlossen** — das alte Projekt ist samt Zugang gelöscht. Einzelheiten in [migration/README.md](migration/README.md).

**Gesundheitsprüfung:** Flow `RWG Wartung - Funktionen pruefen` (`h4uVcnxF5jbRUPHZ`) beantwortet in einer halben Sekunde, ob die Wissensbasis intakt ist — Bestand, Embeddings, Indizes, Bucket und ob noch Verweise aufs alte Projekt existieren.

## Als Erstes in der neuen Sitzung

1. **Zwei Nebenbefunde aus dem SharePoint-Ingest entscheiden.** Beide sind gemessen und unangetastet: die Löschschleife bricht nach der ersten Aufgabe ab, und 14 Dokumente tragen keine Chunks. Einzelheiten in [offene-punkte.md](offene-punkte.md).
2. **Ist der 01.09. erreicht?** Dann laufen die Mistral-Token wieder, und der Contract Loader lässt sich zu Ende belegen — siehe unten.
3. **Gesundheitsprüfung** (`h4uVcnxF5jbRUPHZ`) als Routine vor größeren Eingriffen. Der Flow hat keine publizierte Fassung — im Manuell-Modus starten. Zuletzt bestanden: 21 323 Chunks, 0 ohne Embedding, Bucket 7 384, 0 Altverweise.

## Offene Themen

Die vollständige Liste steht in [offene-punkte.md](offene-punkte.md). Nach Dringlichkeit:

**Wartet auf Sebastian**
- Beitragsprüfung im Content Studio testen (erzeugt echte Artefakte)
- Handwerks-Use-Cases: der Scout kann sie nicht aus Branchennachrichten erfinden — Quellen ergänzen oder von Hand setzen
- 27 inhaltsgleiche Kopien und 63 namensgleiche in SharePoint — bereinigen oder vom Ingest überspringen lassen

**Das größte offene Vorhaben: Contract Loader zu Ende belegen**

`RWG Contract Loader` (`661BDwEditNicEc0`) ist umgebaut: 30 Nodes statt 36, liest aus SharePoint `/IMPORTER/CONTRACT`, schreibt nach `public.vertraege`, legt die Datei nach `DONE` und erzeugt die Excel-Übersicht neu. Aufbau, Entscheidungen und Fallstricke: [flows/rwg-contract-loader/README.md](flows/rwg-contract-loader/README.md).

**Der Umbau ist unveröffentlichter Entwurf.** Die alte Fassung ist noch die aktive.

Belegt (Lauf 110831): SharePoint-Abruf, Download, Hash, Zeile anlegen, Mistral-Upload, OCR, OCR-Text sichern — beide Dokumente vollständig gelesen. **Offen ist die Extraktion**: Die Mistral-Token sind bis zum **01.09.2026** aufgebraucht, der Chat-Endpunkt antwortet `Forbidden`. Der OCR-Endpunkt läuft weiter.

**Zum Abarbeiten ab dem 01.09.:** Lauf anstoßen, Extraktion an den beiden liegengebliebenen Dokumenten prüfen, publizieren, danach Export ins Git.

**Technisch offen**
- Erstbefüllung: 472 Dateien nach Dublettenabzug, 30 je Nacht — rund sechzehn Nächte
- Embeddings von 4 091 Bildchunks nach der Adressänderung nicht neu berechnet (rund vier Cent)
- Dokumenteintrag vor den Chunks — abgefangen, aber unsauber
- Tabellendaten abfragbar machen: **vertagt** — Sebastian erwägt einen eigenen SQL-Weg. Plan und Kosten stehen in `offene-punkte.md`, nicht unaufgefordert weiterbauen.

## Was im Repo liegt

| Datei | Inhalt |
|---|---|
| `README.md` | alle Flows mit n8n-ID, Datenbankzuordnung und Zusammenhängen |
| `migration/` | Umzug: Befund, Abnahme, Struktur der alten Datenbank |
| `offene-punkte.md` | was ansteht und was fehlt |
| `ideen.md` | was noch keine Aufgabe ist |
| `referenz-dokumentationsbefunde.md` | offene Korrekturen an Confluence-Seiten und Jira-Vorgaengen |
| `tests/laufprotokoll.csv` | jeder Lauf mit Execution-ID und Befund |
| `flows/*/README.md` | je Flow: Aufbau, Entscheidungen, Fallstricke |

## Erster Schritt

Hol dir den Stand aus dem Repo und aus n8n, statt dich auf diese Zusammenfassung zu verlassen.
