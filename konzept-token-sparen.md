# Token sparen — offene Punkte über alle Flows

Stand 04.09.2026. Aufgenommen, nachdem Feldpflege und Content Studio abgearbeitet waren und die Frage aufkam, wo insgesamt noch Modellkosten entstehen.

Die Liste ist nach **gemessenem Verbrauch** sortiert, nicht nach Bauchgefühl. Wo etwas geschätzt ist, steht es dabei.

## Was diese Zahlen sind — und was nicht

n8n kennt Token, keine Euro. Alles hier sind **Tokenzahlen und Laufzahlen aus echten Ausführungen**. Was ein Token kostet, hängt vom Modell und vom Tarif ab; die tatsächliche Rechnung steht nur in den Abrechnungen von OpenAI und Mistral.

**Deshalb steht Punkt 0 vor allem anderen:** Ohne den Abgleich mit der Anbieterabrechnung lässt sich nicht sagen, ob die beobachteten fünf bis sechs Euro alle zwei Tage aus dem Jira-Agenten, aus dem SharePoint-OCR oder aus den Einbettungen kommen. Die Rangfolge unten beruht auf Tokenmengen — die sind belastbar, aber ein Mistral-OCR-Seitenpreis taucht darin gar nicht auf.

Zweite Einschränkung: Die Instanz hält nur rund **5.000 Ausführungen** vor, ältere werden gelöscht. Siebentageszahlen sind daher Untergrenzen. Wo es darauf ankam, habe ich einen vollständigen Tag gemessen — Donnerstag, den 03.09.2026.

---

## 0. Zuerst: die Rechnung neben die Messung legen

**Aufwand: 20 Minuten. Kein Umbau.**

Die Tagesbeträge aus dem OpenAI-Dashboard (nach Modell aufgeschlüsselt) und aus der Mistral-Abrechnung neben die Laufzahlen unten legen. Erst dann ist entschieden, ob die Arbeit in den Jira-Agenten oder in das SharePoint-OCR gehört.

Ohne diesen Schritt optimieren wir an der Tokenzahl statt an der Rechnung. Die beiden müssen nicht dasselbe sagen: `gpt-5.4` kostet je Token ein Vielfaches von `gpt-4.1-mini`, und Mistral-OCR rechnet nach Seiten statt nach Token.

---

## Der Bestand: wer ruft welches Modell

Aus den 18 Exporten im Repo. Ein Flow ohne Modellknoten steht nicht in der Tabelle.

| Flow | Modelle | Takt | Läufe |
|---|---|---|---|
| RWG_Jira-Agent | **gpt-5.4** (Analyse), gpt-5.4-mini (Policy, Anwendertext), gpt-4o-mini (Bild), gpt-4.1-mini (Herstellerrecherche), Einbettungen | alle 30 Min + Jira-Ereignis | 250 in 7 Tagen |
| RWG Teams Agent | **gpt-5.4**, gpt-4o-mini (Begrüßung) | Teams-Chat | 237 in 7 Tagen |
| RAG-JIRA-Ingest | gpt-4.1-mini (Lösung, Bild), Einbettungen | jedes Jira-Ereignis | **404 am 03.09.** |
| RWG_Jira-Feldpflege | gpt-4o | jedes Jira-Ereignis | **317 am 03.09.** |
| RAG - SharePoint Ingest | **Mistral OCR**, Einbettungen | stündlich + nachts | 62 in 7 Tagen |
| RWG Contract Loader | Mistral OCR, mistral-medium | stündlich | 119 in 7 Tagen |
| KI Daily - Collect [WF-1] | 2× gpt-4o-mini | Mo/Mi/Fr 06:00 | 3/Woche |
| KI Daily - Analyze [WF-2] | gpt-4o, 2× gpt-4o-mini | Mo/Mi/Fr 06:20 | 3/Woche |
| Content Studio [WF-3] | 3× gpt-4o, gpt-image-1 | Mo/Mi/Do 08:00 | 3/Woche |
| Lead Intake, Belegeingang, Angebot, Event Scout, Website-Assistent | je ein Modell | anlassbezogen | selten |
| RWG Sub - Jira Tickets / Wissenssuche | gpt-5.4-mini, Einbettungen, Cohere rerank | als Agenten-Werkzeug | im Elternlauf |

---

## 1. Jira-Agent: die Trefferliste wird viermal bezahlt

**Der größte gemessene Hebel. Aufwand: ein halber Tag. Qualitätsrisiko: gering, wenn entdoppelt statt blind gekürzt wird.**

Gemessen an Lauf `114645` vom 03.09., 12:18 Uhr (Ticket SSD-9299, eine gewöhnliche Verteileranfrage):

| Schritt | Eingabe | Ausgabe |
|---|---|---|
| 1 | 4.338 | 81 |
| 2 | 4.620 | 57 |
| 3 | 10.694 | 132 |
| 4 | 10.844 | 102 |
| 5 | 12.567 | 226 |
| 6 | 12.861 | 1.146 |
| **Summe** | **55.924** | **1.744** |

Sechs Modellschritte auf `gpt-5.4` für ein Ticket. Entscheidend ist die Bauart eines Agentenzyklus: **jeder Schritt schickt den gesamten bisherigen Verlauf erneut mit.** Was einmal im Kontext liegt, wird bis zum Ende jedes Mal neu bezahlt.

Zwischen Schritt 2 und 3 wächst die Eingabe um **6.074 Token**. Das ist die Rückgabe von `Public Wissen hybrid abrufen`: **24 Kandidaten mit vollem Chunktext**. Diese 6.074 Token stehen danach auch in den Schritten 4, 5 und 6 — rund **24.000 der 55.924 Eingabetoken, also 43 Prozent des Laufs, für eine einzige Trefferliste.**

Zwei Dinge machen die Liste unnötig groß:

**Doppelte Chunks desselben Tickets.** In dem Lauf erscheint SSD-9291 viermal (`solution`, `comment`, `content`, `image_attachment`), SSD-8394 dreimal, vier weitere Tickets doppelt. Von 24 Kandidaten sind es 15 verschiedene Tickets. Eine Entdopplung nach `sourceRef` halbiert die Liste fast, ohne dass eine Erkenntnis verloren geht — die Zusammenfassung eines Tickets steht ohnehin im `solution`-Chunk.

**Bildanalyse-Chunks.** Der `image_attachment`-Chunk zu SSD-9291 ist allein rund 1.900 Zeichen lang und enthält die vollständige Mitgliederliste eines Mailverteilers mit zehn Namen und dienstlichen E-Mail-Adressen. Das ist teuer und geht als Personendatensatz an OpenAI. Ob solche Chunks in die Trefferliste eines Agenten gehören, ist keine reine Kostenfrage — siehe Punkt 8.

**Was zu tun ist:**

1. Trefferliste nach `sourceRef` entdoppeln, bevor sie an das Modell geht.
2. Auf die besten sechs bis acht Tickets begrenzen statt auf 24 Chunks.
3. Je Kandidat nur das mitgeben, was der Agent zum Bewerten braucht: Titel, Lösungsabschnitt, Quelle. Nicht die kompletten `TICKETDATEN`-Blöcke, die Status, Resolution und Lösungsdatum ein zweites Mal wiederholen — die stehen schon im Text darüber.
4. `image_attachment` aus der Kandidatenliste ausschließen.

**Vorher/nachher belegen:** derselbe Ticketinhalt, Tokenzahl je Schritt aus dem Lauf, und die fachliche Bewertung des Agenten vergleichen. Nicht publizieren, bevor drei Tickets zeigen, dass die Antwort gleich gut bleibt.

**Kein Hebel:** Am 03.09. hatte ich vermutet, die Ergebnislänge sei über die 1800-Zeichen-Kappung zu drücken, und das nach einer Messung verworfen — in jenem Lauf hatten die Werkzeuge **null** Treffer geliefert, die Kappung griff also nirgends. Diese Messung war nicht falsch, aber nicht aussagekräftig: an einem Lauf mit Treffern sieht die Sache genau umgekehrt aus.

---

## 2. Jira-Agent: der Systemtext steht sechsmal im Lauf

**Aufwand: zwei Stunden Schreibarbeit. Risiko: mittel — am Systemtext hängt das fachliche Verhalten.**

Der Systemtext von `Interner Support-Analyst` ist **14.209 Zeichen**, grob 3.550 Token. Bei sechs Schritten sind das rund **21.300 Token je Ticket**, weitere 38 Prozent der Eingabe.

Zusammen mit Punkt 1 sind damit etwa vier Fünftel der 55.924 Eingabetoken erklärt.

Eine Kürzung um ein Drittel spart rund 7.000 Token je Ticket. Das ist kein Umbau der Fachlogik, sondern Redaktionsarbeit: Wiederholungen streichen, Beispiele zusammenziehen, Regeln nicht dreimal in anderen Worten wiederholen. **Jede Regel, die entfällt, kann Verhalten ändern** — deshalb einzeln und mit Gegenprobe an echten Tickets, nicht in einem Rutsch.

Zum Vergleich: Der Teams-Agent trägt 10.457 Zeichen (~2.600 Token) im Systemtext, bei 237 Läufen in sieben Tagen. Dieselbe Rechnung, kleinerer Faktor.

---

## 3. Prompt-Caching prüfen

**Aufwand: eine Stunde Prüfung. Wenn es greift, der billigste Hebel von allen — ohne jede inhaltliche Änderung.**

Genau das Muster, das die Punkte 1 und 2 teuer macht — ein langer, in jedem Schritt identischer Anfang aus Systemtext und Werkzeugbeschreibungen —, ist das, wofür Anbieter Prompt-Caching anbieten: der wiederholte Vorspann wird stark verbilligt abgerechnet.

**Gemessen:** Im Ingest-Aufruf (`114844`) steht in der Antwort ausdrücklich `cached_tokens: 0` und `cache_write_tokens: 0`. Dort greift kein Caching. Ob es beim Agenten greift, geht aus der n8n-Tokenmeldung nicht hervor — die zeigt nur `promptTokens` und `completionTokens`.

**Zu klären:** ob der verwendete Modellknoten Caching überhaupt anfordert, ob `gpt-5.4` es unterstützt, und ob der Vorspann stabil genug ist (Caching greift nur, wenn der Anfang zeichengleich bleibt — ein Zeitstempel oder Ticketschlüssel weit vorn im Text zerstört den Effekt).

Das ist zuerst eine Lesearbeit an der Antwort eines echten Laufs, kein Umbau.

---

## 4. Jira-Ingest: der Lösungscache greift nicht, weil der Schlüssel fehlt

**Aufwand: ein Nachtrag per SQL plus eine Prüfung. Risiko: gering.**

Gemessen an Lauf `114844` vom 03.09., 18:00 Uhr, Ticket SSD-9110:

```
Solution-Cache Abgleich → aktion: "analyse", cache_grund: "kein_schluessel", loesung_llm_gespart: 0
Extract Solution With OpenAI → gpt-4.1-mini, 1.745 Eingabe + 260 Ausgabe Token
```

Das Ticket war seit dem 27.08. gelöst. Der Statuswechsel Erledigt → Geschlossen am 03.09. hat trotzdem eine **vollständige Neuextraktion** ausgelöst.

**Der Grund ist ein anderer als bisher notiert.** In `offene-punkte.md` stand die Vermutung, der Cache verfehle, weil der Lösungsschlüssel `status` und `resolution` enthält und sich beim Schließen ändert. Der Lauf sagt etwas anderes: `cache_grund: "kein_schluessel"` — der Chunk trägt **gar keinen** Schlüssel. Ein Cache, der nie gefüllt wurde, kann nicht treffen.

Nach dem Stand vom 03.09. haben **115 von 1.389** Lösungschunks einen Schlüssel. Die übrigen 1.274 lösen bei **jeder** Berührung eine Neuextraktion aus.

**Stand 04.09.: geprüft, SQL liegt vor, wartet auf Freigabe.**
Alles Folgende ist lesend an der Wissensbasis gemessen; geschrieben wurde nichts.

- 1.389 Lösungschunks, **115 mit Schlüssel, 1.274 ohne**. Alle 1.274 tragen `content_hash`, `status` und `resolution` in den Metadaten — der Schlüssel ist also rechnerisch ableitbar.
- **Gegenprobe:** Die Ableitung auf die 115 vorhandenen Schlüssel angewandt ergibt **115 von 115 exakte Treffer, null Abweichungen.** Die Formel ist damit an echten Daten belegt.
- Bei allen 1.274 stimmen `status`, `resolution` und `resolved_at` in den Metadaten mit dem überein, was im Chunktext wörtlich steht. Die Metadaten beschreiben denselben Stand wie der Text.
- Alle 1.389 stammen vom selben Modell und derselben Flow-Fassung. Beide Gruppen sind strukturell gleich — sechs Abschnitte in 100 Prozent der Fälle, Durchschnittslänge 821 gegen 818 Zeichen. Der Extraktions-Prompt wurde zwischen ihnen nicht geändert.
- Alle 1.274 Tickets sind auffindbar, Status und Resolution haben sich seither nicht bewegt; 1.264 sind bereits geschlossen.
- Probelauf: 1.274 Zeilen, 1.274 verschiedene Schlüssel, keine Kollision.

Eine Korrektur zur ersten Annahme: Die 1.274 sind **nicht** einfach „die älteren". Beide Gruppen überlappen zeitlich. Die 115 sind die, die seit Einführung der Cache-Logik einmal angefasst wurden.

Das vorbereitete SQL mit Probelauf, Nachweis und Rücknahme steht in [flows/rag-jira-ingest/loesungsschluessel-nachtrag.sql](flows/rag-jira-ingest/loesungsschluessel-nachtrag.sql). Es ändert ausschließlich zwei Schlüssel innerhalb von `metadata`; `chunk_text` und `embedding` bleiben unberührt.

**Danach:** messen, wie viele der abendlichen Läufe noch extrahieren. **Erst dann** entscheiden, ob Erledigt → Geschlossen den Chunk überhaupt neu erzeugen soll — möglicherweise erledigt sich die Frage von selbst.

**Größenordnung ehrlich:** Die abendliche Sammelschließung erzeugte am 03.09. **35 Ingest-Läufe in 40 Sekunden**, davon rund zehn mit 13 bis 15 Sekunden Laufzeit — das sind die mit Extraktion. Bei rund 2.000 Token je Extraktion auf `gpt-4.1-mini` ist das je Abend eine kleine Summe. Der Punkt steht hier nicht wegen des Betrags, sondern weil er billig zu beheben ist und die Zahl bei jedem Nachladen der Wissensbasis mitwächst.

---

## 5. Jedes Jira-Ereignis startet zwei bis drei Flows

**Aufwand: eine Messung, danach eine Entscheidung.**

Am 03.09.: **404 Läufe** im Jira-Ingest, **317** in der Feldpflege, dazu die Ticket-Ereignisse des Jira-Agenten. Dieselben Jira-Webhooks, drei Empfänger.

Die meisten enden früh — der Ingest-Lauf `115123` etwa nach vier Knoten und 0,5 Sekunden am `Filter Nur SSD`. Ein früh beendeter Lauf kostet keine Token.

Trotzdem gehört gemessen, **wie viele der 404 und 317 Läufe bis zu einem Modell durchlaufen**. Für die Feldpflege ist das ohnehin die offene Nachprüfung des am 03.09. eingebauten Filters: Läufe unter 100 ms mit `lastNodeExecuted: Maschinentickets aussortieren` sind die eingesparten. Die Zahl steht in `offene-punkte.md` als Beobachtungsauftrag.

Erst wenn feststeht, wie viele Ereignisse wirklich ein Modell erreichen, lohnt die Frage, ob der Jira-Webhook enger gefasst werden kann — etwa auf Ereignisarten statt auf alles.

---

## 6. Der Monitor-Flow scheitert alle 15 Minuten

**Aufwand: 15 Minuten Ansehen. Kostet keine Token, aber es ist der lauteste Abfall in der Instanz.**

`RWG Monitor - Microsoft Graph & Teams` (`1OcqfC4wTC9bj0wK`) endet bei **jedem** Lauf mit Fehler und zieht jedes Mal `Telegram_Error_Info` hinterher. In den vorgehaltenen Ausführungen: 43 gescheiterte Läufe, davon 33 allein zwischen dem 03.09. abends und dem 04.09. früh, im 15-Minuten-Takt.

Der Flow hat keinen Export im Repo und keine Beschreibung. Zu klären: Wird er noch gebraucht? Wenn ja, reparieren; wenn nein, abschalten. Solange er läuft, verrauscht er die Fehlermeldungen, in denen echte Störungen stehen sollten.

---

## 7. Content Studio: die fünf offenen Entscheidungen

**Kein Aufwand für mich, sondern Entscheidungen.**

Aus dem [Auftrag](flows/kapa-content-studio/auftrag-content-studio.md), Abschnitt 6:

1. Bildqualität `medium` oder `low` — der einzige Tokenhebel am Bild, bei drei Bildern je Woche.
2. LinkedIn-Format 1:1 oder 1,91:1.
3. Ob COPY weiterhin Instagram- und Facebook-Texte schreibt, obwohl beide Kanäle ruhen. Sie stecken in derselben Modellantwort, kosten also nur Ausgabetoken — bei drei Läufen je Woche wenig. Es ist eher eine Frage der Sauberkeit als der Kosten.
4. Quellen von WF-1: 14 von 22 Auslösern sind Herstellerpresse. Das ist der Grund, warum der Ankerfilter so viel aussortiert — kein Kostenpunkt, aber der Grund für leere Läufe.
5. Kandidatenschleife (A4) erst nach der Messung.

Der Videostrang und drei Bildformate sind am 03.09. entfallen; der Ankerfilter verhindert Modellaufrufe für Themen, die die eigene Prüfung nicht bestehen können.

---

## 8. Personendaten im Modellkontext

**Keine Kostenfrage. Gehört trotzdem in dieselbe Betrachtung, weil dieselben Chunks gemeint sind.**

Die Bildanalyse-Chunks des Jira-Ingest enthalten, was auf dem Screenshot stand. Im gemessenen Lauf war das die Mitgliederliste eines Mailverteilers: zehn Namen mit dienstlichen E-Mail-Adressen, als Kandidat an `gpt-5.4` geschickt.

Das ist gewollt gewesen — Screenshots sollen durchsuchbar sein. Ob sie auch als Trefferkandidaten an ein Modell gehen sollen, ist eine eigene Entscheidung. Punkt 1 würde sie nebenbei aus der Kandidatenliste nehmen; das wäre dann kein Zufall, sondern sollte bewusst so festgehalten werden.

---

## 9. SharePoint-OCR: der Rückstand ist der Kostentreiber

**Erst nach Punkt 0 zu bewerten.**

`RAG - SharePoint Ingest` lief in der Nacht zum 04.09. zwischen 01:30 und 01:44 in **14 Teilläufen** von 10 bis 50 Sekunden. Jeder davon kann eine Mistral-OCR-Verarbeitung sein. Nach `offene-punkte.md` steht ein Rückstand von rund **356 Dateien**.

Mistral-OCR rechnet nach Seiten, nicht nach Token — in keiner Tokenmessung sichtbar, aber möglicherweise der größte Posten der Nachtrechnung. Ohne Punkt 0 ist das nicht zu entscheiden.

Bereits vorhanden: [konzept-ocr-schonen.md](konzept-ocr-schonen.md).

---

## 10. Kleinigkeit: Zeitzone ausdrücklich setzen

**Fünf Minuten. Keine Kostenwirkung, aber eine Korrektur.**

Ich habe am 03.09. notiert, das Setzen der Workflow-Zeitzone könne die Auslösezeit verschieben, falls die Instanz auf UTC steht. **Das ist widerlegt.** Gemessen an zwei Flows:

- Content Studio, Cron `0 8 * * 1,3,4` → feuerte am 03.09. um **06:00 UTC**
- KI Daily Analyze, Cron `20 6 * * 1,3,5` → feuerte am 04.09. um **04:20 UTC**

Beide entsprechen 08:00 und 06:20 **Ortszeit**. Die Instanz steht also bereits auf `Europe/Berlin`. Die Zeitzone im Workflow ausdrücklich zu setzen ist damit wirkungsfrei und gefahrlos — sie schützt nur davor, dass eine spätere Änderung der Instanzvorgabe die Flows still verschiebt.

---

## Was schon erledigt ist

Damit die Liste nicht suggeriert, es sei nichts passiert:

| Wann | Was | Wirkung |
|---|---|---|
| 03.09. | Feldpflege: Maschinentickets als nativer Filter am Eingang, Sammelfenster, keine Bewertung bei Done-Status | verhindert `gpt-4o`-Aufrufe, Wirkung noch nachzumessen |
| 03.09. | Content Studio: Videostrang entfernt | ein `gpt-4o-mini`-Aufruf je Lauf, auch vor jeder Ablehnung |
| 03.09. | Content Studio: Ankerfilter vor der Themenwahl | kein Modellaufruf für Themen, die die eigene Prüfung nicht bestehen können |
| 02.09. | Contract Loader auf `mistral-medium` | Beleg mit echter neuer Datei steht noch aus |

## Reihenfolge, wenn nichts dazwischenkommt

**Punkt 0** (Abrechnung ansehen) → **Punkt 3** (Caching prüfen, weil es ohne inhaltliche Änderung wirkt) → **Punkt 1** (Trefferliste) → **Punkt 4** (Schlüssel nachtragen) → **Punkt 2** (Systemtext) → der Rest nach Lage.

Punkt 6 (Monitor-Flow) dazwischen, sobald jemand 15 Minuten hat — er blockiert nichts, aber er verdeckt echte Fehler.
