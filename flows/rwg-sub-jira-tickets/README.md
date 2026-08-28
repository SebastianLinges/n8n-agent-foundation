# RWG Sub - Jira Tickets

Werkzeug-Subworkflow (`HoCch7AkiSroyJBB`) für Ticketfragen des Teams-Agenten. Aufruf über `Execute Sub-workflow`, nicht eigenständig startbar.

## Ablauf

`Aufruf vom Agenten` → `Anfrage pruefen` → `Absicht per LLM` → `Absicht auswerten` → `Nutzerkonto aufloesen` → `JQL bauen` → `Jira abfragen` → `Tickets aufbereiten`

## Autorisierung

`istIT` und `userEmail` kommen ausschließlich aus dem Parent-Kontext und nie aus dem Modell. Das Modell liefert nur die *Absicht*, niemals JQL; jeder Wert wird gegen eine Whitelist geprüft. Für den Fachbereich wird `personBezug` hart auf `selbst` gesetzt — eine Modellausgabe kann das Kontogate nicht umgehen.

Wird eine dritte Person genannt, muss jedes Namensteil wörtlich im Fragetext stehen. Sonst wird nicht geraten, sondern zurückgefragt: sonst könnte ein vom Modell ergänzter Nachname eine fremde Ticketliste unter falschem Namen ausgeben.

## Selbstbezug schlägt Modellirrtum

Die Absichtserkennung läuft über `gpt-4o-mini` und stufte „welche offenen Vorgänge hast du **von mir**?" als Fremdabfrage nach einer Person „Sebastian" ein. Der Namensschutz griff daraufhin korrekt und blockierte — richtiges Verhalten auf falscher Grundlage. Der Anwender bekam eine Rückfrage nach seinem eigenen Namen, obwohl die Identität feststand.

Deshalb gilt jetzt: Trägt die Frage einen klaren Selbstbezug (`mein`, `meine`, `ich`, `mir`, `mich`, `eigene`) und steht kein vollständiger Fremdname im Text, wird sie als Selbstabfrage behandelt.

Die Korrektur verläuft ausschließlich von `andere` nach `selbst`, also zur engeren Sicht. Fremde Vorgänge werden dadurch nie zugänglich — im gesamten Node gibt es keine Zuweisung, die `personBezug` auf `andere` setzt.

Die regelbasierte Heuristik in `Anfrage pruefen` hätte den Fall von Anfang an richtig erkannt, greift aber nur, wenn das Modell ungültiges JSON liefert. Hier lieferte es gültiges, aber falsches.

## Offen

Die Absichtserkennung nutzt weiterhin `gpt-4o-mini`. Ein Wechsel auf die aktuelle Modellgeneration würde die Fehlklassifikation an der Wurzel angehen, statt sie nachgelagert zu korrigieren — bisher nicht umgesetzt, weil erst die deterministische Absicherung greifen soll.
