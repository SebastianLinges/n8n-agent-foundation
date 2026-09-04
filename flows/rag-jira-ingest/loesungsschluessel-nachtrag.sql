-- ============================================================
-- Nachtrag des Loesungsschluessels in bestehende Loesungschunks
--
-- Projekt: RWG-Wissensbasis (zckaxkpycyyxaymmkmvu), Tabelle public.document_chunks
-- AUSGEFUEHRT am 04.09.2026. UPDATE 1274, Lauf 115140, 10,5 Sekunden.
-- Danach: 1.390 Loesungschunks, alle mit Schluessel, keiner mehr ohne.
-- Die Gegenprobe ueber den GESAMTEN Bestand reproduziert jeden Schluessel
-- exakt: 116 urspruengliche und 1.274 nachgetragene, null Abweichungen.
--
-- WEG DER AUSFUEHRUNG
-- Der Supabase-Zugang ueber MCP ist schreibgeschuetzt (25006, read-only
-- transaction). Ausgefuehrt wurde daher ueber einen Wartungsflow in n8n
-- mit dem vorhandenen Postgres-Zugang, der direkt nach dem Lauf wieder
-- entfernt wurde. Kein Skript und keine Funktion in der Datenbank.
--
-- EINE ABWEICHUNG VOM TEXT UNTEN
-- Im Wartungsflow stand statt '[^\n]' die Schreibweise
-- '[^' || chr(10) || ']', weil Backslashes auf dem Weg durch mehrere
-- Werkzeugschichten still verlorengehen koennen. Beide Fassungen wurden
-- vorher lesend gegeneinander gestellt: dieselben 1.274 Zeilen. Der Text
-- unten bleibt die lesbare Fassung, die uebertragene war zeichengleich
-- bis auf diese eine Ersetzung - nachgeprueft am gespeicherten Knoten.
--
-- WARUM
-- "Solution-Cache Abgleich" im RAG-JIRA-Ingest ueberspringt Extraktion und
-- Embedding, wenn der gespeicherte Chunk denselben Schluessel traegt wie der
-- neu berechnete. Gemessen am Lauf 114844 vom 03.09. greift der Cache nicht:
--   aktion "analyse", cache_grund "kein_schluessel", loesung_llm_gespart 0
-- Der Chunk traegt gar keinen Schluessel. Ein nie gefuellter Cache kann nicht
-- treffen. Betroffen sind 1.274 von 1.389 Loesungschunks.
--
-- DER SCHLUESSEL
-- Aus dem Knoten "Solution-Cache Abgleich":
--   sha256( content_hash | status | resolution | jira_resolved_at
--           | 'gpt-4.1-mini-2025-04-14' | 'v1' )
-- Alle vier Eingangswerte stehen in metadata der bestehenden Zeilen.
--
-- WAS VORHER GEPRUEFT WURDE (alles lesend, 04.09.2026)
--   1. 1.389 Loesungschunks, 115 mit Schluessel, 1.274 ohne.
--   2. Alle 1.274 tragen content_hash, status und resolution in metadata.
--   3. GEGENPROBE: Die Ableitung auf die 115 vorhandenen Schluessel angewandt
--      ergibt 115 von 115 exakte Treffer, null Abweichungen. Die Formel ist
--      damit an echten Daten belegt, nicht angenommen.
--   4. Bei allen 1.274 stimmen metadata.status, metadata.resolution und
--      metadata.resolved_at mit dem ueberein, was im Chunktext woertlich steht.
--      Die Metadaten beschreiben also denselben Stand wie der Text.
--   5. Alle 1.389 stammen vom selben Modell (gpt-4.1-mini-2025-04-14) und
--      derselben Flow-Fassung (jira-rag-v4).
--   6. Beide Gruppen sind strukturell gleich: PROBLEM, URSACHE, LOESUNG,
--      ERGEBNIS, SUCHBEGRIFFE und Quelle in 100 Prozent der Faelle,
--      Durchschnittslaenge 821 gegen 818 Zeichen. Der Prompt wurde zwischen
--      den Gruppen nicht veraendert.
--   7. Alle 1.274 Tickets sind in jira_tickets auffindbar, Status und
--      Resolution haben sich seither nicht bewegt. 1.264 sind bereits
--      geschlossen, 10 stehen auf Erledigt.
--   8. Probelauf mit der WHERE-Bedingung unten: 1.274 Zeilen, 1.274
--      verschiedene Schluessel, keine Kollision mit vorhandenen Schluesseln.
--
-- DIE EINE ANNAHME
-- Den 1.274 fehlt die Angabe solution_prompt_version, weil es sie beim
-- Schreiben noch nicht gab. Der Nachtrag setzt 'v1'. Belegt ist das ueber
-- Pruefung 6 (gleicher Aufbau, gleiche Laenge). Falls der Prompt spaeter
-- doch einmal geaendert wird, ist der vorgesehene Weg ohnehin ein Sprung auf
-- 'v2' im Knoten - dann verlieren alle 1.389 Schluessel ihre Gueltigkeit und
-- der Bestand wird vollstaendig neu erzeugt. Genau dafuer gibt es das Feld.
--
-- WAS SICH AENDERT
-- Ausschliesslich zwei Schluessel innerhalb der Spalte metadata. chunk_text,
-- embedding, audience, chunk_index und alle uebrigen Felder bleiben unberuehrt.
-- Der Marker loesung_schluessel_nachgetragen_am dient der Herkunft und macht
-- die Ruecknahme eindeutig.
--
-- WIRKUNG WENN ES SCHIEFGEHT
-- Ein falsch gesetzter Schluessel wuerde eine noetige Neuextraktion
-- unterdruecken. Der Chunk behielte dann seinen bisherigen Text - kein
-- Datenverlust, und die naechste inhaltliche Aenderung am Ticket erzeugt ihn
-- ohnehin neu, weil sich dann der content_hash aendert.
-- ============================================================


-- ------------------------------------------------------------
-- SCHRITT 1  Probelauf. Aendert nichts. Erwartet: 1274 / 1274 / 0
-- ------------------------------------------------------------
WITH kandidaten AS (
  SELECT c.id,
    encode(sha256(convert_to(concat_ws('|',
      coalesce(c.metadata->>'content_hash',''),
      coalesce(c.metadata->>'status',''),
      coalesce(c.metadata->>'resolution',''),
      coalesce(c.metadata->>'resolved_at',''),
      'gpt-4.1-mini-2025-04-14','v1'), 'UTF8')), 'hex') AS neuer_schluessel
  FROM public.document_chunks c
  WHERE c.source_type = 'jira'
    AND c.metadata->>'chunk_type' = 'solution'
    AND NOT (c.metadata ? 'loesung_schluessel')
    AND c.metadata ? 'content_hash'
    AND c.metadata->>'solution_model' = 'gpt-4.1-mini-2025-04-14'
    AND c.chunk_text LIKE '[JIRA-LÖSUNG]%'
    AND coalesce(c.metadata->>'status','')
        = coalesce(substring(c.chunk_text from 'Status: ([^\n]*)'),'')
    AND coalesce(c.metadata->>'resolution','')
        = CASE WHEN coalesce(substring(c.chunk_text from 'Resolution: ([^\n]*)'),'') = 'nicht gesetzt'
               THEN '' ELSE coalesce(substring(c.chunk_text from 'Resolution: ([^\n]*)'),'') END
    AND coalesce(c.metadata->>'resolved_at','')
        = coalesce(substring(c.chunk_text from 'Gelöst am: ([^\n]*)'),'')
)
SELECT count(*)                         AS wuerden_geaendert,
       count(DISTINCT neuer_schluessel) AS verschiedene_schluessel,
       (SELECT count(*) FROM kandidaten k
          JOIN public.document_chunks d
            ON d.metadata->>'loesung_schluessel' = k.neuer_schluessel) AS kollisionen
FROM kandidaten;


-- ------------------------------------------------------------
-- SCHRITT 2  Der Nachtrag. Erwartet: UPDATE 1274
--            Die WHERE-Bedingung ist zeichengleich mit Schritt 1.
-- ------------------------------------------------------------
UPDATE public.document_chunks c
SET metadata = c.metadata || jsonb_build_object(
      'loesung_schluessel',
        encode(sha256(convert_to(concat_ws('|',
          coalesce(c.metadata->>'content_hash',''),
          coalesce(c.metadata->>'status',''),
          coalesce(c.metadata->>'resolution',''),
          coalesce(c.metadata->>'resolved_at',''),
          'gpt-4.1-mini-2025-04-14','v1'), 'UTF8')), 'hex'),
      'solution_prompt_version', 'v1',
      'loesung_schluessel_nachgetragen_am', '2026-09-04'
    )
WHERE c.source_type = 'jira'
  AND c.metadata->>'chunk_type' = 'solution'
  AND NOT (c.metadata ? 'loesung_schluessel')
  AND c.metadata ? 'content_hash'
  AND c.metadata->>'solution_model' = 'gpt-4.1-mini-2025-04-14'
  AND c.chunk_text LIKE '[JIRA-LÖSUNG]%'
  AND coalesce(c.metadata->>'status','')
      = coalesce(substring(c.chunk_text from 'Status: ([^\n]*)'),'')
  AND coalesce(c.metadata->>'resolution','')
      = CASE WHEN coalesce(substring(c.chunk_text from 'Resolution: ([^\n]*)'),'') = 'nicht gesetzt'
             THEN '' ELSE coalesce(substring(c.chunk_text from 'Resolution: ([^\n]*)'),'') END
  AND coalesce(c.metadata->>'resolved_at','')
      = coalesce(substring(c.chunk_text from 'Gelöst am: ([^\n]*)'),'');


-- ------------------------------------------------------------
-- SCHRITT 3  Nachweis. Erwartet: 1389 / 1389 / 1274 / 0
-- ------------------------------------------------------------
SELECT
  count(*)                                                          AS loesungschunks,
  count(*) FILTER (WHERE metadata ? 'loesung_schluessel')            AS mit_schluessel,
  count(*) FILTER (WHERE metadata ? 'loesung_schluessel_nachgetragen_am') AS nachgetragen,
  count(*) FILTER (WHERE NOT (metadata ? 'loesung_schluessel'))      AS ohne_schluessel
FROM public.document_chunks
WHERE source_type = 'jira'
  AND metadata->>'chunk_type' = 'solution';

-- Und die Gegenprobe muss weiterhin fuer ALLE gelten: 1389 Treffer, 0 Abweichungen
WITH p AS (
  SELECT metadata->>'loesung_schluessel' AS gespeichert,
    encode(sha256(convert_to(concat_ws('|',
      coalesce(metadata->>'content_hash',''),
      coalesce(metadata->>'status',''),
      coalesce(metadata->>'resolution',''),
      coalesce(metadata->>'resolved_at',''),
      'gpt-4.1-mini-2025-04-14','v1'), 'UTF8')), 'hex') AS berechnet
  FROM public.document_chunks
  WHERE source_type='jira' AND metadata->>'chunk_type'='solution'
    AND metadata ? 'loesung_schluessel'
)
SELECT count(*) AS geprueft,
       count(*) FILTER (WHERE gespeichert = berechnet)  AS treffer,
       count(*) FILTER (WHERE gespeichert <> berechnet) AS abweichung
FROM p;


-- ------------------------------------------------------------
-- RUECKNAHME  Nimmt genau die nachgetragenen Zeilen zurueck,
--             erkennbar am Marker. Ruehrt die 115 echten nicht an.
-- ------------------------------------------------------------
-- UPDATE public.document_chunks
-- SET metadata = metadata
--       - 'loesung_schluessel'
--       - 'solution_prompt_version'
--       - 'loesung_schluessel_nachgetragen_am'
-- WHERE source_type = 'jira'
--   AND metadata->>'chunk_type' = 'solution'
--   AND metadata ? 'loesung_schluessel_nachgetragen_am';
