-- Node "Anspruch setzen" (Postgres v2.6, executeQuery, queryBatching independently).
-- queryReplacement: ={{ [ $json.issueKey, $json.fensterMinuten, $json.source, $json.ausloeser ] }}
--
-- Kommt eine Zeile zurueck, haelt dieser Lauf den Anspruch. Kommt keine, gibt der
-- Postgres-Node { success: true } aus - deshalb steht dahinter das IF "Anspruch erhalten?".
-- claimed_until IS NULL ist der Fall einer Zeile, die spaeter nur den Inhaltshash traegt.
INSERT INTO public.jira_feldpflege_state (issue_key, claimed_until)
VALUES ($1, now() + ($2::int * interval '1 minute'))
ON CONFLICT (issue_key) DO UPDATE
  SET claimed_until = now() + ($2::int * interval '1 minute')
  WHERE public.jira_feldpflege_state.claimed_until IS NULL
     OR public.jira_feldpflege_state.claimed_until < now()
RETURNING issue_key AS "issueKey", $3::text AS "source", $4::text AS "ausloeser", $2::int AS "fensterMinuten";
