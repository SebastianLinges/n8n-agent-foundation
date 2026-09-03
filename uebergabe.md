# Übergabe an den nächsten Chat

Diese Datei ist als Eingangsnachricht für eine neue Sitzung gedacht. Sie ersetzt keine Recherche — der aktuelle Stand steht im Repo und in n8n, nicht hier.

---

## Wer und was

Sebastian Linges, Geschäftsführer KAPA Digital, arbeitet für RWG Rheinland eG. n8n-Instanz `https://n8n.srv1307521.hstgr.cloud`. Zugriff per MCP auf n8n, Jira/Confluence (Atlassian), Supabase.

**Zwei getrennte Welten in derselben Instanz.** Alle KAPA-Digital-Flows heißen `KAPA Digital - …` und hängen an den Supabase-Projekten `glhqajoxbscriskwzhbr` (Kapa-Core) und `ouccmqkwgdxjnplblnzk` (Marketing). Alles Übrige gehört zur RWG und hängt an `zckaxkpycyyxaymmkmvu` (Organisation RWG Rheinland eG, Projekt RAG). Die beiden Welten werden nie vermischt.

## Arbeitsregeln

- **Native n8n-Nodes vor Code-Nodes.**
- **Keine Versionsangaben und keine Änderungshistorie in der Doku.** Immer nur der aktuelle Stand, keine Altlasten.
- **Nach jedem Publish geht der Export ins Git.**
- **Supabase nur lesen.** Änderungen nur nach Freigabe und Quercheck.
- **Code-Nodes nach der Übertragung byte-identisch zurücklesen** und mit `node --check` prüfen. Die MCP-Übertragung verfälscht sonst still.
- **Jeden Test mit n8n-Execution-ID ins Laufprotokoll**, auch die bestandenen. Der Befund enthält den Messwert, nicht die Deutung.
- **Behauptungen belegen.** „Läuft" gilt erst mit einem Lauf, nicht mit einer schlüssigen Diagnose.
- **Kein Publish ohne das ausdrückliche Wort „Publizieren".**
- **Alle Node-Änderungen eines Workflows in einem `operations`-Array.** Getrennte `update_workflow`-Calls überschreiben sich gegenseitig.
- Arbeitsrhythmus: **Block für Block** — erklären, Information holen, freigeben lassen.

## Bewusst so entschieden

Nicht aufwerfen, das ist geklärt:

- **Graph läuft über den persönlichen Zugang `Sebastian.Linges`**, nicht über ein Dienstkonto. Bewusst so, bleibt so.
- **Der ProzessHub-Flow (`Muss6GBGPuG9fjE2`) läuft aktiv**, nächtlich um 02 Uhr. Anlegen, Aktualisieren, Entfernen und Umbenennen sind belegt.
- **Der Spiegel wird gegen den Ist-Bestand abgeglichen, nicht gegen das Gedächtnis.** Der Aufräumer entfernt in SharePoint, was nicht auf der Soll-Liste steht — gleich ob Umbenennung, abgebrochener Lauf oder von Hand Hineinkopiertes. Nicht per Wegwerfen und Neuanlegen: das würde jede Nacht alle geteilten Links, die Versionshistorie und die Item-IDs zerstören.
- **Der Ablageordner des Contract Loaders heißt `DONE`**, nicht `Erledigt` — er bestand bereits und war gefüllt.
- **Die Excel-Übersicht wird je Lauf neu erzeugt**, nicht fortgeschrieben, und enthält Fertiges wie Fehlerfälle mit `status` als erster Spalte.
- **maxJeLauf steht auf 15, nicht hoeher.** Nicht die technische Grenze - die laege deutlich hoeher, gemessen an Lauf 113044 mit 10 Dokumenten in 69 Sekunden. Es ist eine Kostenbremse: Sebastian hat begrenzt, damit das Mistral-Kontingent nicht verbrennt. Wer die Zahl anfassen will, muss zuerst den Verbrauch je Nacht kennen, nicht die Laufzeit.
- **Der SharePoint-Ingest ist in Steuerung und Verarbeitung geschnitten.** Nichts Binäres über die Flowgrenze: Die Steuerung übergibt einen Auftrag je Datei, die Verarbeitung holt die Datei selbst. Kein Webhook, auch nicht als Rückweg. Begründung und Bauplan: [konzept-sharepoint-neubau.md](konzept-sharepoint-neubau.md).

## Teuer erkaufte technische Regeln

- **Niemals `temperature` an GPT-5-Modellen.** Ungleich null scheitert immer; 0 läuft nur über Chat Completions.
- **Niemals `responsesApiEnabled` zusammen mit `outputParserStructured`.** Der Parser bekommt dann die API-Hülle statt des JSON. Das hat den Jira-Agenten anderthalb Tage lahmgelegt.
- **Tool-Beschreibungen setzen sich gegen den Systemprompt durch.**
- **„Null Ausführungen" heißt nicht „läuft nicht"** — bei `saveDataSuccessExecution: none` werden Erfolge nicht gespeichert.
- **n8n-MCP `sourceOutput` bei IF/Switch ist unzuverlässig** (landet immer auf Index 0). Auch `removeConnection` ignoriert den Ausgangsindex.
- **Der n8n-Server läuft auf UTC.** Ein Schedule-Trigger ohne `timezone` in den Workflow-Einstellungen feuert nach Serverzeit.
- **In Schleifen liefert `$('Node').all()` nur den letzten Durchlauf.** Der zweite Parameter ist der Durchlaufindex.
- **Ein Subworkflow bekommt alle Items auf einmal.** Liest er mit `$input.first()`, verarbeitet er nur das erste.
- **PostgREST liefert höchstens 1000 Zeilen je Anfrage.** Ein `limit` im Querystring hebt das nicht auf.
- **Ein HTTP-Node ohne `onError` beendet den ganzen Lauf.** In einer Schleife über viele Dokumente reißt ein einzelner Netzabbruch alles Übrige mit.
- **n8n legt bei HTTP-Fehlern das komplette Request-Objekt in den Ausführungsdaten ab**, samt `apikey` und `Authorization` im Klartext.
- **Ein Fehlerausgang liefert weder `httpCode` noch den Knotennamen mit.** Bei `onError: continueErrorOutput` trägt das Item nur die Meldung. Wer wissen will, an welchem Knoten es klemmte, muss `$prevNode.name` lesen; die Fehlerart lässt sich nur am Meldungstext erkennen. Gemessen in Lauf 111419.
- **Telegram liest jede Nachricht als Markup.** Ein einzelner Unterstrich ohne Gegenstück — etwa in `KONTINGENT_ERSCHOEPFT` — lässt den Versand mit `can't parse entities` scheitern, und zwar lautlos, wenn der Node `onError` trägt. Gegenmittel ist `parse_mode: HTML` und das Maskieren von `&`, `<` und `>` im eingesetzten Text. Belegt in Lauf 111467 gegen 111469.
- **Der Supabase-MCP-Zugang liest nur.** `execute_sql` scheitert bei jedem Schreibversuch mit `cannot execute DROP TABLE in a read-only transaction`. DDL geht ausschliesslich ueber `apply_migration`.
- **Der Postgres-Node durchsucht den gesamten Abfragetext nach Dollar-Platzhaltern** — auch in Zeichenketten und **in Kommentaren**. Ein `$1` in einem Kommentar bricht die Abfrage mit `out of range`; ein `$` ohne Ziffer wird still verschluckt (ein Zeilenende-Anker in einem regulären Ausdruck verschwand samt Anführungszeichen). Platzhalter zur Laufzeit aus `chr(36)` bauen, Daten immer über `queryReplacement` binden.
- **Ein Node ohne Ausgabeitems stoppt seinen Zweig.** Ein PostgREST-`DELETE` oder `PATCH` ohne Treffer liefert mit `Prefer: return=representation` ein leeres Array — n8n macht daraus null Items, und alles Nachfolgende läuft nicht mehr. In einer Schleife bleibt der Rest der Aufgaben liegen, und der Lauf gilt trotzdem als erfolgreich. Gegenmittel ist `alwaysOutputData` am betroffenen Node — aber nur, wenn die nachgelagerten Nodes aus **benannten Vorgängern** lesen. Hängt dahinter ein Aggregate-Node oder etwas, das Items zählt, verfälscht das eingefügte Leer-Item die Zahl.
- **Eine verschachtelte `splitInBatches` behält ihren Zustand über die äußere Schleife hinweg.** Ab dem zweiten Durchlauf der äußeren Schleife gilt sie als fertig, schleift die neuen Daten nicht mehr durch — und feuert trotzdem ihren Fertig-Ausgang. Alles im Schleifenkörper läuft dann gar nicht, alles dahinter normal weiter. Der Lauf meldet Erfolg und `fehler: 0`. Gegenmittel ist `options.reset` mit einer Bedingung, die nur beim Eintritt von aussen wahr ist, etwa `={{ $prevNode.name === 'Prepare Embedding Batches' }}`. Belegt im Sandkasten `RWG Wartung - Schleifenzugriff pruefen` (`570pf10JA7wnY8e7`), Läufe 110971 und 110972.
- **`$('Node').first()` ist in einer einfachen Schleife korrekt** und liefert den aktuellen Durchlauf — ebenso `.all()` und `.item`. Gemessen in Lauf 110970. Wer einen Schleifenfehler sucht, sollte hier nicht anfangen.
- **Ein Code-Node darf höchstens 300 Sekunden laufen.** Der Task-Runner bricht ihn dann mit `Task execution timed out after 300 seconds` ab und reisst den ganzen Lauf mit — unabhängig vom Workflow-Timeout. In einer Schleife über viele Dokumente ist das die eigentliche Obergrenze, nicht die Stunde in den Workflow-Einstellungen.
- **Der Graph-Delta-Abruf liefert Einträge mehrfach.** Ein Item, das sich mehrmals geändert hat, kommt mehrfach zurück. Ungefiltert zählt man die Ordner fast doppelt — gemessen 1 876 gelieferte Zeilen gegen 1 650 verschiedene Item-IDs. Immer über die Item-ID entdoppeln.
- **Ein abgebrochener Lauf friert den Delta-Anker ein.** Wird der Anker erst am Ende der Schleife geschrieben, schreibt ihn ein vorzeitiger Abbruch nie fort. Der nächste Lauf liest dasselbe Fenster erneut — tagelang, ohne dass etwas auffällt, weil jeder Lauf grün ist.
- **`queryBatching: single` verfälscht SQL**, wenn mehrere Anweisungen zusammengefasst werden. Immer `independently`.
- **Der Postgres-Node liefert bei null Zeilen kein leeres Ergebnis, sondern ein Item `{ success: true }`.** Wer auf „keine Zeile = Zweig endet" baut, bekommt stattdessen ein Item ohne Fachfelder, das still weiterläuft. Hinter jede Abfrage, deren leeres Ergebnis eine Entscheidung ist, gehört ein IF auf das erwartete Feld. Belegt im Probelauf 114916 der Feldpflege: `Anspruch setzen` gab `{ success: true }` zurück, erst `Anspruch erhalten?` hat den Lauf beendet. Ein CTE mit abschließendem SELECT liefert bei null Zeilen dagegen ein leeres Ergebnis (Lauf 114932). Wer sich auf eines von beidem verlässt, verlässt sich auf die Form der Abfrage.
- **Jira-Kommentarereignisse tragen weder `reporter` noch `creator`.** `issue.fields` enthält bei `comment_created` nur `summary`, `issuetype`, `project`, `assignee`, `priority` und `status` — bei `jira:issue_updated` dagegen das ganze Ticket. Ein Filter auf Melder oder Ersteller ist bei Kommentaren stillschweigend wirkungslos; dort helfen nur Regeln auf der Zusammenfassung. Gesehen an der echten Nutzlast von Lauf 114800 der Feldpflege.
- **Parallele Zweige hinter einem Trigger laufen nacheinander, und ein Fehler im ersten beendet den Lauf vor dem zweiten.** Bei `executionOrder: v1` wird jeder Zweig bis zum Ende abgearbeitet, bevor der nächste beginnt. Wer mehrere Testfälle an einen manuellen Auslöser hängt, muss die fehlerfreien Zweige vorn platzieren — sonst testet er nur den ersten. Belegt in den Läufen 114925 und 114932.
- **Große Ausführungen sind per MCP nicht abrufbar** — `get_execution` mit `includeData` reißt bei OCR- und bildlastigen Läufen die Sitzung ab. Die Ursache steht stattdessen in der Ausführung des Fehler-Workflows `pMGm0LaxRTldvPKEkmkzC`.
- **n8n weist Credentials automatisch zu**, wenn nur eine des Typs existiert. Bei zwei Datenbanken ist das gefährlich — nach jedem `create_workflow_from_code` die Zuordnung prüfen.
- **Die MCP-Schnittstelle liest Credentials nicht aus.** `get_workflow_details` liefert bei jedem Node `credentials: null`, auch wenn eine zugewiesen ist. Daraus lässt sich also *nicht* schließen, dass eine fehlt — und man kann auch nicht sehen, welche dranhängt. Der einzige Weg ist, sie mit `setNodeCredential` ausdrücklich zu setzen.
- **Ein aufgebrauchtes Mistral-Kontingent zeigt sich in zwei Gestalten.** Solange der Zugang nur pausiert ist, wirft die API die Verbindung weg, statt einen Fehlercode zu senden — `ECONNRESET` mit *„The connection to the server was closed unexpectedly"*, und die Wiederholungen laufen ins Leere. Ein Abrechnungsproblem sieht dadurch wie ein Netzabbruch aus. Ist das Abo abgelaufen, antwortet dieselbe Stelle sauber mit `402 Payment required`. Gesperrt wird dabei nicht nur der Chat-, sondern auch der Datei-Endpunkt — die OCR wird dann gar nicht mehr erreicht. Belegt in den Läufen 111062 und 111286.
- **Ein Code-Node kann unsichtbare Zeichen enthalten, die eine Neuuebertragung still zerstoert.** In `Eingaben validieren` des Lead-Intake stehen zwei Regex mit literalen Steuer- und Kombinationszeichen: `U+0300`-`U+036F` fuer die Diakritika-Entfernung und `U+0000`, `U+001F`, `U+007F` fuer die Bereinigung von Formulareingaben. Beim Lesen sehen sie aus wie ein harmloses `[ -]`. **Vor jeder Uebertragung eines fremden Code-Nodes auf Zeichen ausserhalb des druckbaren ASCII pruefen** - und zwar auch unterhalb von 0x20, eine Pruefung auf Nicht-ASCII allein findet Steuerzeichen nicht. Gegenmittel: in Escapes umschreiben und die Aequivalenz messen. Die MCP-Schnittstelle wandelt die Escapes beim Speichern von selbst wieder in die literalen Zeichen zurueck; der Rueckvergleich ist deshalb korrekterweise nie byte-identisch.
- **`Forbidden - perhaps check your credentials?` von Mistral zeigt nicht auf die Credential.** Der wahre Grund steht im Feld `description` der Antwort — im Fall des Contract Loaders `This model is not available in your subscription tier`. Der Tarif trug `mistral-large-latest` nicht verlässlich und wies rund drei von vier Anläufen ab. **Der teure Teil war die Diagnose, nicht die Behebung:** Ein sporadischer Fehlschlag sieht wie ein dokumentabhängiger aus, weil immer nur die gescheiterte Zeile auffällt. Erst `versuche` verrät es — dieselbe Datei stand auf `versuche: 3` und war trotzdem `abgelegt`, hatte es also im vierten Anlauf geschafft. Auf dem Weg dahin wurde eine Größengrenze vermutet, gebaut und an Lauf `113768` widerlegt; der Wechsel auf `mistral-medium-latest` hat es dann gelöst. **Regel:** Bevor eine Fehlerursache am Inhalt festgemacht wird, erst die Fehlschlagquote über *alle* Zeilen zählen.
- **Wird ein Supabase-Projekt gelöscht, verschwindet auch sein Zugang aus n8n.** Jeder Flow, der ihn noch referenziert, scheitert ab dem nächsten Lauf mit `Credential with ID … does not exist`. Bei webhook- oder ereignisgetriebenen Flows fällt das sofort auf, bei Delta-Läufen ohne Änderungen erst Tage später — die betroffenen Nodes werden dann gar nicht angefasst. **Vor dem Löschen eines Projekts auf allen Flows den neuen Zugang setzen**, nicht nur die Adressen umstellen.

---

## Stand: die RWG-Wissensbasis

Drei Ingest-Flows füllen dieselbe Tabelle `document_chunks`, unterschieden über `source_type`. Gemessen am 02.09. abends:

| Quelle | Chunks |
|---|---|
| `jira` | 10 855 |
| `sharepoint` | 8 568 |
| `confluence` | 3 641 |
| **gesamt** | **23 064**, davon 0 ohne Embedding |

Dazu 319 Zeilen in `sharepoint_documents` und der Bucket `rag`. Gelesen wird über `RWG Sub - Wissenssuche` (Hybrid aus Vektor- und deutscher Volltextsuche mit RRF und Cohere-Rerank), den Jira-Agenten und den Teams-Agenten.

**Gesundheitsprüfung:** Flow `RWG Wartung - Funktionen pruefen` (`h4uVcnxF5jbRUPHZ`) beantwortet in einer halben Sekunde, ob die Wissensbasis intakt ist — Bestand, Embeddings, Indizes, Bucket und ob noch Verweise aufs alte Projekt existieren. Keine publizierte Fassung, im Manuell-Modus starten.

## Als Erstes in der neuen Sitzung

**Das Thema ist gesetzt: das SQL-Konzept für Reporting, Controlling und Fibu.** Danach folgen Artikelabfragen und die Pflege von Artikeldaten. Beides ist im Repo noch nicht vorbereitet — die Fragen, die vor dem Bau zu klären sind, stehen unter „Zuerst" in [offene-punkte.md](offene-punkte.md).

**Was dabei hilft und was nicht:**

- Der **Contract Loader** zeigt den vollständigen Weg von Daten nach SharePoint samt Excel-Erzeugung. Das nächstliegende Vorbild.
- Der Abschnitt **Tabellendaten abfragbar machen** enthält Vorarbeit zu rechnenden Abfragen neben der Vektorsuche. Er zielt auf Excel-Mappen, nicht auf den SQL Server — die Frage, wie ein Agent sicher aggregiert, ist aber dieselbe.
- **Es gibt keine SQL-Server-Credential in n8n.** Die vorhandenen Postgres-Zugänge zeigen sämtlich auf Supabase. Der Zugang ist das Erste, was fehlt.

**Vor größeren Eingriffen** die Gesundheitsprüfung laufen lassen.

**Nur nachsehen, nicht anfassen** — vier Dinge laufen seit dem 02.09. und brauchen einen Blick, keine Arbeit:

| Was | Worauf |
|---|---|
| Jira-Nachzügler, alle 30 Min | Bilanz `gefunden: 0`. Steht dort eine Zahl, zeigt sie vor dem Scharfschalten, welchen Vorgang er anfassen würde |
| Contract Loader, stündlich | der erste Lauf mit einer **echten neuen Datei** unter `mistral-medium-latest` |
| Content Studio, 04.09. | die Mengenangaben-Regel ist publiziert, aber im Flow nie gelaufen |
| SharePoint-Abgleich, 03:30 | 15 Einlesungen, Rückstand danach rund 356 Dateien |

Der SharePoint-Ingest läuft seit dem 01.09. im Neuschnitt: `RAG - SharePoint Steuerung` (`PAqphQur0CTQRypM`) trägt beide Zeitpläne und ruft je Datei `RAG - SharePoint Ingest` (`coDhu7pIaI2bpmGZ`). Der abgelöste Flow heißt in n8n `… OLD` (`BBhGCRsQ8pdNSxTi`) und ist deaktiviert. **Die Namen sind vertauscht — immer über die ID gehen, nie über den Namen.** Der Rückweg bleibt billig: alten Flow aktivieren, Steuerung abschalten, **nie beide gleichzeitig** (gleiche Cron-Zeiten, gleicher Delta-Anker).

## Offene Themen

Die vollständige Liste steht in [offene-punkte.md](offene-punkte.md), nach Dringlichkeit sortiert. Hier nur, was ohne diese Datei nicht klar wäre.

**Wartet auf Sebastian:** die 17 Doubletten in SharePoint, die fehlenden Handwerks-Use-Cases, die zweite Empfängeradresse im Lead Intake, der Testlead in Kapa-Core und die vertagten Tabellendaten.

**Was mir fehlt:**

- **Ein SQL-Server-Zugang.** Für das kommende Hauptthema. n8n hat heute keinen.
- **Löschen von SharePoint-Dateien.** Verschieben gibt es seit dem 02.09. (`RWG Wartung - SharePoint Datei verschieben`, `k5sofeyVNzEqOIZs`) mit Probelauf und einem Namensfilter, der leer nichts trifft und mehrere Namen als Kommaliste nimmt. **Löschen bewusst nicht** — das kommt erst, wenn die Entscheidung über die 17 Kopien gefallen ist.
- **Ein Werkzeug für Data-Table-Zeilen.** Über MCP lassen sich Zeilen weder lesen noch löschen. Betrifft die rund 370 Null-Zeilen im `prozesshub_spiegel`.
- **Redaction ist nicht verfügbar.** In den Workflow-Einstellungen ausgegraut mit `Upgrade`-Abzeichen. Der bekannte Klartext-Effekt bei HTTP-Fehlern bleibt. Gemessen: der **lebende** Zugang ist in keiner Ausführung gelandet.

**Der Stand der Flows nach dem 02.09.:**

| Flow | Version | Zustand |
|---|---|---|
| `RWG Contract Loader` | `98c19d61` | alle 12 Zeilen in `vertraege` auf `abgelegt`, `FEHLER` leer |
| `RWG_Jira-Agent` | `4654fda5` | Nachzügler-Zeitplan aktiv, **`probelauf` steht auf `true`** |
| `RWG Teams Agent` | `432ee008` | Abo-Ereignisse fallen vor dem Claim heraus |
| `KAPA Digital - Lead Intake` | `206a930b` | `spam_verdacht` ist im Prompt definiert |

**Technisch offen**, alles kleinteilig und ohne Termin: Embeddings von 4 091 Bildchunks nach der Adressänderung (rund vier Cent), Dokumenteintrag vor den Chunks, der Retry als Netz im Content Studio, drei Alteinträge in `agent_requests`, das 404-Ausweichen im Jira-Agent.

**Die Erstbefüllung läuft nebenher:** noch rund 356 Dateien, bei `maxJeLauf: 15` etwa 24 Nächte.

## Was im Repo liegt

| Datei | Inhalt |
|---|---|
| `README.md` | alle Flows mit n8n-ID, Datenbankzuordnung und Zusammenhängen |
| `migration/` | Umzug: Befund, Abnahme, Struktur der alten Datenbank |
| `offene-punkte.md` | was ansteht und was fehlt |
| `konzept-sharepoint-neubau.md` | warum der SharePoint-Ingest in zwei Flows geschnitten ist, Zielbild und Etappen |
| `konzept-ocr-schonen.md` | wie der SharePoint-Ingest Mistral schont, ohne Bilder zu verlieren |
| `ideen.md` | was noch keine Aufgabe ist |
| `referenz-dokumentationsbefunde.md` | offene Korrekturen an Confluence-Seiten und Jira-Vorgängen |
| `referenz-sharepoint-prozesse-gegen-prozesshub.md` | die sieben alten PDF in der ProzessHub-Zielablage und ihre Entsprechungen |
| `sharepoint-struktur-schulungen.xlsx` | die Bibliothek Schulungen Ebene für Ebene, 1 650 Einträge mit Links |
| `tests/laufprotokoll.csv` | jeder Lauf mit Execution-ID und Befund |
| `flows/*/README.md` | je Flow: Aufbau, Entscheidungen, Fallstricke |

Seit dem 02.09. neu: die Ordner `flows/rwg-contract-loader/`, `flows/rwg-wartung-sharepoint-datei-verschieben/` und `flows/kapa-lead-intake-website/` haben jetzt einen Export - vorher lagen dort nur READMEs oder gar nichts.

## Erster Schritt

Hol dir den Stand aus dem Repo und aus n8n, statt dich auf diese Zusammenfassung zu verlassen.
