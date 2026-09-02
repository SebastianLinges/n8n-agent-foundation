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

## Ablauf

1. In `Steuerung` `nurDatei` auf eine Teilzeichenkette des Dateinamens setzen (Groß- und Kleinschreibung egal)
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

## Nebenbefund aus Lauf 113711

In `/IMPORTER/CONTRACT/FEHLER` liegen **vier** Dateien, nicht zwei. Drei davon haben **keine Zeile** in `public.vertraege` und sind damit in keinem Bestand:

- `2017_04_18 Mietvertrag Domnick.pdf` (2,3 MB)
- `2025-10-09_TechSmith.pdf` (48 kB)
- `Auto Leasing Vertrag.pdf` (896 kB)

Sie stammen vermutlich aus der Zeit vor dem Umbau, als der Flow die Data Table `RWG Vertraege` führte. Was mit ihnen geschehen soll, ist offen.
