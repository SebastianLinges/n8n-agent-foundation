# Jira-Agent — Stand und offene Punkte

Workflow `RWG_Jira-Agent` (`QXCWIsTzDEmfwPwK`), aktiv, 75 Nodes, Jira-Trigger auf `Project = SSD`, Ereignis `jira:issue_created`.

## Absicherung der Policy-Ausgabe

Die Policy entscheidet über Routing und Betriebssignale und liefert dafür ein JSON mit zwölf Feldern und zwei verschachtelten Objektarrays — aus einem Regelwerk von rund 10.000 Zeichen. Diese Ausgabe ist der empfindlichste Punkt des Workflows und deshalb dreifach abgesichert.

**1. Die API erzwingt gültiges JSON.** `Policy-Modell` läuft über die Responses-API mit `textFormat.type = json_object`. Damit ist ungültiges JSON auf API-Ebene ausgeschlossen — genau der Fehler, an dem die Policy zuvor abbrach.

> `json_schema` mit `strict: true` wäre stärker, weil es zusätzlich die Felder erzwingt. Das Feld `options.textFormat.textOptions.schema` muss dafür als **JSON-String** übergeben werden, nicht als Objekt — als Objekt meldet der Node zur Laufzeit `Failed to parse schema`, und die Policy wird gar nicht erst befragt. Der Wechsel ist erst sinnvoll, wenn `json_object` an echten Läufen bestätigt ist; das vollständige Schema liegt in `policy-schema.json`.

**2. Der Parser repariert.** `Policy-Schema` prüft die Struktur mit `autoFix`. Weicht die Ausgabe ab, wird das Modell mit der Fehlermeldung erneut befragt, statt den Lauf zu beenden. Der Parser prüft Form und Typen ohne die Wertelisten; die zulässigen Werte stehen im Prompt und in `policy-schema.json`.

**3. Ausfälle werden sichtbar.** Zwei Wege führen auf `Lauf als fehlgeschlagen vermerken`:

- Der Fehlerausgang von `Policy und Routing bestimmen` (`onError: continueErrorOutput`) fängt Fehler im Chain-Node selbst.
- `Policy geliefert?` fängt Fehler in den **Sub-Nodes** ab. Scheitert Modell oder Parser, reicht die Chain die Eingangsdaten ohne `output`-Feld durch; der Lauf gilt dann als erfolgreich, obwohl nichts entschieden wurde. Der IF prüft auf `$json.output?.nextAction` und zweigt ab, wenn das Feld fehlt.

Der zweite Weg ist der wichtigere: Der einzige beobachtete Ausfall (Lauf `108721`) kam aus einem Sub-Node, und der Fehlerausgang allein hat ihn nicht erfasst.

```sql
UPDATE public.jira_agent_events
SET status = 'failed', completed_at = now(), last_error = left($2, 5000)
WHERE event_key = $1
RETURNING event_key, status, attempt_count;
```

Damit greift die `status = 'failed'`-Bedingung der Claim-Query, und der Vorgang ist erneut beanspruchbar. Ohne diesen Weg bliebe er auf `processing` stehen: die Zeitbedingung der Claim-Query greift nur bei einem erneuten Ereignis, und `issue_created` kommt genau einmal.

## Laufzeit

`executionTimeout` steht auf 900 s. Der bisherige Wert von 300 s war zu knapp — ein erfolgreicher Lauf erreichte 286,9 s und damit 96 % der Grenze. `Policy-Modell` läuft mit `reasoningEffort: low`, weil die Aufgabe schemagebunden ist und Latenz hier unmittelbar auf das Timeout durchschlägt.

## Warum die JSM-Kommentare über HTTP laufen

`Anwendernachricht senden` und `Internen JSM-Kommentar anlegen` nutzen `/rest/servicedeskapi/request/{key}/comment` mit `public: true/false`. Der native Jira-Node kennt nur `issueComment:add` über die Plattform-API und **kann die JSM-Sichtbarkeit nicht setzen** — ein Wechsel würde interne Kommentare für Anwender sichtbar machen. Die HTTP-Nodes sind hier die richtige Wahl, kein Versäumnis.

Der Atlassian-MCP-Node (`@n8n/mcp-registry.atlassian`) ist als `ai_tool` deklariert und damit nur als Werkzeug an einem Agenten nutzbar, nicht als feste Aktion im Ablauf. Für die Schreibpfade kommt er nicht in Frage. Als Recherchewerkzeug am `Interner Support-Analyst` ist er einen eigenen Vergleich wert — dafür steht `RWG Test - MCP vs RAG` bereit.

## Offen

**Wirkung messen.** Vor dem Umbau brachen 9 von 60 Läufen am Policy-Schema ab, Quote 15 %, jeweils mit `Invalid JSON in model output`. Seither gab es **keinen sauberen Lauf**: der einzige Lauf nach dem ersten Publish lief in einen Konfigurationsfehler, der inzwischen behoben ist. Die Messung beginnt mit dem nächsten neuen SSD-Ticket. Ziel ist eine Quote nahe null über mindestens 60 Läufe.

**Kommentarkopf in `Internen Kommentar erzeugen`.** Trägt weiterhin `V6.1`, `AENDERUNGEN GEGENUEBER V6` und `[FIX 1]`–`[FIX 6]`. Die bereinigte Fassung liegt in `code/` und muss von Hand eingefügt werden — Begründung dort.

**Canvas.** Der Graph spannt über 12.100 px; `Analysierbar?` verbindet über 9.400 px direkt auf `Event abschliessen`. Das ist kein Layoutproblem, sondern strukturell: `Event abschliessen` ist gemeinsamer Endpunkt für sieben Pfade, darunter der früheste Ausstieg. Auflösen ließe es sich nur durch einen zweiten Abschluss-Node nahe dem frühen Ausstieg — das dupliziert Logik und ist eine offene Entscheidung.

**Credential am neuen Node.** `Lauf als fehlgeschlagen vermerken` wurde `Postgres account: Linges` zugewiesen. Über die MCP-Schnittstelle ist das nicht verifizierbar — sie redigiert Credentials grundsätzlich. Prüfung nur in der Oberfläche möglich. Solange das offen ist, greift die Absicherung aus Punkt 3 nicht.
