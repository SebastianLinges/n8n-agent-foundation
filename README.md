# n8n Agent Foundation

Wiederverwendbare Basis für n8n-Workflows mit Fokus auf AI-Agenten, Wissensablage (RAG) und Microsoft Teams Integration.

## Projektziel

Dieses Repository dient als strukturierte Grundlage für den Aufbau intelligenter AI-Agenten in n8n. Der erste Kernbaustein ist die Wissensablage (RAG), mit der Agenten kontextbezogen auf internes Wissen zugreifen können.

## Fokus: Wissensablage (RAG)

- Wissen wird als Markdown, PDF oder strukturierte Daten gepflegt
- Retrieval erfolgt über einen Vector Store direkt im n8n-Agenten
- Klare Trennung von Wissensbasis und Workflow-Logik

## Struktur

| Ordner | Inhalt |
|---|---|
| `workflows/` | Hauptworkflows (n8n JSON) |
| `subworkflows/` | Wiederverwendbare Bausteine |
| `prompts/` | System- und User-Prompts für AI-Agenten |
| `docs/` | Architektur, Konventionen, Strategie |
| `examples/` | Beispiel-Inputs und Testdaten |
| `knowledge-base/` | Wissensdateien (Markdown, strukturierte Daten) |
| `.vscode/` | VS Code Konfiguration |

## Bibliotheken & Erweiterungen

Externe Bibliotheken werden **nur bei Bedarf** ergänzt. Das Projekt startet bewusst schlank und wird schrittweise erweitert.

## Workflow Import/Export

Workflows werden als JSON gespeichert und in n8n importiert bzw. exportiert. Keine Credentials im Repository.

## Nächste Schritte

1. Ersten RAG-Workflow in n8n aufbauen
2. Vector Store anbinden (z. B. Supabase pgvector oder Pinecone)
3. Teams-Trigger konfigurieren
4. System-Prompt verfeinern
