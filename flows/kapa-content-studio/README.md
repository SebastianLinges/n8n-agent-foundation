# KAPA Content Studio [WF-3]

Produktionsflow (`bBBybznNNCnU2nOJ`). Er wählt ein Thema, schreibt daraus einen LinkedIn-Beitrag samt Instagram- und Facebook-Fassung, erzeugt ein Bild in vier Formaten, prüft das Ergebnis redaktionell und legt es als Entwurf in Buffer ab.

Takt: **Montag, Mittwoch, Donnerstag 08:00** (`0 8 * * 1,3,4`).

## Der Lauftag ist nicht der Posttag

Gepostet wird **Dienstag, Donnerstag, Freitag**. Der Flow läuft jeweils am Vortag, damit der Entwurf morgens im Buffer liegt und nicht erst am Posttag entsteht.

Daraus folgt eine Stelle, an der man sich leicht vertut: Der `weekday` in `content_schedule` meint den **Posttag**, nicht den Lauftag. `Saeule bestimmen` rechnet deshalb einen Tag voraus:

```js
const runWd  = now.weekday;
const postWd = now.plus({ days: 1 }).weekday;
```

Die Tabelle bleibt so als Redaktionsplan lesbar — dort steht, was dienstags erscheint, nicht was montags gebaut wird. Wer den Cron ändert, muss `content_schedule` mitziehen, sonst greift die Ersatzsäule.

## Aufbau

```
Trigger Mo/Mi/Do 08:00 ─┬ Logo laden ──────────────────────────────┐
                        └ Zeitplan lesen → Saeule bestimmen        │
                          → Blocklist lesen → Use-Cases lesen      │
                          → Idee lesen → Bisherige Pakete lesen    │
                          → Thema waehlen → Artikel abrufen        │
                          → Artikel Text extrahieren               │
                          → Analyse (KAPA Denkweise) → Analyse parsen
                            ├ Video Empfehlung → Video parsen ─────┐
                            └ COPY (Text) → COPY parsen            │
                              → Redaktions-Check                   │
                              → Lesbarkeit pruefen                 │
                              → Freigabe erteilt ─┬ [1] Beitrag abgelehnt melden
                                                  └ [0] CREATIVE (Bildidee)
                                                       → Bildprompt bauen
                                                         ├ Bild generieren → 4 Zuschnitte ┤
                                                         └ Text und Video zusammenfuehren ┘
                                                            → content_packages Zeile bauen
                                                            → Text und Bilder zusammenfuehren
                                                              ├ content_packages schreiben
                                                              ├ Anhang-Metadaten setzen → E-Mail → Abschluss
                                                              └ Buffer Config + Draft vorbereiten → Buffer
```

## Die Sperre

`Freigabe erteilt` ist die einzige Stelle, an der ein Lauf abbricht, ohne zu scheitern. Sie schaltet auf `qa_passed` aus dem Redaktions-Check.

**Ausgang 0 (bestanden):** weiter zur Bildidee, Buffer-Entwurf entsteht.
**Ausgang 1 (durchgefallen):** Telegram-Meldung mit den Befunden, **kein** Buffer-Entwurf, **kein** Bild.

Die Sperre sitzt bewusst **vor** der Bilderzeugung. Ein abgelehnter Beitrag kostet damit keinen Bildaufruf.

## Was geprüft wird

`Redaktions-Check` prüft hart — was hier fällt, wird nicht gepostet:

- **Fremdprodukte im Text.** Ein Beitrag, der ein Konkurrenzprodukt benennt, geht nicht raus. Das trifft auch Use Cases, die einen Produktnamen schon im Titel tragen.
- **Benanntes Dokument oder benannter Arbeitsschritt.** Ein Beitrag über „zeitaufwendige Prozesse" ohne Aufmaß, Prüfprotokoll oder Stückliste fällt durch.

`Lesbarkeit pruefen` prüft die Form. Der erste Absatz muss **30 bis 80 Wörter** haben:

```js
const ersterAbsatz = (text.split(/\n\s*\n/)[0] || firstLine).trim();
const woerterErster = ersterAbsatz.split(/\s+/).filter(Boolean).length;
```

LinkedIn kappt mobil bei „mehr anzeigen". Was dahinter steht, liest kaum jemand — der erste Absatz muss die Aussage allein tragen. Satzlänge und Absatzzahl werden zusätzlich gemessen, melden aber nur und blockieren nicht: ein inhaltlich richtiger Text soll daran nicht scheitern.

## Themenauswahl in vier Stufen

`Thema waehlen` geht der Reihe nach vor und nimmt das erste, was trägt:

1. Use Case aus der Säule des Tages
2. Use Case aus den Ersatzsäulen des Slots
3. Use Case aus einer beliebigen anderen Säule
4. Marketing-Idee aus den News, sofern blocklist-sauber

Findet keine Stufe etwas, endet der Lauf ohne Ergebnis. Das ist gewollt — lieber kein Beitrag als ein beliebiger.

**Praktisch greift Stufe 2 häufiger als vorgesehen.** Für die Säule `handwerk` liegt derzeit kein einziger Use Case vor, `engineering` enthält kein CAD/PDM-Thema. Der Befund steht in [offene-punkte.md](../../offene-punkte.md).

## Bildstrecke

`Bild generieren` liefert ein Motiv, das in vier Formate geschnitten wird: 1:1, 4:5, 9:16 und 1.91:1. `Logo compositing (JS)` legt das KAPA-Logo darüber. Die Motivvorgabe kommt aus einer festen Zuordnung je Säule — Werkstatt und Aufmaßskizze für Handwerk, Konstruktionsarbeitsplatz und Planrolle für Engineering.

Das Logo wird parallel zum Textstrang geladen, direkt vom Trigger. Es hängt nicht an der Freigabe und steht deshalb bereit, sobald die Zuschnitte fertig sind.

## Was der Lauf hinterlässt

- Zeile in `content_packages`
- E-Mail mit dem Paket im Anhang
- LinkedIn-Entwurf in Buffer, Bild über Supabase Storage eingebunden
- `marketing_idea` und `use_case` werden auf erledigt gesetzt

Bei Ablehnung entsteht nichts davon außer der Telegram-Meldung.

## Verhältnis zu den anderen Flows

Die Themen entstehen in [KI Daily - Analyze & Deliver](../kapa-ki-daily-analyze/README.md): Der Business Scout schreibt `use_cases`, der Marketing Scout schreibt `marketing_idea`. Das Content Studio verbraucht beides.

Beide Flows laufen versetzt — Analyze Mo/Mi/Fr um 06:20, das Studio Mo/Mi/Do um 08:00. Am Montag und Mittwoch liegt frisches Material vor, am Donnerstag arbeitet das Studio auf dem Bestand.
