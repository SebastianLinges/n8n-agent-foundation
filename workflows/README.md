# Workflows

Dieser Ordner enthaelt importierbare n8n Workflow-Dateien.

## Hauptworkflow

| Datei | Status | Zweck |
|---|---|---|
| `rwg-teams-agent-resilient.json` | aktiv | Robuster Microsoft Teams AI-Agent fuer n8n |

## Import

1. n8n oeffnen.
2. Neuen Workflow anlegen oder Import-Funktion nutzen.
3. `rwg-teams-agent-resilient.json` importieren.
4. Credentials in n8n zuweisen.
5. `ownUserIds` im Node `Normalize Request` setzen.
6. Test in Teams durchfuehren.

## Credential-Hinweis

Workflow-Dateien in diesem Ordner duerfen keine produktiven Credentials enthalten. Wenn ein Export aus n8n Credentials enthaelt, darf er nicht committed werden.

## Nach Aenderungen pruefen

- JSON muss valide sein.
- Node-Namen in `connections` muessen existieren.
- Keine alten Credential-IDs oder Tokens im Export.
- Kurzer Import-Test in n8n, bevor der Workflow produktiv aktiviert wird.
