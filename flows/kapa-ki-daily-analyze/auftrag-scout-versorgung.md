# Auftrag — Business Scout wieder mit Material versorgen

**Flow:** KI Daily - Analyze & Deliver [WF-2] — `objM2PQrcTpEzik7`
**Link:** https://n8n.srv1307521.hstgr.cloud/workflow/objM2PQrcTpEzik7
**Mitbetroffen:** Content Studio [WF-3] `bBBybznNNCnU2nOJ` (verbraucht die Use Cases), KI Daily - Collect [WF-1] `mzSLn4WzFQSv0cuX` (liefert die Meldungen)
**Aufgenommen:** 04.09.2026.
**Stand:** A1 und A2 sind am 04.09.2026 publiziert (`c12ddfb3`, Rueckfallpunkt `57e371ca`). Die sechs Handwerk-Use-Cases sind angelegt. A3 und A4 stehen aus. Der erste Lauf mit den Aenderungen ist **Montag, 07.09.2026, 06:20**.

---

## 0. Der Befund in vier Saetzen

Der Business Scout schreibt seit dem 20.08.2026 praktisch keine Use Cases mehr. Er ist nicht defekt und meldet auch keinen Fehler — er bekommt schlicht kein brauchbares Material. Seit einer Aenderung im Flow sieht er nur noch die fuenf Meldungen, die die **Redaktion** fuer den Newsletter ausgewaehlt hat, statt wie vorher den Rohpool. Die Redaktion waehlt nach Nachrichtenwert aus, der Scout braucht beschriebene Arbeitsschritte — zwei verschiedene Massstaebe.

**Das Content Studio arbeitet dadurch seit zwei Wochen auf Altbestand.**

---

## 1. Wie es gemessen wurde

Alles lesend, am 04.09.2026.

### 1.1 Die Versorgung ist versiegt

| Zeitraum | neue Use Cases |
|---|---|
| 10.08. bis 20.08. | taeglich 4 bis 12 |
| **21.08. bis 03.09.** | **null, vierzehn Tage** |
| 04.09. | 2, Saeule `fertigung` |

Die 43 offenen Use Cases im Pool stammen saemtlich aus der Zeit vor dem 20.08.

### 1.2 Es liegt nicht an den Quellen

In denselben 30 Tagen, aus `news_memory`:

| Quelle | Beitraege | Score-Schnitt | ab 7 | zuletzt |
|---|---|---|---|---|
| konstruktionspraxis.vogel.de | 86 | 9,2 | 86 | 04.09. |
| maschinenmarkt.vogel.de | 82 | 9,1 | 82 | 04.09. |
| **handwerksblatt.de** | **39** | **9,4** | **39** | **04.09.** |
| heise.de | 25 | 8,3 | 25 | 04.09. |

**549 unberichtete Meldungen mit Score ab 7** liegen bereit, 228 davon aus den letzten 14 Tagen. Handwerksblatt ist die beste Quelle im ganzen Bestand — und aus 39 Beitraegen wurde **ein** Use Case.

### 1.3 Es liegt nicht an der Redaktion

Die Redaktion laeuft lueckenlos: An jedem Lauftag vom 21.08. bis 04.09. wurden Meldungen als berichtet markiert, taeglich drei bis sieben, Score-Schnitt 7 bis 10.

### 1.4 Es liegt nicht an einem Fehler

Gemessen am Lauf `113285` vom 02.09.:

- `Redaktionsauswahl aufbereiten` gab **5 Kandidaten** aus, `dropped` war leer. Der Knoten arbeitet sauber.
- `Business Scout` lief, 1.219 Eingabe- und **5 Ausgabetoken**. Die Rohausgabe war `[]` — sauberes JSON.
- `use_cases aufbereiten` gab null Zeilen aus, `use_cases schreiben` wurde nicht angesteuert.

**Das Modell hat korrekt entschieden.** Seine fuenf Kandidaten waren: ein Fraunhofer-Forschungsprojekt zur Kunststoffsortierung, ein allgemeiner Datenartikel, eine Siemens-Meldung zur EU-Regulierung, ein BDE/ERP-Anbieterbeitrag und ein Magazinstueck „KI im Mittelstand". Daraus laesst sich kein Anwendungsfall fuer einen Handwerksbetrieb bauen.

### 1.5 Die Ursache steht im Flow selbst

Kommentar im Knoten `Redaktionsauswahl aufbereiten`:

> Nur die redaktionell ausgewaehlten Meldungen gehen weiter in Business- und Marketing-Scout. **Vorher liefen beide Scouts auf dem ungefilterten Top-40-Rohpool** und ignorierten die Redaktion. Zusaetzlich greift hier die Blocklist.

Die Aenderung war gut gemeint und hat zwei richtige Dinge gebracht: die Blocklist greift jetzt, und die Scouts ignorieren die Redaktion nicht mehr. Sie hat aber die Menge von 40 auf 5 gesenkt und dabei den Massstab gewechselt — von „was koennte ein Anwendungsfall sein" auf „was ist heute eine Nachricht".

---

## 2. Zwei stille Stellen, die unabhaengig davon zu haerten sind

Sie sind **nicht** die Ursache — beide wurden geprueft und arbeiteten korrekt. Sie haetten die Suche aber verschleiert, wenn sie zugeschlagen haetten, und sie werden es beim naechsten Mal:

**`use_cases aufbereiten`, Zeile 2:**

```js
try { arr = JSON.parse(...) } catch(e) { arr = []; }
```

Ein Parserfehler wird verschluckt. Der Lauf ist gruen, die Ausgabe leer, niemand erfaehrt es.

**`use_cases aufbereiten`, `istGenerisch()`:** verwirft Namen unter zwoelf Zeichen und aus einer Sperrliste — ebenfalls ohne Spur.

In beiden Faellen sieht das Ergebnis identisch aus zu „das Modell fand nichts". Genau deshalb ist die Trockenzeit zwei Wochen unbemerkt geblieben.

---

## 3. Arbeitspakete

### A1 — Sichtbarkeit zuerst, vor jeder Aenderung an der Auswahl

**Ohne dieses Paket ist jede Wirkung der uebrigen nicht messbar.**

`use_cases aufbereiten` gibt kuenftig immer **eine Bilanzzeile** aus, auch wenn nichts entsteht: wie viele Kandidaten hereinkamen, ob die Modellausgabe geparst werden konnte, wie viele Vorschlaege kamen, wie viele als generisch verworfen wurden, wie viele geschrieben werden. Dieselbe Bauart wie `Nachzuegler Bilanz` im Jira-Agenten.

**Vorsicht:** `use_cases schreiben` haengt direkt daran. Eine Bilanzzeile darf nicht als Use Case in der Tabelle landen — entweder ein eigener Ausgang oder ein Feld, auf das der Supabase-Knoten filtert. Das ist der einzige Fallstrick in diesem Paket.

**Abnahme:** Ein Lauf ohne Ergebnis hinterlaesst eine lesbare Zeile, und in `use_cases` steht danach nichts Neues.

### A2 — Den Scout wieder breiter versorgen

**Der eigentliche Hebel.** Der Scout bekommt kuenftig nicht nur die fuenf redaktionellen Treffer, sondern zusaetzlich die naechstbesten Kandidaten aus demselben Lauf — blocklistgeprueft, wie es der Knoten heute schon fuer die fuenf tut.

Offen und vor dem Bau zu entscheiden: **wie viele.** Vorher waren es 40 und es entstanden 4 bis 12 Use Cases taeglich, allerdings ohne Blocklist. Vorschlag: mit 20 beginnen und an der Bilanz aus A1 ablesen, ob das reicht.

**Was ausdruecklich erhalten bleibt:** Die Blocklist gilt fuer alle, nicht nur fuer die fuenf. Und die redaktionell ausgewaehlten Meldungen bleiben im Material — die Aenderung vom August wird ergaenzt, nicht rueckgaengig gemacht.

**Abnahme:** Ein Lauf erzeugt wieder Use Cases. Die Bilanz zeigt, wie viele Kandidaten hereinkamen und wie viele davon taugten.

### A3 — Den Massstab des Scouts an die Themenwahl angleichen

Das Content Studio verlangt seit dem 03.09. einen **Anker**: ein benanntes Dokument oder einen benannten Arbeitsschritt. Ein Use Case ohne Anker wird dort aussortiert und war umsonst erzeugt.

Der Scout-Prompt kennt diese Anforderung nicht. Er sollte sie kennen — dann entstehen Use Cases, die die spaetere Pruefung auch bestehen.

**Messbar:** Anteil neuer Use Cases mit Anker, vorher gegen nachher. Die Ankerliste steht in `Redaktionsregeln` im Content Studio.

### A4 — Handwerk gezielt fuellen

Auch mit A2 bleibt `handwerk` die duennste Saeule. Handwerksblatt liefert 39 Beitraege mit Score 9,4 — das Material ist da, es wird nur nicht zu Use Cases.

Zu pruefen, wenn A2 laeuft: ob die Handwerksbeitraege es ueberhaupt in die erweiterte Kandidatenliste schaffen oder ob sie vorher am Score-Ranking scheitern.

**Sofortmassnahme unabhaengig davon:** die sechs von Hand geschriebenen Use Cases aus `flows/kapa-content-studio/entwurf/handwerk_use_cases.json`. Sie ueberbruecken, bis A2 wirkt.

---

## 4. Reihenfolge und Abnahme

1. ~~**Sechs Handwerk-Use-Cases anlegen**~~ — **erledigt am 04.09.**, Lauf `115642`. Pruefsummen Feld fuer Feld gegen die gepruefte Datei: alle sechs byte-identisch.
2. ~~**A1, Bilanz**~~ — **publiziert am 04.09.** Lokal an fuenf Faellen geprueft, der Filter an einem Wegwerfflow nachgewiesen.
3. ~~**A2, breitere Versorgung**~~ — **publiziert am 04.09.**, 20 Kandidaten. `payload` fuer den Marketing Scout zeichengleich zur Altfassung.
4. **Montag, 07.09., 06:20: den ersten Lauf lesen.** Die Bilanzzeile beantwortet in einem Zug beide Fragen — wie viele Kandidaten ankamen und wie viele Use Cases daraus wurden.
5. **A3, Ankerregel im Prompt** — erst wenn wieder Use Cases entstehen, sonst misst man nichts.
6. **A4, Handwerk** — nach zwei Laeufen mit A2.

**Abweichung vom eigenen Grundsatz, offengelegt:** Oben steht "ein Paket je Publish, jedes erst nach einem Lauf mit Beleg". A1 und A2 sind zusammen publiziert worden. Grund: WF-2 laeuft nur Mo/Mi/Fr, getrennte Publishes haetten eine Woche gekostet, und die Bilanzzeile aus A1 macht die Wirkung von A2 im ersten Lauf lesbar. Das Risiko ist gering, weil A1 nachweislich nicht beeinflusst, wie viele Use Cases entstehen — die Gegenprobe gegen die Altfassung liegt vor.

**Nicht anfassen, bevor A1 und A2 gewirkt haben:** neue Quellen. Die Kammer-Idee in `ideen.md` fuellt ein Rohr, das weiter unten verstopft ist — Handwerksblatt beweist das mit 39 Beitraegen und einem Use Case.

**Publiziert wird einzeln**, ein Paket je Publish, und jedes erst nach einem Lauf mit Beleg. Das Content Studio verbraucht diese Daten und postet daraus unter dem Firmennamen.

---

## 5. Was offen bleibt und entschieden werden muss

1. **Wie viele Kandidaten** bekommt der Scout in A2? Vorschlag 20, vorher 40, heute 5.
2. **Soll die Redaktion weiter den Vortritt haben** — also ihre fuenf zuerst und der Rest danach, oder alle gleichrangig nach Score?
3. **Der Takt.** Bis zum 20.08. entstanden taeglich Use Cases, WF-2 laeuft heute Mo/Mi/Fr. Drei Laeufe die Woche bei drei Posttagen ist knapp, wenn nicht jeder Lauf etwas liefert.
