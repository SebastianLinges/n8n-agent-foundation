# Import und Sicherheit

## Import

1. In n8n einen neuen Workflow importieren.
2. Datei `workflows/rwg-teams-agent-resilient.json` auswaehlen.
3. Nach dem Import alle Credential-Felder in n8n neu zuweisen.
4. Testnachricht in einem Teams 1:1 Chat senden.
5. Erst nach erfolgreichem Test aktivieren.

## Erforderliche Zugangsdaten in n8n

| Bereich | n8n Credential-Typ | Zweck |
|---|---|---|
| Microsoft Teams / Graph | Microsoft Teams OAuth2 API | Teams Trigger, Chat laden, Nachricht senden |
| OpenAI | OpenAI API | Chat-Modell und Embeddings |
| Supabase | Supabase API | Knowledge Chunks und Jira-Ticket-Tool |
| Postgres | Postgres | Chat Memory |

## Sicherheitsregeln

- Keine Credential-IDs, Token, Client Secrets oder Exportdateien mit Zugangsdaten committen.
- n8n Credential-Zuordnung erfolgt ausschliesslich nach dem Import in n8n.
- `.env`, lokale n8n-Daten und Credential-Exports sind in `.gitignore` ausgeschlossen.

## Nach dem Import anpassen

Im Code-Node `Normalize Request`:

- `ownUserIds`: IDs des Bot-/Service-Users eintragen, damit der Agent nicht auf eigene Nachrichten reagiert.
- `agentDisplayNameHints`: Anzeigenamen des Agents ergaenzen, falls der Trigger eigene Bot-Nachrichten anders liefert.

Im AI-Agenten:

- OpenAI Credential zuweisen.
- Supabase/Postgres Zugangsdaten zuweisen.
- Tools aktiv lassen, die in der Umgebung wirklich verfuegbar sind.
