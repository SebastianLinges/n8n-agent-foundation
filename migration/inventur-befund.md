# Inventur der alten Datenbank

Gemessen mit `RWG Wartung - DB-Inventur` (`to8C8eaxtfbh3oqq`), Lauf **110780**, reine Lesung. Der vollständige Bauplan liegt in [inventur-alt-struktur.json](inventur-alt-struktur.json) — 198 Spalten, 49 Indizes, 5 Funktionen.

## Wovon sie vollgelaufen ist

**Nicht von den Bildern.** Die Vermutung war falsch.

| | |
|---|---|
| Datenbank gesamt | **464 MB** |
| davon `document_chunks` | **410 MB** |
| Bucket `rag` (getrennt) | 452 MB, 7 384 Objekte |

`document_chunks` allein trägt 88 % der Datenbank: 34 MB Nutzdaten, **193 MB Indizes**, der Rest ausgelagerter Speicher für die Vektoren. Die 21 323 Embeddings zu je 1 536 Stellen sind rund 131 MB, der HNSW-Index darüber noch einmal so viel.

Der Bucket zählt **nicht** auf das Datenbankkontingent — er ist ein eigenes Kontingent. Was die Datenbank gesprengt hat, ist die Vektorsuche selbst.

**Folge für das neue Projekt:** Derselbe Inhalt braucht dort wieder rund 464 MB. Das Zielprojekt läuft auf Pro und hat Luft — aber der Effekt ist strukturell, nicht behebbar durch Aufräumen. Wer die Wissensbasis verdoppelt, verdoppelt das.

## Woraus die Wissensbasis besteht

SharePoint ist nur ein Drittel.

| Quelle | Chunks | Dokumente | Textmenge |
|---|---|---|---|
| `jira` | 10 544 | 1 466 | 5 844 kB |
| `sharepoint` | 7 267 | 252 | 5 674 kB |
| `confluence` | 3 512 | 611 | 3 119 kB |
| **gesamt** | **21 323** | | |

**Alle 21 323 Chunks tragen ein Embedding.** Keines fehlt.

## Der Dokumentenspeicher

Ein Bucket, `rag`, angelegt am 19.01.2026.

| Einstellung | Wert |
|---|---|
| öffentlich | **ja** |
| Größenbegrenzung je Datei | **512 000 Bytes (500 kB)** |
| erlaubte Dateitypen | keine Einschränkung |
| AVIF-Erkennung | aus |
| Versionierung | aus |
| Typ | STANDARD |

**Keine einzige Zugriffsregel auf `storage.objects` oder `storage.buckets`.** Wie bei den Tabellen: alles läuft über `service_role`, gelesen wird über die öffentliche URL.

### Was darin liegt

| Ordner | Objekte | Belegung |
|---|---|---|
| `JIRA/` | 1 429 | **322 MB** |
| `SHAREPOINT/` | 5 785 | 128 MB |
| lose im Wurzelverzeichnis | 170 | ~2 MB |

Jira-Anhänge sind im Schnitt zehnmal so groß wie SharePoint-Bilder — 225 kB gegen 22 kB. Dateitypen: 7 377 × `image/jpeg`, 7 × `image/png`.

Die Pfade haben drei Formen: `SHAREPOINT/<doc_id>/<hash>/<datei>` (vier Ebenen), `JIRA/<...>/<datei>` (drei Ebenen) und **170 lose Dateien ohne Ordner** im Muster `img-1776152767708-dw1zeg4r`. Die stammen erkennbar aus einer frühen Fassung, bevor die Ordnerstruktur eingeführt wurde. Ob noch ein Chunk darauf verweist, ist offen — sie sind Kandidaten fürs Aussortieren, aber mit 2 MB kein Platzproblem.

**Ein Punkt zum Nachfassen:** Die größte abgelegte Datei ist exakt 500 kB — genau die Begrenzung. Das legt nahe, dass größere Bilder abgewiesen wurden. Ob dabei etwas verloren ging, sagt der Bestand nicht; es steht in den Ingest-Fehlern der jeweiligen Läufe.

## Die zwölf Tabellen

| Tabelle | Zeilen | Spalten |
|---|---|---|
| `document_chunks` | 21 323 | 11 |
| `jira_tickets` | 1 554 | 31 |
| `jira_agent_events` | 1 100 | 11 |
| `agent_requests` | 724 | 17 |
| `confluence_pages` | 611 | 15 |
| `sharepoint_documents` | 266 | 29 |
| `agent_conversation_memory` | 104 | 6 |
| `documentation_review_state` | 17 | 16 |
| `documentation_findings` | 10 | 23 |
| `agent_ticket_dialogs` | 2 | 14 |
| `agent_jira_create_requests` | 0 | 11 |
| `ingestion_errors` | 0 | 14 |

**Keine Fremdschlüssel.** Das macht die Reihenfolge beim Befüllen gleichgültig.

## Was das neue Projekt braucht

### Erweiterungen

| Erweiterung | Fassung | Schema |
|---|---|---|
| `vector` | 0.8.0 | `extensions` |
| `pg_trgm` | 1.6 | `extensions` |
| `pgcrypto` | 1.3 | `extensions` |
| `uuid-ossp` | 1.1 | `extensions` |
| `pg_stat_statements` | 1.11 | `extensions` |
| `supabase_vault` | 0.3.1 | `vault` |

**`postgres_fdw` und `dblink` sind nicht installiert.** Für den Server-zu-Server-Weg muss eine davon im **neuen** Projekt aktiviert werden; im alten ist nichts nötig.

### `document_chunks` — die Tabelle, an der alles hängt

```
id            uuid          NOT NULL  DEFAULT gen_random_uuid()
source_type   text          NOT NULL
source_id     uuid          NOT NULL
source_ref    text          NOT NULL
chunk_index   integer       NOT NULL
chunk_text    text          NOT NULL
token_count   integer
embedding     vector(1536)
metadata      jsonb         NOT NULL  DEFAULT '{}'::jsonb
created_at    timestamptz   NOT NULL  DEFAULT now()
audience      text          NOT NULL  DEFAULT 'public'::text
```

Neun Indizes, drei davon tragen die Suche:

```sql
CREATE INDEX ix_chunks_embedding ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');

CREATE INDEX ix_chunks_text_fts ON public.document_chunks
  USING gin (to_tsvector('german'::regconfig, chunk_text));

CREATE UNIQUE INDEX unique_chunk_per_source ON public.document_chunks
  USING btree (source_id, chunk_index);
```

Der Volltextindex ist auf **`german`** festgelegt — eine andere Konfiguration im neuen Projekt macht den lexikalischen Zweig der Hybridsuche stillschweigend schlechter, ohne dass etwas ausfällt.

### Fünf Funktionen, nicht eine

| Funktion | Größe |
|---|---|
| `jira_agent_collect_context` | 8 779 Zeichen |
| `funktion_match_document_chunks` | 2 047 |
| `funktion_rag_suche_chunks` | 1 911 |
| `funktion_jira_ticket_lesen` | 1 298 |
| `match_documents` | 631 |

Der vollständige Quelltext aller fünf steht in [inventur-alt-struktur.json](inventur-alt-struktur.json).

### Zugriffsregeln

**Auf allen zwölf Tabellen ist RLS eingeschaltet — und es gibt keine einzige Policy.** Alles läuft über den `service_role`-Schlüssel, der RLS umgeht. Das ist im neuen Projekt genauso herzustellen: RLS an, keine Regeln. Wer RLS dort vergisst, öffnet die Wissensbasis für jeden anonymen Schlüssel.

## Was das für den Umzug bedeutet

**Vollständig kopieren statt teilweise neu aufbauen.** 21 323 Zeilen und 464 MB sind wenig. Der frühere Gedanke, die SharePoint-Seite neu aufzubauen und so Aufwand zu sparen, trägt nicht: er spart ein Drittel der Zeilen, kostet aber OCR-Zeit, mehrere Abgleichsnächte und wirft die ungeklärte Frage auf, ob die Jira- und Confluence-Strecken ihren Vollbestand überhaupt nachziehen können. Ein vollständiges Kopieren umgeht das.

**Die Bilder müssen dann mit.** Die Chunk-Metadaten verweisen auf Pfade im Bucket `rag`. Kopiert man die Chunks ohne die 7 384 Objekte, entstehen 7 384 tote Verweise. Dafür braucht es S3-Zugangsdaten für beide Projekte.
