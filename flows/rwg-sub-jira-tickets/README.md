# RWG Sub - Jira Tickets

Werkzeug-Subworkflow (`HoCch7AkiSroyJBB`) für Ticketfragen des Teams-Agenten. Aufruf über `Execute Sub-workflow`, nicht eigenständig startbar.

## Ablauf

`Aufruf vom Agenten` → `Anfrage pruefen` → `Absicht per LLM` → `Absicht auswerten` → `Person in Entra suchen` → `Adresse festlegen` → `Nutzerkonto aufloesen` → `JQL bauen` → `Jira abfragen` → `Tickets aufbereiten`

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

## Namensauflösung über Entra

Der Jira-`displayName` folgt in dieser Instanz der Adresse und nicht dem Namen: Konten heißen `andre.kamp` oder `vincent-hendrik.borresch`. Eine Suche nach „Andre Kamp" findet dort deshalb nichts. `Absicht auswerten` konstruiert aus dem Namen die Adresse `vorname.nachname@rwg-r.de` — eine Konvention, die bei Akzenten, Namenszusätzen und abweichenden Adressen nicht trägt.

Deshalb fragt `Person in Entra suchen` das Verzeichnis, das den echten Namen samt verbindlicher Adresse führt. Zwei Eigenheiten sind dabei berücksichtigt:

- **Akzente.** Der OData-Filter vergleicht zeichengenau, `startswith(givenName,'Andre')` findet „André" also nicht. Der Filter nutzt je Namensteil nur den führenden ASCII-Abschnitt — aus „André" wird `Andr`, was beide Schreibweisen trifft. Beginnt ein Name mit einem Nicht-ASCII-Zeichen, unterbleibt die Suche und die konstruierte Adresse bleibt der Rückfall.
- **Reihenfolge.** Entra führt den Anzeigenamen als „Nachname Vorname" (`Linges Sebastian`), die Frage nennt ihn umgekehrt. Geprüft wird deshalb gegen `givenName` und `surname` in beiden Zuordnungen.

`Adresse festlegen` gleicht die Kandidaten anschließend im Code ab. Dabei wird auf Einträge **mit Postfach** eingeengt: Zu einer Person gehören im Verzeichnis oft zwei Konten — das Postfachkonto und ein Administrationskonto mit demselben Vor- und Nachnamen, aber ohne Adresse. Ohne diese Einengung gälte jede solche Person als mehrdeutig. Trägt kein Eintrag eine Adresse, bleibt die ursprüngliche Menge stehen und der Rückfall auf den UPN greift. Beide Seiten werden identisch normalisiert — NFD-Zerlegung, Verwerfen aller Nicht-ASCII-Reste — sodass Akzent- und Umlautschreibweisen zusammenfallen. Die Adresse wird **nur bei genau einem Treffer** übernommen. Mehrere Treffer erzeugen eine Rückfrage statt einer Auswahl; kein Treffer lässt die konstruierte Adresse stehen. Trägt auch die nicht, meldet `JQL bauen` weiterhin `gueltig = false`.

Die Felder `entraKandidaten` (Antwort des Verzeichnisses) und `entraPassend` (nach Abgleich und Einengung) machen den Weg nachvollziehbar. `entraStatus` weist das Ergebnis aus: `eindeutig`, `mehrdeutig`, `kein_treffer`, `ohne_adresse` oder `nicht_gesucht`.

Der Aufruf läuft bei jeder Ticketfrage mit, auch ohne dritte Person — dann mit einem Filter, der bewusst nichts findet. Das kostet einen Verzeichnisaufruf und hält den Strang dafür linear. Gewirkt wird ausschließlich bei `personBezug = 'andere'`; für den Fachbereich steht der Wert weiter oben hart auf `selbst`, die Verzeichnissuche ist dort strukturell unerreichbar.

## Offen

Weder der Modellwechsel noch die Entra-Auflösung sind an echten Läufen belegt. Prüfkriterien im Lauf: `absichtQuelle = 'llm'`, `entraStatus = 'eindeutig'` bei einer namentlich genannten Person und ein korrekter `personBezug` bei Fragen mit Selbstbezug.

Ob das Verzeichnis-Credential die Suche über andere Konten überhaupt zulässt, ist offen. Reicht die Berechtigung nicht, liefert der Aufruf einen Fehlerkörper statt `value`, `entraStatus` steht auf `kein_treffer` und die konstruierte Adresse greift wie zuvor — das Verhalten fällt dann auf den bisherigen Stand zurück, ohne Ausfall.
