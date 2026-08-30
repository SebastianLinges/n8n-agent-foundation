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
- **Der Postgres-Node durchsucht den gesamten Abfragetext nach Dollar-Platzhaltern** — auch in Zeichenketten und **in Kommentaren**. Ein `$1` in einem Kommentar bricht die Abfrage mit `out of range`; ein `$` ohne Ziffer wird still verschluckt (ein Zeilenende-Anker in einem regulären Ausdruck verschwand samt Anführungszeichen). Platzhalter zur Laufzeit aus `chr(36)` bauen, Daten immer über `queryReplacement` binden.
- **`queryBatching: single` verfälscht SQL**, wenn mehrere Anweisungen zusammengefasst werden. Immer `independently`.
- **Große Ausführungen sind per MCP nicht abrufbar** — `get_execution` mit `includeData` reißt bei OCR- und bildlastigen Läufen die Sitzung ab. Die Ursache steht stattdessen in der Ausführung des Fehler-Workflows `pMGm0LaxRTldvPKEkmkzC`.
- **n8n weist Credentials automatisch zu**, wenn nur eine des Typs existiert. Bei zwei Datenbanken ist das gefährlich — nach jedem `create_workflow_from_code` die Zuordnung prüfen.

---

## Stand: die RWG-Wissensbasis

Drei Ingest-Flows füllen dieselbe Tabelle `document_chunks`, unterschieden über `source_type`:

| Quelle | Chunks | Dokumente |
|---|---|---|
| `jira` | 10 544 | 1 466 |
| `sharepoint` | 7 267 | 252 |
| `confluence` | 3 512 | 611 |

Dazu der Bucket `rag` mit 7 384 Bildern (452 MB). Gelesen wird über `RWG Sub - Wissenssuche` (Hybrid aus Vektor- und deutscher Volltextsuche mit RRF und Cohere-Rerank), den Jira-Agenten und den Teams-Agenten.

**Der Umzug ins neue Supabase-Projekt ist am 30.08. vollzogen und abgenommen.** Einzelheiten in [migration/README.md](migration/README.md).

**Gesundheitsprüfung:** Flow `RWG Wartung - Funktionen pruefen` (`h4uVcnxF5jbRUPHZ`) beantwortet in einer halben Sekunde, ob die Wissensbasis intakt ist — Bestand, Embeddings, Indizes, Bucket und ob noch Verweise aufs alte Projekt existieren.

## Als Erstes in der neuen Sitzung

1. **Wie lief der Abgleich um 03:30?** Ausführungen von `BBhGCRsQ8pdNSxTi`, der Lauf um 01:30 UTC ist der Abgleich. Bei einem Fehler steht die Ursache in der Ausführung von `pMGm0LaxRTldvPKEkmkzC`, nicht im Lauf selbst.
2. **Gesundheitsprüfung laufen lassen** (`h4uVcnxF5jbRUPHZ`).
3. Erst danach: **das alte Supabase-Projekt `zjabiweaihsezjjeycko` löschen.**

## Offene Themen

Die vollständige Liste steht in [offene-punkte.md](offene-punkte.md). Nach Dringlichkeit:

**Wartet auf Sebastian**
- Altes Supabase-Projekt löschen (nach der Beobachtungsnacht)
- Power-Automate-Flow entfernen (außerhalb von n8n, Ziel `.../webhook/8e16e07b-…`)
- Vier leere Ordner in Shared Documents: löschen oder behalten?
- 23 Formatpaare und 5 unklare Doubletten — fachlich zu entscheiden
- Beitragsprüfung im Content Studio testen (erzeugt echte Artefakte)
- Use Cases für Handwerk und CAD/PDM: Zuarbeit nötig

**Das größte offene Vorhaben: Contract Loader neu aufsetzen**

Der alte `RWG_Contract_Loader` (`661BDwEditNicEc0`) läuft über Formular und Webhook und schreibt in eine n8n-Data-Table. Der Neuaufbau soll aus **SharePoint** lesen, nach **Supabase** schreiben und die verarbeitete Datei in einen Unterordner **`Erledigt`** legen. Ergebnisse zusätzlich in eine Excel-Liste. Ziel ist die bestmögliche Erkennung von Vertragsinformationen — Laufzeit, Kundennummern, Kündigungsfristen, Preise.

**Die Zieltabelle `vertraege` steht bereits.** Aufbau und die beiden Entwurfsentscheidungen dahinter stehen in [flows/rwg-vertragsdaten/README.md](flows/rwg-vertragsdaten/README.md).

**Was fehlt:** Site, Bibliothek und Eingangsordner in SharePoint. Die liefert Sebastian. Dazu der Ablageort der Excel-Liste.

**Technisch offen**
- Erstbefüllung läuft: rund 458 SharePoint-Dateien fehlen, 30 je Nacht
- Drei Tabellen ohne bekannten Schreiber: `agent_ticket_dialogs`, `documentation_findings`, `documentation_review_state`
- Embeddings von 4 091 Bildchunks nach der Adressänderung nicht neu berechnet (rund vier Cent)
- Dokumenteintrag vor den Chunks — abgefangen, aber unsauber
- Tabellendaten abfragbar machen: Vektorsuche findet, sie rechnet nicht. Eigenes Vorhaben.
- ProzessHub-Flow scharfschalten (`Muss6GBGPuG9fjE2`, stillgelegt aber funktionsfähig)
- Dienstkonto statt persönlichem Zugang für Graph

## Was im Repo liegt

| Datei | Inhalt |
|---|---|
| `README.md` | alle Flows mit n8n-ID, Datenbankzuordnung und Zusammenhängen |
| `migration/` | Umzug: Befund, Abnahme, Struktur der alten Datenbank |
| `offene-punkte.md` | was ansteht und was fehlt |
| `ideen.md` | was noch keine Aufgabe ist |
| `tests/laufprotokoll.csv` | jeder Lauf mit Execution-ID und Befund |
| `flows/*/README.md` | je Flow: Aufbau, Entscheidungen, Fallstricke |

## Erster Schritt

Hol dir den Stand aus dem Repo und aus n8n, statt dich auf diese Zusammenfassung zu verlassen.
