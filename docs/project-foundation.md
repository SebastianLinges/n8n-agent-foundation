# Projektbasis

Dieses Repository ist die wiederverwendbare Basis fuer n8n-Workflows mit Fokus auf AI-Agenten, Wissensablage (RAG) und Microsoft Teams Integration.

## Projektziel

Das Repository dient als strukturierte Grundlage fuer den Aufbau intelligenter AI-Agenten in n8n. Der erste Kernbaustein ist die Wissensablage (RAG), mit der Agenten kontextbezogen auf internes Wissen zugreifen koennen.

## Fokus: Wissensablage (RAG)

- Wissen wird als Markdown, PDF oder strukturierte Daten gepflegt.
- Retrieval erfolgt ueber einen Vector Store direkt im n8n-Agenten.
- Wissensbasis und Workflow-Logik bleiben getrennt.

## Struktur

| Ordner | Inhalt |
|---|---|
| `workflows/` | Importierbare n8n Hauptworkflows |
| `subworkflows/` | Wiederverwendbare Bausteine |
| `prompts/` | System- und User-Prompts fuer AI-Agenten |
| `docs/` | Architektur, Konventionen, Importhinweise |
| `examples/` | Beispiel-Inputs und Testdaten |
| `knowledge-base/` | Wissensdateien |
| `.agents/skills/` | Lokale Codex/n8n Arbeitsanweisungen, nicht Teil des versionierten Workflows |

## Workflow Import/Export

Workflows werden als JSON gespeichert und in n8n importiert bzw. exportiert. Credentials duerfen nicht im Repository landen.
