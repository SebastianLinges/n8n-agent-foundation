# Jira-Agent — Stand und offene Punkte

Workflow `RWG_Jira-Agent` (`QXCWIsTzDEmfwPwK`), aktiv, 74 Nodes, Jira-Trigger auf `Project = SSD`, Ereignis `jira:issue_created`.

## Absicherung der Policy-Ausgabe

Die Policy entscheidet über Routing und Betriebssignale und liefert dafür ein JSON mit zwölf Feldern und zwei verschachtelten Objektarrays — aus einem Regelwerk von rund 10.000 Zeichen. Diese Ausgabe ist der empfindlichste Punkt des Workflows und deshalb doppelt abgesichert:

**Die API erzwingt das Format.** `Policy-Modell` läuft über die Responses-API mit `json_schema` und `strict: true`. Das Schema liegt in `jira-agent-policy-schema.json`; jedes Objekt ist geschlossen, `required` deckt alle Felder. Ungültiges JSON ist damit auf API-Ebene ausgeschlossen.

**Der Parser repariert.** `Policy-Schema` prüft dieselbe Struktur mit `autoFix`. Weicht die Ausgabe wider Erwarten ab, wird das Modell mit der Fehlermeldung erneut befragt, statt den Lauf zu beenden. Der Parser prüft Form und Typen ohne die Wertelisten — die Enums erzwingt bereits die API, und doppelt gepflegte Wertelisten wären eine Fehlerquelle.

**Scheitert die Policy dennoch**, führt ihr Fehlerausgang auf `Lauf als fehlgeschlagen vermerken`. Der Vorgang wird in `jira_agent_events` auf `failed` gesetzt und trägt den Fehlertext:

```sql
UPDATE public.jira_agent_events
SET status = 'failed', completed_at = now(), last_error = left($2, 5000)
WHERE event_key = $1
RETURNING event_key, status, attempt_count;
```

Damit greift die `status = 'failed'`-Bedingung der Claim-Query, und der Vorgang ist erneut beanspruchbar. Ohne diesen Ausgang bliebe er auf `processing` stehen: die Zeitbedingung der Claim-Query greift nur bei einem erneuten Ereignis, und `issue_created` kommt genau einmal.

## Laufzeit

`executionTimeout` steht auf 900 s. Der bisherige Wert von 300 s war zu knapp — ein erfolgreicher Lauf erreichte 286,9 s und damit 96 % der Grenze. `Policy-Modell` läuft mit `reasoningEffort: low`, weil die Aufgabe schemagebunden ist und Latenz hier unmittelbar auf das Timeout durchschlägt.

## Warum die JSM-Kommentare über HTTP laufen

`Anwendernachricht senden` und `Internen JSM-Kommentar anlegen` nutzen `/rest/servicedeskapi/request/{key}/comment` mit `public: true/false`. Der native Jira-Node kennt nur `issueComment:add` über die Plattform-API und **kann die JSM-Sichtbarkeit nicht setzen** — ein Wechsel würde interne Kommentare für Anwender sichtbar machen. Die HTTP-Nodes sind hier die richtige Wahl, kein Versäumnis.

Der Atlassian-MCP-Node (`@n8n/mcp-registry.atlassian`) ist als `ai_tool` deklariert und damit nur als Werkzeug an einem Agenten nutzbar, nicht als feste Aktion im Ablauf. Für die Schreibpfade kommt er nicht in Frage. Als Recherchewerkzeug am `Interner Support-Analyst` ist er einen eigenen Vergleich wert — dafür steht `RWG Test - MCP vs RAG` bereit.

## Offen

**Wirkung messen.** Vor dem Umbau brachen 9 von 60 Läufen am Policy-Schema ab, Quote 15 %, jeweils mit `Invalid JSON in model output`. Der Umbau wurde am 27.08. um 14:30 veröffentlicht; seither steht die Messung aus. Ziel ist eine Quote nahe null, gemessen über mindestens 60 Läufe.

**Aufräumen (eigene Etappe).** Noch nicht angefasst:

- Versionsspuren in den Code-Kommentaren — `V6.1`, `AENDERUNGEN GEGENUEBER V6`, `FIX 08/2026`, `Beleg: Lauf 102972`. Kommentare sollen beschreiben, was der Node heute tut.
- Sticky Notes tragen technische Namen (`Sticky Note 6dc891e0`) statt sprechender. Die Inhalte sind gut und tragen die Gliederung 1–6.
- Canvas spannt über 12.100 px; `Analysierbar?` verbindet über 9.400 px direkt auf `Event abschliessen`.
- 2.079 Code-Zeilen in 11 Code-Nodes, größter Einzelnode 17.237 Zeichen.

**Credential am neuen Node.** `Lauf als fehlgeschlagen vermerken` wurde `Postgres account: Linges` zugewiesen. Über die MCP-Schnittstelle ist das nicht verifizierbar — sie redigiert Credentials grundsätzlich. Prüfung nur in der Oberfläche möglich.
