# RWG_Jira-Feldpflege

Workflow `k4SmnNrz7ASMdFwk`, aktiv, 24 Nodes. Setzt in Jira SSD zwei Felder: **Priorität** und **Support-Level** (`customfield_10777`). Der alleinige Schreiber auf diese beiden Felder.

## Zwei Eingänge, die sich nicht überschneiden

`Aufruf aus Jira-Agent` läuft genau einmal je Ticket, bei der Anlage. Die vier Betriebssignale kommen mit, deshalb fällt hier kein Modellaufruf an — praktisch wird nur die Priorität gesetzt.

`Jira Ticketereignis` deckt alles danach ab: Statuswechsel, Kommentare, Beschreibung, Zusammenfassung, Vorgangstyp. Da der Agent ein Ticket nur bei Anlage sieht, ist dies der einzige Weg, auf dem sich das Support-Level je ändern kann.

Kein Zeitplan — ein Ticket, das sich nicht bewegt, hat keine neue Evidenz.

## Sammelfenster vor der Bewertung

Ereignisse an einem Ticket kommen in Schwärmen — Kommentar, Statuswechsel, Antwort innerhalb von Sekunden. Jedes wäre ein eigener Modellaufruf, und nur der letzte zählt: gemessen viermal in 50 Sekunden an SSD-9212, 7 von 22 Modellaufrufen in der Stichprobe.

Der Webhook-Pfad bewertet deshalb nicht sofort. Vier Nodes liegen zwischen `Ticketereignis pruefen` und `Kandidat und Konfiguration`:

| Node | Aufgabe |
|---|---|
| `Sammelfenster` | die einzige Stellschraube: `fensterMinuten = 4` |
| `Anspruch setzen` | atomares `INSERT … ON CONFLICT … RETURNING` auf `public.jira_feldpflege_state`. Kommt eine Zeile zurück, hält dieser Lauf den Anspruch; kommt keine, hält ihn ein anderer. Trägt bei `abschluss: true` stattdessen die Zeile aus und liefert nichts zurück (siehe unten) |
| `Anspruch erhalten?` | endet den Lauf ohne Anspruch — nötig, weil der Postgres-Node bei null Zeilen `{ success: true }` liefert, kein leeres Ergebnis |
| `Sammelfenster abwarten` | wartet `fensterMinuten`; erst danach lädt `Ticketdaten laden` den frischen Stand, alle Ereignisse des Schwarms sind dann in Jira |

Ein zweites Ereignis im Fenster sieht das gültige Schild und endet nach Millisekunden, ohne zu warten und ohne zu bewerten. Das Ergebnis ist dasselbe wie vorher beim letzten Lauf des Schwarms; es entfallen nur die Zwischenläufe. Der Agentenpfad ist unberührt — der Aufruf aus dem Jira-Agent ist synchron und darf nicht warten.

**Warum vier Minuten:** `executionTimeout` steht auf 300 Sekunden, und nach dem Warten muss der Lauf noch laden, bewerten und schreiben. Der längste gemessene Abstand innerhalb eines Schwarms lag bei 72 Sekunden.

**Das Schild hängt sich selbst ab.** `claimed_until` ist eine Uhrzeit, kein Ja/Nein: Stürzt der Anspruchsinhaber ab, ist das Ticket nach Fensterende wieder frei. Abgelaufen heißt unwirksam, nicht gelöscht — die Zeile bleibt, bis das Ticket abgeschlossen ist.

## Zwei Klassen werden nicht mehr bewertet

Beides ist eine Entscheidung vom 03.09.2026 und **bewusst nicht ergebnisneutral**: Tickets, die vorher bewertet wurden, bleiben jetzt unbewertet.

**Maschinentickets.** Monitoring (`[Managed | Monitoring]`), Defender, SIEM-Berichte, Intune- und Snipe-Checker, und Tickets mit RWG.Automate als Melder. `Ticketereignis pruefen` verwendet dafür **dieselbe Regel wie `Filter Automated Ticket Creator` im RAG-JIRA-Ingest**, damit beide Flows dasselbe darunter verstehen: drei Konto-IDs, fünf Token in E-Mail oder Anzeigename von Melder und Ersteller, das Summary-Präfix und sechs Meldungsmuster. Einzige Abweichung: `siem` nur als ganzes Wort — sonst träfe die Regel auch „Siemensring". Größenordnung aus der Sammelschließung vom 03.09.: 19 von 34 geschlossenen Tickets fielen unter diese Regel.

**Bei Kommentarereignissen liefert Jira weder `reporter` noch `creator` mit** — nur `summary`, `issuetype`, `project`, `assignee`, `priority` und `status`. Dort greifen ausschließlich die Regeln auf der Zusammenfassung. Die Konto- und Token-Prüfung wirkt nur bei Feldänderungen.

**Tickets in einem Done-Status.** Der Trigger filtert auf `statusCategory != Done`; der Übergang Erledigt → Geschlossen erreicht diesen Workflow nie (gemessen: null Läufe während der automatischen Sammelschließung von 34 Tickets um 18:00 Uhr). Das letzte Ereignis, das er von einem Ticket sieht, ist das, bei dem es bereits in einem Done-Status steht — meist der abschließende Kommentar samt Übergang nach Erledigt. Vorher wurde genau dieses Ereignis noch mit vollem Modellaufruf bewertet (Lauf 114800: `no_change`). Jetzt markiert `Ticketereignis pruefen` es mit `abschluss: true`, gelesen aus `issue.fields.status.statusCategory.key`, und `Anspruch setzen` trägt in demselben Statement nur noch die Zeile aus `jira_feldpflege_state` aus, ohne Anspruch — es kommt keine Zeile zurück, der Lauf endet an `Anspruch erhalten?`. Kein Warten, keine Bewertung.

Wird ein abgeschlossenes Ticket wieder geöffnet, entsteht beim nächsten Ereignis einfach eine neue Zeile.

Die Tabelle gehört ausschließlich diesem Workflow: eine Zeile je Ticket in Bearbeitung, sechs Spalten, DDL in [m2-entwurf/tabelle.sql](m2-entwurf/tabelle.sql), Postgres-Zugang `awcN6ePCJHieBrzb` (Projekt RAG). Die Spalten `content_hash`, `last_evaluated_at`, `last_level`, `last_priority` sind für den Inhaltshash vorgesehen und noch unbenutzt.

## Schleifensicherung, doppelt

Der Workflow schreibt nach Jira und würde sich sonst selbst auslösen. Dagegen zwei unabhängige Sperren:

1. **Vier Konto-IDs werden verworfen.** Zwei davon sind belegt: `712020:86b7f975…` ist `RWG.Automate` — das Konto, unter dem geschrieben wird — und `557058:f58131cb…` ist `Automation for Jira`, dessen Regel bei Anlage Bearbeiter und Fälligkeit setzt. Die beiden übrigen IDs sind nicht zugeordnet.
2. **`priority` und `customfield_10777` stehen nicht in `RELEVANT`.** Selbst ein Schreibvorgang unter fremdem Konto würde am Feldfilter scheitern.

Ebenfalls bewusst verworfen: Bearbeiter, Labels und Komponenten. Das Regelwerk schließt sie als Level-Kriterium aus; ein Modellaufruf darauf könnte per Definition nie zu einer Änderung führen.

## Feld-IDs, gegen die Instanz geprüft

| Priorität | ID | Support-Level | ID |
|---|---|---|---|
| Sehr Hoch | 1 | 1st-Lvl. | 10354 |
| Hoch | 2 | 2nd-Lvl. | 10355 |
| Medium | 3 | 3rd-Lvl. | 10356 |
| Niedrig | 4 | | |
| Sehr Niedrig | 5 | | |

Beide Tabellen sind gegen echte SSD-Daten abgeglichen. Über 100 Vorgänge mit gesetztem Support-Level kommt kein vierter Wert vor — das ist wichtig, weil `Support-Level festlegen` am Ende jeden Wert außerhalb der drei erlaubten auf `1st-Lvl.` zurücksetzt. Käme eine vierte Option hinzu, würde sie überschrieben. **Diese Prüfung gehört wiederholt, wenn das Feld erweitert wird.**

## Entscheidungslogik

Ein einziger Modellaufruf liefert Support-Level-Bewertung und die vier Betriebssignale. Verrechnet wird deterministisch im Code — das Modell entscheidet nichts.

**Priorität:** Unterhalb von Medium liegen ausschließlich planbare Anfragen. Jede echte Störung ist mindestens Medium, auch bei einem einzigen betroffenen Anwender. Signale auf `UNKNOWN` lassen die Priorität unangetastet; bestehende hohe Prioritäten werden nie automatisch gesenkt.

**Support-Level:** Der Normalfall ist eine Hochstufung. Eine Herabstufung verlangt eine im Ticket dokumentierte Rückgabe. Status `WARTEN AUF GWS` erzwingt 3rd-Lvl. Ein manuell gesetzter Wert bleibt ohne eindeutigen Beleg unangetastet.

## Was das Modell zu sehen bekommt

`Ticketkontext aufbereiten` bereinigt Beschreibung und Kommentartexte, bevor sie in den Prompt gehen. Entfernt wird, was die fachliche Bewertung nicht trägt: Grußformel samt Signaturblock, Kontaktzeilen, Postanschriften, rechtliche Fußzeilen und zitierte Vorgängermails. Der Schnitt setzt an der ersten erkannten Marke an, alles darunter fällt weg.

Die Sicherung dagegen ist eine **absolute Zeichengrenze, kein Anteil**. Ein Anteil misst nur, wie lang die Signatur im Verhältnis war, nicht ob der Schnitt stimmt — bei einem Anliegen von zwei Sätzen und zehn Zeilen Signatur ist ein richtiger Schnitt zwangsläufig größer als die Hälfte. Zwei Grenzen, weil die Marken unterschiedlich sicher sind:

| Konstante | Wert | Gilt für |
|---|---|---|
| `MIN_REST_ZEICHEN` | 40 | Schnitt an Grußformel oder Rechtshinweis |
| `MIN_REST_ZEICHEN_ZITAT` | 120 | Schnitt an einem Zitat |

Nach einer Grußformel folgt ein Signaturblock, der die Bewertung nie trägt. Nach einem Zitat kann Inhalt stehen, auf den sich der Text davor beruft — bleibt dort nur eine Verweiszeile wie „siehe unten" übrig, wird das Zitat behalten. Bleibt zu wenig übrig, gilt das Muster als unsicher erkannt und der Originaltext wird verwendet. Diese Fälle zählt `result.bereinigung`, das bis `Ergebnis` durchwandert, dort aber nicht ausgegeben wird.

**Diese beiden Zahlen sind die einzigen Stellschrauben.** Wer sie ändert, ändert den Text, der ins Modell geht — und damit jeden künftigen Inhaltshash.

Gemessen an den echten Texten aus SSD-9212: vier von vier Signaturfällen bereinigt, keiner verworfen, der fachliche Befundkommentar unangetastet, in Summe 40 Prozent weniger Zeichen.

## Schreibpfad

`Schreiben erforderlich?` verlangt `shouldWrite === true` **und** `dryRun === false`, beides als strikte Booleans. Geschrieben wird ein `PUT` mit genau den zwei Feldern — nichts sonst. Aktueller Stand: `dryRun = false`, also scharf.

## Unsichere Fälle werden jetzt gemeldet

`Support-Level festlegen` berechnet in `unsicher`, wann eine Bewertung nicht belastbar war: fehlende Fundstelle, `confidence` unter HIGH, Herabstufung ohne dokumentierte Rückgabe. In diesen Fällen bleibt der bestehende Wert stehen — richtig so.

Gemeldet wurde das bisher nicht: `needsManualReview` stand fest auf `false`, und damit war `manuellePruefungNoetig` im Ergebnis immer falsch. Der Empfänger im Jira-Agent existiert (`supportLevel.manuellePruefung`), es kam nur nie etwas an. Das Feld wird jetzt aus `unsicher` gespeist.

Die Änderung ist reine Meldung: Kein Schreibvorgang und kein Routing hängt an diesem Feld, und der Agent rendert es derzeit nicht in den internen Kommentar.

## Offen

**Kein Meldekanal für unsichere Fälle.** Sie stehen jetzt korrekt im Rückgabewert und im Ausführungsprotokoll, aber niemand wird aktiv darauf hingewiesen.

**`Bewertungsmodell` läuft auf `gpt-4o`** mit `temperature: 0` über Chat Completions. Funktioniert, ist aber zwei Generationen alt. Bei einem Wechsel auf die GPT-5-Familie muss `temperature` entfallen.

**Zwei der vier gesperrten Konto-IDs** sind nicht zugeordnet: `712020:2c41da01…` und `60242eda…`. Vermutlich weitere Apps; gehört in die Notiz, sobald bekannt.
