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

Damit greift die `status = 'failed'`-Bedingung der Claim-Query, und der Vorgang ist erneut beanspruchbar. Dass der Node samt Credential trägt, ist an den Läufen `109605` und `109799` belegt: Er lief an und gab `event_key`, `status: failed` und `attempt_count: 1` zurück. Ohne diesen Weg bliebe er auf `processing` stehen: die Zeitbedingung der Claim-Query greift nur bei einem erneuten Ereignis, und `issue_created` kommt genau einmal.

## Laufzeit

`executionTimeout` steht auf 900 s. Der bisherige Wert von 300 s war zu knapp — ein erfolgreicher Lauf erreichte 286,9 s und damit 96 % der Grenze. `Policy-Modell` läuft mit `reasoningEffort: low`, weil die Aufgabe schemagebunden ist und Latenz hier unmittelbar auf das Timeout durchschlägt.

## Warum die JSM-Kommentare über HTTP laufen

`Anwendernachricht senden` und `Internen JSM-Kommentar anlegen` nutzen `/rest/servicedeskapi/request/{key}/comment` mit `public: true/false`. Der native Jira-Node kennt nur `issueComment:add` über die Plattform-API und **kann die JSM-Sichtbarkeit nicht setzen** — ein Wechsel würde interne Kommentare für Anwender sichtbar machen. Die HTTP-Nodes sind hier die richtige Wahl, kein Versäumnis.

Der Atlassian-MCP-Node (`@n8n/mcp-registry.atlassian`) ist als `ai_tool` deklariert und damit nur als Werkzeug an einem Agenten nutzbar, nicht als feste Aktion im Ablauf. Für die Schreibpfade kommt er nicht in Frage. Als Recherchewerkzeug am `Interner Support-Analyst` ist er einen eigenen Vergleich wert — dafür steht `RWG Test - MCP vs RAG` bereit.

## Der Parameter `temperature` gehört nicht an das Policy-Modell

`Policy-Modell` trug `temperature: 0` — ein Wert, den die GPT-5-Generation ablehnt. Solange der Node über Chat Completions lief, blieb das folgenlos. Mit der Umstellung auf die Responses-API quittierte die API jede Anfrage mit `Bad request - please check your parameters`. Die Policy wurde damit **gar nicht mehr befragt**.

Sichtbar war das nicht an der Ausführungsliste: Der Fehler lief über den Fehlerausgang von `Policy und Routing bestimmen` auf `Lauf als fehlgeschlagen vermerken`, und n8n meldet den Lauf deshalb als `success`. Genau dafür ist dieser Weg gebaut — der Vorgang wird in `jira_agent_events` auf `failed` gesetzt und bleibt beanspruchbar. Die Absicherung hat gehalten; sie ersetzt aber keine Wirkungskontrolle.

Belegte Zeitschiene: Lauf `108547` (27.08., 12:28) liefert eine vollständige Policy mit `nextAction: IT`. Die Läufe `109605` und `109799` (28.08.) enden im Fehlerausgang, `Policy-Schema` wird nie erreicht.

### Die Regel, die daraus folgt

Ein Sweep über alle Modellnodes ergibt ein klares Bild:

| Fall | Verhalten |
|---|---|
| `temperature: 0`, Chat Completions | läuft — n8n sendet den Wert offenbar nicht mit |
| `temperature: 0`, Responses-API | **Bad request** — der Ausfall vom 27./28.08. |
| `temperature` ungleich 0 | **Bad request**, unabhängig vom Pfad |

Deshalb trug `Anwender-Schreibmodell` mit `temperature: 0.2` eine scharfe Störung: Der Node speist `Anwenderloesung formulieren` und `Anwenderrueckfrage formulieren`, also **jede** Nachricht an einen Anwender. Aufgefallen war das nie, weil die beobachteten Läufe alle nach IT routeten und den Pfad nicht berührten. Der Parameter ist entfernt.

`Analyse-Modell` trägt weiterhin `temperature: 0` über Chat Completions und arbeitet nachweislich — vier Sub-Läufe je Ticket. Der Node bleibt unangetastet: Ein Eingriff in einen laufenden Node auf Basis einer Theorie hat heute schon einmal die Policy stillgelegt. Wer ihn anfasst, darf `temperature` nicht auf einen Wert ungleich null setzen.

## Offen

**Wirkung messen.** Vor dem Umbau brachen 9 von 60 Läufen am Policy-Schema ab, Quote 15 %, jeweils mit `Invalid JSON in model output`. Diese Messung steht weiterhin aus: Seit dem 27.08. nachmittags scheiterte die Policy am Konfigurationsfehler oben, sodass kein Lauf die neue Absicherung inhaltlich prüfen konnte. Nach dem Laufzeitprofil betrifft das rund 13 Vorgänge — kurze Läufe von etwa 7 s sind Maschinentickets und erreichen die Policy nicht. Die Messung beginnt mit dem nächsten SSD-Ticket nach dem Entfernen von `temperature`. Ziel ist eine Quote nahe null über mindestens 60 Läufe.

Sollte der nächste Lauf erneut `Bad request` melden, ist der nächste Verdächtige `verbosity` in `textFormat.textOptions` — der einzige weitere Parameter, den `Policy-Modell` gegenüber dem funktionierenden `Analyse-Modell` zusätzlich trägt.

**Canvas.** Der Graph spannt über 12.100 px; `Analysierbar?` verbindet über 9.400 px direkt auf `Event abschliessen`. Das ist kein Layoutproblem, sondern strukturell: `Event abschliessen` ist gemeinsamer Endpunkt für sieben Pfade, darunter der früheste Ausstieg. Auflösen ließe es sich nur durch einen zweiten Abschluss-Node nahe dem frühen Ausstieg — das dupliziert Logik und ist eine offene Entscheidung.
