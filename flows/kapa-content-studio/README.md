# KAPA Content Studio [WF-3]

Produktionsflow (`bBBybznNNCnU2nOJ`). Er wählt ein Thema, schreibt daraus einen LinkedIn-Beitrag, erzeugt ein Bild, prüft das Ergebnis redaktionell und legt es als Entwurf in Buffer ab.

Takt: **Montag, Mittwoch, Donnerstag 08:00** (`0 8 * * 1,3,4`).

## Der Lauftag ist nicht der Posttag

Gepostet wird **Dienstag, Donnerstag, Freitag**. Der Flow läuft jeweils am Vortag, damit der Entwurf morgens im Buffer liegt und nicht erst am Posttag entsteht.

Daraus folgt eine Stelle, an der man sich leicht vertut: Der `weekday` in `content_schedule` meint den **Posttag**, nicht den Lauftag. `Saeule bestimmen` rechnet deshalb einen Tag voraus:

```js
const runWd  = now.weekday;
const postWd = now.plus({ days: 1 }).weekday;
```

Die Tabelle bleibt so als Redaktionsplan lesbar — dort steht, was dienstags erscheint, nicht was montags gebaut wird. Wer den Cron ändert, muss `content_schedule` mitziehen, sonst greift die Ersatzsäule.

| Lauftag | Posttag | Slot | Säulen |
|---|---|---|---|
| Montag | Dienstag | Werkstatt & Produktion | handwerk, fertigung, engineering |
| Mittwoch | Donnerstag | Engineering & Konstruktion | engineering, fertigung |
| Donnerstag | Freitag | Büro & Verwaltung | buero, engineering |

## Aufbau

```text
Trigger Mo/Mi/Do 08:00 ─┬ Logo laden ─────────────────────────────────────────┐
                        └ Redaktionsregeln → Zeitplan lesen                   │
                          → Saeule bestimmen → Blocklist lesen                │
                          → Use-Cases lesen → Idee lesen                      │
                          → Bisherige Pakete lesen → Thema waehlen            │
                          → Artikel abrufen → Artikel Text extrahieren        │
                          → Analyse (KAPA Denkweise) → Analyse parsen         │
                          → COPY (Text) → COPY parsen                         │
                          → Redaktions-Check → Lesbarkeit pruefen             │
                          → Freigabe erteilt ─┬ [1] Beitrag abgelehnt melden  │
                                              └ [0] CREATIVE (Bildidee)       │
                                                   → Bildprompt bauen         │
                                                     ├ Bild generieren        │
                                                     │  → Zuschnitt 1:1 ──────┤
                                                     │    → Bilder zusammenfuehren
                                                     │      → Logo compositing (JS) ┐
                                                     └ content_packages Zeile bauen ┤
                                                        → Text und Bilder zusammenfuehren
                                                          ├ content_packages schreiben
                                                          ├ Anhang-Metadaten setzen
                                                          │  → E-Mail → Abschluss
                                                          └ Buffer Config + Draft
                                                             → Storage → GraphQL → Buffer
```

## Eine Quelle für die geteilten Listen

`Redaktionsregeln` ist ein Set-Node gleich hinter dem Trigger. Er führt drei Listen, und zwar genau einmal:

| Feld | Wer liest es | Wofür |
|---|---|---|
| `anker` (31 Einträge) | `Thema waehlen`, `Redaktions-Check` | benannte Dokumente und Arbeitsschritte — Aufmaß, Prüfprotokoll, Stückliste, Rechnungseingang … |
| `technik_stopwoerter` (39) | `Thema waehlen`, `Redaktions-Check` | Allerweltsbegriffe, die im Feld `technology` kein Produktname sind |
| `mengenwoerter_muster` | `Redaktions-Check` | erheblich, deutlich, massiv, drastisch, signifikant, spürbar, enorm, immens |

Der Grund: Auswahl und Abnahme müssen dasselbe verstehen. Vorher standen die Anker nur im Check — die Auswahl konnte also ein Thema ziehen, das die Abnahme unmöglich bestehen konnte. Genau das ist am 03.09.2026 passiert.

Wer eine Liste ergänzt, ändert den Set-Node, sonst nichts. Die Analyse- und COPY-Prompts nennen die Mengenwörter zusätzlich im Klartext — ein Prompt kann keinen Node lesen. Diese eine Doppelung ist unvermeidbar und in beiden Prompts kommentiert.

## Themenauswahl: erst Anker, dann Eignung

`Thema waehlen` wirft zuerst alles weg, was keinen Anker trägt. Ein Use Case ohne benanntes Dokument könnte den Redaktions-Check nie bestehen; er fällt vor dem ersten Modellaufruf heraus und kostet nichts.

Was übrig bleibt, wird nach **Eignung** sortiert, nicht mehr nach dem Scout-Score. Der Score taugt dafür nicht: Er liegt über den ganzen Bestand konstant bei 8 bis 9 und trennt nichts. Er ist nur noch Stichentscheid bei Gleichstand.

| Punkte | Kriterium |
|---|---|
| 20 je Treffer, höchstens 3 | benanntes Dokument oder benannter Arbeitsschritt |
| 15 | Lösungsweg beschrieben (≥ 60 Zeichen) |
| 10 | Problem beschrieben (≥ 60 Zeichen) |
| 10 | spezifische Zielgruppe statt „Kleine Unternehmen" |
| 5 | kein Fremdprodukt in der Vorlage |

Die Kriterien sind aus dem abgeleitet, was LinkedIn für organische Beiträge empfiehlt und was `Redaktions-Check` und `Lesbarkeit pruefen` am fertigen Text ohnehin messen: konkreter Einstieg statt Allgemeinplatz, benannter Arbeitskontext, kein fremdes Produkt, eine echte Frage am Ende. Die Auswahl hängt damit an denselben Maßstäben wie die Abnahme.

Gemessen am echten Bestand vom 03.09.2026 (22 offene Use Cases): 17 fallen mangels Anker heraus. Im Slot Büro gewinnt „Rechnungseingang automatisieren" (Eignung 70) gegen „Echtzeit-Datenverarbeitung" (50) — vorher entschied der Score, und der hätte das umgekehrt.

Findet keine Stufe etwas, endet der Lauf ohne Ergebnis und ohne Modellaufruf. Das ist gewollt — lieber kein Beitrag als ein beliebiger.

**Die Reihenfolge bleibt:** Säule des Tages, Ersatzsäulen des Slots, beliebige andere Säule, zuletzt eine Marketing-Idee aus den News. Der Ankerfilter gilt nur für Use Cases; eine News-Idee bringt ihren Text selbst mit.

## Wochenvorschau

`Thema waehlen` legt zusätzlich `slot_vorschau` und `slot_vorschau_text` an: je Posttag der beste verfügbare Kandidat mit seiner Eignung und die Zahl der Kandidaten im Pool. Beides steht in der E-Mail und in der Telegram-Meldung.

```text
Dienstag (Werkstatt & Produktion): … - Eignung 70, 3 im Pool
Donnerstag (Engineering & Konstruktion): kein tauglicher Kandidat, 0 im Pool
Freitag (Buero & Verwaltung): Rechnungseingang automatisieren - Eignung 70, 2 im Pool
```

Damit ist vor dem leeren Lauf sichtbar, wo der Pool dünn wird.

## Die Sperre

`Freigabe erteilt` ist die einzige Stelle, an der ein Lauf abbricht, ohne zu scheitern. Sie schaltet auf `qa_passed` aus dem Redaktions-Check.

**Ausgang 0 (bestanden):** weiter zur Bildidee, Buffer-Entwurf entsteht.
**Ausgang 1 (durchgefallen):** Telegram-Meldung mit den Befunden, **kein** Buffer-Entwurf, **kein** Bild.

Die Sperre sitzt bewusst **vor** der Bilderzeugung. Ein abgelehnter Beitrag kostet damit keinen Bildaufruf.

## Was geprüft wird

`Redaktions-Check` prüft hart — was hier fällt, wird nicht gepostet:

- **Gesperrte Marken im Text.** Namen aus der Blocklist (`competitor`, `consulting`, `vendor_sales`) gehen nicht raus. Das trifft auch Use Cases, die einen Produktnamen schon im Titel tragen.
- **Benanntes Dokument oder benannter Arbeitsschritt** aus der Ankerliste.
- **Erfundene Zahlen.** Jede Ziffer im Text muss in `belegte_zahlen` aus der Analyse stehen.
- Link im Text, Frage oder Emoji im ersten Satz, hypothetische Formulierungen, Buzzwords, zielgruppenfremde Begriffe, fehlende Schlussfrage, Länge unter 500 oder über 1600 Zeichen.

Weich gemeldet, aber nicht blockierend:

- **Mengenangaben ohne Beleg.** Ein Mengenwort allein reicht nicht — „den Arbeitsalltag erheblich erleichtern" ist qualitativ und harmlos. Erst zusammen mit einem messbaren Ziel im Umkreis von 50 Zeichen (Kosten, Zeit, Aufwand, Fehler, Effizienz) wird daraus eine Behauptung. An den 17 abgelegten Beiträgen gemessen: 3 Treffer, alle drei echt.
- **Begriffe aus dem Feld `uc_technology`.** Dort steht oft gar kein Produkt, sondern ein Allerweltsbegriff wie „Bildverarbeitung". Echte Marken fängt die Blocklist-Prüfung darüber ab.

Seit dem 03.09.2026 verbieten **Analyse- und COPY-Prompt die Mengenwörter ausdrücklich**. Vorher pflanzte die Analyse ein, was der Check anschließend rügte.

`Lesbarkeit pruefen` prüft die Form. Der erste Absatz muss **30 bis 80 Wörter** haben:

```js
const ersterAbsatz = (text.split(/\n\s*\n/)[0] || firstLine).trim();
const woerterErster = ersterAbsatz.split(/\s+/).filter(Boolean).length;
```

LinkedIn kappt mobil bei „mehr anzeigen". Was dahinter steht, liest kaum jemand — der erste Absatz muss die Aussage allein tragen. Satzlänge und Absatzzahl werden zusätzlich gemessen, melden aber nur.

**Der Prompt trägt dieselbe Regel.** Der System-Prompt von `COPY (Text)` verlangt für den ersten Absatz 3 bis 4 Sätze mit 30 bis 80 Wörtern und schreibt die kurzen 1–2-Satz-Absätze erst ab dem zweiten vor; der Selbsttest am Prompt-Ende fragt die Wortzahl noch einmal ab. Beide Stellen müssen zusammen geändert werden — steht im Prompt eine engere Absatzregel als im Gate, kann das Modell die Schwelle nicht erreichen und jeder Lauf bricht ab.

## Bildstrecke: ein Bild, ein Format

`Bild generieren` ruft `gpt-image-1` einmal auf (1024×1024, quality medium). `Zuschnitt 1:1` erzeugt den Binärschlüssel `img_1x1`, an dem der Buffer-Entwurf und der E-Mail-Anhang hängen. `Logo compositing (JS)` legt das KAPA-Logo darüber; die Motivvorgabe kommt aus einer festen Zuordnung je Säule — Werkstatt und Aufmaßskizze für Handwerk, Konstruktionsarbeitsplatz und Planrolle für Engineering.

Die Formate **4:5, 9:16 und 1.91:1 sind am 03.09.2026 entfallen**. Sie gingen ausschließlich als E-Mail-Anhang raus, für Kanäle, die abgeschaltet sind. Kommt Instagram oder Facebook zurück, werden sie wieder gebraucht — die Zuschnitte selbst kosten keine Token, nur der eine Bildaufruf kostet.

`Logo compositing (JS)` holt jeden Schlüssel aus `PLACEMENTS`. **Ein Schlüssel ohne Bild bricht den Node ab** — wer ein Format ergänzt, muss beide Stellen anfassen.

Das Logo wird parallel zum Textstrang geladen, direkt vom Trigger. Es hängt nicht an der Freigabe und steht bereit, sobald der Zuschnitt fertig ist.

## Was der Lauf hinterlässt

- Zeile in `content_packages` (mit Instagram- und Facebook-Text, auch wenn beide Kanäle ruhen)
- E-Mail mit Beitrag, Befunden, Wochenvorschau und dem Bild im Anhang
- LinkedIn-Entwurf in Buffer, Bild über Supabase Storage eingebunden
- `marketing_idea` und `use_case` werden auf erledigt gesetzt

Bei Ablehnung entsteht nichts davon außer der Telegram-Meldung.

## Was am 03.09.2026 entfernt wurde

| Weg | Warum |
|---|---|
| Videostrang (4 Knoten, `gpt-4o-mini`) | lief bei **jedem** Lauf, auch vor jeder Ablehnung, und sein Ergebnis las niemand |
| Zuschnitte 4:5, 9:16, 1.91:1 | gingen nur an abgeschaltete Kanäle |
| `LinkedIn - Kapa Digital`, `Facebook Graph API`, `Publish` | deaktiviert und unverdrahtet |
| Alte Buffer-Kette (Get Organization, Get Channel, Create Draft) | der Entwurf entsteht über den GraphQL-Weg mit Bild |

Die Felder `video_recommended` und `video_package` schreibt `content_packages Zeile bauen` weiterhin fest mit `false` und `''`. Die Spalten stehen noch in der Tabelle; so läuft kein späterer Leser auf `undefined`.

Der Flow ging damit von 54 auf 45 Knoten.

## Verhältnis zu den anderen Flows

Die Themen entstehen in [KI Daily - Analyze & Deliver](../kapa-ki-daily-analyze/README.md): Der Business Scout schreibt `use_cases`, der Marketing Scout schreibt `marketing_idea`. Das Content Studio verbraucht beides.

Beide Flows laufen versetzt — Analyze Mo/Mi/Fr um 06:20, das Studio Mo/Mi/Do um 08:00. Am Montag und Mittwoch liegt frisches Material vor, am Donnerstag arbeitet das Studio auf dem Bestand.

**Der Ankerfilter macht die Quellenqualität sichtbar.** Dass 17 von 22 Use Cases keinen Anker tragen, liegt nicht am Filter, sondern am Bestand: 14 der Auslöser sind Herstellermeldungen. Der Befund gehört zu WF-1, nicht hierher, und steht in [offene-punkte.md](../../offene-punkte.md).

## Prüfmittel

Unter [entwurf/](entwurf/) liegen die Referenzfassungen aller Code-Knoten und zwei Testtreiber, die den **echten** Node-Code mit nachgebildetem `$()` ausführen:

- `probe_thema_waehlen.js` — gegen den echten Pool (`pool_new.json`, 22 Use Cases) und den echten Zeitplan
- `probe_redaktions_check.js` — Mengenwortregel, fehlendes Muster, Blocklist, Zahlen, sauberer Text

Beide laufen mit `node <datei>` und geben bei Abweichung Exitcode 1 zurück.
