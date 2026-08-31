# RAG - SharePoint Ingest

Der Flow (`BBhGCRsQ8pdNSxTi`), der SharePoint-Dokumente in die Wissensbasis bringt. **Ein Flow für alles** — er holt sich die Änderungen selbst, verarbeitet sie und schreibt sie fort. Kein Webhook, kein Power Automate, kein zweiter Flow.

## Zwei Betriebsarten, ein Verarbeitungsweg

| | Takt | Was |
|---|---|---|
| **Delta** | stündlich (`0 * * * *`) | nur Änderungen seit dem letzten Anker |
| **Abgleich** | nachts (`30 3 * * *`) | voller Vergleich SharePoint ↔ Wissensbasis |

### Warum es beide braucht

Der Delta-Abruf ist schnell und billig: Microsoft Graph liefert genau das, was sich seit dem gespeicherten `deltaLink` geändert hat. Ohne Änderungen ist der Lauf nach einer halben Sekunde fertig.

**Aber er meldet jede Löschung genau einmal.** Scheitert der Lauf, in dem sie kommt, ist die Meldung fort — und der Eintrag bliebe für immer in der Wissensbasis stehen. Am 29.08. ist genau das zweimal passiert, weil Läufe abbrachen.

Der Abgleich hält den vollständigen SharePoint-Bestand gegen die Wissensbasis und findet drei Dinge:

- **fehlend** — liegt in SharePoint, steht nicht im RAG
- **veraltet** — in SharePoint neuer als die letzte Einlesung
- **verwaist** — steht im RAG, liegt nicht mehr in SharePoint

Der Vergleich selbst kostet **keine OCR**. Nur was wirklich fehlt oder sich geändert hat, wird verarbeitet. Damit erledigt derselbe Mechanismus Erstbefüllung, Lückenschluss und Verwaisten-Bereinigung.

## Zwei Sicherungen

**Beim Verwaist-Befund** gilt nur als verwaist, was eine **Graph-Item-ID** trägt und damit nachweislich aus dieser Bibliothek stammt. Die Wissensbasis enthält auch Dokumente aus der Power-Automate-Zeit (`RWGID-…`), deren Herkunft sich nicht sicher bestimmen lässt — der Pfad wurde dort anders geschrieben. Die bleiben unangetastet.

Zusätzlich bricht der Abgleich ab, wenn mehr als ein Fünftel der zuordenbaren Dokumente als verwaist gälte. Dann stimmt etwas nicht, und es wird gemeldet statt gelöscht.

**Die Mengenbremse** begrenzt jeden Lauf auf `maxJeLauf` Einlesungen. Eine große PDF braucht mehrere Minuten in der OCR; ohne Bremse liefe der Abgleich in den Zeitrahmen. Löschungen sind billig und bleiben unbegrenzt. Was diesmal nicht drankommt, findet der nächste Abgleich wieder.

## Aufbau

```
Stuendlich (Delta) ─┐
Taeglich (Abgleich) ─┼→ Steuerung → Anker laden → SharePoint-Bestand
Manueller Start ────┘                              → Wissensbasis-Bestand
                                                   → Aufgaben bestimmen
                                                   → Etwas zu tun ─┬ [nein] Laufbilanz
                                                                    └ [ja]  Je Aufgabe (Schleife)
                                                                            → Was tun ─┬ datei
                                                                                        ├ tabelle
                                                                                        └ loeschen
                                                                            → Uebergabe brauchbar
                                                                            → Config → [die bestehende Verarbeitung]
                                                   Je Aufgabe [fertig] → Anker fortschreiben → Laufbilanz
```

Die Verarbeitung selbst — OCR, Bilderkennung, Chunking, Embedding, Löschzweig — ist unverändert. Nur die Zuleitung ist neu.

## Drei Wege je Dokument

**Datei** — PDF, Text und alles Übrige direkt über `/content`. **Word und PowerPoint** bekommen `?format=pdf` angehängt: Microsoft wandelt sie selbst um, und sie laufen durch dieselbe OCR-Strecke wie die PDFs. Bei PowerPoint zahlt sich das besonders aus — Mistral erfasst dann auch die Folienbilder. Eine Datei mit 1 360 Wörtern lieferte so neun Textstücke **und 20 beschriebene Bilder**.

**Tabelle** — Arbeitsmappen laufen über die Workbook-API, Blatt für Blatt. Der Extract-Node kennt nur `sheetName` für ein einzelnes Blatt und liest sonst lautlos nur das erste. Alle Blätter werden zu einer CSV mit dem Blattnamen als erster Spalte.

Dabei wird jedes Blatt eingeschätzt: Echte Tabellen kommen mit ihren Spalten, Notizen und Formulare als Text unter `Blatt / Zeile / Inhalt`. **Die Kopfzeile wird gesucht, nicht angenommen** — sie steht selten in Zeile 1, darüber liegen Titel und Leerzeilen.

**Löschen** — Delta meldet entfernte Einträge mit `deleted`-Vermerk, der Abgleich findet Verwaiste. Beide münden in den bestehenden Löschzweig.

## Der Übergang von Power Automate

Beide Wege vergaben unterschiedliche Kennungen für dieselbe Datei. `Aufgaben bestimmen` prüft deshalb, ob eine gleichnamige Datei bereits unter fremder Kennung liegt, und merkt sie als `alt_doc_id` vor. So wandert der Altbestand nach und nach über.

**Stand 30.08.:** 256 Dokumente in der Wissensbasis, davon 247 mit Power-Automate-Kennung. 490 Dateien fehlen noch — Power Automate hatte nur PDF und Excel geschickt, Word und PowerPoint nie. Bei 20 je Nacht dauert das Aufholen rund 25 Tage; für eine schnellere Erstbefüllung `maxJeLauf` vorübergehend erhöhen.

## Abgeschaltet

| Node | Warum |
|---|---|
| `Webhook SharePoint` | Power Automate wird nicht mehr gebraucht. Bleibt als Rückweg stehen. |
| `Aufruf aus Delta-Leser` | Der getrennte Delta-Leser ist in diesen Flow aufgegangen und archiviert. |

Der Power-Automate-Flow selbst liegt außerhalb von n8n und muss dort entfernt werden — erkennbar am Ziel `.../webhook/8e16e07b-d272-4147-a2a2-80694afd9007`.

## Zeitzone

Der n8n-Server läuft auf **UTC**. Ohne ausdrückliche Angabe würde `30 3 * * *` also um 05:30 Berliner Zeit feuern, nicht um 03:30. Der Flow trägt deshalb `timezone: Europe/Berlin` in den Einstellungen — die Cron-Zeiten sind damit Ortszeit.

## Zustandsspeicher

Data Table `sharepoint_delta` (`RbdhNeubkrmgZkOC`), eine Zeile je Bibliothek. Der Anker rückt **nur vor, wenn tatsächlich verarbeitet wurde** — ein Trockenlauf lässt ihn stehen, sonst gingen ungelesene Änderungen verloren.

## Ein gescheitertes Bild beendet den Lauf nicht

Große PDFs bringen hunderte Bilder mit, die einzeln in den Speicher-Bucket wandern. Ein einziger Netzabbruch dabei hat den **gesamten nächtlichen Abgleich** mitgerissen — inklusive aller Dateien, die noch drankommen sollten.

`Upload Extracted Image To Supabase` läuft deshalb bei Fehler weiter, statt abzubrechen, und wiederholt fünfmal im Abstand von fünf Sekunden. `Build Uploaded Image Metadata` sortiert die gescheiterten Zeilen aus — sonst stünde im Chunk ein Speicherpfad, unter dem nichts liegt. Zugeordnet wird über den Index, deshalb wird erst abgebildet und dann gefiltert.

Scheitern **alle** Bilder eines Dokuments, liefert `Collect Uploaded Images` dank `alwaysOutputData` trotzdem ein Item. `Build All SharePoint Chunk Rows` behandelt einen fehlenden Bildsatz als leere Liste — das Dokument bekommt seinen Text und seine Chunks, nur ohne Bilder.

**Der Preis:** Ein verlorenes Bild fällt nicht auf. Es gibt keine Meldung, nur eine kürzere Bildliste am Dokument. Das ist bewusst so — ein durchgelaufener Abgleich mit einem fehlenden Bild ist mehr wert als ein abgebrochener mit vollständigen Bildern.

## Ein ausgefallener Dienst beendet den Lauf nicht

Die OCR hängt an einem einzigen Anbieter. Ist der nicht erreichbar — Kontingent erschöpft, Abo abgelaufen, Ratengrenze —, scheitert **jede** Aufgabe, die durch die OCR muss. Ohne Absicherung reißt die erste davon den ganzen Lauf mit, und zwar samt allem, was danach käme: auch die Tabellen und Textdateien, die den Dienst gar nicht brauchen.

**Schwerer wiegt, was dabei nicht mehr passiert.** Ein abgebrochener Lauf erreicht weder `Laufbilanz` noch `Anker fortschreiben`. Es gibt keine Bilanz, und der Delta-Anker bleibt stehen — der nächste stündliche Lauf liest dasselbe Fenster erneut, tagelang, ohne dass es auffällt.

`Upload Source To Mistral`, `Get Mistral Signed URL` und `Mistral OCR And Visual Annotations` gehen deshalb bei Fehler in ihren Fehlerausgang. `Dienst nicht verfuegbar` ordnet den Ausfall ein, protokolliert ihn nach `ingestion_errors` und führt über `Ingest Error Summary` zurück in die Schleife. Die Aufgabe gilt als **zurückgestellt**, nicht als gescheitert: Die Laufbilanz zählt `zurueckgestellt` getrennt von `fehler` und nennt die betroffenen Dateien mit Grund.

**Eingeordnet wird über den Meldungstext, nicht über den HTTP-Code.** Der Fehlerausgang liefert weder `httpCode` noch den Knotennamen mit — der Knoten kommt deshalb aus `$prevNode`. Unterschieden werden `KONTINGENT_ERSCHOEPFT`, `RATE_LIMIT`, `ZUGANG` und `DIENST_GESTOERT`.

**Übernommen wird nur Meldung, Knotenname und HTTP-Code.** Das Rohobjekt bleibt außen vor: n8n legt bei HTTP-Fehlern das komplette Request-Objekt samt Zugangsdaten im Klartext ab, und diese Zeile geht in die Datenbank.

**Damit die Rückstellung nicht lautlos bleibt**, hängen hinter `Laufbilanz` das IF `Etwas zurueckgestellt` und der Telegram-Node `Rueckstellung melden`. Ein zurückgestellter Lauf ist grün, der Error Trigger feuert also nicht — ohne diese Meldung stünde die liegengebliebene Arbeit nur in der Bilanz und in `ingestion_errors`, wo sie niemand sieht. Gemeldet wird über denselben Bot wie die Fehlermeldungen, mit der Kopfzeile `[ZURUECKGESTELLT]` und den betroffenen Dateien.

**Der Node sendet mit `parse_mode: HTML`, und die Dateiliste wird maskiert.** Telegram liest jede Nachricht als Markup: Der Unterstrich in `KONTINGENT_ERSCHOEPFT` blieb ohne Gegenstück und ließ den Versand mit `can't parse entities` scheitern. Weil SharePoint-Dateinamen `&`, `<` und `>` tragen können, werden die drei ersetzt. Der Node trägt `onError` — eine klemmende Meldung darf den Ingest nicht kosten.

**Der Preis:** Die zurückgestellte Datei bleibt unbearbeitet liegen. Sie wird beim nächsten Lauf wieder gezogen — solange der Dienst klemmt, jedes Mal. Das ist gewollt: Ein durchgelaufener Abgleich mit einer liegengebliebenen Datei ist mehr wert als ein abgebrochener, der den Anker einfriert.

## Zwei Fallstricke, die hier zuschlugen

**Der Ingest verarbeitet je Aufruf genau ein Dokument.** Er liest seine Eingabe mit `$input.first()`. Zehn Aufträge in einem Aufruf werden zu einem, der Rest fällt lautlos weg. Deshalb die Schleife mit `batchSize: 1`.

**In einer Schleife liefert `$('Node').all()` nur den letzten Durchlauf.** Die Bilanz sah bei vier Dokumenten nur das vierte. Die Sammelfunktion zählt deshalb den Durchlaufindex hoch, bis kein Durchlauf mehr kommt.

**Und beim Messen:** PostgREST liefert höchstens 1 000 Zeilen je Anfrage — ein `limit` im Querystring hebt das nicht auf.
