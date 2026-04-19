# Architektur

## Übersicht

```
Teams → n8n → Subworkflows → AI Agent → RAG → Response → Teams
```

## Komponenten

### 1. Eingang: Microsoft Teams
- Teams-Nachricht löst den Workflow aus (Webhook oder Teams-Trigger)
- Übergibt Benutzer, Nachricht, Kanal und Kontext

### 2. n8n Hauptworkflow
- Empfängt den Trigger
- Routet an den passenden Subworkflow
- Koordiniert den gesamten Ablauf

### 3. Subworkflows
- Wiederverwendbare Bausteine (z. B. RAG-Abfrage, Authentifizierung)
- Werden per "Execute Workflow" Node aufgerufen
- Klar definierte Ein- und Ausgaben

### 4. AI Agent
- Erhält Benutzeranfrage + abgerufenes Wissen
- Verarbeitet mit System-Prompt und Kontext
- Generiert strukturierte Antwort

### 5. RAG (Retrieval-Augmented Generation)
- Kernbaustein des Systems
- Wissensdateien werden in Vector Store eingespeist
- Bei jeder Anfrage: semantische Suche nach relevantem Wissen
- Gefundene Chunks werden dem Agenten als Kontext übergeben

### 6. Ausgabe: Teams
- Formatierte Antwort wird zurück an Teams gesendet
- Antwort enthält Quellenangaben wenn möglich

## Datenfluß

```
Benutzer (Teams)
    ↓ Nachricht + Kanal-Kontext
n8n Trigger
    ↓ Strukturierte Anfrage
Subworkflow: RAG-Retrieval
    ↓ Relevante Wissens-Chunks
AI Agent (LLM)
    ↓ Generierte Antwort
Teams Response
    ↓
Benutzer
```

## Wissensverarbeitung (RAG Detail)

```
Wissensdatei (Markdown/PDF)
    ↓ Chunking
    ↓ Embedding (z. B. OpenAI text-embedding)
Vector Store (z. B. Supabase pgvector)
    ↑ Semantische Suche bei Anfrage
AI Agent
```
