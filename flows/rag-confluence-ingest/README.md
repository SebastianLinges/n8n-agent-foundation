# RAG-Confluence-Ingest

Bringt Confluence-Seiten in die Wissensbasis (`Ham6IDJxbqIydImp`, 33 Nodes). Aufgerufen wird er je Bereich vom Steuerflow `RWG Steuerung - Confluence Bereiche` (`MNQGEjBNyaYhkbSy`) mit `spaceKey` und `newPageAudience`.

## Audience

`newPageAudience` gilt **ausschließlich für neu entdeckte Seiten**. Bestehende behalten ihren Wert aus `confluence_pages.audience` — das ist Absicht, damit eine manuelle Umstufung jeden Folgelauf übersteht.

Soll ein bereits eingelesener Bereich die Stufe wechseln, reicht eine Änderung im Steuerflow **nicht**. Der Bestand muss einmalig per SQL umgestellt werden.

## Löschen

Seiten, die in Confluence verschwinden, verlieren erst ihre Chunks, dann ihren Eintrag in `confluence_pages`. Beides ist auf `space_key` eingegrenzt, damit ein Fehlabruf eines Bereichs nicht die anderen leerräumt.

## Zielprojekt

Sieben HTTP-Nodes auf das Supabase-Projekt `zckaxkpycyyxaymmkmvu`. Keine Code-Nodes mit Adressbezug — anders als bei SharePoint- und Jira-Ingest steht hier keine Bildadresse im Inhalt.
