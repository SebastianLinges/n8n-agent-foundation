# Token sparen — offene Punkte über alle Flows

Stand 04.09.2026. Aufgenommen, nachdem Feldpflege und Content Studio abgearbeitet waren und die Frage aufkam, wo insgesamt noch Modellkosten entstehen.

Die Liste ist nach **gemessenen Kosten** sortiert. Bis zum 04.09. stand sie nach Tokenmenge — das war richtig gezaehlt und trotzdem falsch gewichtet. Die Abrechnung in Punkt 0 hat die Rangfolge umgeworfen. Wo etwas geschaetzt ist, steht es dabei.

## Was diese Zahlen sind — und was nicht

n8n kennt Token, keine Euro. Alles hier sind **Tokenzahlen und Laufzahlen aus echten Ausführungen**. Was ein Token kostet, hängt vom Modell und vom Tarif ab; die tatsächliche Rechnung steht nur in den Abrechnungen von OpenAI und Mistral.

**Deshalb steht Punkt 0 vor allem anderen:** Ohne den Abgleich mit der Anbieterabrechnung lässt sich nicht sagen, ob die beobachteten fünf bis sechs Euro alle zwei Tage aus dem Jira-Agenten, aus dem SharePoint-OCR oder aus den Einbettungen kommen. Die Rangfolge unten beruht auf Tokenmengen — die sind belastbar, aber ein Mistral-OCR-Seitenpreis taucht darin gar nicht auf.

Zweite Einschränkung: Die Instanz hält nur rund **5.000 Ausführungen** vor, ältere werden gelöscht. Siebentageszahlen sind daher Untergrenzen. Wo es darauf ankam, habe ich einen vollständigen Tag gemessen — Donnerstag, den 03.09.2026.

---

## 0. Die Abrechnung — beantwortet am 04.09.2026

**Damit ist die Rangfolge dieser Liste umgeworfen.** Sie stand vorher nach Tokenmenge. Die Tokenmengen waren richtig gezählt, aber falsch gewichtet.

OpenAI, Organisation RWG, 30 Tage vom 05.08. bis 04.09., **67,59 $ gesamt**, 50,97 Mio. Token, 11.598 Anfragen. Nach Modell aufgeschlüsselt (Eingabe, zwischengespeicherte Eingabe und Ausgabe zusammengezogen):

| Modell | Kosten | Anteil |
|---|---|---|
| **gpt-4o** | **46,34 $** | **69 %** |
| gpt-4.1-mini | 9,56 $ | 14 % |
| gpt-5.4 | 6,16 $ | 9 % |
| gpt-4o-mini | 2,21 $ | 3 % |
| gpt-image-1 | 1,51 $ | 2 % |
| gpt-5.4-mini | 0,91 $ | 1 % |
| Websuche | 0,61 $ | 1 % |
| text-embedding-3-small | 0,29 $ | 0,4 % |

Die Summe stimmt auf den Cent mit der Dashboard-Angabe überein.

### Drei Befunde

**1. Zwei Drittel der Rechnung sind ein einziges Modell an einer einzigen Stelle.** `gpt-4o` nutzen laut Inventur vier Knoten: drei im Content Studio und einer in `KI Daily - Analyze` — die laufen dreimal die Woche und fallen nicht ins Gewicht — und das **Bewertungsmodell der Jira-Feldpflege**, das bei rund 317 Ticketereignissen am Tag hängt.

Gegengerechnet: 27,29 $ nicht zwischengespeicherte Eingabe plus 11,31 $ zwischengespeicherte ergeben rund 20 Mio. Eingabetoken in 30 Tagen. Bei rund 4.000 Token je Aufruf sind das etwa 5.000 Aufrufe, also **rund 167 am Tag** — gut die Hälfte der Ticketereignisse. Das passt zur Beobachtung, dass die meisten Läufe 2 bis 5 Sekunden dauern.

**Gemessen am Lauf `114784` vom 03.09.:** Ticket SSD-9297, `Bewertungsmodell` auf `gpt-4o`, **3.962 Eingabe- und 152 Ausgabetoken**. Das Ticket war eine Defender-Schwachstellenmeldung — also genau die Klasse, die der Maschinenfilter seit dem 03.09. abends aussortiert. Wie viel das bereits gebracht hat, zeigt erst die Messung.

**2. Der Jira-Agent, an dem ich zwei Tage gemessen habe, ist neun Prozent.** Die 55.924 Eingabetoken je Ticketlauf sind real, aber es sind nur elf Läufe am Tag. Die Feldpflege ruft ein Fünfzehntel davon je Lauf, aber fünfzehnmal so oft — und `gpt-4o` kostet je Token ein Vielfaches von dem, was diese Rechnung an `gpt-5.4` zeigt, weil dort der Löwenanteil im Cache landet.

**3. Prompt-Caching ist bereits aktiv.** 11,89 $ der Rechnung entfallen auf zwischengespeicherte Eingabe, verteilt über `gpt-4o`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-4.1-mini` und `gpt-4o-mini`. Der frühere Punkt 3 dieser Liste — „Caching prüfen" — ist damit erledigt: Es greift, ohne dass etwas zu tun wäre.

### Was diese Zahlen nicht beantworten

- **Mistral fehlt.** Das nächtliche SharePoint-OCR und der Contract Loader rechnen dort ab, nach Seiten statt nach Token. Punkt 9 bleibt offen, bis die Mistral-Abrechnung danebenliegt.
- **Ob die KAPA-Flows in dieselbe Abrechnung laufen.** Die Auswertung ist die Organisation RWG. Sollte das Content Studio auf einem eigenen Zugang liegen, ist `gpt-4o` hier praktisch ausschließlich die Feldpflege — und der Hebel noch eindeutiger.
- **Die Wirkung der Änderungen vom 03.09.** Der Maschinenfilter lief erst am Abend an; die 30 Tage decken fast nur die Zeit davor ab.

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

## 1. Jira-Agent: ein defektes Werkzeug, ein zu breiter Treffer, ein Selbstgespräch

**Der größte gemessene Hebel — und ein Fehler, der unabhängig von den Kosten behoben gehört. Aufwand: die Fehlerbehebung eine halbe Stunde, der Rest ein halber Tag.**

Gemessen an Lauf `114645` vom 03.09., 12:18 Uhr (Ticket SSD-9299, eine gewöhnliche Verteileranfrage):

| Schritt | Eingabe | Ausgabe | was davor kam |
|---|---|---|---|
| 1 | 4.338 | 81 | — |
| 2 | 4.620 | 57 | `Denkschritt` |
| 3 | 10.694 | 132 | **`Semantische Wissenssuche`: +6.074** |
| 4 | 10.844 | 102 | — |
| 5 | 12.567 | 226 | **`Jira-Altfall lesen`: +1.723** |
| 6 | 12.861 | 1.146 | `Denkschritt` |
| **Summe** | **55.924** | **1.744** | |

Sechs Modellschritte auf `gpt-5.4` für ein Ticket. Entscheidend ist die Bauart eines Agentenzyklus: **jeder Schritt schickt den gesamten bisherigen Verlauf erneut mit.** Was einmal im Kontext liegt, wird bis zum Ende jedes Mal neu bezahlt. Die 6.074 Token aus Schritt 3 stehen deshalb auch in 4, 5 und 6 — rund 24.000 der 55.924 Eingabetoken.

### 1a. `Jira-Altfall lesen` liefert das falsche Ticket — ein Fehler, kein Kostenpunkt

Der Agent fragte nach **SSD-9291**. Zurück kam **SSD-8227**, ein Ticket über einen TÜV-Mangel an einem Lastenaufzug, mitten in einem Fall über Mailverteiler.

Die Ursache steht im Knoten. Er hat zwei Bedingungen auf derselben Spalte:

```
ticket_key eq   {{ $fromAI("ticket_key", …) }}
ticket_key neq  {{ $("Ticketkontext aufbereiten").first().json.ticketKey }}
```

Gemeint ist offensichtlich: „lies genau dieses eine Altticket, aber niemals das gerade bearbeitete". Es fehlt jedoch der Parameter `matchType`, und dessen Vorgabe im Supabase-Knoten ist laut Typdefinition **`anyFilter`**, also ODER. Wirksam ist damit:

```
ticket_key = <angefragt>   ODER   ticket_key <> <aktuelles Ticket>
```

Die zweite Hälfte trifft auf jedes Ticket außer dem aktuellen zu. Zusammen mit `limit: 1` und ohne Sortierung liefert der Knoten eine beliebige Zeile. **Das Werkzeug hat in dieser Form nie funktioniert.**

Die Folgen wiegen schwerer als die Token: Der Agent stützt seine Analyse auf einen zufälligen fremden Vorgang. Nebenbei landet dessen vollständiger Rohdatensatz im Kontext — Beschreibung mit Signaturblock, vier Kommentare mit Signaturen, zwei Safelinks-URLs von je rund 400 Zeichen, Telefonnummern und E-Mail-Adressen. Das sind die 1.723 Token in Schritt 5, danach dreimal mitbezahlt.

**Die Behebung ist ein Parameter:** `matchType: "allFilters"`.

**Stand 04.09.: behoben und publiziert** als `23b634fd`, Rueckfallpunkt `4654fda5`. An einem Wegwerfflow (Lauf `115205`, vier unabhängige Zweige, danach archiviert) wurde die Filterkombination mit festen Werten nachgebaut:

| Fall | Einstellung | Gefragt | Ergebnis |
|---|---|---|---|
| A | `allFilters` | SSD-9291 | **SSD-9291** — richtig |
| B | `allFilters` | SSD-9299, das aktuelle Ticket | leer — richtig |
| C | `allFilters` | eine Nummer, die es nicht gibt | leer — richtig |
| D | ohne `matchType`, wie heute live | SSD-9291 | **SSD-8227**, der TÜV-Aufzug |

Fall D liefert exakt dasselbe falsche Ticket wie der echte Agentenlauf `114645`. Der Fehler ist damit reproduziert, nicht vermutet.

Publiziert wurde genau ein Unterschied: `matchType` von nicht gesetzt auf `allFilters`. 81 Knoten vorher wie nachher, Verbindungen identisch, Filterbedingungen byte-identisch. In der Live-Fassung nachgeprueft.

### 1b. Die Wissenssuche schickt zu jedem Treffer den kompletten Metadatenblock mit

`Semantische Wissenssuche` holt `topK: 20` und lässt den Cohere-Reranker auf `topN: 8` kürzen. Zurück gehen acht Dokumente, jedes als JSON aus `pageContent` **und dem vollständigen Metadatenobjekt** der Zeile.

In diesen Metadaten steht unter anderem: `content_hash`, `loesung_schluessel`, `analyse_schluessel` (je 64 Zeichen Hexadezimal), `storage_path`, `storage_bucket`, `related_image_url`, `normalized_size_bytes`, `original_mime_type`, `normalized_mime_type`, `vision_model`, `vision_prompt_version`, `solution_model`, `solution_prompt_version`, `rag_flow_version`, `noise_filter`, `attachment_id`, `comment_id`, `part`, leere `labels`- und `components`-Listen. **Nichts davon hilft dem Modell beim Denken.** Gebraucht werden Titel, Ticketschlüssel, Status, Resolution, `chunk_type`, `audience` und die URL.

Dazu kommt die Trefferqualität: Von den acht Dokumenten trafen bei einer Frage nach Mailverteilern nur drei das Thema. Die übrigen waren eine Bildanalyse zu einem Exchange-Zustellfehler, eine Word-Serienbrief-Anleitung und eine zweite Bildanalyse zu Connector-Fehlern.

**Einschränkung, ehrlich:** Was der Vektorspeicher-Knoten zurückgibt, kommt aus der Datenbankfunktion `funktion_match_document_chunks`. Den Metadatenblock dort zu beschneiden hieße, diese Funktion zu ändern — das ist ausdrücklich ausgeschlossen. Ohne Eingriff in die Datenbank bleiben zwei Wege: `topN` im Reranker von 8 auf 5 senken, oder den Vektorspeicher-Knoten durch ein eigenes Werkzeug ersetzen, das nur die gebrauchten Felder zurückgibt. Der erste Weg ist sofort machbar, der zweite ist ein kleiner Umbau.

### 1c. `Denkschritt` kostet zwei von sechs Modellschritten

`Denkschritt` ist ein `toolThink`-Knoten: Er gibt zurück, was hineingeht. Im gemessenen Lauf wurde er zweimal gerufen — einmal vor den Suchen, einmal danach — und lieferte beide Male den Text des Modells wortgleich zurück.

Zwei der sechs Schritte dienen also dem Selbstgespräch. Fachlich hat das einen Zweck: Es zwingt den Agenten, seine Suchabsicht zu formulieren und die Treffer danach zu bewerten, und genau das steht so in der Recherchepflicht des Systemtextes. Es kostet aber zwei vollständige Runden mit dem gesamten Verlauf.

**Nicht ohne Messung streichen.** Zu prüfen wäre, ob ein Denkschritt statt zwei reicht — der zweite, der die Treffer bewertet, trägt mehr als der erste. Vorher/nachher an denselben Tickets vergleichen.

### Reihenfolge innerhalb von Punkt 1

1. `matchType` in `Jira-Altfall lesen` — Fehlerbehebung, sofort, unabhängig von allem anderen.
2. `topN` im Reranker von 8 auf 5.
3. Denkschritt-Zahl prüfen.
4. Erst danach der Umbau des Wissenssuche-Werkzeugs, falls die Messung ihn noch rechtfertigt.

**Vorher/nachher belegen:** derselbe Ticketinhalt, Tokenzahl je Schritt aus dem Lauf, und die fachliche Bewertung des Agenten vergleichen. Nicht publizieren, bevor drei Tickets zeigen, dass die Antwort gleich gut bleibt.

### Was ich am 04.09. korrigiert habe

Die erste Fassung dieser Liste schrieb den Sprung in Schritt 3 der Rückgabe von `Public Wissen hybrid abrufen` zu — „24 Kandidaten mit vollem Chunktext". Das war falsch. Dieser Knoten hängt gar nicht am Agenten: Er läuft in der Hauptkette **nach** ihm und speist über die `Evidenzschranke` die Policy-Stufe auf `gpt-5.4-mini`. Seine 24 Kandidaten waren nie im `gpt-5.4`-Kontext.

Am Agenten hängen genau vier Werkzeuge: `Semantische Wissenssuche`, `Volltextsuche Wissensbasis` (lieferte in diesem Lauf null Treffer), `Jira-Altfall lesen` und `Denkschritt`. Die Ursache des Sprungs war also eine andere — und die Entdopplung nach `sourceRef`, die ich vorgeschlagen hatte, greift an der falschen Stelle. Der Reranker liefert bereits acht verschiedene Dokumente.

**Kein Hebel:** Am 03.09. hatte ich vermutet, die Ergebnislänge sei über die 1800-Zeichen-Kappung zu drücken, und das nach einer Messung verworfen — in jenem Lauf hatten die Werkzeuge null Treffer geliefert, die Kappung griff also nirgends. Die Messung war nicht falsch, aber nicht aussagekräftig.

---

## 2. Jira-Agent: der Systemtext steht sechsmal im Lauf

**Aufwand: zwei Stunden Schreibarbeit. Risiko: mittel — am Systemtext hängt das fachliche Verhalten.**

Der Systemtext von `Interner Support-Analyst` ist **14.209 Zeichen**, grob 3.550 Token. Bei sechs Schritten sind das rund **21.300 Token je Ticket**, weitere 38 Prozent der Eingabe.

Zusammen mit Punkt 1 sind damit etwa vier Fünftel der 55.924 Eingabetoken erklärt.

Eine Kürzung um ein Drittel spart rund 7.000 Token je Ticket. Das ist kein Umbau der Fachlogik, sondern Redaktionsarbeit: Wiederholungen streichen, Beispiele zusammenziehen, Regeln nicht dreimal in anderen Worten wiederholen. **Jede Regel, die entfällt, kann Verhalten ändern** — deshalb einzeln und mit Gegenprobe an echten Tickets, nicht in einem Rutsch.

Zum Vergleich: Der Teams-Agent trägt 10.457 Zeichen (~2.600 Token) im Systemtext, bei 237 Läufen in sieben Tagen. Dieselbe Rechnung, kleinerer Faktor.

---

## 3. ~~Prompt-Caching prüfen~~ — erledigt, es greift bereits

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

**Stand 04.09.: erledigt.** UPDATE 1274, Lauf 115140. Alle 1.390 Lösungschunks tragen jetzt einen Schlüssel, keiner mehr ohne.
Alles Folgende ist lesend an der Wissensbasis gemessen; geschrieben wurde nichts.

- 1.389 Lösungschunks, **115 mit Schlüssel, 1.274 ohne**. Alle 1.274 tragen `content_hash`, `status` und `resolution` in den Metadaten — der Schlüssel ist also rechnerisch ableitbar.
- **Gegenprobe:** Die Ableitung auf die 115 vorhandenen Schlüssel angewandt ergibt **115 von 115 exakte Treffer, null Abweichungen.** Die Formel ist damit an echten Daten belegt.
- Bei allen 1.274 stimmen `status`, `resolution` und `resolved_at` in den Metadaten mit dem überein, was im Chunktext wörtlich steht. Die Metadaten beschreiben denselben Stand wie der Text.
- Alle 1.389 stammen vom selben Modell und derselben Flow-Fassung. Beide Gruppen sind strukturell gleich — sechs Abschnitte in 100 Prozent der Fälle, Durchschnittslänge 821 gegen 818 Zeichen. Der Extraktions-Prompt wurde zwischen ihnen nicht geändert.
- Alle 1.274 Tickets sind auffindbar, Status und Resolution haben sich seither nicht bewegt; 1.264 sind bereits geschlossen.
- Probelauf: 1.274 Zeilen, 1.274 verschiedene Schlüssel, keine Kollision.

Eine Korrektur zur ersten Annahme: Die 1.274 sind **nicht** einfach „die älteren". Beide Gruppen überlappen zeitlich. Die 115 sind die, die seit Einführung der Cache-Logik einmal angefasst wurden.

Das SQL mit Probelauf, Nachweis und Rücknahme steht in [flows/rag-jira-ingest/loesungsschluessel-nachtrag.sql](flows/rag-jira-ingest/loesungsschluessel-nachtrag.sql). Geändert wurden ausschließlich Schlüssel innerhalb von `metadata`; `chunk_text` und `embedding` blieben unberührt.

**Nachweis nach dem Lauf:** Die Gegenprobe über den gesamten Bestand reproduziert jeden Schlüssel exakt — 116 ursprüngliche und 1.274 nachgetragene, null Abweichungen. Das Statement ist zudem selbstbegrenzend: Ein zweiter Lauf träfe null Zeilen.

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

## 6. ~~Der Monitor-Flow scheitert alle 15 Minuten~~ — erledigt

`RWG Monitor - Microsoft Graph & Teams` (`1OcqfC4wTC9bj0wK`) meldete bei jedem Lauf einen Fehler und zog jedes Mal `Telegram_Error_Info` hinterher — 96 Meldungen am Tag.

Er war nicht defekt, sondern hat seine Aufgabe erfüllt: Dem Automatisierungskonto `rwg_automate@rwg-r.de` fehlte die Office-365-Lizenz, `GET /me/chats` antwortete mit HTTP 403. **Am 04.09. hat das Konto eine Lizenz bekommen.** Der Alarm sollte damit von selbst aufhören.

**Nachzusehen:** ob seither noch Fehlläufe entstehen. Wenn ja, ist es doch ein zweites Problem.

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

Das ist gewollt gewesen — Screenshots sollen durchsuchbar sein. Ob sie auch als Trefferkandidaten an ein Modell gehen sollen, ist eine eigene Entscheidung. Im gemessenen Lauf kamen sie ueber zwei Wege in den Kontext: als Bildanalyse-Treffer der semantischen Wissenssuche und als Rohdatensatz des falsch gelieferten Alttickets (Punkt 1a). Der zweite Weg entfaellt mit der Fehlerbehebung. Fuer den ersten ist zu entscheiden, ob Bildanalysen ueberhaupt Trefferkandidaten sein sollen.

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

## 11. Jira-Feldpflege: das Bewertungsmodell war die Rechnung

**Zwei Drittel der OpenAI-Rechnung hingen an diesem einen Knoten. Am 04.09. nachgemessen: die Aenderungen vom 03.09. haben den Verbrauch dort um rund Faktor 8 gesenkt — der Punkt erledigt sich womoeglich von selbst.**

Die Feldpflege bewertet Support-Level und Betriebssignale mit `gpt-4o`, bei rund 167 Modellaufrufen am Tag und rund 4.000 Eingabetoken je Aufruf. Drei Hebel, aufsteigend nach Risiko:

### 11a. Was der Filter schon gebracht hat — am 04.09. gemessen

**Ergebnis: rund Faktor 8. Damit ist 11c wahrscheinlich hinfällig und 11b nur noch klein.**

Zwei Wirkungen greifen zusammen, beide seit dem 03.09. abends live: der Maschinenfilter am Eingang und das Sammelfenster, das mehrere Ereignisse zum selben Ticket zu einem Anspruch zusammenzieht.

**Wie viele Läufe überhaupt noch ein Modell erreichen.** Läufe, die über das Sammelfenster gehen, dauern rund 244 Sekunden und rufen danach das Modell; früh beendete liegen unter einer Sekunde. Damit lassen sie sich ohne Einzelabruf zählen.

| Fenster | Läufe | mit Modellaufruf |
|---|---|---|
| 03.09., 14:45–16:00 Ortszeit (Stichprobe 40) | 40 | 31 — **78 %** |
| 04.09., 08:18–09:50 Ortszeit (vollständig) | 57 | 7 — **12 %** |

**Was ein Aufruf noch verbraucht.** Gemessen an zwei echten Läufen:

| Lauf | Ticket | Eingabe | Ausgabe |
|---|---|---|---|
| `114784`, 03.09. | SSD-9297, Defender-Schwachstellenmeldung | 3.962 | 152 |
| `115293`, 04.09. | SSD-9312, echtes Anwenderticket | 2.112 | 157 |

Das ist der zweite Effekt, und er war nicht geplant: **Die teuren Fälle waren gerade die, die der Filter jetzt aussortiert.** Maschinentickets schleppen Safelinks-URLs von je 800 bis 1.000 Zeichen mit; ein von Hand geschriebenes Ticket hat das nicht.

**Hochgerechnet je Tag**, grob und aus einem Fenster von anderthalb Stunden:

- vorher rund 167 Aufrufe × 3.962 Token ≈ 660.000 Eingabetoken
- nachher rund 39 Aufrufe × 2.112 Token ≈ 82.000 Eingabetoken

**Verhältnis rund 8 zu 1.** Auf die Rechnung übertragen hieße das: die 46,34 $ auf `gpt-4o` fielen in die Größenordnung von 6 $ im Monat.

**Vorsicht mit dieser Zahl.** Sie stammt aus anderthalb Stunden an einem Vormittag. Ticketaufkommen schwankt über den Tag und über die Woche, und der 03.09. war der Tag der abendlichen Sammelschließung. Belastbar wird das erst mit einem vollen Tag und, endgültig, mit der nächsten Monatsabrechnung.

**Was daraus folgt:**

- **11b (Safelinks kürzen)** wirkt jetzt nur noch auf echte Tickets, und die tragen kaum solche URLs. Der Hebel ist von „ein erheblicher Teil von 4.000 Token" auf „wenig" geschrumpft. Zurückgestellt.
- **11c (kleineres Modell)** war der Vorschlag, weil zwei Drittel der Rechnung an diesem Knoten hingen. Wenn daraus 6 $ im Monat werden, steht das Qualitätsrisiko in keinem Verhältnis mehr. **Vorschlag: nicht machen.**
- Stattdessen: **eine Woche laufen lassen und die Abrechnung erneut ansehen.** Wenn `gpt-4o` dann tatsächlich einstellig ist, ist das Kostenthema an dieser Stelle erledigt und die nächstgrößte Position ist `gpt-4.1-mini` im Jira-Ingest mit 9,56 $.

### 11b. Die Safelinks-URLs aus der Beschreibung werfen — zurueckgestellt

**Nach der Messung in 11a nur noch ein kleiner Hebel.** Die Beschreibung unten stammt vom Stand vor der Messung.

**Geringes Risiko, sofort machbar.** Im gemessenen Aufruf besteht ein erheblicher Teil der 3.962 Eingabetoken aus drei Outlook-Safelinks-URLs von je rund 800 bis 1.000 Zeichen prozentkodiertem Text. Für die Bewertung von Support-Level und Betriebssignalen trägt keine davon etwas bei.

`Ticketkontext aufbereiten` bereinigt bereits Signaturen. Dieselbe Stelle könnte URLs auf ihren Host kürzen oder ganz ersetzen. Das ist dieselbe Bauart von Änderung, die für die Signaturen schon belegt ist — inklusive der Kennzahl `bereinigung.verworfen`, an der sich die Wirkung ablesen lässt.

### 11c. Modellwechsel auf ein kleines Modell — nicht empfohlen

**Nach der Messung in 11a entfaellt die Begruendung.** Wenn aus 46 $ rund 6 $ werden, steht das Qualitaetsrisiko in keinem Verhaeltnis. Die Ueberlegung bleibt hier stehen, falls die Zahlen sich anders entwickeln.

**Der große Hebel, mit echtem Qualitätsrisiko.** Die Aufgabe ist eine Einstufung nach festen Regeln mit festem Ausgabeschema — keine freie Textproduktion. Genau dafür sind die kleinen Modelle gedacht, und sie kosten je Token um eine Größenordnung weniger.

Das ist **nicht** nebenbei zu entscheiden. Die Einstufung schreibt in echte Jira-Tickets, und `confidence HIGH` verlangt eine wörtliche Fundstelle als Beleg — das ist genau die Art Anforderung, an der kleinere Modelle scheitern können.

**Vorgehen, wenn überhaupt:** Zwanzig bis dreißig echte Tickets mit bekannter Einstufung durch beide Modelle schicken, ohne zu schreiben, und die Ergebnisse Feld für Feld vergleichen — `level`, `confidence`, `scope`, `businessImpact`, `securityRisk`. Erst wenn das kleine Modell dieselben Einstufungen mit derselben Belegqualität liefert, ist der Wechsel vertretbar. Weicht es ab, bleibt es bei `gpt-4o`, und 11a plus 11b sind das Erreichbare.

---

## Was schon erledigt ist

Damit die Liste nicht suggeriert, es sei nichts passiert:

| Wann | Was | Wirkung |
|---|---|---|
| 03.09. | Feldpflege: Maschinentickets als nativer Filter am Eingang, Sammelfenster, keine Bewertung bei Done-Status | verhindert `gpt-4o`-Aufrufe, Wirkung noch nachzumessen |
| 03.09. | Content Studio: Videostrang entfernt | ein `gpt-4o-mini`-Aufruf je Lauf, auch vor jeder Ablehnung |
| 03.09. | Content Studio: Ankerfilter vor der Themenwahl | kein Modellaufruf für Themen, die die eigene Prüfung nicht bestehen können |
| 04.09. | Jira-Agent: `matchType` in `Jira-Altfall lesen` | das Werkzeug liefert wieder den angefragten Vorgang statt eines zufälligen fremden |
| 04.09. | Lizenz für `rwg_automate@rwg-r.de` erteilt | der 15-Minuten-Alarm des Healthchecks sollte aufhören |
| 04.09. | Jira-Ingest: Lösungsschlüssel für 1.274 Chunks nachgetragen | der Cache kann überhaupt erst greifen; Wirkung noch nachzumessen |
| 02.09. | Contract Loader auf `mistral-medium` | Beleg mit echter neuer Datei steht noch aus |

## Reihenfolge, wenn nichts dazwischenkommt

Am 04.09. zweimal neu geordnet: erst nach der Abrechnung, dann nach der Messung in 11a.

1. **Nichts bauen, eine Woche laufen lassen.** Die Aenderungen vom 03.09. haben den groessten Posten laut Messung um rund Faktor 8 gesenkt. Das ist an anderthalb Stunden gemessen und muss sich an einem vollen Monat bestaetigen.
2. **Danach die Abrechnung erneut ansehen.** Ist `gpt-4o` dann einstellig, ist das Kostenthema an der Feldpflege erledigt.
3. **Punkt 9 — Mistral-Abrechnung.** Der einzige groessere Posten, der noch gar nicht beziffert ist. Unabhaengig von allem anderen.
4. **Punkt 4 Rest** — messen, wie oft der Loesungscache jetzt greift, danach ueber Erledigt/Geschlossen entscheiden. Zielt auf die 9,56 $ bei `gpt-4.1-mini`, die dann die groesste Position waeren.
5. **Punkt 1b und 1c** — Reranker und Denkschritte im Jira-Agenten, 9 % der Rechnung.
6. **Punkt 2** — Systemtext des Agenten. Dasselbe Neuntel, mehr Aufwand, mehr Risiko. Zurueckgestellt.
7. Der Rest nach Lage.

**Erledigt und aus der Liste genommen:** Punkt 0 (Abrechnung), Punkt 3 (Caching greift bereits), Punkt 6 (Lizenz erteilt), Punkt 1a (`matchType` behoben), Punkt 4 Nachtrag (Schluessel gesetzt).

**Nicht empfohlen:** Punkt 11c, Modellwechsel an der Feldpflege. Die Begruendung ist mit 11a entfallen.
