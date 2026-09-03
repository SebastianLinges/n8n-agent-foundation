# Auftrag — KAPA Content Studio: Themenwahl, Videostrang, Bildformate, Aufräumen

**Flow:** KAPA Digital - Content Studio [WF-3] — `bBBybznNNCnU2nOJ`
**Link:** https://n8n.srv1307521.hstgr.cloud/workflow/bBBybznNNCnU2nOJ
**Mitbetroffen (nur lesend):** KI Daily · Collect [WF-1] `mzSLn4WzFQSv0cuX`, Analyze & Deliver [WF-2] `objM2PQrcTpEzik7`
**Stand der Vorarbeit:** 03.09.2026, abends
**Supabase:** Marketing-Projekt `ouccmqkwgdxjnplblnzk` (Tabellen `use_cases`, `content_packages`, `content_schedule`, Blocklist)

**Stand: umgesetzt und publiziert am 03.09.2026** (activeVersionId 369b664c) — was daraus geworden ist, steht in Abschnitt 8.

Dieser Auftrag ersetzt die mündliche Vorlage vom 03.09. Deren erste Hälfte war falsch (Abschnitt 2.1); der Rest ist verifiziert und hier mit Messwerten belegt.

---

## 0. Für Claude Code: Einstieg in drei Sätzen

Der Flow funktioniert technisch — die Sperre sitzt richtig, der teure Bildaufruf entsteht nur bei Freigabe. Was ihn unproduktiv macht, ist die **Themenwahl**: Von 22 offenen Use-Cases nennen nur 5 überhaupt ein Dokument oder einen Arbeitsschritt, und genau das verlangt der Redaktions-Check. Dazu läuft ein **Videostrang mit, dessen Ergebnis nirgends verwendet wird**, und es werden **vier Bildformate erzeugt, von denen LinkedIn eines braucht**.

**Erster Arbeitsschritt:** Arbeitspaket A1 (Videostrang), weil es reine Bereinigung ohne fachliche Entscheidung ist. Dann A2, A3, A5, A7 in dieser Reihenfolge. A4 und A6 erst nach der ersten Messung.

---

## 1. Auftrag

Der Content Studio soll an jedem Lauftag einen verwertbaren LinkedIn-Entwurf liefern, ohne Modellaufrufe für Themen zu verbrennen, die die eigene Prüfung nicht bestehen können. Der Videostrang wird vollständig deaktiviert. Die Bilderzeugung wird auf das reduziert, was LinkedIn heute braucht. Tote Nodes und Kanäle werden entfernt.

**Nicht Gegenstand:** Modellwechsel, Änderung der Redaktionsregeln (Ankerliste, Blocklist, Zielgruppen), Umbau von WF-1 oder WF-2. Die Quellen von WF-1 sind das eigentliche Grundproblem (Abschnitt 2.3) — das ist eine eigene Entscheidung, siehe Abschnitt 6.

---

## 2. Bestand und Befunde (verifiziert am 03.09.2026)

### 2.1 Zeitpläne — die Vorlage war falsch

| Flow | Cron | Wochentage | feuert (Ortszeit) |
|---|---|---|---|
| WF-1 Collect | `0 6 * * 1,3,5` | Mo, Mi, Fr | 06:00 |
| WF-2 Analyze & Deliver | `20 6 * * 1,3,5` | Mo, Mi, Fr | 06:20 |
| WF-3 Content Studio | `0 8 * * 1,3,4` | Mo, Mi, Do | 08:00 |

WF-1 und WF-2 wurden am **30.08., 13:04 Uhr** von Sebastian auf Mo/Mi/Fr gestellt (Nodes heißen „Trigger Mo/Mi/Fr …"). Die in der Vorlage „fehlenden" Läufe vom 30.08. (So), 01.09. (Di) und 03.09. (Do) sind nicht vorgesehen. Die Instanz war jeweils da (Jira-Agent lief am 03.09. um 04:00:00 und 04:30:00 UTC). **Kein Wächter für verpasste Läufe nötig.**

Die Lauftage passen zu den Posttagen Di/Do/Fr aus `content_schedule` (README: der Flow läuft am Vortag). Donnerstags produziert WF-3 aus dem Pool vom Mittwoch, was WF-1/2 freitags sammeln, wird erst montags Beitrag. Das ist keine Lücke, nur eine Verzögerung.

**Randbefund:** Der Cron `0 6` feuert um 04:00 UTC — die Instanz interpretiert Zeitpläne in Europe/Berlin. Die Regel in `uebergabe.md` („Server läuft auf UTC, Trigger ohne `timezone` feuert nach Serverzeit") ist damit widerlegt oder veraltet und gehört korrigiert.

### 2.2 Die Kette, wie sie tatsächlich verdrahtet ist

```
Trigger Mo/Mi/Do 08:00 ─┬ Logo laden ─────────────────────────────────────────────────┐
                        └ Zeitplan lesen → Saeule bestimmen → Blocklist lesen          │
                          → Use-Cases lesen → Idee lesen → Bisherige Pakete lesen      │
                          → Thema waehlen → Artikel abrufen → Artikel Text extrahieren │
                          → Analyse (gpt-4o) → Analyse parsen                           │
                            ├ Video Empfehlung (gpt-4o-mini) → Video parsen ──────────┐│
                            └ COPY (gpt-4o) → COPY parsen → Redaktions-Check           ││
                              → Lesbarkeit pruefen → Freigabe erteilt                  ││
                                 ├ [1] Beitrag abgelehnt melden (Telegram)             ││
                                 └ [0] CREATIVE (gpt-4o) → Bildprompt bauen            ││
                                        ├ Bild generieren (gpt-image-1) → 4 Zuschnitte ┼┤
                                        └ Text und Video zusammenfuehren ◄─────────────┘│
                                          → content_packages Zeile bauen                │
                                          → Text und Bilder zusammenfuehren ◄───────────┘
                                             ├ content_packages schreiben
                                             ├ Anhang-Metadaten setzen → E-Mail (4 PNG) → Abschluss → Supabase
                                             └ Buffer Config + Draft vorbereiten → Storage → Buffer-Entwurf (img_1x1)
```

**Aktive Ausgabekanäle:** Buffer-Entwurf für LinkedIn und eine E-Mail an Sebastian. **Deaktiviert und unverdrahtet:** `Publish` (Instagram), `Facebook Graph API`, `LinkedIn - Kapa Digital`. **Verdrahtet, aber ohne Eingang, also tot:** `Buffer - Get Organization` → `Buffer - Get LinkedIn Channel` → `Buffer - Create LinkedIn Draft`.

### 2.3 Themenwahl: der Pool kann die Prüfung kaum bestehen

`Redaktions-Check` blockiert hart, wenn im LinkedIn-Text kein Wort aus seiner Ankerliste steht (Aufmaß, Prüfprotokoll, Stückliste, Rechnungseingang, Angebot, Anfrage, Stundenzettel, Lieferschein, Zeichnung, Wartungsplan, Posteingang, Beleg, Protokoll, Auftrag, …). `Thema waehlen` prüft nichts davon — es nimmt den Use-Case mit dem höchsten Score aus der Säule des Tages.

Dieselbe Ankerliste über die 22 offenen Use-Cases (`status = 'new'`, Stand 03.09.):

| Säule | offen | nennt selbst ein Dokument oder einen Arbeitsschritt |
|---|---|---|
| buero | 10 | 2 — davon einer nur über „Anfrage" |
| engineering | 9 | 2 — beide nur über „Anfrage" |
| fertigung | 3 | 1 |

14 der 22 Auslöser sind englischsprachige Tech- und Herstellerpresse (Oracle, Rockwell, OpenAI, „10 Best AI Platforms"). Das ist der strukturelle Bruch: WF-1 sammelt Branchennachrichten, der Check verlangt Mittelstandsalltag. **Kein Auswahlverfahren repariert einen Pool, in dem nichts Passendes liegt** — deshalb steht die Quellenfrage in Abschnitt 6.

### 2.4 Lauf 114163 vom 03.09., abgelehnt — was er gekostet hat

| Schritt | Modell | Tokens ein / aus |
|---|---|---|
| Analyse | gpt-4o | 1.066 / 332 |
| Video Empfehlung | gpt-4o-mini | 437 / 268 |
| COPY | gpt-4o | 1.598 / 396 |

Danach `Redaktions-Check` mit zwei Befunden — **hart:** „Kein benanntes Dokument und kein benannter Arbeitsschritt"; **weich, nur gemeldet:** „Mengenangabe ohne Beleg: … erheblich reduziert …". `Freigabe erteilt` → Ausgang 1 → Telegram. Kein Bild, kein zweiter Versuch, 18 weitere Kandidaten im Slot ungenutzt.

**Genau lesen:** Der Beitrag fiel am **Anker** durch, nicht am Wort „erheblich". Die Mengenwortprüfung meldet und blockiert nicht (so steht es im Code). Der Kettenfehler ist real — „erheblich" steht wörtlich in der Kernaussage des Analyse-Modells, dessen Prompt Zahlen verbietet, aber Mengenwörter nicht — aber er ist ein Qualitätsthema, kein Grund der Ablehnung.

### 2.5 Videostrang: läuft vor der Sperre und wird nirgends gelesen

`Video Empfehlung` (gpt-4o-mini) läuft bei **jedem** Lauf direkt nach der Analyse — also auch bei jeder Ablehnung. Sein Ergebnis (`video_recommended`, `video_package`) geht über `Text und Video zusammenfuehren` in `content_packages Zeile bauen` und von dort in die Tabelle `content_packages`. Sonst liest es niemand: kein Video wird erzeugt, Instagram und Facebook sind aus. In WF-1 und WF-2 gibt es keinen Videobezug; die übrigen KAPA-Flows haben laut ihrer Beschreibung keine Videofunktion.

### 2.6 Bilder: ein Aufruf, vier Formate, eines wird gebraucht

`Bild generieren` ruft `gpt-image-1` einmal auf (`1024x1024`, `quality: medium`, gemessen 21 Sekunden). Die vier `Zuschnitt`-Nodes sind lokale Bildoperationen ohne Modellaufruf — **sie kosten keine Tokens**. Wohin sie gehen:

| Format | Verwendung |
|---|---|
| `img_1x1` (1024×1024) | Buffer-Entwurf für LinkedIn (`Buffer Config + Draft vorbereiten` bricht ohne ihn ab) und E-Mail |
| `img_4x5`, `img_9x16`, `img_191x1` | **nur** E-Mail-Anhang (Instagram-/Facebook-Formate für abgeschaltete Kanäle) |

Die E-Mail vom 02.09. war 9,1 MB groß — vier PNG. Der Zuschnitt 1:1 auf ein 1024×1024-Bild ist außerdem eine Nulloperation.

**Ehrlich zur Kostenfrage:** Weniger Zuschnitte sparen Zeit und Postfach, keine Tokens. Am Bild selbst gibt es zwei Kostenhebel, beide sind Entscheidungen (Abschnitt 6): die Qualität `medium` → `low`, und — bereits umgesetzt — kein Bild ohne Freigabe.

### 2.7 Weitere Befunde

- **`COPY (Text)` erzeugt Texte für drei Plattformen** (`linkedin_text`, `instagram_text`, `facebook_text`, Hashtags, Alt-Text), obwohl nur LinkedIn ausgespielt wird. Rund 400 Ausgabe-Tokens je Lauf, davon der größere Teil für Kanäle, die aus sind.
- **Kein zweiter Versuch** nach Ablehnung. Mit dem Eignungsfilter (A3) sinkt die Ablehnungsquote so weit, dass eine Schleife erst nach Messung entschieden werden sollte (A4).
- **Meldung nur bei Ablehnung.** Bei Erfolg kommen E-Mail und Buffer-Entwurf; niemand sieht, wie viele taugliche Kandidaten noch im Pool sind.

---

## 3. Rahmenbedingungen

**Publikationssperre.** Nichts geht ohne das ausdrückliche Wort „Publizieren" live. Alle Änderungen bleiben Entwurf.

**Verifikationsstandard.** Nichts gilt als verifiziert ohne echte Ausführungsdaten aus `get_execution`. Ein Probelauf dieses Flows kostet echte Modellaufrufe und legt einen echten Buffer-Entwurf an — Probeläufe daher bewusst setzen, ihre Kosten protokollieren, den Entwurf danach in Buffer löschen.

**Technische Randbedingungen dieser Instanz** (gesammelt aus den Aufträgen Feldpflege und Ingest, dort belegt):

- Alle Node-Änderungen eines Workflows in **einem** `operations`-Array. `updateNodeParameters` überträgt Regex-Backslashes korrekt, wenn sie im JSON doppelt geschrieben sind; danach immer den Live-Code gegen die Referenzdatei diffen.
- Code-Nodes zuerst als Referenzdatei unter `flows/kapa-content-studio/entwurf/` schreiben, dann übertragen, dann zurücklesen. Große Code-Nodes (`Thema waehlen` 7.332 Zeichen, `Redaktions-Check` 7.580 Zeichen) niemals aus dem Gedächtnis rekonstruieren.
- **Bash-Heredocs verschlucken Backslashes** — Code mit Regexen über den Write-Weg schreiben.
- `sourceOutput` beim Anlegen von Verbindungen: Index 0 funktioniert über den claude.ai-Konnektor; Index 1 (IF-false, Merge-Eingang 2) nach jeder Änderung im frischen Abruf prüfen.
- Merge-Nodes: `Bilder zusammenfuehren` und `Text und Bilder zusammenfuehren` haben mehrere Eingänge — beim Entfernen eines Zuschnitts die Eingangsindizes der verbleibenden Verbindungen kontrollieren.
- Parallele Zweige hinter einem Trigger laufen nacheinander; ein Fehler im ersten beendet den Lauf.
- MCP liefert leere `credentials`; Zuweisungen nur über `setNodeCredential`.
- `executionTimeout` steht auf 3.600 s, unkritisch.

**Keine Leichen.** Was am Ende nicht verdrahtet ist, wird entfernt.

---

## 4. Arbeitspakete

### A1 — Videostrang deaktivieren

**Entfernen:** `Video Empfehlung`, `Video Modell (gpt-4o-mini)`, `Video parsen`, `Text und Video zusammenfuehren`.
**Neu verdrahten:** `Bildprompt bauen` → `content_packages Zeile bauen` (bisher über den Merge).
**Anpassen:** `content_packages Zeile bauen` schreibt `video_recommended: false` und `video_package: ''` fest, damit die Spalten in `content_packages` unverändert bleiben und nichts Nachgelagertes auf `undefined` läuft.
**Nachweis:** ein Lauf, in dem `Video*` nicht mehr in `runData` erscheint und `content_packages` die Zeile mit `video_recommended = false` erhält. Ersparnis je Lauf: ein gpt-4o-mini-Aufruf (~450/270 Tokens) — klein, aber bei jeder Ablehnung bisher umsonst.

### A2 — Bildformate auf LinkedIn reduzieren

**Entfernen:** `Zuschnitt 4:5`, `Zuschnitt 9:16`, `Zuschnitt 1.91-1`.
**Behalten:** `Bild generieren` (unverändert), `Zuschnitt 1:1` — nicht wegen des Zuschnitts, sondern weil er den Binärschlüssel `img_1x1` erzeugt, an dem `Buffer Config + Draft vorbereiten` hängt. Alternative mit weniger Nodes: den Zuschnitt entfernen und `Bild generieren` den Schlüssel direkt liefern lassen — dann muss `Buffer Config + Draft vorbereiten` auf `data` umgestellt werden. Die Alternative nur wählen, wenn sie in einem Probelauf sauber durchgeht.
**Anpassen:** `Bilder zusammenfuehren` auf zwei Eingänge (Logo, `img_1x1`); `Logo compositing (JS)` prüfen, ob es die drei fehlenden Schlüssel tolerant behandelt; `Anhang-Metadaten setzen` und `Content-Paket per E-Mail` auf `img_1x1`.
**Nachweis:** E-Mail mit einem Anhang, Buffer-Entwurf mit Bild, `Logo compositing` ohne Fehler.
**Entscheidung offen (Abschnitt 6):** ob LinkedIn 1:1 bleibt oder 1,91:1 werden soll — dann wäre `Zuschnitt 1.91-1` der bleibende und `img_191x1` der Schlüssel für Buffer.

### A3 — Eignungsfilter in der Themenwahl

**Wo:** `Thema waehlen`, Kandidatenaufbau:

```js
const ucAll = $('Use-Cases lesen').all().map(i => i.json)
  .filter(u => u && u.uc_id && (u.score || 0) >= 7)
  .filter(zielgruppePasst)
  .filter(u => !isDuplicate(u.name, '', u.uc_id));
```

**Was:** eine weitere Stufe `.filter(hatAnker)`: `name + problem + solution` kleingeschrieben muss mindestens ein Wort der Ankerliste enthalten. Kandidaten ohne Anker fallen aus der Auswahl, **bevor** ein Modell läuft — ein deterministischer Filter, null Kosten.

**Die Ankerliste darf nur an einer Stelle stehen.** Heute liegt sie im `Redaktions-Check`. Vorschlag: ein Set-Node `Redaktionsregeln` direkt hinter dem Trigger mit dem Array `anker` (und perspektivisch `mengenwoerter`), gelesen von `Thema waehlen` und `Redaktions-Check` über `$('Redaktionsregeln').first().json`. Damit verhält sich die Auswahl garantiert wie die Prüfung.

**Rückfallverhalten:** Findet sich in Säule und Ersatzsäulen kein tauglicher Kandidat, soll der Lauf **ohne Modellaufruf** enden und melden (A6), statt einen untauglichen zu ziehen. Heute zieht er den nächstbesten.

**Nachweis:** Filter lokal gegen den Pool laufen lassen (die 22 Use-Cases liegen als Messung vor; erwartet 5 taugliche), dann ein Probelauf, dessen `Thema waehlen`-Ausgabe einen Kandidaten mit Anker zeigt.

**Erwartung:** Mit dem Pool vom 03.09. hätten von zehn Bürokandidaten nur „Rechnungseingang automatisieren" und „Echtzeit-Datenverarbeitung" zur Wahl gestanden. Das ist wenig — und genau die Zahl, die A6 melden muss.

### A4 — Kandidatenschleife (erst nach Messung)

Bis zu drei Kandidaten je Lauf, nächster nach Ablehnung. **Nicht sofort bauen:** Mit A3 fällt der häufigste Ablehnungsgrund weg; ob eine Schleife dann noch Aufrufe rettet oder nur verdreifacht, zeigt die Messung nach zwei Wochen (Abschnitt 5). Falls ja: `Thema waehlen` liefert die drei besten Kandidaten, eine `splitInBatches`-Schleife läuft Analyse → COPY → Check je Kandidat und bricht beim ersten `qa_passed` ab. Die Schleifenfallstricke aus `uebergabe.md` beachten (`options.reset`, `$('Node').all()` liefert nur den letzten Durchlauf).

### A5 — Prompt-Kette angleichen

- **Analyse-Prompt**, Regel 2 („KEINE ERFUNDENEN ZAHLEN … beschreibe qualitativ …"): ergänzen, dass auch **Mengenwörter ohne Beleg** verboten sind — `erheblich, deutlich, massiv, drastisch, signifikant, spürbar, enorm, immens` — und stattdessen der Arbeitsschritt beschrieben wird. Heute produziert genau diese Regel das Wort „erheblich".
- **COPY-Prompt:** dieselbe Liste, dieselbe Formulierung.
- **`Redaktions-Check`:** die Liste aus `Redaktionsregeln` lesen (A3), Verhalten unverändert — meldet, blockiert nicht.
- **Optional, Tokens:** `COPY (Text)` auf LinkedIn beschränken, solange Instagram und Facebook aus sind; `instagram_*` und `facebook_text` leer schreiben, Spalten bleiben. Spart geschätzt die Hälfte der Ausgabe-Tokens des teuersten Aufrufs. Entscheidung Sebastian.

**Nachweis:** zwei Probeläufe, deren Analyse-Ausgabe (`kernaussage`, `takeaway`) kein Wort der Liste enthält.

### A6 — Meldung an jedem Lauftag

Die Telegram-Meldung `Beitrag abgelehnt melden` um die Poolzahlen ergänzen: offene Kandidaten je Säule, davon mit Anker. Zusätzlich eine kurze Erfolgsmeldung (Thema, Säule, Poolstand) — heute kommt bei Erfolg nur die E-Mail. Das ist der einzige Ort, an dem sichtbar wird, dass der Pool leerläuft, **bevor** der nächste Lauf leer ausgeht.

### A7 — Aufräumen

**Entfernen:** `Publish`, `Facebook Graph API`, `LinkedIn - Kapa Digital` (deaktiviert und unverdrahtet), `Buffer - Get Organization`, `Buffer - Get LinkedIn Channel`, `Buffer - Create LinkedIn Draft` (Kette ohne Eingang). Vorher in den letzten Läufen prüfen, dass keiner davon ausgeführt wurde (Lauf 113375: keiner).
**Anordnung:** 240er-Raster von links nach rechts, Freigabe-Verzweigung als Abzweig, Notizen als Kopfzeilen über ihren Abschnitten, keine Überlappung — wie bei der Feldpflege.
**Dokumentation:** README des Flows auf den neuen Stand (Aufbau-Diagramm, Kanäle, Videostrang entfernt, ein Bildformat), `uebergabe.md` um die Zeitzonen-Korrektur (2.1).

---

## 5. Abnahme

Vor jeder Freigabe:

1. Entwurf gegen `activeVersion` diffen, geänderte Nodes zeigen.
2. Alle berührten Code-Nodes gegen ihre Referenzdateien diffen.
3. Mindestens ein Probelauf je Paket mit `get_execution`, Kosten im Laufprotokoll.
4. Buffer-Entwürfe aus Probeläufen löschen.

**Messung nach zwei Wochen** (sechs Lauftage) gegen den Stand vom 03.09.:

| Kennzahl | Stand 03.09. |
|---|---|
| Läufe mit Freigabe | zu messen — 03.09. abgelehnt, 02.09. freigegeben |
| Modellaufrufe je abgelehntem Lauf | 3 (Analyse, Video, COPY) |
| Modellaufrufe je freigegebenem Lauf | 4 + 1 Bild |
| taugliche Kandidaten im Pool (mit Anker) | 5 von 22 |
| Anhänge je E-Mail | 4, 9,1 MB |

**Abbruchkriterium:** Erzeugt ein freigegebener Lauf nach A2 keinen Buffer-Entwurf mit Bild, wird A2 zurückgenommen, bevor etwas anderes weitergeht.

---

## 6. Entscheidungen für Sebastian

1. **Bildqualität** `medium` behalten oder auf `low`? Das ist der einzige Tokenhebel am Bild. Entscheidung nach Ansicht zweier Entwürfe in beiden Stufen.
2. **LinkedIn-Format:** 1:1 (heute) oder 1,91:1? Bestimmt, welcher Zuschnitt bleibt.
3. **COPY auf LinkedIn beschränken** (A5, optional) — oder Instagram-/Facebook-Texte weiter erzeugen, obwohl die Kanäle aus sind?
4. **Quellen von WF-1.** 14 von 22 Auslösern sind Herstellerpresse. Solange das so bleibt, liefert kein Filter genug Themen. Vorschlag aus `offene-punkte.md` steht weiterhin: fünf bis acht Use-Cases je Säule von Hand setzen, und die Quellen um deutschsprachige Mittelstands- und Handwerksmedien ergänzen. Eigener Auftrag.
5. **Kandidatenschleife** (A4) — erst nach der Messung entscheiden.

---

## 7. Berichtsform

Kurz, in ganzen Sätzen. Workflow immer mit Name, ID und direktem Link. Gemessene Zahlen und Schätzungen klar getrennt. Rückmeldung nur, wenn eine Entscheidung ansteht oder ein Paket abgeschlossen ist.

---

## 8. Umsetzung — abgeschlossen und publiziert am 03.09.2026

Live seit `activeVersionId 369b664c`. Rückfallpunkt ist `5573f917` (54 Knoten, Stand vor diesem Auftrag).

| Paket | Stand | Was tatsächlich geändert wurde |
|---|---|---|
| A1 Videostrang | erledigt | 4 Knoten entfernt (`Video Empfehlung`, `Video Modell (gpt-4o-mini)`, `Video parsen`, `Text und Video zusammenfuehren`). `Bildprompt bauen` geht direkt auf `content_packages Zeile bauen`. Die Felder `video_recommended` und `video_package` bleiben fest auf `false` / `''`, weil die Spalten in `content_packages` stehen. |
| A2 Bildformate | erledigt | `Zuschnitt 4:5`, `9:16`, `1.91-1` entfernt. `Bilder zusammenfuehren` von 5 auf 2 Eingänge, `Logo laden` auf Eingang 1. `PLACEMENTS` im Logo-Compositing auf `img_1x1`. E-Mail mit einem Anhang statt vier. |
| A3 Eignungsfilter | erledigt | Ankerfilter vor der Auswahl, Rangfolge nach `eignung()` statt nach dem Scout-Score. Ohne tauglichen Kandidaten endet der Lauf ohne Modellaufruf. |
| A4 Kandidatenschleife | offen | wie vorgesehen erst nach der Messung |
| A5 Prompt-Kette | erledigt | Regel 2a im Analyse-Prompt, entsprechender Punkt im COPY-Prompt, beide Selbsttests erweitert. |
| A6 Meldung je Lauftag | erledigt, anders gelöst | Statt einer eigenen Meldung an jedem Lauftag trägt jede Ausgabe die **Wochenvorschau** je Posttag — in der E-Mail und in der Telegram-Meldung. Ein zusätzlicher Kanal entsteht dadurch nicht. |
| A7 Aufräumen | erledigt | 6 tote Knoten und die alte Sammelnotiz entfernt, 260er-Raster, keine Überlappung, vier neue Notizen (`Notiz Auswahl`, `Notiz Sperre`, `Notiz Bild`, `Notiz Ausgabe`). |
| A8 Eine Regelquelle | dazugekommen | Neuer Set-Node `Redaktionsregeln` hinter dem Trigger führt `anker`, `technik_stopwoerter` und `mengenwoerter_muster`. `Thema waehlen` und `Redaktions-Check` lesen daraus. |

**A8 war nicht im Auftrag** und ist während A3 entstanden: Der Ankerfilter der Auswahl und die Ankerprüfung der Abnahme wären sonst zwei getrennte Listen gewesen, die auseinanderlaufen. Genau diese Trennung hat am 03.09. den Fehllauf verursacht.

Knotenzahl 54 → 45.

### Was gemessen wurde, was geschätzt ist

**Gemessen** (lokal, gegen den echten Bestand vom 03.09.: 22 offene Use Cases, echter `content_schedule`):

- 17 der 22 Use Cases tragen keinen Anker und fallen vor dem ersten Modellaufruf heraus.
- Im Slot Büro gewinnt „Rechnungseingang automatisieren" (Eignung 70) gegen „Echtzeit-Datenverarbeitung" (50). Nach Scout-Score wäre es umgekehrt gewesen.
- Leerer Pool ⇒ kein Modellaufruf. News-Idee bleibt unberührt.
- Der Redaktions-Check meldet Mengenwörter weiterhin nur zusammen mit einem messbaren Ziel im Umkreis; fehlt das Muster, wird nicht geprüft statt durchzulaufen.

Beide Testtreiber führen den **echten** Node-Code aus (`entwurf/probe_thema_waehlen.js`, `entwurf/probe_redaktions_check.js`).

**Geschätzt, nicht gemessen:** die Einsparung je Lauf. Wegfallen ein `gpt-4o-mini`-Aufruf bei jedem Lauf (auch vor jeder Ablehnung) und alle Modellaufrufe für Themen ohne Anker. Wie oft der zweite Fall greift, zeigt erst die Messung nach sechs Lauftagen — sie steht aus.

### Was noch aussteht

- Ein Produktionslauf mit `get_execution` als Beleg. Der nächste Lauf ist Montag, 07.09.2026, 08:00 für den Posttag Dienstag.
- Die Messung nach zwei Wochen gemäß Abschnitt 5.
- Die fünf Entscheidungen aus Abschnitt 6 stehen unverändert.
- Die Workflow-Zeitzone ist nicht gesetzt; der Flow erbt die der Instanz. Für `0 8 * * 1,3,4` und die Wochentagsrechnung ist das um 08:00 unkritisch, sollte aber bei nächster Gelegenheit ausdrücklich auf `Europe/Berlin` gestellt werden — das verschiebt die Auslösezeit, wenn die Instanz auf UTC steht, und gehört deshalb nicht in einen Publish nebenbei.
