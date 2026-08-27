# Jira-Agent — Befund und Umbauplan

Workflow `RWG_Jira-Agent` (`QXCWIsTzDEmfwPwK`), aktiv, 73 Nodes, Jira-Trigger auf `Project = SSD`, Ereignis `jira:issue_created`.

## Messlage

371 Läufe insgesamt. In den letzten 60 Läufen: **9 Fehlläufe, Quote 15 %**. Jeder Fehllauf endet an derselben Stelle.

Beleg Lauf `108610` (27.08., 13:40): 44 Node-Ausführungen bis `Policy und Routing bestimmen`, dort Abbruch mit `Model output doesn't fit required format`, Grund `Invalid JSON in model output`. Zwei Versuche des Modells, beide ungültig, danach stirbt der Lauf.

## Befund 1 — Policy-Ausgabe ist strukturell ungesichert (Blocker)

Drei Ursachen greifen ineinander:

1. **Modell**: `Policy-Modell` läuft auf `gpt-4o-mini` und soll aus einem **10.022 Zeichen langen Regelwerk** ein JSON mit 12 Feldern und zwei verschachtelten Objektarrays erzeugen.
2. **Kein erzwungenes Format**: `responsesApiEnabled` steht auf `false`, es ist kein `json_schema` gesetzt. Die Formatvorgabe existiert nur als Prompt-Text — das Modell *kann* ungültiges JSON liefern.
3. **Kein Auffangen**: `Policy-Schema` nutzt `jsonSchemaExample` statt eines echten Schemas und hat `autoFix` nicht aktiviert. Aus `"publicEvidenceRefs": []` lässt sich kein Elementtyp ableiten, aus `"safeUserAction": ""` keine Länge — das abgeleitete Schema ist unschärfer als das Regelwerk verlangt.

Der Abbruch ist damit kein Zufall, sondern der Normalfall bei jedem etwas komplexeren Ticket.

## Befund 2 — Fehlläufe hinterlassen blockierte Vorgänge

`Claim Jira Event` setzt `jira_agent_events.status = 'processing'`. Nur `Event abschliessen` und `Event mit Statuswarnung abschliessen` setzen ihn wieder zurück. Beide liegen hinter der Policy — bei einem Abbruch dort läuft keiner von beiden.

Der Vorgang bleibt auf `processing` mit `last_error = NULL` stehen. Die Selbstheilung in der Claim-Query greift nicht:

```sql
WHERE status = 'failed'
   OR (status = 'processing' AND claimed_at < now() - interval '30 minutes')
```

Sie greift nur, **wenn dasselbe Ereignis erneut eintrifft** — ein `jira:issue_created` kommt aber genau einmal. Zudem setzt **kein einziger Node** den Status je auf `failed`; dieser Zweig der Bedingung ist toter Code.

**Folge: Jedes am Policy-Schema gescheiterte Ticket wird nie bearbeitet, ohne dass es jemandem auffällt.** Der Error-Workflow meldet zwar nach Telegram, der Vorgang selbst bleibt aber unsichtbar liegen.

## Befund 3 — Veraltete Modellgeneration

`Analyse-Modell` nutzt `gpt-4o`, `Policy-Modell` und `Anwender-Schreibmodell` nutzen `gpt-4o-mini`. n8n weist diese Generation im Node selbst als überholt aus. Der eigene Testworkflow `RWG Test - MCP vs RAG` arbeitet bereits mit `gpt-5.4-mini`.

## Befund 4 — Hygiene

- **Änderungshistorie im Code**: Die Code-Nodes tragen Versionsspuren im Klartext — `V6.1`, `AENDERUNGEN GEGENUEBER V6`, `FIX 08/2026`, `ENTSCHEIDUNG 08/2026`, `Beleg: Lauf 102972`. Das widerspricht der Vorgabe, immer am neuesten Stand zu arbeiten.
- **Canvas**: Der Graph spannt über 12.100 px. `Analysierbar?` (x = −848) verbindet direkt auf `Event abschliessen` (x = 8.544) — eine Leitung über 9.400 px quer durch den gesamten Workflow.
- **Node-Namen der Notes**: `Sticky Note 6dc891e0` statt sprechender Namen. Die *Inhalte* der sechs Notes sind gut und tragen die Gliederung 1–6; nur die Namen und der Stand müssen nachgezogen werden.
- **Code-Umfang**: 2.079 Zeilen in 11 Code-Nodes, größter Einzelnode 17.237 Zeichen.

## Native Jira-Aktionen und MCP — Prüfergebnis

Geprüft wurde, ob die selbstgebauten HTTP-Aufrufe durch native Aktionen ersetzbar sind.

| Aufruf | Ergebnis |
|---|---|
| `Anwendernachricht senden`, `Internen JSM-Kommentar anlegen` | **Bleibt HTTP.** Beide nutzen `/rest/servicedeskapi/request/{key}/comment` mit `public: true/false`. Der native Jira-Node kennt nur `issueComment:add` über die Plattform-API und **kann die JSM-Sichtbarkeit nicht setzen**. Ein Wechsel würde interne Kommentare für den Anwender sichtbar machen — ein Sicherheitsrückschritt. |
| `Get Issue Fresh`, `Get Issue Comments`, `Status In Arbeit`, `Set Waiting on Employee` | Bereits native Jira-Nodes. Kein Handlungsbedarf. |
| Atlassian MCP | Der Node `@n8n/mcp-registry.atlassian` (v1.1) existiert und die Credential `Atlassian MCP OAuth2: rwg-r.atlassian.net` ist eingerichtet. Er ist aber als `@subnodeType ai_tool` deklariert — **nur als Werkzeug an einem Agenten verwendbar, nicht als deterministische Aktion im Ablauf.** Für die Schreibpfade des Jira-Agenten ist er damit kein Kandidat. |

**Einordnung:** MCP ist hier kein Ersatz für die Schreibpfade. Interessant ist er ausschließlich als *Recherchewerkzeug* am `Interner Support-Analyst` — und genau dafür existiert bereits der A/B-Test `RWG Test - MCP vs RAG`. Ob MCP die eigene Wissenssuche schlägt, ist eine eigene Entscheidung mit eigener Messung und gehört nicht in diesen Umbau.

## Umbauplan

### Schritt 1 — Policy-Ausgabe erzwingen statt erhoffen (behebt Befund 1)

Zwei Verteidigungslinien, beide mit n8n-Bordmitteln, kein Code:

**Erste Linie — die API erzwingt das Format.** `Policy-Modell` auf `gpt-5.4-mini` mit `responsesApiEnabled: true` und `textFormat.textOptions.type = json_schema`, `strict: true`. Das Schema liegt in `jira-agent-policy-schema.json`. Bei `strict: true` ist ungültiges JSON auf API-Ebene ausgeschlossen.

**Zweite Linie — der Parser repariert.** `Policy-Schema` von `jsonSchemaExample` auf `schemaType: manual` mit demselben Schema, dazu `autoFix: true`. Schlägt das Parsen wider Erwarten fehl, wird das Modell mit der Fehlermeldung erneut befragt, statt den Lauf zu beenden.

Der zuvor angedachte Code-Node als Policy-Guard entfällt damit ersatzlos — n8n kann das nativ. Die Vorarbeit dazu wurde entfernt.

> Hinweis: `Auto-fixing Output Parser` als eigener Node ist in dieser n8n-Version **deprecated**. Die Funktion steckt jetzt als `autoFix` im Structured Output Parser.

### Schritt 2 — Fehlläufe sichtbar und wiederholbar machen (behebt Befund 2)

`Policy und Routing bestimmen` erhält `onError: continueErrorOutput`. Der Fehlerausgang führt auf einen neuen Postgres-Node, der den Vorgang auf `failed` setzt:

```sql
UPDATE public.jira_agent_events
SET status = 'failed', completed_at = now(), last_error = left($2, 5000)
WHERE event_key = $1
RETURNING event_key, status, attempt_count;
```

Damit greift die bereits vorhandene `status = 'failed'`-Bedingung der Claim-Query, der tote Zweig wird lebendig, und ein Wiederanlauf ist möglich. Der Fehler bleibt am Vorgang lesbar, statt als stiller Hänger zu verschwinden.

### Schritt 3 — Modelle aktualisieren (behebt Befund 3)

`Analyse-Modell` auf `gpt-5.4`, `Policy-Modell` und `Anwender-Schreibmodell` auf `gpt-5.4-mini`, Temperatur unverändert.

### Schritt 4 — Aufräumen (behebt Befund 4)

Versionsspuren und Änderungshistorie aus allen Code-Kommentaren entfernen; Kommentare beschreiben nur noch, was der Node *heute* tut. Notes auf sprechende Namen (`Note 1 Eingang`, `Note 2 Ticketkontext`, …) und inhaltlich auf den neuen Stand. Canvas neu ordnen, insbesondere `Event abschliessen` an das Ende der Kette statt quer über den Graph.

## Verifikationsstand

| Gegenstand | Prüfung | Ergebnis |
|---|---|---|
| Policy-Schema, Strict-Mode-Tauglichkeit | Eigener Prüflauf: jedes Objekt geschlossen, `required` deckt alle Felder | bestanden |
| `Policy-Modell` neue Konfiguration | `validate_node_config` | gültig |
| `Policy-Schema` mit `autoFix` | `validate_node_config` | gültig |
| `Analyse-Modell` auf `gpt-5.4` | `validate_node_config` | gültig |
| Fehlerursache | Laufdaten `108610` | belegt |
| JSM-Sichtbarkeit nicht nativ abbildbar | Node-Definition `n8n-nodes-base.jira` gegen genutzte Endpunkte | belegt |

Offen bis zum Einbau: Wirkung von Schritt 1 auf echte Tickets. Messgröße ist die Fehlerquote, Ausgangswert 15 % der letzten 60 Läufe.
