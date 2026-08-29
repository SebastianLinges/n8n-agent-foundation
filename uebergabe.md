# Übergabe an den nächsten Chat

Diese Datei ist als Eingangsnachricht für eine neue Sitzung gedacht. Sie ersetzt keine Recherche — der aktuelle Stand steht im Repo und in n8n, nicht hier.

---

## Wer und was

Sebastian Linges, Geschäftsführer KAPA Digital, arbeitet für RWG Rheinland eG. n8n-Instanz `https://n8n.srv1307521.hstgr.cloud`. Zugriff per MCP auf n8n, Jira/Confluence (Atlassian), Supabase.

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

---

## Stand: SharePoint-Wissensbasis

**Der Hauptbau der letzten Sitzung.** `RAG - SharePoint Ingest` (`BBhGCRsQ8pdNSxTi`), 106 Nodes, publiziert.

Ein Flow für alles — er holt seine Änderungen selbst, verarbeitet sie und schreibt sie fort. Kein Webhook, kein Power Automate, kein zweiter Flow.

| | Takt | Was |
|---|---|---|
| Delta | stündlich | nur Änderungen seit dem Anker |
| Abgleich | 03:30 Ortszeit | voller Vergleich SharePoint ↔ Wissensbasis |

Alle Dateitypen sind einzeln belegt: pdf, docx, pptx, txt, xls, xlsx. Word und PowerPoint laufen über die PDF-Wandlung von Graph durch dieselbe OCR-Strecke — bei PowerPoint erfasst Mistral dabei auch die Folienbilder. Arbeitsmappen laufen über die Workbook-API, Blatt für Blatt, mit Unterscheidung Tabelle/Notiz.

**Als Erstes am Morgen:** Der Abgleich vom 30.08. um 03:30 war der erste echte Erstbefüllungslauf mit 30 Dateien. Die Laufbilanz zeigt, ob er sauber durchlief.

## Offene Themen

Die vollständige Liste steht in [offene-punkte.md](offene-punkte.md). Nach Dringlichkeit:

**Wartet auf Sebastian**
- Power-Automate-Flow entfernen (liegt außerhalb von n8n, Ziel `.../webhook/8e16e07b-...`)
- Vier leere Ordner in Shared Documents: löschen oder behalten?
- Formatpaare (dieselbe Unterlage als pptx und pdf) und 5 unklare Doubletten — fachlich zu entscheiden
- Beitragsprüfung im Content Studio testen (erzeugt echte Artefakte)
- Use Cases für Handwerk und CAD/PDM: Zuarbeit nötig, der Bestand trägt die Positionierung nicht

**Technisch offen**
- Erstbefüllung läuft: 458 Dateien fehlen, 30 je Nacht
- Dokumenteintrag vor den Chunks — abgefangen, aber unsauber
- Tabellendaten abfragbar machen: Vektorsuche findet, sie rechnet nicht. Für Umsatzfragen bräuchte es ein Abfragewerkzeug wie beim Jira-Agenten. Eigenes Vorhaben.
- ProzessHub-Flow scharfschalten (`Muss6GBGPuG9fjE2`, stillgelegt aber funktionsfähig)
- Dienstkonto statt persönlichem Zugang für Graph

## Was im Repo liegt

| Datei | Inhalt |
|---|---|
| `README.md` | Flow-Übersicht mit n8n-IDs |
| `offene-punkte.md` | Was ansteht und was fehlt |
| `ideen.md` | Was noch keine Aufgabe ist |
| `tests/laufprotokoll.csv` | 160 Läufe mit Execution-ID und Befund |
| `flows/*/README.md` | je Flow: Aufbau, Entscheidungen, Fallstricke |

## Erster Schritt

Hol dir den Stand aus dem Repo und aus n8n, statt dich auf diese Zusammenfassung zu verlassen. Sieh zuerst nach, wie der Abgleich um 03:30 gelaufen ist.
