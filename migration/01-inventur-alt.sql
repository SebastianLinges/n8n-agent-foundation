-- ===========================================================================
-- SCHRITT 1: INVENTUR DER ALTEN DATENBANK
--
-- Reine Lesung, kein Schreibzugriff. Gegen das alte Projekt laufen lassen
-- (zjabiweaihsezjjeycko). Jede Abfrage einzeln ueber execute_sql - die
-- Ergebnisse kommen als JSON zurueck und sollen klein bleiben.
--
-- Zweck: Vor dem Anlegen der neuen Strukturen muss feststehen, WAS es gibt,
-- WIE GROSS es ist und WOVON die Datenbank vollgelaufen ist. Ohne diese
-- Messung waere jedes Migrationsskript geraten.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1.1 Gesamtgroesse und woran sie haengt
-- ---------------------------------------------------------------------------
SELECT pg_size_pretty(pg_database_size(current_database())) AS datenbank_gesamt;


-- ---------------------------------------------------------------------------
-- 1.2 Tabellen nach Groesse - die Antwort auf "wovon ist sie vollgelaufen"
-- Beachte: n_live_tup ist eine Schaetzung aus der Statistik, kein count(*).
-- ---------------------------------------------------------------------------
SELECT
  n.nspname                                        AS schema,
  c.relname                                        AS tabelle,
  s.n_live_tup                                     AS zeilen_geschaetzt,
  pg_size_pretty(pg_total_relation_size(c.oid))    AS gesamt,
  pg_size_pretty(pg_relation_size(c.oid))          AS nur_daten,
  pg_size_pretty(pg_indexes_size(c.oid))           AS nur_indizes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 40;


-- ---------------------------------------------------------------------------
-- 1.3 Speicher-Buckets: Anzahl und Belegung
-- Die Bilder liegen hier, nicht in den Tabellen. pg_dump erfasst sie NICHT.
-- ---------------------------------------------------------------------------
SELECT
  b.name                                                          AS bucket,
  b.public                                                        AS oeffentlich,
  count(o.id)                                                     AS objekte,
  pg_size_pretty(COALESCE(sum((o.metadata->>'size')::bigint), 0)) AS belegung
FROM storage.buckets b
LEFT JOIN storage.objects o ON o.bucket_id = b.id
GROUP BY b.name, b.public
ORDER BY COALESCE(sum((o.metadata->>'size')::bigint), 0) DESC;


-- ---------------------------------------------------------------------------
-- 1.4 Erweiterungen - was das neue Projekt mitbringen muss
-- Das Schema ist wichtig: die Wissenssuche schreibt extensions.vector(1536).
-- ---------------------------------------------------------------------------
SELECT e.extname AS erweiterung, e.extversion AS fassung, n.nspname AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;


-- ---------------------------------------------------------------------------
-- 1.5 Spalten aller oeffentlichen Tabellen
-- ---------------------------------------------------------------------------
SELECT
  c.table_name  AS tabelle,
  c.ordinal_position AS pos,
  c.column_name AS spalte,
  CASE
    WHEN c.data_type = 'USER-DEFINED' THEN c.udt_schema || '.' || c.udt_name
    ELSE c.data_type
  END           AS typ,
  c.is_nullable AS nullbar,
  c.column_default AS vorgabe
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY c.table_name, c.ordinal_position;


-- ---------------------------------------------------------------------------
-- 1.6 Indizes - besonders der HNSW-Index auf dem Vektor
-- Die Hybridabfrage der Wissenssuche setzt hnsw.iterative_scan und
-- hnsw.ef_search. Ohne passenden Index laeuft sie, aber falsch.
-- ---------------------------------------------------------------------------
SELECT tablename AS tabelle, indexname AS index, indexdef AS definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ---------------------------------------------------------------------------
-- 1.7 Funktionen - darunter funktion_match_document_chunks
-- ---------------------------------------------------------------------------
SELECT
  p.proname                              AS funktion,
  pg_get_function_identity_arguments(p.oid) AS argumente,
  t.typname                              AS rueckgabe
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_type t ON t.oid = p.prorettype
WHERE n.nspname = 'public'
ORDER BY p.proname;


-- ---------------------------------------------------------------------------
-- 1.8 Der vollstaendige Quelltext der Funktionen - wird 1:1 gebraucht
-- Einzeln abrufen, sonst wird die Antwort zu gross:
--   SELECT pg_get_functiondef('public.funktion_match_document_chunks'::regproc);
-- ---------------------------------------------------------------------------
SELECT p.proname AS funktion, pg_get_functiondef(p.oid) AS quelltext
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'funktion_match_document_chunks';


-- ---------------------------------------------------------------------------
-- 1.9 Zugriffsregeln (RLS) - muessen im neuen Projekt gleich stehen,
-- sonst faellt der Zugriff entweder aus oder er oeffnet zu weit.
-- ---------------------------------------------------------------------------
SELECT
  c.relname   AS tabelle,
  c.relrowsecurity AS rls_an,
  p.polname   AS regel,
  p.polcmd    AS befehl,
  pg_get_expr(p.polqual, p.polrelid)      AS bedingung,
  pg_get_expr(p.polwithcheck, p.polrelid) AS pruefung
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname, p.polname;


-- ---------------------------------------------------------------------------
-- 1.10 Fremdschluessel - bestimmen die Reihenfolge beim Befuellen
-- ---------------------------------------------------------------------------
SELECT
  c.conname                            AS bedingung,
  src.relname                          AS tabelle,
  ziel.relname                         AS verweist_auf,
  pg_get_constraintdef(c.oid)          AS definition
FROM pg_constraint c
JOIN pg_class src ON src.oid = c.conrelid
JOIN pg_class ziel ON ziel.oid = c.confrelid
JOIN pg_namespace n ON n.oid = src.relnamespace
WHERE c.contype = 'f' AND n.nspname = 'public'
ORDER BY src.relname;


-- ---------------------------------------------------------------------------
-- 1.11 Woraus die Wissensbasis besteht - je Quelle
-- Entscheidet, was migriert werden muss und was sich neu aufbauen laesst:
-- SharePoint holt sich der Abgleich selbst zurueck, Jira nicht.
-- ---------------------------------------------------------------------------
SELECT
  source_type                              AS quelle,
  count(*)                                 AS chunks,
  count(DISTINCT source_ref)               AS dokumente,
  pg_size_pretty(sum(pg_column_size(chunk_text)))   AS textmenge
FROM public.document_chunks
GROUP BY source_type
ORDER BY count(*) DESC;


-- ---------------------------------------------------------------------------
-- 1.12 Genaue Zeilenzahlen der Tabellen, die sicher mitmuessen
-- ---------------------------------------------------------------------------
SELECT 'document_chunks'           AS tabelle, count(*) FROM public.document_chunks
UNION ALL SELECT 'sharepoint_documents',       count(*) FROM public.sharepoint_documents
UNION ALL SELECT 'jira_tickets',               count(*) FROM public.jira_tickets
UNION ALL SELECT 'jira_agent_events',          count(*) FROM public.jira_agent_events
UNION ALL SELECT 'agent_conversation_memory',  count(*) FROM public.agent_conversation_memory
UNION ALL SELECT 'agent_requests',             count(*) FROM public.agent_requests
UNION ALL SELECT 'ingestion_errors',           count(*) FROM public.ingestion_errors;
