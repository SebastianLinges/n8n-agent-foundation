# n8n Agent Foundation

Ablage für die n8n-Instanz: je Flow ein Ordner unter `flows/`, darin alles, was zu diesem Flow gehört — Dokumentation, Schemata, Hilfsdateien und der Workflow-Export.

## Struktur

```
flows/<flow-name>/
  README.md        Was der Flow tut, wie er gebaut ist, was offen ist
  workflow.json    Export aus n8n
  *.json / *.sql   Schemata, Abfragen, Hilfsdateien des Flows
```

| Flow | Ordner | n8n-ID |
|---|---|---|
| RWG Jira-Agent | `flows/rwg-jira-agent/` | `QXCWIsTzDEmfwPwK` |
| RWG Teams Agent | `flows/rwg-teams-agent/` | `BWswB3XA8S2gMwoT` |
| RWG Sub - Jira Tickets | `flows/rwg-sub-jira-tickets/` | `HoCch7AkiSroyJBB` |
| RWG Sub - Wissenssuche | `flows/rwg-sub-wissenssuche/` | `GD256mxClPHHbngI` |
| RWG_Jira-Feldpflege | `flows/rwg-jira-feldpflege/` | `k4SmnNrz7ASMdFwk` |
| KI Daily - Collect [WF-1] | `flows/ki-daily-collect/` | `mzSLn4WzFQSv0cuX` |
| KI Daily - Analyze & Deliver [WF-2] | `flows/ki-daily-analyze/` | `objM2PQrcTpEzik7` |
| KAPA Content Studio [WF-3] | `flows/kapa-content-studio/` | `bBBybznNNCnU2nOJ` |
| RWG ProzessHub nach SharePoint | `flows/prozesshub-sharepoint/` | `Muss6GBGPuG9fjE2` |

Die beiden KI-Daily-Flows gehören zusammen und müssen **auf denselben Wochentagen laufen** — die Kopplung trägt über Zustände in Supabase, nicht über ein Datum. Wer den Cron des einen ändert, muss den anderen mitändern. Die Begründung steht in beiden Flow-READMEs.

Die drei Marketing-Flows bilden eine Kette: Collect sammelt, Analyze wertet aus und legt Use Cases und Marketing-Ideen ab, das Content Studio verbraucht sie. Das Studio laeuft **einen Tag vor dem Posttag** - der `weekday` in `content_schedule` meint deshalb den Posttag, nicht den Lauftag.

Der Teams-Agent ruft zwei weitere Subflows: `RWG Sub - Identity & Audience Resolver` (`B2kmRuBHRbJx8HBI`) und `RWG Sub – Teams Image Read` (`omHDN0g9Lusb6H87`). Beide sind auf der n8n-Leinwand dokumentiert und im README des Teams-Agenten eingeordnet; einen eigenen Ordner bekommen sie erst, wenn dort mehr als der Export abzulegen ist.

## Offene Punkte

Was ansteht und was zum Abarbeiten fehlt, steht in [offene-punkte.md](offene-punkte.md). Erledigtes wird dort geloescht, nicht abgehakt - der Verlauf liegt in `tests/laufprotokoll.csv` und in der Git-Historie. Was noch keine Aufgabe ist, sondern erst ein Gedanke, steht in [ideen.md](ideen.md).

## Arbeitsweise

1. Ist-Stand direkt aus n8n lesen (`search_workflows`, `get_workflow_details`, `search_executions`).
2. Befund und Vorgehen im `README.md` des Flow-Ordners festhalten.
3. Änderung in n8n anwenden, mit `validate_node_config` bzw. `test_workflow` absichern, dann veröffentlichen.
4. Nach dem Publish den Export erneuern und committen.

Native n8n-Nodes gehen vor Code-Nodes. Die Dokumentation beschreibt immer den aktuellen Stand — keine Versionsangaben, keine Änderungshistorie, keine abgelösten Passagen.

## Zum Workflow-Export

`workflow.json` enthält Nodes, Verbindungen und Einstellungen und dient der Nachvollziehbarkeit und dem Vergleich zwischen Ständen.

**Es ist kein vollständiges Backup.** Die n8n-Schnittstelle redigiert Credentials grundsätzlich, deshalb enthält der Export **keine Credential-Referenzen**. Nach einem Import müssen alle Credentials in n8n neu zugewiesen werden. Die produktive Wahrheit steht in der Instanz, nicht hier.

## Sicherheit

Keine Zugangsdaten im Repository — keine Credential-Exports, `.env`-Dateien, Tokens, API-Keys oder Zertifikate. Credentials leben ausschließlich im n8n Credential Store.
