# RWG_Jira-Feldpflege

Workflow `k4SmnNrz7ASMdFwk`, aktiv, 20 Nodes. Setzt in Jira SSD zwei Felder: **Priorität** und **Support-Level** (`customfield_10777`). Der alleinige Schreiber auf diese beiden Felder.

## Zwei Eingänge, die sich nicht überschneiden

`Aufruf aus Jira-Agent` läuft genau einmal je Ticket, bei der Anlage. Die vier Betriebssignale kommen mit, deshalb fällt hier kein Modellaufruf an — praktisch wird nur die Priorität gesetzt.

`Jira Ticketereignis` deckt alles danach ab: Statuswechsel, Kommentare, Beschreibung, Zusammenfassung, Vorgangstyp. Da der Agent ein Ticket nur bei Anlage sieht, ist dies der einzige Weg, auf dem sich das Support-Level je ändern kann.

Kein Zeitplan — ein Ticket, das sich nicht bewegt, hat keine neue Evidenz.

## Schleifensicherung, doppelt

Der Workflow schreibt nach Jira und würde sich sonst selbst auslösen. Dagegen zwei unabhängige Sperren:

1. **Vier Konto-IDs werden verworfen.** Zwei davon sind belegt: `712020:86b7f975…` ist `RWG.Automate` — das Konto, unter dem geschrieben wird — und `557058:f58131cb…` ist `Automation for Jira`, dessen Regel bei Anlage Bearbeiter und Fälligkeit setzt. Die beiden übrigen IDs sind nicht zugeordnet.
2. **`priority` und `customfield_10777` stehen nicht in `RELEVANT`.** Selbst ein Schreibvorgang unter fremdem Konto würde am Feldfilter scheitern.

Ebenfalls bewusst verworfen: Bearbeiter, Labels und Komponenten. Das Regelwerk schließt sie als Level-Kriterium aus; ein Modellaufruf darauf könnte per Definition nie zu einer Änderung führen.

## Feld-IDs, gegen die Instanz geprüft

| Priorität | ID | Support-Level | ID |
|---|---|---|---|
| Sehr Hoch | 1 | 1st-Lvl. | 10354 |
| Hoch | 2 | 2nd-Lvl. | 10355 |
| Medium | 3 | 3rd-Lvl. | 10356 |
| Niedrig | 4 | | |
| Sehr Niedrig | 5 | | |

Beide Tabellen sind gegen echte SSD-Daten abgeglichen. Über 100 Vorgänge mit gesetztem Support-Level kommt kein vierter Wert vor — das ist wichtig, weil `Support-Level festlegen` am Ende jeden Wert außerhalb der drei erlaubten auf `1st-Lvl.` zurücksetzt. Käme eine vierte Option hinzu, würde sie überschrieben. **Diese Prüfung gehört wiederholt, wenn das Feld erweitert wird.**

## Entscheidungslogik

Ein einziger Modellaufruf liefert Support-Level-Bewertung und die vier Betriebssignale. Verrechnet wird deterministisch im Code — das Modell entscheidet nichts.

**Priorität:** Unterhalb von Medium liegen ausschließlich planbare Anfragen. Jede echte Störung ist mindestens Medium, auch bei einem einzigen betroffenen Anwender. Signale auf `UNKNOWN` lassen die Priorität unangetastet; bestehende hohe Prioritäten werden nie automatisch gesenkt.

**Support-Level:** Der Normalfall ist eine Hochstufung. Eine Herabstufung verlangt eine im Ticket dokumentierte Rückgabe. Status `WARTEN AUF GWS` erzwingt 3rd-Lvl. Ein manuell gesetzter Wert bleibt ohne eindeutigen Beleg unangetastet.

## Schreibpfad

`Schreiben erforderlich?` verlangt `shouldWrite === true` **und** `dryRun === false`, beides als strikte Booleans. Geschrieben wird ein `PUT` mit genau den zwei Feldern — nichts sonst. Aktueller Stand: `dryRun = false`, also scharf.

## Unsichere Fälle werden jetzt gemeldet

`Support-Level festlegen` berechnet in `unsicher`, wann eine Bewertung nicht belastbar war: fehlende Fundstelle, `confidence` unter HIGH, Herabstufung ohne dokumentierte Rückgabe. In diesen Fällen bleibt der bestehende Wert stehen — richtig so.

Gemeldet wurde das bisher nicht: `needsManualReview` stand fest auf `false`, und damit war `manuellePruefungNoetig` im Ergebnis immer falsch. Der Empfänger im Jira-Agent existiert (`supportLevel.manuellePruefung`), es kam nur nie etwas an. Das Feld wird jetzt aus `unsicher` gespeist.

Die Änderung ist reine Meldung: Kein Schreibvorgang und kein Routing hängt an diesem Feld, und der Agent rendert es derzeit nicht in den internen Kommentar.

## Offen

**Kein Meldekanal für unsichere Fälle.** Sie stehen jetzt korrekt im Rückgabewert und im Ausführungsprotokoll, aber niemand wird aktiv darauf hingewiesen.

**`Bewertungsmodell` läuft auf `gpt-4o`** mit `temperature: 0` über Chat Completions. Funktioniert, ist aber zwei Generationen alt. Bei einem Wechsel auf die GPT-5-Familie muss `temperature` entfallen.

**Zwei der vier gesperrten Konto-IDs** sind nicht zugeordnet: `712020:2c41da01…` und `60242eda…`. Vermutlich weitere Apps; gehört in die Notiz, sobald bekannt.
