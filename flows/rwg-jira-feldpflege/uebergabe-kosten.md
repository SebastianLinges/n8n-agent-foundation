# RWG_Jira-Feldpflege — OpenAI-Kosten senken, Fortschreibung

**Workflow:** RWG_Jira-Feldpflege — `k4SmnNrz7ASMdFwk`
**Link:** https://n8n.srv1307521.hstgr.cloud/workflow/k4SmnNrz7ASMdFwk
**Stand:** 03.09.2026, abends
**Umfang:** ausschließlich dieser Flow.

Diese Datei schreibt die große Übergabe zum Thema fort. Der aktuelle Aufbau steht in der [README](README.md); hier steht nur, was noch offen ist und was bei der Umsetzung gelernt wurde.

---

## 0. Einstieg in drei Sätzen

**M-5 und M-2 sind live**, aktive Version `2cdcd5a6`: Signaturbereinigung, Sammelfenster mit Anspruch je Ticket, und die Zeile in `jira_feldpflege_state` verschwindet, sobald das Ticket in einem Done-Status ist. Offen bleiben der Monitoring-Filter und M-3.

**Erster Arbeitsschritt:** Die ersten echten Schwärme ansehen — Läufe unter 100 ms mit `lastNodeExecuted: Anspruch erhalten?` sind die eingesparten Aufrufe. Das ist der einzige Beleg, der noch fehlt: die Probeläufe kamen über einen manuellen Auslöser, nicht über den Jira-Trigger.

---

## 1. Stand der Maßnahmen

| Maßnahme | Zustand |
|---|---|
| **M-5 Signaturbereinigung** | live, an echten Texten belegt |
| **M-2 Sammelfenster** | live, belegt in den Läufen 114915/114916 (Anspruch, Warten, zweiter Lauf endet nach 38 ms) |
| **Zeile bei Abschluss entfernen** | live, belegt in 114925 (Ja-Fall, `zeilenEntfernt: 1`) und 114930 (Nein-Fall, `zeilenEntfernt: 0`) |
| **Monitoring-Filter** | offen, Erkennungsmerkmal bekannt (Abschnitt 3) |
| **M-3 Inhaltshash** | offen, die Tabelle trägt die Spalten dafür schon |
| **M-1 Autorenfilter** | entfällt, im Bestand bereits gebaut |

---

## 2. Was bei der Umsetzung gelernt wurde

**Erledigt → Geschlossen erreicht die Feldpflege nie.** Der Trigger filtert auf `statusCategory != Done`, und eine Automatisierung schließt jeden Abend um 18:00 alle erledigten Tickets in einem Schwung (34 Stück am 03.09.). Gemessen: null Läufe der Feldpflege in diesem Fenster. Der Wunsch, beim Archivieren nichts zu tun, war damit von vornherein erfüllt — nur eine Zeile ließ sich an diesem Ereignis nicht löschen. Deshalb greift die Entfernung beim letzten Ereignis, das der Workflow sieht: dem, bei dem das Ticket bereits in einem Done-Status steht.

**Der Übergang nach Erledigt kommt dagegen an** (SSD-9240, Lauf 114800) — meist als abschließender Kommentar, und die Feldpflege bewertet ihn mit vollem Modellaufruf. Im gemessenen Fall `no_change`. Die Bewertung bei diesem Ereignis abzuschalten wäre ein weiterer Hebel, aber **nicht ergebnisneutral**: der abschließende Kommentar trägt oft die beste Evidenz für die endgültige Einstufung. Nicht umgesetzt, nicht entschieden.

**Drei Korrekturen an der großen Übergabe:**

1. Die Postgres-Credential `uEE8k2oPVj4Tnb4b` existiert nicht mehr. Es gibt genau eine, `awcN6ePCJHieBrzb`.
2. Das Anspruchs-Statement der Übergabe hätte bei `claimed_until = NULL` nie gegriffen. Die Bedingung lautet `claimed_until IS NULL OR claimed_until < now()`.
3. Der Postgres-Node liefert bei null Zeilen `{ success: true }`, kein leeres Ergebnis. Deshalb das IF hinter dem Anspruch — und deshalb ist die Zeilenentfernung als ein Statement gebaut, das immer genau eine Zeile zurückgibt, statt als Verzweigung.

**n8n arbeitet parallele Zweige nacheinander ab.** Zwei Probezweige an einem manuellen Auslöser laufen nicht gleichzeitig; der erste läuft bis zum Ende, ein Fehler dort beendet den Lauf, bevor der zweite beginnt. Für zwei Testfälle braucht es zwei Läufe.

---

## 3. Monitoring-Filter — Erkennungsmerkmal gefunden

Der Node `Filter Automated Ticket Creator` in `RAG-JIRA-Ingest` (`ESVtaoyTfaP3jm2G`) prüft im Betrieb Reporter und Ersteller gegen drei Konto-IDs, die Token `rwg_automate`, `rwg.automate`, `managed.monitoring`, `defender-noreply`, `defender`, das Summary-Präfix `[Managed | Monitoring]` und die Muster `intune-checker`, `snipe-checker`, `bericht zu kritischen events`, `aufgabenwarteschlangenprotokoll`, `siem`, `new vulnerabilities notification`. Erprobt.

Er gehört in `Ticketereignis pruefen` direkt hinter `IGNORIERTE_KONTEN`; der Webhook liefert Reporter und Summary mit. Kein neuer Node.

**Noch offen:** ob „Automate" heißt, dass auch Tickets mit RWG.Automate als Reporter übersprungen werden. Der Filter ist **nicht ergebnisneutral**, der Volumenanteil ist nicht gemessen — aus der Sammelschließung vom 03.09. lässt er sich abschätzen: von 34 geschlossenen Tickets trugen 19 ein Monitoring- oder Defender-Muster.

---

## 4. M-3 Inhaltshash

Die Tabelle trägt `content_hash`, `last_evaluated_at`, `last_level`, `last_priority` bereits. M-5 ist final, solange die Zeichengrenzen 40/120 stehen. Schattenlauf über mindestens 20 Ereignisse bleibt Voraussetzung. Zu beachten: Die Zeile wird bei Abschluss gelöscht — ein wiedereröffnetes Ticket wird einmal neu bewertet, das ist gewollt.

---

## 5. Reihenfolge für die nächste Sitzung

1. **Erste echte Schwärme ansehen** — Läufe unter 100 ms am IF, `zeilenEntfernt` bei Abschlussereignissen, Tabelle nur mit Tickets in Bearbeitung.
2. **Monitoring-Filter:** die Automate-Frage klären, dann bauen.
3. Danach M-3 mit Schattenlauf.

Eine Woche nach dem 03.09. gegen die Ausgangsmessung vergleichen: Median Prompt 2.668 Tokens, Anteil `no_change` 91 Prozent, Modellquote 58 Prozent, rund 240 Läufe pro Tag.
