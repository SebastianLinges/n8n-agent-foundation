-- Zustandstabelle der Feldpflege. Angelegt am 03.09.2026 per apply_migration
-- im Supabase-Projekt zckaxkpycyyxaymmkmvu (Organisation RWG Rheinland eG, Projekt RAG).
CREATE TABLE IF NOT EXISTS public.jira_feldpflege_state (
  issue_key         text PRIMARY KEY,
  claimed_until     timestamptz,
  content_hash      text,
  last_evaluated_at timestamptz,
  last_level        text,
  last_priority     text
);
