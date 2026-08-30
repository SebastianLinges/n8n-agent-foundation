# Umzug der RWG-Datenbank

Die alte Supabase-Datenbank der RWG war vollgelaufen. Alles ist in ein neues Projekt gezogen; das alte Projekt samt Zugang ist am 30.08.2026 gelöscht.

| | Projekt | Organisation |
|---|---|---|
| Alt, gelöscht am 30.08.2026 | `zjabiweaihsezjjeycko` | — |
| Heute in Betrieb | `zckaxkpycyyxaymmkmvu` („RAG") | RWG Rheinland |

**Die KAPA-Digital-Verbindung ist nicht betroffen.** `Kapa-Core` (`glhqajoxbscriskwzhbr`) und `Marketing` (`ouccmqkwgdxjnplblnzk`) liegen in der Organisation `kapa-digital` und werden nicht angefasst.

## Der Weg

Vier Schritte. Jeder ist erst prüfbar, wenn der vorige steht — deshalb nicht vermischen.

| | Was | Wodurch | Stand |
|---|---|---|---|
| 1 | Inventur der alten Datenbank | Flow `RWG Wartung - DB-Inventur` (`to8C8eaxtfbh3oqq`) | **erledigt** → [inventur-befund.md](inventur-befund.md) |
| 2 | Strukturen und Speicher anlegen | Flow `RWG Wartung - Schema uebertragen` (`WOpIkQbGpEklY61d`) | **erledigt**, Lauf 110797 |
| 3 | Tabellendaten überführen | Flow `RWG Wartung - Daten uebertragen` (`Y1WLMssRCWIKPIed`) | **erledigt**, Lauf 110801 |
| 4 | Bilder überführen | Flow `RWG Wartung - Bilder uebertragen` (`19pVnbzEWTeZIEm3`) | **erledigt**, Lauf 110805 |
| 5 | Verweise im Inhalt umstellen | Flow `RWG Wartung - Verweise umstellen` (`SuGyYWFVn5LAf8fA`) | **erledigt**, Lauf 110816 |
| 6 | Funktionen prüfen | Flow `RWG Wartung - Funktionen pruefen` (`h4uVcnxF5jbRUPHZ`) | **erledigt**, Lauf 110817 |
| 7 | Flows umstellen und publizieren | — | **erledigt**, Delta-Lauf 110818 belegt |

### Abnahme des Umzugs

| | Alt | Neu |
|---|---|---|
| `document_chunks` | 21 323 | 21 323 |
| Chunks je Quelle | jira 10 544 / sharepoint 7 267 / confluence 3 512 | identisch |
| Chunks ohne Embedding | 0 | 0 |
| `jira_tickets` / `jira_agent_events` / `agent_requests` | 1 554 / 1 100 / 724 | identisch |
| `confluence_pages` / `sharepoint_documents` / `agent_conversation_memory` | 611 / 266 / 104 | identisch |
| Bucket `rag` | 7 384 Objekte, 452 MB | identisch |
| Verweise auf das alte Projekt | — | **0** |
| Bildpfade ohne echtes Objekt | — | **0 von 4 090** |

**Die fünf Funktionen liefern alle Treffer** (Lauf 110817): `funktion_match_document_chunks` 5, `funktion_rag_suche_chunks` 5, `match_documents` 5, `funktion_jira_ticket_lesen` 1, `jira_agent_collect_context` in allen fünf Zweigen.

### Der Fund, der den Umzug gerettet hat

Die Daten wurden **unverändert** kopiert — und trugen die Adresse des alten Projekts im Inhalt: 4 651 Zeilen in `document_chunks.metadata` (`related_image_url`), 4 091 in `chunk_text` (die Zeile „Öffentliche URL"), 185 in `sharepoint_documents.images` (`public_url`). **8 927 Bildverweise**, die beim Löschen des alten Projekts still gebrochen wären.

Die Verbindung umzustellen genügt nicht, wenn die Adresse zusätzlich im Inhalt steht. Deshalb durchsucht `RWG Wartung - Verweise umstellen` **jede** Text-, Varchar- und JSON-Spalte aller Tabellen, nicht nur die vermuteten.

**Eine Einschränkung dabei:** Bei der Textänderung in `chunk_text` wurden die Embeddings **nicht** neu berechnet. Betroffen ist nur die Adresszeile im Bildchunk — semantisch unerheblich, aber es ist eine Abweichung zwischen Text und Vektor.

### Abnahme des Zielschemas — Lauf 110797

| | Alt | Neu |
|---|---|---|
| Tabellen | 12 | 12 |
| Bedingungen | 37 | 37 |
| Indizes | 49 | 49 |
| Ansichten | 1 | 1 |
| Funktionen | 5 | 5 (+1 im Ziel vorbestehend) |
| RLS aktiv / Regeln | 12 / 0 | 12 / 0 |
| Vektorspalte | `vector(1536)` | `vector(1536)` |
| HNSW-Index | `m=16, ef_construction=64` | identisch |
| Volltextindex | `german` | `german` |
| Identitätsspalten | 1× ALWAYS, 1× BY DEFAULT | identisch |
| Bucket `rag` | öffentlich, 512 000 Bytes | identisch |
| Zeilen | — | alle 12 Tabellen auf 0 |

**Offen:** Im Zielprojekt stand bereits **eine Funktion**, bevor irgendetwas übertragen wurde. Ihre Herkunft ist ungeklärt — vor Schritt 3 nachsehen.

### Die beiden Stolperstellen dieses Schritts

**`queryBatching: single` verfälscht.** Bei mehreren Eingangsitems fügt der Postgres-Node alle Abfragen zu einer zusammen — und dabei wird gültiges SQL ungültig. Der Beleg: dieselbe `CREATE TABLE`-Anweisung scheiterte über den Sammelweg und lief wörtlich übergeben anstandslos (Läufe 110786 gegen 110793). **`independently` verwenden**, dann läuft jede Anweisung für sich und jeder Fehler benennt seine eigene.

**Ein `$` im übergebenen Text wird verschluckt.** Aus `CHECK ((ticket_key ~ '^[A-Z]+-[0-9]+$'::text))` wurde `CHECK ((ticket_key ~ '^[A-Z]+-[0-9]+::text))` — das Dollarzeichen samt schließendem Anführungszeichen war fort. n8n deutet es als Platzhaltersyntax. Ohne Einzelfehlermeldung wäre diese Bedingung stillschweigend gefehlt. Solche Anweisungen wörtlich übergeben, nicht über einen Ausdruck.

**Der Bauplan wird nicht abgetippt.** Die alte Datenbank erzeugt ihr DDL selbst aus dem Systemkatalog, der Flow wendet es unmittelbar im Zielprojekt an. Damit gibt es keine Zwischenfassung, die vom Ist abweichen kann. `01-inventur-alt.sql` bleibt als lesbare Fassung der Abfragen bestehen; maßgeblich sind die Flows.

Zwei Dinge, die dabei fast durchgerutscht wären und den Nachbau falsch gemacht hätten: `agent_conversation_memory.id` ist `GENERATED ALWAYS AS IDENTITY`, `agent_ticket_dialogs.id` ist `GENERATED BY DEFAULT` — und die zugehörigen Sequenzen dürfen **nicht** getrennt angelegt werden, sie entstehen mit der Tabelle.

## Wie die Daten hinüberkommen

**Über n8n, ohne ein einziges Passwort.** n8n hält die Zugänge zu beiden Datenbanken bereits als Credentials. Ein Flow liest aus der alten und schreibt in die neue — niemand muss ein Passwort herausgeben, es steht in keiner Datei und in keinem Abfragetext.

Erwogen und verworfen: `postgres_fdw` wäre schneller, verlangt aber das Passwort der alten Datenbank in einer `CREATE USER MAPPING`-Anweisung. Die Supabase-CLI wäre gründlicher, verlangt aber Docker Desktop, das hier fehlt.

Flow `RWG Wartung - Daten uebertragen` (`Y1WLMssRCWIKPIed`):

1. **Arbeitsliste** — die alte Datenbank rechnet aus, wie viele Abschnitte je Tabelle nötig sind, und schreibt die passenden Lese- und Schreibanweisungen gleich dazu. `document_chunks` steht ans Ende sortiert.
2. **Je Abschnitt** — Schleife mit einem Abschnitt je Durchlauf. 500 Zeilen bei den kleinen Tabellen, **100 bei `document_chunks`**, weil dort jede Zeile einen 1536-stelligen Vektor trägt.
3. **Lesen** aus dem Altbestand als `jsonb_agg(to_jsonb(...))`, **Schreiben** ins Ziel über `jsonb_populate_recordset`. Damit muss keine Spaltenliste gepflegt werden — Struktur und Reihenfolge ergeben sich aus der Zieltabelle.
4. **Sequenzen nachziehen** — die Identitätsspalten haben ihre Werte mitbekommen, ihre Sequenzen stünden sonst auf eins und das nächste Einfügen liefe in einen doppelten Schlüssel.

`ON CONFLICT DO NOTHING` macht den Lauf beliebig wiederholbar.

### Zwei Fallen, die dabei zuschlugen

**`OVERRIDING SYSTEM VALUE` nur wo nötig.** `agent_conversation_memory.id` ist `GENERATED ALWAYS` — ohne den Zusatz weist Postgres jedes Einfügen mit eigenem Wert ab. Bei Tabellen ohne solche Spalte ist der Zusatz umgekehrt ein Fehler. Die Arbeitsliste entscheidet das je Tabelle.

**Der Postgres-Node durchsucht den ganzen Abfragetext nach Dollar-Platzhaltern** — auch in Zeichenketten und **sogar in Kommentaren**. Ein `$1`, das nur in einem erklärenden Kommentar stand, hat die Abfrage mit `Variable $1 out of range` abgewiesen. Der Platzhalter wird deshalb zur Laufzeit aus `chr(36)` zusammengesetzt und steht nirgends wörtlich im Quelltext.

## Die Bilder

Der Bucket `rag` enthält 7 384 Objekte, 452 MB. Die liegen als Objekte, nicht in der Datenbank — SQL erreicht sie nicht.

**Auch das geht ohne Schlüssel:** Der alte Bucket ist **öffentlich lesbar**, die Bilder lassen sich also über ihre öffentliche Adresse holen. Geschrieben wird mit der Supabase-Credential des neuen Projekts, die in n8n bereits liegt.

## Vollständig kopieren, nicht teilweise neu aufbauen

Nach der Inventur entschieden. 21 323 Zeilen und 464 MB sind wenig — ein vollständiges Kopieren ist einfacher und sicherer als ein Teil-Neuaufbau.

Der frühere Gedanke war, die SharePoint-Seite neu einlesen zu lassen und so Aufwand zu sparen. Er trägt nicht: SharePoint ist nur **ein Drittel** der Chunks, der Neuaufbau kostet OCR-Zeit und mehrere Abgleichsnächte, und für Jira und Confluence ist ungeklärt, ob die Einleseflows ihren Vollbestand überhaupt nachziehen können. Zwei Wege parallel zu fahren ist teurer als einer.

**Damit müssen auch die Bilder mit.** Die Chunk-Metadaten verweisen auf Pfade im Bucket `rag`; ohne die 7 384 Objekte entstehen 7 384 tote Verweise.

## Warum sie vollgelaufen ist

**Beantwortet — und anders als vermutet.** Nicht die Bilder: `document_chunks` trägt 410 MB der 464 MB, davon 193 MB Indizes und der Rest die ausgelagerten Vektoren. Der Bucket liegt auf einem eigenen Kontingent und hat damit nichts zu tun. Die Einzelheiten stehen in [inventur-befund.md](inventur-befund.md).

Der Effekt ist strukturell und nicht durch Aufräumen behebbar. Wer die Wissensbasis verdoppelt, verdoppelt ihn.

## Was betroffen ist

| Flow | Wie |
|---|---|
| `RAG - SharePoint Ingest` | HTTP auf PostgREST, Bucket `rag` |
| `RWG Sub - Wissenssuche` | Postgres-Node, direkte Verbindung |
| `RWG Jira-Agent` | Vector-Store-Node, RPC `funktion_match_document_chunks` |
| `RWG Teams-Agent` | `agent_conversation_memory`, `agent_requests`, `document_chunks` |
| `RWG Wartung - RAG-Bestand pruefen` | PostgREST |
| `RWG Wartung - Wissensbasis Analyse` | PostgREST |

Jeder dieser Flows wurde einzeln umgestellt und mit einem Lauf belegt, nicht in einem Zug.

Die Liste stammt aus den Flows im Repo und war deshalb nicht vollständig. Die Nachprüfung über **alle 35 Flows der Instanz** hat einen übersehenen gefunden: `RWG Sub - Jira Issue Create` mit fünf Postgres-Nodes auf der alten Datenbank. Der Flow ist inaktiv und hätte keinen Schaden angerichtet — beim Scharfschalten nach der Löschung aber schon. Nachträglich umgestellt.

Drei Tabellen tragen Daten, für die sich kein schreibender Flow finden ließ: `agent_ticket_dialogs`, `documentation_findings`, `documentation_review_state`. Sie sind mitgezogen und stehen unverändert im Zielprojekt.

## Was im Zielprojekt entfernt wurde

Nach der Übernahme wurde geprüft, was tatsächlich aufgerufen wird — über **alle 35 Flows der Instanz**, nicht nur die vermuteten. Entfernt (Lauf 110820):

| Entfernt | Grund |
|---|---|
| `funktion_rag_suche_chunks` | kein Aufrufer |
| `funktion_jira_ticket_lesen` | kein Aufrufer |
| `jira_agent_collect_context` | kein Aufrufer — der Jira-Agent nutzt eigenes SQL |
| `match_documents` | kein Aufrufer |
| Ansicht `documents` | diente nur `match_documents` als LangChain-Brücke |

**Wiederherstellbar:** Die vollständigen Definitionen stehen in [inventur-alt-struktur.json](inventur-alt-struktur.json).

Verblieben sind `funktion_match_document_chunks` (vom Jira-Agenten aufgerufen, Probe liefert Treffer) und `rls_auto_enable` — ein Supabase-eigener Trigger, der bei neuen Tabellen RLS einschaltet. Das war die Funktion, die im leeren Zielprojekt schon stand.

### Was bewusst bleibt

| Tabelle | Zeilen | Warum |
|---|---|---|
| `agent_jira_create_requests` | 0 | **wird gebraucht** — Duplikatschutz von `RWG Sub - Jira Issue Create`. Der Flow ist inaktiv, seine fünf Postgres-Nodes zeigten noch auf die alte Datenbank und wurden nachträglich umgestellt. |
| `agent_ticket_dialogs` | 2 | kein Flow gefunden, aber Daten vorhanden. Herkunft klären, bevor etwas verschwindet. |
| `documentation_findings` | 10 | dito |
| `documentation_review_state` | 17 | dito |

Tabellen mit Inhalt ohne bekannten Schreiber werden **nicht** gelöscht. Eine Funktion lässt sich aus dem Repo in Sekunden wiederherstellen, 27 Zeilen unbekannter Herkunft nicht.
