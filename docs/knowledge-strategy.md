# Wissensstrategie (RAG)

## Ziel

Aufbau einer zentralen, strukturierten Wissensbasis, auf die AI-Agenten in n8n kontextbezogen zugreifen können. Wissen ist von Workflow-Logik klar getrennt und eigenständig pflegbar.

## Wissensquellen

### Markdown-Dateien
- Interne Prozessbeschreibungen
- Produktinformationen, FAQs
- Handbücher und Richtlinien
- Direkt im Ordner `knowledge-base/` abgelegt

### PDFs
- Externe Dokumente, Verträge, technische Dokumentationen
- Werden vor dem Einpflegen in Markdown konvertiert oder direkt via n8n PDF-Node gechunkt

### Strukturierte Daten
- CSV / JSON für Tabellenwissen (z. B. Produktkatalog, Preislisten)
- Werden als Kontext-Chunks aufbereitet

## Wissensverarbeitung (Ingestion)

```
Quelldatei
  ↓ Laden (n8n File/HTTP Node)
  ↓ Chunking (z. B. 500 Token, 50 Token Overlap)
  ↓ Embedding (OpenAI text-embedding-3-small)
  ↓ Speichern im Vector Store
```

### Empfohlene Vector Stores
| Option | Vorteil | Einsatz |
|---|---|---|
| Supabase pgvector | Self-hosted, SQL-Integration | Produktion |
| Pinecone | Managed, skalierbar | Cloud-First |
| n8n In-Memory | Kein Setup | Prototyping |

## Wissensnutzung (Retrieval)

```
Benutzeranfrage
  ↓ Embedding der Anfrage
  ↓ Semantische Suche im Vector Store (Top-K Chunks)
  ↓ Chunks als Kontext an AI Agent
  ↓ LLM generiert Antwort mit Kontext
```

### Retrieval-Parameter
- **Top-K**: 3–5 Chunks (Balance zwischen Kontext und Token-Limit)
- **Similarity Threshold**: 0.75 (nur relevante Treffer)
- **Chunk Size**: 500 Token (anpassbar je Dokumenttyp)

## Trennung von Wissen und Logik

| Wissen | Logik |
|---|---|
| `knowledge-base/` | `workflows/`, `subworkflows/` |
| Statische Inhalte | Dynamische Abläufe |
| Manuell gepflegt | Per n8n exportiert |
| Eigenes Git-Tracking | Workflow-JSON versioniert |

## Pflegekonzept

- Wissensdateien regelmäßig prüfen (Veralterung vermeiden)
- Bei Änderungen: Re-Embedding auslösen (n8n Ingest-Workflow)
- Kategorien klar halten — kein unstrukturiertes Ablegen
- Metadaten-Header in jeder Datei (siehe `conventions.md`)
