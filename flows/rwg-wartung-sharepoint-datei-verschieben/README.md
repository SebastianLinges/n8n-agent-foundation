# RWG Wartung - SharePoint Datei verschieben

Verschiebt Dateien zwischen zwei Ordnern derselben SharePoint-Bibliothek (`k5sofeyVNzEqOIZs`, 8 Nodes). Handstart, kein Zeitplan, nicht aktiv.

Entstanden, weil ein Werkzeug fehlte: Der Contract Loader schiebt Dateien nach drei Fehlversuchen selbst nach `/IMPORTER/CONTRACT/FEHLER` — zurück kamen sie nur von Hand über die SharePoint-Oberfläche. Für jede Nacharbeit an einem gescheiterten Dokument war das der Bruch in der Kette.

## Was es tut

```
Manueller Start → Steuerung → Quelle lesen → Ziel lesen → Auftrag bauen
                                                              ↓
                                    Wirklich verschieben? ─[ja]→ Verschieben ─┐
                                                          └[nein]─────────────┴→ Bilanz
```

`Ziel lesen` holt die **Item-ID** des Zielordners. Graph verschiebt über `parentReference.id`, nicht über den Pfad — dasselbe Muster wie `Nach DONE verschieben` im Contract Loader.

## Die zwei Sicherungen

Beide stehen nach jedem Einsatz wieder auf ihrem Vorgabewert.

| Schalter | Vorgabe | Wirkung |
|---|---|---|
| `probelauf` | `true` | Der Lauf zeigt nur, was er täte. Nichts wird angefasst. |
| `nurDatei` | `''` | **Ein leerer Filter trifft absichtlich nichts.** |

Der leere Filter ist der wichtigere der beiden. Ein Werkzeug, das ohne Angabe den ganzen Ordner verschiebt, ist eine Falle — wer es zum ersten Mal startet, erwartet keine Massenaktion. Läuft es ohne Filter, meldet es stattdessen, was im Quellordner liegt.

**Der Filter nimmt mehrere Namensteile**, durch Komma getrennt: `TechSmith, Leasing, Domnick` trifft drei Dateien in einem Lauf und lässt die vierte im Ordner liegen. Getroffen wird, was **einen** der Teile enthält. Ohne das braucht jede Datei ihren eigenen Probe- und Ernstlauf.

## Ablauf

1. In `Steuerung` `nurDatei` auf eine Teilzeichenkette des Dateinamens setzen — oder auf mehrere, durch Komma getrennt (Groß- und Kleinschreibung egal)
2. Starten — die Bilanz zeigt unter `wuerde_verschieben`, was getroffen würde
3. Stimmt es, `probelauf` auf `false` und erneut starten
4. **Danach beide Schalter zurücksetzen**

`quellPfad` und `zielPfad` lassen sich tauschen; der Rückweg ist derselbe Lauf mit vertauschten Pfaden.

## Was es bewusst nicht tut

**Kein Löschen.** Ein Löschwerkzeug ohne konkreten Auftrag wird nicht gebaut. Solange die Entscheidung über die 17 inhaltsgleichen Kopien in der Bibliothek `Schulungen` offen ist, gibt es keinen.

**Kein Abstieg in Unterordner.** `Quelle lesen` holt nur die direkten Kinder.

## Zugänge

| Zweck | Credential |
|---|---|
| Microsoft Graph | `OAuth2 API: Entra-SharePoint-RWG` (`mClncgXjqvaJjfm4`) |

Die drei HTTP-Knoten brauchen sie ausdrücklich gesetzt — die MCP-Schnittstelle weist sie nicht von selbst zu.

## Belegte Läufe

| Lauf | Was | Ergebnis |
|---|---|---|
| `113711` | Vorgabewerte, leerer Filter | `aktion: nichts`, „Kein Namensfilter gesetzt" — `Verschieben` lief nicht |
| `113712` | Filter `Stadtspk`, Probelauf | genau **eine** Datei unter `wuerde_verschieben`, `verschoben: []` |
| `113713` | Filter `Stadtspk`, Ernstfall | verschoben nach `/IMPORTER/CONTRACT`, Graph meldet `parentReference.name: CONTRACT` |
| `113714` | Rückweg, Pfade getauscht | zurück nach `FEHLER` — beide Richtungen belegt, Stand unverändert |
| `113771` | Kommaliste, Probelauf | genau **drei** Dateien unter `wuerde_verschieben`, die vierte im Ordner bleibt unberührt |
| `113773` | Kommaliste, Ernstfall | alle drei nach `/IMPORTER/CONTRACT`, 4,8 s |
| `113775` | Filter `Stadtspk`, Ernstfall | verschoben — `FEHLER` damit leer |
| `113777` | Vorgabewerte, leerer Filter | `namen_im_quellordner: []` — der Ordner ist leer, das Werkzeug steht wieder auf beiden Sicherungen |

## Wozu es zuerst gebraucht wurde

Lauf `113711` brachte einen Nebenbefund: In `/IMPORTER/CONTRACT/FEHLER` lagen **vier** Dateien, nicht zwei — drei davon ohne Zeile in `public.vertraege` und damit in keinem Bestand. Sie stammten aus der Zeit vor dem Umbau, als der Contract Loader die Data Table `RWG Vertraege` führte.

Alle vier sind am 02.09. über dieses Werkzeug zurück in den Eingang gegangen und vom Contract Loader verarbeitet worden. Der Ordner ist leer, alle zwölf Zeilen in `vertraege` stehen auf `abgelegt`.
