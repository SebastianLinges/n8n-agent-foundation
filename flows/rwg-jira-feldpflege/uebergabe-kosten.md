# RWG_Jira-Feldpflege — OpenAI-Kosten senken, Fortschreibung

**Workflow:** RWG_Jira-Feldpflege — `k4SmnNrz7ASMdFwk`
**Link:** https://n8n.srv1307521.hstgr.cloud/workflow/k4SmnNrz7ASMdFwk
**Stand:** 03.09.2026
**Umfang:** ausschließlich dieser Flow.

Diese Datei schreibt die große Übergabe zum Thema fort. Auftrag, Messergebnisse und Rahmenbedingungen (Abschnitte 1 bis 6 dort) gelten weiter, mit den unten vermerkten Korrekturen.

---

## 0. Einstieg in drei Sätzen

**M-5 ist live.** Aktive Version `0337d1c6`, publiziert am 03.09.2026. Offen sind der Monitoring-Filter, M-2 und das daran hängende M-3.

**Erster Arbeitsschritt:** Die ersten Produktivläufe ansehen — `result.bereinigung` am Node `Ticketkontext aufbereiten` und die Prompt-Tokens am Modellaufruf.

---

## 1. Gefallene Entscheidungen

| Punkt | Entscheidung | Zustand |
|---|---|---|
| **M-5 Sicherung** | absolute Zeichengrenze statt Anteil | **live** |
| **PRTG** | kein Textmuster, sondern Bewertung ganz überspringen bei Monitoring- und Automate-Tickets | offen |
| **Sammelfenster** | 4 Minuten, Timeout bleibt 300 s | offen |
| **M-1 Autorenfilter** | entfällt, im Bestand bereits gebaut | erledigt |

---

## 2. M-5 Signaturbereinigung — live

Geändert ist genau ein Node: `Ticketkontext aufbereiten`. Keine neuen Nodes, keine Verbindungsänderungen, keine Einstellungsänderungen. Was der Code tut und warum die Grenzen so gewählt sind, steht in der [README](README.md) unter „Was das Modell zu sehen bekommt" — dort ist der aktuelle Stand, hier nur der Weg dorthin.

### Was belegt ist

**An echten Texten gemessen** (SSD-9212, über die Jira-API geholt, Bereinigung ausgeführt mit dem Code, der aus n8n zurückgelesen wurde):

| Text | roh | neu | Wirkung |
|---|---|---|---|
| Beschreibung | 294 | 46 | bereinigt |
| Kommentar 60811 | 328 | 80 | bereinigt |
| Kommentar 60805, Rueckfrage | 188 | 157 | bereinigt |
| Kommentar 60814, kurz | 115 | 84 | bereinigt |
| Kommentar 60818, Befund | 482 | 482 | unverändert |
| **Summe** | **1.407** | **849** | **40 % weniger Zeichen** |

Vier von vier Signaturfällen bereinigt, keiner verworfen, der fachliche Befundkommentar unangetastet. Damit ist die Kritik aus Abschnitt 6.4 der großen Übergabe erledigt — die dortige Tabelle galt für die verworfene Schwelle 0,5 und ist hinfällig.

*Einschränkung:* Die Texte kamen als Markdown aus der Jira-API, der Node bekommt ADF und wandelt mit `adfText`. Die Zeilenstruktur ist gleichwertig, die Zeichenzahlen können um wenige Zeichen abweichen.

**Übertragung geprüft:** Nach dem `update_workflow` frisch abgerufen und gegen die Referenzdatei gediffed — byte-identisch. `node --check` auf dem zurückgelesenen Code sauber, der Prüfstand über sieben Fälle grün.

**Der offene Diff aus Abschnitt 7.4 ist geschlossen:** Der Entwurf vom 02.09. enthielt genau die Passage aus Abschnitt 7.3, `\\?\\?` in der `KONTAKT`-Regex intakt. Und die aktive Version war byte-identisch zum Repo-Export — der Ausgangsstand war belastbar.

### Was nicht belegt ist

**Es gab keinen n8n-Testlauf vor dem Publizieren.** Der Code ist statisch geprüft und an echten Texten gerechnet, aber der Node ist nie mit echten Ticketdaten durch n8n gelaufen. Die ersten Produktivläufe sind der Test. Bewusst so entschieden.

**Worauf zu achten ist:** `result.bereinigung` am Node `Ticketkontext aufbereiten`. Steht dort `verworfen` deutlich über null, greifen die Muster nicht wie gedacht. Und ob eine Einstufung von der bisherigen abweicht — das Abbruchkriterium aus Abschnitt 10 gilt unverändert.

### Werkzeug

In [m5-entwurf/](m5-entwurf/) liegen die Referenzfassung, die Ausgangsversion, der Patch mit Ankerprüfung und der Prüfstand `probe.js`. Er schneidet den M-5-Block aus dem Node heraus, statt ihn abzuschreiben — wer die Grenzen ändert, prüft damit gegen den echten Code.

Der Lauf über die echten SSD-9212-Texte war einmalig und liegt **nicht** im Repo: die Testdatei enthielt eine vollständige Signatur mit Name, Dienstanschrift, Telefonnummer und E-Mail. Das Ergebnis steht in der Tabelle oben, wiederholen lässt er sich jederzeit über die Jira-API.

---

## 3. Monitoring-Filter — Stelle steht, zwei Angaben fehlen

Er gehört **in den bestehenden Node `Ticketereignis pruefen`**, direkt hinter die Prüfung auf `IGNORIERTE_KONTEN`. Der Webhook liefert dort bereits `e.issue`, es braucht keinen neuen Node und keine Verbindungsänderung — und damit auch keine Berührung mit dem unzuverlässigen `sourceOutput`. Der Lauf endet vor `Ticketdaten laden`, spart also auch den Jira-Aufruf.

**Was fehlt und nicht zu raten ist:**

1. **Woran ein Monitoring-Ticket sicher zu erkennen ist.** Die accountId der Monitoring-Mailbox als Reporter, der Request Type, oder ob das Summary-Präfix `[Managed | Monitoring]` stabil ist. Ein Textmuster auf der Beschreibung scheidet laut Auftrag aus.
2. **Was „Automate" heißen soll.** Ereignisse *durch* RWG.Automate und Automation for Jira werden bereits verworfen. Neu wäre, Tickets zu überspringen, deren **Reporter** eines dieser Konten ist — also auch dann, wenn ein Mensch darauf kommentiert.

**Nicht ergebnisneutral, ausdrücklich so entschieden.** Ein PRTG-Ticket, das heute nach einem menschlichen Kommentar hochgestuft würde, bliebe danach unbewertet. Der Volumenanteil ist **nicht gemessen** — er lässt sich über `search_executions` zählen.

---

## 4. M-2 Anspruch und Sammelfenster — 4 Minuten

Anspruchsfenster und Wait-Dauer bekommen dieselbe Konstante von 4 Minuten aus einer Stelle. Der Execution-Timeout bleibt bei 300 s, es ist keine Einstellungsänderung nötig und der Agentenpfad bleibt unberührt.

Tabelle, atomares Anspruchs-Statement und die Fehlerpfade stehen unverändert in M-2 der großen Übergabe. Es blockiert nur noch **eine Freigabe für `CREATE TABLE public.jira_feldpflege_state`** — ein Schreibvorgang auf die Datenbank, und die Regel dafür lautet „nur nach Freigabe und Quercheck".

Nicht vergessen: der Anspruch muss auch dann zurückgesetzt werden, wenn M-3 den Lauf wegen unverändertem Hash abbricht, sonst blockiert das Ticket bis Fensterende.

---

## 5. M-3 Inhaltshash — hängt an M-2

**M-5 ist jetzt final**, damit ist die Abhängigkeit aufgelöst — solange `MIN_REST_ZEICHEN` und `MIN_REST_ZEICHEN_ZITAT` stehen bleiben. Wer sie ändert, entwertet alle Hashes auf einen Schlag.

Der Schattenlauf über mindestens 20 Ereignisse bleibt Voraussetzung fürs Scharfschalten.

---

## 6. Reihenfolge für die nächste Sitzung

1. **Erste Produktivläufe ansehen** — `bereinigung`-Zähler, Prompt-Tokens, und ob eine Einstufung abweicht.
2. **Zwei Angaben zum Monitoring-Filter klären** (Abschnitt 3), Volumenanteil messen, dann bauen.
3. **Freigabe für die Zustandstabelle** einholen, dann M-2 mit 4 Minuten.
4. Erst danach M-3 mit Schattenlauf.

Eine Woche nach dem 03.09. gegen die Ausgangsmessung vergleichen: Median Prompt 2.668 Tokens, Anteil `no_change` 91 Prozent, Modellquote 58 Prozent, rund 240 Läufe pro Tag.

---

## 7. Zwei Notizen zum Werkzeug

**Ein Bash-Heredoc verkürzt Backslashes.** Beim Schreiben der Regexe wurde `\\?\\?` still zu `\?\?`. Der Code blieb syntaktisch gültig und hätte anders gematcht. Code-Nodes über den Write-Weg schreiben, nicht über Heredocs — und danach zurücklesen.

**Für n8n reicht der claude.ai-Konnektor.** Er ist bereits authentifiziert und deckt alles ab. Ein zusätzlicher `n8n-mcp`-Eintrag in `.mcp.json` lief in eine Zeitüberschreitung nach 30 Sekunden und ist überflüssig.
