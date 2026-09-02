# RWG Contract Loader

`661BDwEditNicEc0` — holt Vertrags-PDF aus SharePoint, liest sie per Mistral OCR, extrahiert 18 Vertragsfelder, schreibt nach `public.vertraege` im Projekt `zckaxkpycyyxaymmkmvu` (RWG Rheinland eG / RAG), legt die verarbeitete Datei nach `DONE` und erzeugt die Excel-Übersicht neu.

## Wo die Dokumente liegen

| | Wert |
|---|---|
| Site | `https://rwgrheinland.sharepoint.com/sites/rwgintranet` |
| Bibliothek | „Dokumente", intern `Documents` |
| Drive-ID | `b!C2yhEx592Ei36yvay6U9n2886_vvW61LokJwBCKhlW_uiHYCBMlCRaEn9mGTdB1m` |
| Eingang | `/IMPORTER/CONTRACT` |
| Ablage | `/IMPORTER/CONTRACT/DONE` |
| Fehlerablage | `/IMPORTER/CONTRACT/FEHLER` |
| Excel | `/IMPORTER/CONTRACT/Vertragsuebersicht.xlsx` |

Der Ablageordner heißt **`DONE`**, nicht `Erledigt`. Er besteht seit dem 08.03.2026 und war bereits gefüllt, als der Neuaufbau begann. Ein zweiter Ordner daneben hätte die Historie geteilt.

`FEHLER` legt der Flow selbst an, falls er fehlt. Beide Ordner-IDs werden **nicht** fest hinterlegt, sondern bei jedem Lauf aus dem Verzeichnis gelesen. Wird ein Ordner neu angelegt oder ersetzt, findet der Flow ihn trotzdem.

## Ablauf

```
Zeitplan (stuendlich) -> Steuerung -> Eingang lesen -> Fehlerordner sichern
                                                    -> Nur PDF -> Je Datei
                                                                     |
   +-----------------------------------------------------------------+
   v
Datei holen -> Hash bilden -> Zeile sichern -> Datei und Stand vereinen
                                                        v
                                                      Weiche
                        +-------------------------------+------------------------------+
                        | abgelegt                      | OCR vorhanden                | neu
                        v                               v                              v
              Nach DONE verschieben        Vorhandenen OCR-Text laden     Datei zu Mistral
                        ^                               |                  -> Signierte URL
                        |                               |                  -> OCR
                        |                               |                  -> OCR-Text sichern
                        |                               |                  -> OCR schreiben
                        |                               +------------+-----------------+
                        |                                            v
                        |                                   Extraktionsauftrag
                        |                                -> Vertragsdaten extrahieren
                        |                                -> Ergebnis auswerten
                        +--------------------------------- Vertragsdaten schreiben
                        v
                Ablage vermerken -> naechste Datei

Fehlerausgaenge -> Fehler vermerken (versuche + 1) -> Zu viele Versuche?
                                        nein: naechste Datei
                                        ja:   Nach FEHLER verschieben
                                              -> Ablage FEHLER vermerken

nach der letzten Datei:  Liste holen -> Als Excel -> Excel ablegen
```

## Die Entscheidungen dahinter

**Jedes Vertragsfeld doppelt: als Klartext und als ausgewerteter Wert.** `laufzeit_ende_text` hält, was im Vertrag steht — auch „bis auf Widerruf" oder „31.12. des Folgejahres". `laufzeit_ende` als `date` wird nur gefüllt, wenn es eindeutig ist. Wer nur typisierte Spalten führt, verliert genau die Fälle, die später Ärger machen; wer nur Text führt, kann nicht nach auslaufenden Verträgen fragen.

**Der OCR-Text bleibt gespeichert.** `ocr_text` und `rohdaten` erlauben eine erneute Auswertung ohne neue OCR. Wird der Extraktionsprompt besser — und das wird er, das Ziel ist „bestmögliche Erkennung" —, laufen alle Altverträge in Sekunden neu durch, ohne einen Cent für Mistral.

**Deshalb überspringt `Weiche` die OCR, wenn `ocr_text` schon steht.** Ohne diesen Zweig liefe ein liegengebliebenes Dokument bei jedem stündlichen Versuch erneut durch die Erkennung — und würde jedes Mal neu bezahlt. Gemessen: mit OCR 53,6 Sekunden, ohne 18,8.

**Nach drei Fehlversuchen wandert die Datei nach `FEHLER`.** Vorübergehende Störungen — ein Netzabbruch, ein erschöpftes Modellkontingent — heilen von selbst, weil der nächste Lauf es ohne neue OCR erneut versucht. Was dreimal scheitert, ist keine Störung mehr, sondern ein Fall für einen Menschen; dann ist der Eingang wieder sauber und nichts läuft endlos im Kreis. Die Grenze steht als `maxVersuche` in `Steuerung`, der Zähler als `versuche` in der Tabelle.

**Erst schreiben, dann verschieben.** Bricht der Lauf zwischen OCR und Extraktion ab, liegt die Datei noch im Eingang und der nächste Lauf holt sie erneut. Der Hash verhindert die Dublette, der Status sagt, wie weit sie kam. `abgelegt_am` wird erst gesetzt, wenn die Datei tatsächlich in `DONE` liegt.

**Die Excel wird bei jedem Lauf vollständig neu erzeugt**, nicht zeilenweise fortgeschrieben. Anhängen bedeutet, den Stand an zwei Orten zu führen; nach dem ersten abgebrochenen Lauf weichen sie voneinander ab, und niemand merkt es. Neu erzeugen ist immer deckungsgleich mit der Datenbank. Der Preis: Handeingaben in der Datei überleben einen Lauf nicht. Die Datei ist Ergebnisliste, kein Eingabemedium.

**`status` und `versuche` stehen ganz vorn, Fertiges steht oben.** Sortiert wird `abgelegt`, `extrahiert`, `ocr`, `neu`, `fehler` — wer die Datei öffnet, sieht zuerst die fertigen Verträge und muss bis zu den Problemfällen scrollen. Die Fehler stehen mit in derselben Datei und nicht daneben: Eine getrennte Fehlerliste öffnet niemand.

**Der Hash läuft über die Dateibytes**, nicht über eine Base64-Zeichenkette wie im alten Flow. Damit ist er unabhängig davon, auf welchem Weg das Dokument hereinkommt.

## Die Extraktion

`mistral-medium-latest`, `temperature: 0`, `response_format: json_object`. Achtzehn Felder, alle als Pflichtsuche benannt:

Definition, Mandant, Vertragsart, Vertragspartner, Lieferantennummer, Vertragsnummer, Laufzeit Beginn, Laufzeit Ende, Intervalle, Verlängerung, Kündigungsfrist, Kündigung zum, Preis Netto, Preis Brutto, Kosten Jährlich, Sparte/Bereich, Standortinfo, **Kostenstelle**.

**Kostenstelle ist neu.** Der alte Flow hatte die Spalte in seiner Data Table und schrieb sie beim Insert — aber der Prompt fragte das Feld nirgends ab. Der Wert war seit jeher leer.

**Warum nicht `mistral-large-latest`.** Der Tarif trägt es nicht verlässlich. Rund drei von vier Anläufen kamen mit `Forbidden - perhaps check your credentials?` zurück; der wahre Grund steht nicht in der Meldung, sondern im Feld `description`: `This model is not available in your subscription tier`. Weil immer nur die gescheiterte Zeile auffiel, sah das dokumentabhängig aus — tatsächlich schaffte dieselbe Datei es beim vierten Anlauf (`RG Lichtwelle`, `versuche: 3`, trotzdem `abgelegt`). Unter `medium` laufen vier Extraktionen in Folge ohne einen einzigen `Forbidden` durch, darunter der 46-seitige Stadtsparkassen-Vertrag mit 164 789 Zeichen OCR-Text. Eine Größengrenze gibt es dabei nicht: Sie wurde vermutet, gebaut und an Lauf `113768` widerlegt.

**Mandant und Vertragspartner sind die heikle Stelle.** Der Prompt trennt sie ausdrücklich: Mandant ist die interne Gesellschaft auf RWG-Seite (Kunde, Antragsteller, Leasingnehmer, Besteller), Vertragspartner die externe Gegenseite (Leasinggeber, Vermieter, Dienstleister, Versicherer, Lieferant). Eine Voraberkennung im Code sucht die drei internen Gesellschaften — RWG Rheinland eG, Obst und Gemüse GmbH, Baumarkt GmbH — in der Nähe eines Kundenfelds und gibt den Fund als Hinweis mit. Als Hinweis, nicht als Vorgabe.

## Fallstricke, die hier eingebaut sind

- **Der Postgres-Node durchsucht den gesamten Abfragetext nach Dollar-Platzhaltern**, auch in Zeichenketten und Kommentaren. Alle acht Abfragen enthalten deshalb ausschließlich `$1` und keinen einzigen Kommentar. Sämtliche Daten kommen als **ein** JSON-Parameter herein und werden per `jsonb_to_record` aufgefächert — damit gibt es weder ein Komma-Problem in `queryReplacement` noch Typkonflikte. `queryBatching` steht überall auf `independently`.
- **Der Postgres-Node reicht keine Binärdaten weiter.** Nach `Zeile sichern` wäre die Datei vor dem Mistral-Upload verloren. `Datei und Stand vereinen` führt Datei und Datenbankstand wieder zusammen.
- **Ein HTTP-Node ohne `onError` beendet den ganzen Lauf.** Alle fehleranfälligen Aufrufe haben einen Fehlerausgang: fünf davon schreiben `status = 'fehler'` samt Meldung in die Zeile, zählen `versuche` hoch und gehen zur nächsten Datei.
- **`Datei holen` ist die eine Ausnahme:** Der Fehlerausgang führt direkt zur nächsten Datei, weil zu diesem Zeitpunkt noch keine Zeile existiert, in die man den Fehler schreiben könnte. Die Datei bleibt im Eingang und wird im nächsten Lauf erneut geholt. Kein Verlust, aber auch kein Eintrag — ein dauerhaft unlesbares Dokument fällt nur dadurch auf, dass es im Eingang liegen bleibt.
- **Die Zeitzone steht im Workflow** (`Europe/Berlin`). Der Server läuft auf UTC.
- **`$('Node').first()` statt `.all()`** in der Schleife.
- **Der Fehlerordner wird mit `conflictBehavior: fail` angelegt.** Existiert er schon, antwortet Graph mit einem Konflikt statt mit einer Kennung — `Nur PDF` liest sie dann aus der Auflistung des Eingangs. `replace` wäre hier gefährlich: Es würde den gefüllten Ordner ersetzen.
- **Die Ausgänge von IF und Switch wurden nach dem Setzen zurückgelesen.** Der bekannte Fallstrick, dass die MCP-Schnittstelle den Ausgangsindex ignoriert, ist hier nicht eingetreten — belegt statt vermutet.

## Grenzen

- **10 Dateien je Lauf** (`maxJeLauf` in `Steuerung`). Bei größerem Nachlauf vorübergehend erhöhen.
- **Ein Namenskonflikt in `DONE` lässt das Verschieben scheitern.** Graph antwortet mit 409, die Zeile bekommt `status = 'fehler'`, die Datei bleibt im Eingang. Bisher nicht eingetreten.
- **Große PDF sind teuer und langsam.** Der Zeitausschuss für die OCR steht auf 15 Minuten, der des Workflows auf eine Stunde.
- **Die Datei wird auch dann geladen, wenn die OCR übersprungen wird.** Der Hash braucht die Bytes. Für ein liegengebliebenes 24-MB-Dokument heißt das stündlich 24 MB Übertragung — kostenlos, aber nicht umsonst. Nach drei Versuchen ist ohnehin Schluss.

## Zieltabelle `vertraege`

43 Spalten, `UNIQUE (datei_hash)` als Duplikatschutz, `CHECK` auf `status` in `neu`, `ocr`, `extrahiert`, `abgelegt`, `fehler`. Indizes auf `status`, `vertragspartner`, `laufzeit_ende` und `kuendigung_zum` (die beiden letzten nur wo gefüllt), dazu ein deutscher Volltextindex über Partner, Definition und Vertragsart. RLS ist an, ohne Regeln — wie im ganzen Projekt.

| Gruppe | Spalten |
|---|---|
| Herkunft | `datei_name`, `datei_hash`, `sharepoint_item_id`, `sharepoint_pfad`, `sharepoint_url` |
| Verarbeitungsstand | `status`, `versuche`, `fehler_text`, `erkannt_am`, `abgelegt_am` |
| Klartext | `definition`, `mandant`, `vertragsart`, `vertragspartner`, `lieferantennummer`, `vertragsnummer`, `laufzeit_beginn_text`, `laufzeit_ende_text`, `intervalle`, `verlaengerung`, `kuendigungsfrist`, `kuendigung_zum_text`, `preis_netto_text`, `preis_brutto_text`, `kosten_jaehrlich_text`, `sparte_bereich`, `standortinfo`, `kostenstelle` |
| Ausgewertet | `laufzeit_beginn`, `laufzeit_ende`, `kuendigung_zum` als `date`; `preis_netto`, `preis_brutto`, `kosten_jaehrlich` als `numeric(14,2)` |
| Nachvollziehbarkeit | `ocr_text`, `rohdaten`, `ocr_modell`, `extraktions_modell`, `seiten`, `woerter` |

## Zugänge

| Zweck | Credential |
|---|---|
| SharePoint über Microsoft Graph | `mClncgXjqvaJjfm4` — OAuth2 API: Entra-SharePoint-RWG |
| Mistral OCR und Extraktion | `tv4AxZ1FALgZCIVK` — Mistral Cloud, Sebastian.Linges@rwg-r.de |
| Datenbank | `awcN6ePCJHieBrzb` — Postgres, Org_RWG Rheinland eG_Project_RAG |

Es gibt **zwei** Mistral-Zugänge in der Instanz. Die automatische Zuordnung greift daher nicht — sie ist an jedem Node ausdrücklich gesetzt.

## Offen

- **`Auto Leasing Vertrag.pdf` liefert bei 718 Wörtern nur sieben Rohfelder** — keine Laufzeit, kein Preis, kein Intervall. Für einen Leasingvertrag ist das wenig; möglich, dass die Datei nur ein Deckblatt ist. Am `ocr_text` derselben Zeile in einer Minute zu klären.

Der Power-Automate-Flow `RWG_n8n_Trigg` überwachte denselben Ordner und ist am 30.08. gelöscht worden. Solange er lief, verschob er neu erzeugte Dateien nach `DONE` — auch die Excel des ersten Laufs — und legte in der Bibliothekswurzel einen gespiegelten Leerpfad `Shared Documents/IMPORTER/…` an. Beides steht als Aufräumpunkt in [offene-punkte.md](../../offene-punkte.md).

**Woran man erkennt, wer geschrieben hat:** Graph vermerkt bei jedem Eintrag die App. Der Flow hier schreibt als `n8n-SharePoint` (`676b0b05-…`), Power Automate als `Microsoft Power Platform` (`7ab7862c-…`).
