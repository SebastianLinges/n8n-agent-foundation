# KI Daily - Collect [WF-1]

Sammelflow (`mzSLn4WzFQSv0cuX`) für die KI-Nachrichtenlage. Er trägt Meldungen aus vier Quellen zusammen, wirft Bekanntes und Unerwünschtes raus, lässt den Rest von einem Modell bewerten und legt die Treffer in `news_memory` ab. Er verschickt nichts — das tut der Auswertungsflow [KI Daily - Analyze](../kapa-ki-daily-analyze/README.md).

Takt: **Montag, Mittwoch, Freitag 06:00** (`0 6 * * 1,3,5`).

## Warum der Takt an Analyze hängt

Collect und Analyze müssen **auf denselben Tagen laufen**. Die Kopplung läuft nicht über ein Datum, sondern über Zustände: Collect legt Kandidaten mit `status = triaged` ab und einen Lauf in `runs` mit `status = running`. Analyze greift genau danach. Läuft Analyze an einem Tag ohne vorherigen Collect, findet es keinen offenen Lauf, und `runs schliessen` arbeitet auf einer `run_id`, die es nicht gibt.

Wer hier den Cron ändert, muss ihn in Analyze mitändern.

## Aufbau

`Trigger Mo/Mi/Fr 06 Uhr` → `Lauf initialisieren` → `runs - Lauf anlegen` → vier Quellenstränge parallel plus zwei Aufräumjobs

Die Stränge:

- `HN Query Pool` → `Hacker News KI`
- `Dynamic Query Gen` → `Tavily Query Pool` → `Tavily Suche KI`
- `GitHub Query Pool` → `GitHub Repo-Suche`
- `RSS Feeds Liste` → `Nur PRUEFEN ausschliessen` → `RSS abrufen` → `RSS XML lesen` → `RSS Eintraege`

Alle vier münden in `Quellen zusammenfuehren` → `Normalisieren und Hash` → `Blocklist lesen` → `news_memory Keys laden` → `Dedup gegen news_memory` → `Kandidaten buendeln` → `Triage (0-10)` → `Score anwenden` → `In news_memory speichern` → `Lauf zaehlen` → `runs - Lauf abschliessen`

## Das Suchfenster steht an einer Stelle

`Lauf initialisieren` berechnet `since_ts` als **72 Stunden** vor Laufbeginn, in Sekunden. `HN Query Pool` und `GitHub Query Pool` lesen den Wert von dort — GitHub rechnet ihn auf `yyyy-mm-dd` um, weil die API ein Datum erwartet.

72 Stunden sind kein runder Wert, sondern der größte Laufabstand: Von Freitag 06:00 bis Montag 06:00 vergehen drei Tage. Ein kürzeres Fenster ließe alles durchfallen, was Freitag nach dem Lauf erscheint. An Mittwoch und Freitag entsteht dadurch eine Überlappung von 24 Stunden — die fängt `Dedup gegen news_memory` ab, wie schon vorher.

Die anderen beiden Quellen bringen eigene Fenster mit, die weit genug reichen: Tavily `time_range: 'week'`, RSS `MAX_AGE_DAYS = 10`.

Die Fenstererweiterung vergrößert die Rohmenge nicht — die Quellen sind pro Abfrage gedeckelt (HN 20 Treffer je Query, GitHub 10 je Query). Sie sorgt dafür, dass ältere Treffer überhaupt in der Ergebnisliste erscheinen können.

## Blocklist vor der Triage, nicht danach

`Dedup gegen news_memory` wendet die Blocklist aus `content_blocklist` an, **bevor** die Kandidaten ans Modell und in die Datenbank gehen. Wettbewerber, Beratungsseiten, Verkaufsseiten, Social- und UGC-Quellen sowie Listicle-Farmen fliegen damit früh raus. Gefiltert wird nach Domain, URL-Pfad und Titel-Schlagwort.

Derselbe Node entfernt Dubletten über `url_hash` und eine normalisierte Titelform.

## Bewertung und Schwelle

`Triage (0-10)` bewertet den gebündelten Kandidatensatz aus Sicht eines KMU-Entscheiders im DACH-Raum und gibt je Eingabe einen Score und eine Kategorie zurück. `Kandidaten buendeln` übergibt dafür Titel, **Domain**, Quellentyp, Region und Kurzfassung — die Domain muss mit, sonst kann das Modell die Quellenqualität nicht beurteilen, obwohl der Prompt genau das verlangt.

`Score anwenden` gewichtet das Ergebnis nach KAPA-Kernthemen und setzt die Aufnahmeschwelle:

| Kategorie | Gewicht |
|---|---|
| handcraft, manufacturing, engineering | +2 |
| sme, automation | +1 |
| regulation | 0 |
| ai_models | −1 |
| comparison | −2 |

`MIN_SCORE = 7` nach Gewichtung. Was darunter bleibt, kommt nicht in `news_memory`.

## Aufräumen

An `runs - Lauf anlegen` hängen zwei Löschjobs, die bei jedem Lauf mitlaufen: `news_memory` älter als **60 Tage** und `runs` älter als **180 Tage**.

## Datenhaltung

Supabase-Projekt *Marketing* (`ouccmqkwgdxjnplblnzk`).

| Tabelle | Rolle in diesem Flow |
|---|---|
| `content_sources` | Liste der RSS-Feeds, nur `active = true`, Einträge mit `feed_url = 'PRUEFEN'` werden übersprungen |
| `content_blocklist` | Sperrregeln nach Domain, Pfad, Titel-Schlagwort |
| `news_memory` | Ablage der Kandidaten, hier mit `status = triaged` |
| `runs` | Laufprotokoll, hier mit `status = running` angelegt |

## Modelle

`Query Modell (gpt-4o-mini)` für die Tavily-Suchanfragen, `Triage Modell (gpt-4o-mini)` für die Bewertung. Beide über Chat Completions, die Responses-API ist abgeschaltet.

## Offene Punkte

- An beiden Modell-Nodes steht `builtInTools`. Das Feld ist nur bei eingeschalteter Responses-API zulässig und wird derzeit ignoriert. Der Validator meldet es bei jedem Update. Es sollte entfernt werden.
- `executionTimeout` steht auf 120 Sekunden. Der Testlauf brauchte 24,9 Sekunden bei 252 gesammelten Meldungen — Luft ist da, aber der Wert ist knapp genug, um ihn im Blick zu behalten.
