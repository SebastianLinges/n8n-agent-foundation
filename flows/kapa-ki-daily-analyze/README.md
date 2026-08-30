# KI Daily - Analyze & Deliver [WF-2]

Auswertungsflow (`objM2PQrcTpEzik7`). Er nimmt, was [KI Daily - Collect](../kapa-ki-daily-collect/README.md) hinterlegt hat, lässt eine Redaktion daraus einen Brief bauen, schickt ihn per Telegram und leitet aus derselben Auswahl zwei Nebenprodukte ab: Geschäfts-Use-Cases und eine Marketing-Idee.

Takt: **Montag, Mittwoch, Freitag 06:20** (`20 6 * * 1,3,5`), zwanzig Minuten nach Collect.

## Die Kopplung an Collect trägt über Zustände, nicht über Daten

Es gibt **keinen Datumsfilter**, der die beiden Flows zusammenhält:

- `Kandidaten lesen (triaged)` holt alle Zeilen aus `news_memory` mit `status = triaged`
- `Heutigen Lauf holen` holt aus `runs` den **letzten** Eintrag mit `status = running`

Läuft Analyze an einem Tag, an dem Collect nicht lief, findet es keinen offenen Lauf, und `runs schliessen` arbeitet auf einer `run_id`, die es nicht gibt. Beide Cron-Ausdrücke müssen deshalb dieselben Wochentage nennen.

## Aufbau

`Trigger Mo/Mi/Fr 06:20` → `Blocklist lesen` → `Behandelte Themen lesen` → `Themen sammeln` → `Kandidaten lesen (triaged)` → `Kandidaten buendeln` → `Redaktion (Brief)` → `Brief bauen` → `Telegram senden` → `Persist vorbereiten` → `news_memory aktualisieren` → `Heutigen Lauf holen` → `runs schliessen` → `Redaktionsauswahl aufbereiten` → zwei Scouts parallel

Die beiden Scout-Stränge:

- `Business Scout` → `use_cases aufbereiten` → `use_cases schreiben`
- `Marketing Scout` → `marketing_idea aufbereiten` → `marketing_idea schreiben`

## Auswahl und Gewichtung

`Kandidaten buendeln` sortiert die triagierten Meldungen gewichtet: der inhaltliche Score führt, der `trust_score` der Quelle geht als sekundäres Signal mit einem Fünftel seines Wertes ein. Die besten **40** gehen an die Redaktion.

`Themen sammeln` liefert dem Marketing-Scout, was in den letzten **14 Tagen** bereits berichtet wurde (`status = reported`), damit dieselbe Sache nicht zweimal zum Post wird.

## Die Scouts sehen nur die redaktionelle Auswahl

`Redaktionsauswahl aufbereiten` reicht ausschließlich die Meldungen weiter, die es tatsächlich in den Brief geschafft haben, und wendet die Blocklist ein zweites Mal an. Beide Scouts liefen vorher auf dem ungefilterten Top-40-Rohpool und ignorierten die redaktionelle Entscheidung.

`marketing_idea aufbereiten` ordnet die Idee einer Quelle aus der Auswahl zu. **Ohne belegbare Zuordnung entsteht keine Idee** — der Node gibt dann ein leeres Ergebnis zurück. Das verhindert Posts mit erfundener Herkunft. Ebenso gilt ein leeres Modellergebnis als gültig: an manchen Tagen entsteht schlicht keine Idee.

Die Säule wird auf `handwerk`, `fertigung`, `engineering` oder `buero` normiert, alles andere fällt auf `buero` zurück.

## Verhältnis zum Content Studio

Die Marketing-Idee wandert ins [KAPA Content Studio](https://n8n.srv1307521.hstgr.cloud/workflow/bBBybznNNCnU2nOJ) (`bBBybznNNCnU2nOJ`) — aber **nicht taggleich und nicht als Hauptquelle**:

- Das Content Studio hat einen eigenen Trigger, Di/Mi/Do 08:00 (`0 8 * * 2,3,4`).
- Sein Node `Idee lesen` holt **alle** Einträge aus `marketing_ideas` mit `produced = false`, nach `idea_date` aufsteigend. Es ist eine Warteschlange, kein Tagesbezug.
- In `Thema waehlen` steht die News-Idee an **vierter** Stelle: zuerst ein Use-Case der Tagessäule, dann ein Use-Case der Ersatzsäulen des Slots, dann ein beliebiger anderer Use-Case, erst dann die News-Idee.

Der Takt dieses Flows bestimmt daher **nicht** die Postfrequenz. Er bestimmt, wie oft der Telegram-Brief kommt und wie oft Nachschub in die Warteschlange läuft.

## Datenhaltung

Supabase-Projekt *Marketing* (`ouccmqkwgdxjnplblnzk`).

| Tabelle | Rolle in diesem Flow |
|---|---|
| `news_memory` | gelesen mit `status = triaged`, danach auf `reported` oder `archived` gesetzt |
| `runs` | offener Lauf wird auf `success` gesetzt, mit `scored` und `reported_count` |
| `content_blocklist` | Sperrregeln, hier ein zweites Mal vor den Scouts |
| `use_cases` | Ablage des Business-Scouts, `status = new` |
| `marketing_ideas` | Ablage des Marketing-Scouts, `produced = false` |

`Persist vorbereiten` schreibt jede Meldung fort: ausgewählte auf `reported` mit `topic_key` und `development_stage`, nicht ausgewählte auf `archived`.

## Ausgabe

`Telegram senden` verschickt HTML an eine feste Chat-ID, ohne Linkvorschau und ohne n8n-Signatur.

## Modelle

`Redaktion Modell (gpt-4o)` für den Brief, `Scout Modell Business (gpt-4o-mini)` und `Scout Modell Marketing (gpt-4o-mini)` für die Nebenprodukte. Alle über Chat Completions, die Responses-API ist abgeschaltet.

## Offene Punkte

- An den drei Modell-Nodes steht `builtInTools`. Das Feld ist nur bei eingeschalteter Responses-API zulässig und wird derzeit ignoriert. Es sollte entfernt werden.
- Der Validator meldet an `Telegram senden` einen fehlenden `resource`-Diskriminator. Der Node arbeitet, der Befund ist bisher nicht nachgegangen worden.
- `Heutigen Lauf holen` nimmt den letzten Lauf mit `status = running`, ohne Datumsprüfung. Bleibt ein Lauf offen liegen — etwa nach einem Testlauf von Collect ohne folgenden Analyze-Lauf —, bleibt er dauerhaft auf `running` stehen, weil der nächste Analyze-Lauf den neueren Eintrag greift.
