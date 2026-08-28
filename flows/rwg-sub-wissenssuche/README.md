# RWG Sub - Wissenssuche

Werkzeug-Subworkflow (`GD256mxClPHHbngI`) für alle inhaltlichen Fragen des Teams-Agenten. Sechs Nodes, linear, kein eigener Trigger.

`Aufruf vom Agenten` → `Eingaben pruefen` → `Suchvektor erzeugen` → `Wissen hybrid abrufen` → `Kandidaten reranken` → `Treffer aufbereiten`

## Das Audience-Gate

Hier sitzt die Sichtbarkeitsentscheidung des gesamten Agenten. Sie liegt **in der SQL-Abfrage, nicht im Modell** — der Agent kann sie weder sehen noch umgehen.

`Eingaben pruefen` nimmt `audienceCsv` ausschließlich aus dem Parent-Kontext und prüft jeden Wert gegen die Whitelist `public` / `it_internal`. Unbekanntes wird verworfen, nicht durchgereicht.

Bleibt nichts übrig, liefert die Abfrage null Zeilen. Das ist nachgerechnet, nicht angenommen:

```sql
string_to_array('', ',')                  → {}      -- leeres Array
array_length(string_to_array('', ','), 1) → NULL
```

Die `gate`-CTE fordert `array_length(...) >= 1`. Bei `NULL` ist die Bedingung nicht wahr, die CTE bleibt leer — und jeder Suchpfad hängt per `CROSS JOIN gate` daran. **Fail closed, kein Bypass.**

Gefiltert wird zusätzlich in **jedem** Pfad einzeln: `ident`, `ident_bilder`, `vec`, `lex_strict` und `lex_or` tragen alle `dc.audience = ANY (g.auds)`.

## Drei Suchwege

**`ident`** greift direkt auf eine Vorgangskennung zu — an Vektor, Volltext und Reranker vorbei. Eine Kennung ist eine exakte Referenz und keine Ähnlichkeitsfrage; sie darf nicht an einem Score-Boden scheitern. Anders als in den übrigen Pfaden ist der `header`-Chunk hier bewusst nicht ausgeschlossen, weil dort Status, Priorität und Typ stehen.

**`vec`** ist die Vektorsuche, **`lex`** die deutsche Volltextsuche. Deren strenge Lesart verknüpft alle Begriffe mit UND; nur wenn sie leer bleibt, greift der gelockerte ODER-Pfad. Der Rückfall liegt im SQL statt im Prompt — so ist er Code und keine Bitte.

Die Zuordnung einer Person zu einem Vorgang (`melder`, `bearbeiter`, `teilnehmer`, `fremd`) kommt belegt aus `jira_tickets` mit, damit der Agent den Besitz nicht aus dem Gesprächsverlauf ableitet.

## Auswahl und Ausgabe

Zwei Bodenwerte: `0.05` im Normalfall, `0.15` wenn der gelockerte Volltextpfad gegriffen hat — dort ist der Pool per Konstruktion Rauschen. Höchstens zwei Treffer je Quelle, höchstens ein Bildchunk, und ein Bildchunk nie auf Platz 1, solange echte Dokumentation vorhanden ist.

Confluence-Links gehen nur an die IT. Für den Fachbereich wird die URL entfernt, damit kein Verweis auf eine Seite entsteht, die er nicht öffnen kann.

Die `hinweise` im Ergebnis sind als **Anweisung an den Agenten** formuliert, nicht als bloße Feststellung. Im Werkzeugergebnis wirken sie zuverlässiger als eine Regel im Systemprompt — dieselbe Erfahrung wie beim Vollständigkeitshinweis im Jira-Subflow.

## Offen

`Kandidaten reranken` schickt Titel und bis zu 2.000 Zeichen je Kandidat an `api.cohere.com`, bei IT-Anfragen auch `it_internal`-Inhalte. Die datenschutzrechtliche Bewertung ist bewusst zurückgestellt; siehe das README des Teams-Agenten.

Fällt der Reranker aus, wird auf die RRF-Reihenfolge zurückgefallen statt leer zu liefern. Das ist gewollt, senkt aber die Trefferqualität still — im Ergebnis steht dann `rerankerAktiv: false`.
