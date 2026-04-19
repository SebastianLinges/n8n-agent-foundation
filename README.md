# RWG Teams Agent fuer n8n

Dieses Repository enthaelt den importierbaren n8n Workflow fuer einen robusten Microsoft Teams AI-Agenten.

## Hauptworkflow

Importdatei:

`workflows/rwg-teams-agent-resilient.json`

Der Workflow verarbeitet Teams-Nachrichten, erkennt Sprache und Kontext, beruecksichtigt Datei-/Linkinformationen, nutzt interne Wissensquellen und sendet schnell eine erste Rueckmeldung in Teams.

## Dokumentation

| Datei | Inhalt |
|---|---|
| `docs/import-and-security.md` | Import, Credential-Zuordnung und Sicherheitsregeln |
| `docs/workflow-overview.md` | Ablauf, Funktionen, Grenzen |
| `docs/project-foundation.md` | Urspruengliche Projektbasis und Ordnerstruktur |
| `prompts/rwg-teams-agent-system.md` | System-Prompt des Agents |

## Sicherheit

Dieses Repo enthaelt keine Zugangsdaten. Nach dem Import muessen Microsoft Teams, OpenAI, Supabase und Postgres Credentials direkt in n8n zugewiesen werden.

Credential-Exports, `.env` Dateien und lokale n8n-Daten sind per `.gitignore` ausgeschlossen.

## Naechste Schritte

1. Workflow in n8n importieren.
2. Credentials in n8n zuweisen.
3. `ownUserIds` im Code-Node `Normalize Request` setzen.
4. Test in einem Teams 1:1 Chat ausfuehren.
5. Workflow aktivieren.
