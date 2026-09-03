# RWG_Jira-Feldpflege — OpenAI-Kosten senken, Abschluss

**Workflow:** RWG_Jira-Feldpflege — `k4SmnNrz7ASMdFwk`
**Link:** https://n8n.srv1307521.hstgr.cloud/workflow/k4SmnNrz7ASMdFwk
**Stand:** 03.09.2026, spät abends — Bauphase abgeschlossen
**Umfang:** ausschließlich dieser Flow.

Der aktuelle Aufbau steht in der [README](README.md). Hier steht, was aus dem Auftrag wurde, was bei der Umsetzung gelernt wurde und was noch zu beobachten ist.

---

## 0. Einstieg in drei Sätzen

**Alles ist live**, aktive Version `8796340b`: Signaturbereinigung, Sammelfenster mit Anspruch je Ticket, und zwei Klassen werden gar nicht mehr bewertet — Maschinentickets und Tickets in einem Done-Status. Die Bauphase ist damit beendet; offen ist nur noch M-3, und der lohnt sich erst, wenn die Messung nach einer Woche es hergibt.

**Erster Arbeitsschritt der nächsten Sitzung:** nicht bauen, sondern messen (Abschnitt 4).

---

## 1. Was aus dem Auftrag wurde

| Maßnahme | Ergebnisneutral | Zustand |
|---|---|---|
| **M-5 Signaturbereinigung** | ja | live, an echten Texten belegt |
| **M-2 Sammelfenster** | ja | live, belegt (114915/114916) |
| **Maschinentickets nicht bewerten** | **nein — Entscheidung Sebastian** | live, belegt (114932) |
| **Tickets in Done-Status nicht bewerten** | **nein — Entscheidung Sebastian** | live, belegt (114932) |
| **Zeile bei Abschluss austragen** | ja | live, belegt (114925, 114932) |
| **M-1 Autorenfilter** | — | entfällt, war im Bestand |
| **M-3 Inhaltshash** | ja | offen, Tabelle vorbereitet |

Die beiden nicht neutralen Punkte sind bewusst so entschieden: Maschinentickets haben keine fachlich verwertbare Einstufung, und ein abgeschlossenes Ticket braucht keine mehr. Das Abbruchkriterium aus Abschnitt 10 der großen Übergabe gilt für diese beiden Klassen nicht mehr — für alle übrigen Tickets unverändert.

---

## 2. Was bei der Umsetzung gelernt wurde

**Erledigt → Geschlossen erreicht die Feldpflege nie.** Eine Automatisierung schließt jeden Abend um 18:00 alle erledigten Tickets in einem Schwung (34 am 03.09.). Der Trigger filtert auf `statusCategory != Done` — null Läufe in diesem Fenster. Der Übergang **nach** Erledigt kommt dagegen an, meist als abschließender Kommentar (SSD-9240, Lauf 114800), und wurde bis heute mit vollem Modellaufruf bewertet.

**Bei Kommentarereignissen liefert Jira weder `reporter` noch `creator` mit.** Nur `summary`, `issuetype`, `project`, `assignee`, `priority`, `status`. Der Maschinenfilter greift bei Kommentaren deshalb nur über die Zusammenfassung. Gefunden an der echten Nutzlast von Lauf 114800 — ohne diesen Blick wäre die Konto-Prüfung bei Kommentaren stillschweigend wirkungslos gewesen.

**Der Ingest-Filter trifft „Siemensring".** `Filter Automated Ticket Creator` prüft `siem` ohne Wortgrenze. Die Feldpflege verwendet dieselbe Regel mit `\bsiem\b`; der Ingest sollte nachziehen — steht in `offene-punkte.md`.

**Drei Korrekturen an der großen Übergabe:** Die Postgres-Credential `uEE8k2oPVj4Tnb4b` existiert nicht mehr (es gibt nur `awcN6ePCJHieBrzb`). Das Anspruchs-Statement hätte bei `claimed_until = NULL` nie gegriffen. Der Postgres-Node liefert bei null Zeilen eines INSERT … RETURNING `{ success: true }`, kein leeres Ergebnis — bei einem CTE mit SELECT dagegen leer. Beides fängt `Anspruch erhalten?` ab.

**n8n arbeitet parallele Zweige nacheinander ab**, und ein Fehler im ersten beendet den Lauf vor dem zweiten. Für mehrere Testfälle in einem Lauf müssen die fehlerfreien Zweige vorn liegen.

---

## 3. Belege

| Lauf | Was | Ergebnis |
|---|---|---|
| 114915 | Anspruch, 4 Minuten warten, Kandidat weitergereicht | bestanden |
| 114916 | zweiter Lauf im Schwarm | endet nach 38 ms am IF |
| 114925 | Zeile bei Abschluss ausgetragen | `zeilenEntfernt: 1` |
| 114930 | Zeile bleibt sonst | `zeilenEntfernt: 0` |
| 114932 | Monitoring verworfen, Abschluss trägt Zeile aus und endet, normales Ticket beansprucht und wartet | alle drei Zweige wie entworfen |

Dazu elf lokale Fälle in [m2-entwurf/probe_ereignis.js](m2-entwurf/probe_ereignis.js) gegen den Code, wie er im Node steht — darunter die echte Nutzlast aus 114800 und der Siemensring-Fall.

**Noch nicht belegt:** ein Schwarm aus echten Jira-Ereignissen. Alle Probeläufe kamen über einen manuellen Auslöser.

---

## 4. Messung in einer Woche

Am 10.09. gegen die Ausgangsmessung vergleichen — Referenzwerte: Median Prompt 2.668 Tokens, Anteil `no_change` 91 Prozent, Modellquote 58 Prozent, rund 240 Läufe pro Tag.

Worauf zu achten ist:

- **Läufe unter 100 ms** mit `lastNodeExecuted: Ticketereignis pruefen` oder `Anspruch erhalten?` — das sind die vermiedenen Aufrufe, nach Klasse getrennt sichtbar.
- **`bereinigung.verworfen`** am Node `Ticketkontext aufbereiten` — deutlich über null heißt, die Signaturmuster greifen nicht.
- **`jira_feldpflege_state`** sollte nur Tickets in Bearbeitung enthalten.
- **Zehn Tickets mit Feldänderung**: ist die Einstufung dieselbe wie vorher? Gilt für alle Tickets außer den zwei ausgeschlossenen Klassen.
- **Die OpenAI-Nutzungsseite nach Modell**, vorher und nachher. Die einzige Zahl, die zeigt, ob die Feldpflege oder der Jira-Agent der größere Posten war.

---

## 5. Was danach noch möglich wäre

**M-3 Inhaltshash** — nur, wenn die Feldpflege nach der Woche noch dominiert. Tabelle und Spalten sind da, M-5 ist final, solange die Grenzen 40/120 stehen. Schattenlauf über mindestens 20 Ereignisse bleibt Voraussetzung.

**Jira-Agent** — als Kostenthema abgehakt: rund 36.500 Tokens je Lauf auf gpt-5.4, aber die Struktur ist knapp und die Evidenz wird gebraucht. Die Fehlläufe sind Jira-Schreibfehler nach der Modellarbeit und ein Qualitätsthema (404-Punkt in `offene-punkte.md`).

**Jira-Ingest** — beide Caches arbeiten und wärmen sich von selbst. Ein Befund liegt vor: Die Sammelschließung um 18:00 entwertet den Lösungscache, weil `status` im Schlüssel steht. Steht in `offene-punkte.md`, Sprengweite 115 Chunks.
