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
