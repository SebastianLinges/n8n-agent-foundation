-- Node "Anspruch setzen" (Postgres v2.6, executeQuery, queryBatching independently).
-- queryReplacement: ={{ [ $json.issueKey, $json.fensterMinuten, $json.source, $json.ausloeser, $json.abschluss === true ] }}
--
-- Zwei Faelle in einem Statement, damit hinter dem Node kein IF mit zwei
-- Ausgaengen noetig ist:
--   abschluss = false: Anspruch setzen. Kommt eine Zeile zurueck, haelt dieser
--     Lauf den Anspruch. Kommt keine, gibt der Postgres-Node { success: true }
--     aus und "Anspruch erhalten?" beendet den Lauf.
--   abschluss = true: Das Ticket steht in einem Done-Status. Die Zeile wird
--     ausgetragen, es wird kein Anspruch gesetzt, es kommt keine Zeile zurueck -
--     der Lauf endet an "Anspruch erhalten?", ohne Warten, ohne Bewertung.
-- claimed_until IS NULL ist der Fall einer Zeile, die spaeter nur den
-- Inhaltshash traegt.
-- In dieser Datei stehen die Erklaerungen; im Node selbst steht die Abfrage
-- ohne Kommentare, weil der Postgres-Node auch Kommentare nach Platzhaltern
-- durchsucht.
WITH abschluss AS (
  DELETE FROM public.jira_feldpflege_state
  WHERE issue_key = $1 AND $5::boolean
  RETURNING issue_key
),
anspruch AS (
  INSERT INTO public.jira_feldpflege_state (issue_key, claimed_until)
  SELECT $1, now() + ($2::int * interval '1 minute')
  WHERE NOT $5::boolean
  ON CONFLICT (issue_key) DO UPDATE
    SET claimed_until = now() + ($2::int * interval '1 minute')
    WHERE public.jira_feldpflege_state.claimed_until IS NULL
       OR public.jira_feldpflege_state.claimed_until < now()
  RETURNING issue_key
)
SELECT issue_key AS "issueKey", $3::text AS "source", $4::text AS "ausloeser", $2::int AS "fensterMinuten"
FROM anspruch;
