# Laufprotokoll

`laufprotokoll.csv` ist die fortlaufende Messreihe über alle Tests an den Agenten. Eine Zeile ist **ein Prüfgegenstand in einem Lauf** — nicht eine Chatnachricht. Ein Lauf mit mehreren Werkzeugaufrufen kann deshalb mehrere Zeilen ergeben, und dieselbe `lauf_id` darf mehrfach vorkommen.

## Warum CSV

Semikolon-getrennt, UTF-8 mit BOM: Excel öffnet die Datei per Doppelklick korrekt, und Git zeigt jede Ergänzung als lesbare Zeilendifferenz. Damit bleibt die Reihe auswertbar und gleichzeitig nachvollziehbar — wer wann welches Ergebnis eingetragen hat, steht in der Historie.

## Spalten

| Spalte | Inhalt |
|---|---|
| `datum` | Tag des Laufs, ISO |
| `flow` | Geprüfter Workflow |
| `lauf_id` | n8n-Execution-ID — der Beleg. Ohne sie ist eine Zeile wertlos |
| `pruefgegenstand` | Was diese Zeile prüft, nicht was gefragt wurde |
| `frage` | Eingabe, möglichst wörtlich inklusive Tippfehlern |
| `erwartung` | Vorher festgelegtes Sollverhalten |
| `ergebnis` | `bestanden`, `durchgefallen`, `teilweise`, `nicht erreicht`, `offen` |
| `befund` | Beobachtung mit Messwert, nicht Deutung |
| `ursache` | Nur bei Abweichung, sonst `-` |
| `massnahme` | Was daraufhin geändert wurde, sonst `Keine` |
| `commit` | Git-Commit der Maßnahme, sonst `-` oder `offen` |

## Zu den Ergebniswerten

`nicht erreicht` ist bewusst von `durchgefallen` getrennt. Es bedeutet: Die geprüfte Änderung war aktiv, wurde vom Ablauf aber gar nicht angesteuert — etwa weil der Agent das Werkzeug nicht aufrief. Ein `durchgefallen` daraus zu machen, würde die Wirkung der Änderung falsch bewerten und die Messreihe verzerren.

`teilweise` steht für ein fachlich richtiges Ergebnis auf unsauberem Weg. Solche Zeilen bleiben mit `commit: offen` stehen, bis sie entweder behoben oder bewusst akzeptiert sind.

## Regeln

Jeder Test wird eingetragen, auch der bestandene — sonst misst die Reihe nur Fehler und nicht den Stand. Der `befund` enthält den Messwert, an dem das Ergebnis hängt (`tool_calls.completed`, `entraStatus`, `absichtQuelle`, Trefferzahl), damit eine spätere Auswertung nicht erneut in die Läufe schauen muss.

Wo ein Ergebnis gegen eine unabhängige Quelle geprüft wurde, steht das im `befund`. Eine Antwort des Agenten ist kein Beleg für sich selbst.
