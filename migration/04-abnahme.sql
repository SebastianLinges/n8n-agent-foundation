-- ===========================================================================
-- SCHRITT 4: ABNAHME
--
-- Nach der Ueberfuehrung. Gegen BEIDE Projekte laufen lassen und die
-- Ergebnisse nebeneinanderlegen. Erst wenn sie uebereinstimmen, gilt die
-- Migration als belegt - vorher ist sie nur ohne Fehlermeldung durchgelaufen,
-- und das ist nicht dasselbe.
--
-- Was nicht mitmigriert, sondern neu aufgebaut wird (Entscheidung aus
-- Schritt 1), gehoert hier ausgeklammert - sonst meldet die Abnahme eine
-- Luecke, die keine ist.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 4.1 Zeilenzahlen je Tabelle
-- ---------------------------------------------------------------------------
SELECT 'document_chunks'           AS tabelle, count(*) FROM public.document_chunks
UNION ALL SELECT 'sharepoint_documents',       count(*) FROM public.sharepoint_documents
UNION ALL SELECT 'jira_tickets',               count(*) FROM public.jira_tickets
UNION ALL SELECT 'jira_agent_events',          count(*) FROM public.jira_agent_events
UNION ALL SELECT 'agent_conversation_memory',  count(*) FROM public.agent_conversation_memory
UNION ALL SELECT 'agent_requests',             count(*) FROM public.agent_requests
UNION ALL SELECT 'ingestion_errors',           count(*) FROM public.ingestion_errors
ORDER BY 1;


-- ---------------------------------------------------------------------------
-- 4.2 Chunks je Quelle - muss der Inventur entsprechen
-- ---------------------------------------------------------------------------
SELECT source_type AS quelle, count(*) AS chunks, count(DISTINCT source_ref) AS dokumente
FROM public.document_chunks
GROUP BY source_type
ORDER BY source_type;


-- ---------------------------------------------------------------------------
-- 4.3 Sind die Vektoren wirklich mitgekommen?
-- Eine Zeile ohne Embedding ist fuer die Wissenssuche unsichtbar. Genau das
-- wuerde eine reine Zeilenzaehlung nicht bemerken.
-- ---------------------------------------------------------------------------
SELECT
  count(*)                                    AS chunks_gesamt,
  count(*) FILTER (WHERE embedding IS NULL)   AS ohne_embedding,
  min(vector_dims(embedding))                 AS kleinste_breite,
  max(vector_dims(embedding))                 AS groesste_breite
FROM public.document_chunks;


-- ---------------------------------------------------------------------------
-- 4.4 Vollstaendigkeit der Dokumente: jedes Dokument braucht seinen Kopfsatz
-- Dieselbe Pruefung, die der naechtliche Abgleich faehrt.
-- ---------------------------------------------------------------------------
SELECT count(*) AS dokumente_ohne_kopfsatz
FROM public.sharepoint_documents d
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_chunks c
  WHERE c.source_ref = d.doc_id AND c.chunk_index = 0
);


-- ---------------------------------------------------------------------------
-- 4.5 Verwaiste Chunks - Chunks ohne Dokument
-- ---------------------------------------------------------------------------
SELECT count(*) AS verwaiste_chunks
FROM public.document_chunks c
WHERE c.source_type = 'sharepoint'
  AND NOT EXISTS (
    SELECT 1 FROM public.sharepoint_documents d WHERE d.doc_id = c.source_ref
  );


-- ---------------------------------------------------------------------------
-- 4.6 Der HNSW-Index muss stehen, sonst sucht die Wissenssuche linear
-- ---------------------------------------------------------------------------
SELECT indexname AS index, indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'document_chunks';


-- ---------------------------------------------------------------------------
-- 4.7 Speicher-Buckets: Objektzahl und Belegung im Vergleich
-- ---------------------------------------------------------------------------
SELECT
  b.name                                                          AS bucket,
  b.public                                                        AS oeffentlich,
  count(o.id)                                                     AS objekte,
  pg_size_pretty(COALESCE(sum((o.metadata->>'size')::bigint), 0)) AS belegung
FROM storage.buckets b
LEFT JOIN storage.objects o ON o.bucket_id = b.id
GROUP BY b.name, b.public
ORDER BY b.name;


-- ---------------------------------------------------------------------------
-- 4.8 Zeigen die Bildpfade in den Chunks auf Objekte, die es wirklich gibt?
-- Ein toter Speicherpfad faellt sonst erst auf, wenn ihn jemand anklickt.
-- Nur im NEUEN Projekt sinnvoll, nach der Bilduebernahme.
-- ---------------------------------------------------------------------------
WITH bildpfade AS (
  SELECT DISTINCT bild->>'storage_path' AS pfad
  FROM public.document_chunks c,
       LATERAL jsonb_array_elements(COALESCE(c.metadata->'images', '[]'::jsonb)) bild
  WHERE bild->>'storage_path' IS NOT NULL
)
SELECT
  count(*)                                          AS bildpfade_gesamt,
  count(*) FILTER (WHERE o.id IS NULL)              AS ohne_objekt_im_speicher
FROM bildpfade p
LEFT JOIN storage.objects o
  ON o.bucket_id = 'rag' AND o.name = p.pfad;
