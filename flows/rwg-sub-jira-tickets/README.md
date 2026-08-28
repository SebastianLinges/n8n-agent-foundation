# RWG Sub - Jira Tickets

Werkzeug-Subworkflow (`HoCch7AkiSroyJBB`) für Ticketfragen des Teams-Agenten. Aufruf über `Execute Sub-workflow`, nicht eigenständig startbar.

## Ablauf

`Aufruf vom Agenten` → `Anfrage pruefen` → `Absicht per LLM` → `Absicht auswerten` → `Nutzerkonto aufloesen` → `JQL bauen` → `Jira abfragen` → `Tickets aufbereiten`

## Autorisierung

`istIT` und `userEmail` kommen ausschließlich aus dem Parent-Kontext und nie aus dem Modell. Das Modell liefert nur die *Absicht*, niemals JQL; jeder Wert wird gegen eine Whitelist geprüft. Für den Fachbereich wird `personBezug` hart auf `selbst` gesetzt — eine Modellausgabe kann das Kontogate nicht umgehen.

Wird eine dritte Person genannt, muss jedes Namensteil wörtlich im Fragetext stehen. Sonst wird nicht geraten, sondern zurückgefragt: sonst könnte ein vom Modell ergänzter Nachname eine fremde Ticketliste unter falschem Namen ausgeben.

## Absichtserkennung

`Absicht per LLM` ruft `/v1/chat/completions` direkt auf, mit `gpt-5.4-mini`, `reasoning_effort: low` und `response_format: json_object`. `max_completion_tokens` steht auf 1500, weil bei dieser Modellgeneration die Reasoning-Tokens mitzählen und ein zu enges Limit eine leere Antwort erzeugt. `temperature` wird nicht gesetzt — die GPT-5-Familie lehnt den Parameter ab.

Der Node läuft mit `neverError` und `onError: continueRegularOutput`. Fällt der Aufruf aus, findet `Absicht auswerten` kein `choices[0].message.content` und übernimmt die regelbasierte Heuristik aus `Anfrage pruefen`. Das Feld `absichtQuelle` im Ergebnis sagt, welcher Weg gegriffen hat: `llm` oder `heuristik`. Ein dauerhaftes `heuristik` ist das Signal, dass der Modellaufruf scheitert.

## Selbstbezug schlägt Modellirrtum

Ein Modell kann „welche offenen Vorgänge hast du **von mir**?" als Fremdabfrage nach einer Person „Sebastian" einstufen. Der Namensschutz greift dann korrekt und blockiert — richtiges Verhalten auf falscher Grundlage. Der Anwender bekäme eine Rückfrage nach seinem eigenen Namen, obwohl die Identität feststeht.

Deshalb gilt: Trägt die Frage einen klaren Selbstbezug (`mein`, `meine`, `ich`, `mir`, `mich`, `eigene`) und steht kein vollständiger Fremdname im Text, wird sie als Selbstabfrage behandelt.

Die Korrektur verläuft ausschließlich von `andere` nach `selbst`, also zur engeren Sicht. Fremde Vorgänge werden dadurch nie zugänglich — im gesamten Node gibt es keine Zuweisung, die `personBezug` auf `andere` setzt.

Diese Absicherung bleibt bestehen, unabhängig vom eingesetzten Modell. Sie ist deterministisch und deshalb die belastbarere Ebene; das Modell verbessert nur die Trefferquote davor.

## Offen

Wirkung des Modellwechsels ist noch nicht an echten Läufen belegt. Prüfkriterium ist `absichtQuelle = 'llm'` bei gleichzeitig korrektem `personBezug` — insbesondere bei Fragen mit Selbstbezug und bei Fragen nach einer namentlich genannten Person.
