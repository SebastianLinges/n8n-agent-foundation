# Workflow-Uebersicht

## Ziel

`rwg-teams-agent-resilient.json` ist der robuste Hauptworkflow fuer einen Microsoft Teams AI-Agenten in n8n.

## Kernfunktionen

- Microsoft Teams 1:1 Chat Trigger.
- Schnelle Eingangsreaktion per Graph API, bevor der AI-Agent arbeitet.
- Mehrsprachige Erkennung fuer Deutsch, Englisch, Niederlaendisch, Franzoesisch, Spanisch und Italienisch.
- Fallback-Antwort, falls der AI-Agent keine verwertbare Antwort liefert oder fehlschlaegt.
- Verarbeitung von Teams Message Attachments und Hosted Contents als Kontext.
- Rueckgabe von Text sowie Bild-, Dokument- und Linkinformationen, wenn diese im Kontext vorhanden sind.
- RAG ueber Supabase Vector Store.
- Jira-Ticket-Lookup ueber Supabase.
- Postgres Chat Memory pro Teams Chat.
- Retry/Continue-on-fail an externen Graph-Aufrufen.

## Datei- und Attachment-Logik

Teams liefert Dateien je nach Quelle unterschiedlich:

- `attachments`: Referenzen, Cards, Dokumentlinks oder Inline-Elemente.
- `hostedContents`: direkt an Nachrichten gebundene Inhalte, oft Inline-Bilder.
- `contentUrl`: Link zu Datei oder SharePoint/Graph-Ressource.

Der Workflow normalisiert diese Informationen und stellt sie dem Agenten als strukturierte Attachment-Liste bereit. Text- und JSON-nahe Inline-Inhalte werden als lesbarer Kontext uebergeben. Binaere Dateien werden als Datei-/Link-Metadaten uebergeben; der Agent benennt transparent, wenn der eigentliche Dateiinhalt nicht lesbar vorliegt.

## Ausfallsicherheit

- Der Agent antwortet nicht auf eigene Nachrichten.
- Nur 1:1-Chats werden standardmaessig verarbeitet.
- Graph-Aufrufe haben Retry und laufen bei Fehlern weiter.
- Die erste Teams-Antwort wird vor der AI-Verarbeitung gesendet.
- Die finale Antwort wird HTML-sicher formatiert.
- Wenn keine belastbare AI-Antwort entsteht, wird eine kurze Fallback-Antwort in der Sprache des Nutzers gesendet.

## Grenzen

Der Workflow enthaelt keine Credentials. Nach dem Import muessen die Credentials in n8n zugewiesen werden. Fuer tiefe Datei-Inhaltsextraktion aus SharePoint/OneDrive-Dateien kann spaeter ein spezialisierter Subworkflow ergaenzt werden.
