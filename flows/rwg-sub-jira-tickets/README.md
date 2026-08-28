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

## Anschlussfragen behalten den Ticketschlüssel

`Anfrage pruefen` leitet die Absicht bewusst aus der **Originalfrage** ab und nicht aus dem `suchtext`, den der Agent frei formuliert. Für den Personenbezug ist das richtig. Für den Ticketschlüssel war es zu eng: Auf „und wer bearbeitet das?" enthält die Originalfrage keine Kennung mehr, der Agent hatte den Bezug im `suchtext` aber bereits korrekt auf `SSD-9083` aufgelöst. Der Schlüssel ging verloren, und aus der Abfrage wurde `project = SSD ORDER BY updated DESC` — die Gesamtliste statt des gemeinten Vorgangs.

Deshalb liest `Absicht auswerten` den Schlüssel ergänzend aus `frage + suchtext`, wenn das Modell keinen erkannt hat. Das ist unbedenklich: Der Schlüssel ist ein festes Muster und keine Berechtigung. `JQL bauen` ergänzt das Kontogate unabhängig davon per `AND` — für den Fachbereich ausnahmslos. Ein erfundener Schlüssel öffnet daher keinen Vorgang, auf den die fragende Person ohnehin kein Recht hat.

## Grenze der Namensauflösung

Der Jira-`displayName` folgt in dieser Instanz der Adresse und nicht dem Namen: Konten heißen `andre.kamp` oder `vincent-hendrik.borresch`. Eine Suche nach „Andre Kamp" findet deshalb nichts — der Umweg über die konstruierte Adresse `vorname.nachname@rwg-r.de` ist die Folge, nicht ein Versehen.

Die Konstruktion ist aber eine Konvention, keine Auskunft. Sie entumlautet nur `ä ö ü ß`; andere diakritische Zeichen fallen der Filterung `[^a-z0-9-]` zum Opfer und erzeugen eine Adresse, die es nicht gibt. Ebenso brechen Doppelnamen, Namenszusätze und jede Abweichung vom Schema. Das Verhalten bleibt dabei sicher — ohne eindeutiges Konto wird `gueltig = false` gesetzt und nichts geraten — aber die Person wird nicht gefunden, obwohl sie existiert.

Die belastbare Quelle für Klarnamen ist Entra: Dort steht der echte Anzeigename (`Linges Sebastian`) samt verbindlicher Adresse, und die Anbindung besteht bereits über `RWG Sub - Identity & Audience Resolver`. Ein Namensschlag gegen Entra statt der Konstruktion wäre der deterministische Weg — noch nicht umgesetzt.

## Offen

Wirkung des Modellwechsels ist noch nicht an echten Läufen belegt. Prüfkriterium ist `absichtQuelle = 'llm'` bei gleichzeitig korrektem `personBezug` — insbesondere bei Fragen mit Selbstbezug und bei Fragen nach einer namentlich genannten Person.
