# RAG-JIRA-Ingest

Bringt Jira-Vorgänge aus dem Projekt SSD in die Wissensbasis (`ESVtaoyTfaP3jm2G`, 85 Nodes).

Je Ticket entstehen mehrere Chunks mit festem Vokabular für `chunk_type`: `header`, `content`, `comment`, `solution`, `image_attachment`. Die `audience` kommt 1:1 aus `jira_tickets.audience` und steht sowohl in der Spalte als auch in den Metadaten.

## Bildanhänge

Anhänge werden normalisiert, in den Speicher-Bucket `rag` gelegt und von einem Sehmodell beschrieben. Der Beschreibungstext wird selbst zum Chunk — so ist ein Screenshot über die Textsuche auffindbar.

`analyse_schluessel` verhindert, dass dasselbe Bild bei jedem Folgelauf erneut durch die Bildanalyse läuft. Fehlt er, bricht der Aufbau ab, statt still Kosten zu erzeugen.

## Zielprojekt

Alle Zugriffe gehen auf das Supabase-Projekt `zckaxkpycyyxaymmkmvu`. Die Adresse steht an 18 HTTP-Nodes und einmal im Code-Node `Build Vision Image Chunk`, der die öffentliche Bildadresse in den Chunktext und in `related_image_url` schreibt.

**Beim Umzug übersehen wäre genau das der Bruch gewesen:** Die Verbindung umzustellen genügt nicht, wenn die Adresse zusätzlich im Inhalt steht.
