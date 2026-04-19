# Konventionen

## Naming-Regeln

### Workflow-Dateien
- Format: `kebab-case.json`
- Beispiele: `teams-chat-agent.json`, `rag-retrieval.json`, `knowledge-ingest.json`
- Subworkflows Präfix: `sub-` (z. B. `sub-rag-query.json`)

### Ordner
- Kleinbuchstaben, Bindestriche statt Leerzeichen
- Thematisch gruppiert, nicht nach Datum

### Prompts
- Format: `<zweck>-prompt.md` (z. B. `system-prompt.md`, `rag-context-prompt.md`)

### Wissensdateien
- Format: `<thema>-<beschreibung>.md` (z. B. `prozess-onboarding.md`)
- Metadaten-Header am Anfang jeder Datei (siehe unten)

## Credential-Regel

**Keine Credentials im Repository.**
- API-Keys, Tokens, Passwörter bleiben in n8n Credential Store
- Workflow-JSONs enthalten nur Credential-Referenznamen, keine Werte
- `.gitignore` schließt `.env`-Dateien aus

## Workflow-Struktur (Modularität)

- Hauptworkflows orchestrieren, Subworkflows führen aus
- Jeder Subworkflow hat klar definierte Inputs und Outputs
- Kein Copy-Paste von Logik — Wiederverwendung über Subworkflows
- Maximale Workflow-Größe: ~20 Nodes (sonst aufteilen)

## Wissensdateien-Format

Jede Wissensdatei beginnt mit einem Metadaten-Block:

```markdown
---
title: Titel des Dokuments
category: Kategorie (z. B. prozess, produkt, technik)
tags: [tag1, tag2]
last_updated: YYYY-MM-DD
source: Quelle (z. B. intern, confluence, handbuch)
---
```

## Versionierung

- Workflows nach Export sofort committen
- Commit-Message Format: `feat/fix/docs: kurze Beschreibung`
- Beispiele:
  - `feat: RAG-Retrieval Subworkflow hinzugefügt`
  - `fix: Teams-Trigger Fehlerbehandlung korrigiert`
  - `docs: Konventionen aktualisiert`

## JSON-Formatierung

- Einrückung: 2 Spaces
- Kein Trailing Whitespace
- UTF-8 Encoding
