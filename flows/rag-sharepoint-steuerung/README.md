# RAG - SharePoint Steuerung

Findet, was in SharePoint neu, geändert oder gelöscht ist, und ruft je Datei
[RAG - SharePoint Verarbeitung](../rag-sharepoint-verarbeitung/README.md) auf
(`PAqphQur0CTQRypM`, 23 Nodes).

Hervorgegangen aus `RAG - SharePoint Ingest` (`BBhGCRsQ8pdNSxTi`), der Scanner und Verarbeitung in
einem Canvas trug. Bauplan: [konzept-sharepoint-neubau.md](../../konzept-sharepoint-neubau.md).

## Drei Betriebsarten, ein Mechanismus

| Trigger | Laufart | Was |
|---|---|---|
| **Stuendlich (Delta)** `0 * * * *` | `delta` | nur Änderungen seit dem Anker |
| **Taeglich (Abgleich)** `30 3 * * *` | `abgleich` | voller Vergleich SharePoint ↔ Wissensbasis |
| **Manueller Start** | `handstart` | wie Abgleich, mit Startparametern |

**Die Laufart wird gesetzt, nicht geraten.** Jeder Trigger führt über einen eigenen Set-Knoten nach
`Startbereiche`. Der Vorgängerflow erschloss sie über `isExecuted` dreier Trigger, weil n8n beim
Handstart den erstbesten Trigger nimmt — das war eine der undurchsichtigsten Stellen.

### Warum es Delta und Abgleich braucht

Der Delta-Abruf ist schnell und billig: Microsoft Graph liefert genau das, was sich seit dem
gespeicherten `deltaLink` geändert hat. Ohne Änderungen ist der Lauf nach einer halben Sekunde fertig.

**Aber er meldet jede Löschung genau einmal.** Scheitert der Lauf, in dem sie kommt, ist die Meldung
fort — und der Eintrag bliebe für immer in der Wissensbasis stehen.

Der Abgleich hält den vollständigen SharePoint-Bestand gegen die Wissensbasis und findet vier Dinge:
**fehlend**, **veraltet**, **verwaist** und **im RAG ohne Chunks**. Der Vergleich selbst kostet keine
OCR — nur was wirklich fehlt oder sich geändert hat, wird verarbeitet.

## Startbereiche

`Startbereiche` gibt **ein Item je Bereich** aus. Ein Bereich ist ein Ordner auf hoher Ebene; alles
darunter kommt über den Delta-Abruf mit — die Schleife durch die Ordner ist die Paginierung des
Abrufs, kein eigener Abstieg.

```js
{
  bezeichnung:   'Schulungen',
  driveId:       'b!C2yhEx…',
  driveName:     'Documents (Shared Documents) der Untersite Schulungen',
  siteUrl:       'https://rwgrheinland.sharepoint.com/sites/rwgintranet/Schulungen',
  startordnerId: '',        // leer = ab Bibliothekswurzel, sonst Item-ID des Startordners
  audience:      'public'
}
```

**Weitere Bereiche kommen als weiterer Eintrag in die Liste.** Es gibt keine Bereichsschleife — die
HTTP- und Data-Table-Knoten laufen ohnehin je Item. Zugeordnet wird über `parentReference.driveId`
an den Graph-Einträgen und über `drive_id` in der Ankerzeile.

**Einschränkung bei mehreren Bereichen:** Der `@odata.deltaLink` einer Antwortseite trägt selbst
keine Laufwerkskennung. Er wird dem Bereich zugeordnet, dessen Einträge auf derselben Seite lagen.
Bei einem Bereich ist das exakt; bei mehreren ist es beim ersten Ausbau zu prüfen. Rückfallweg wäre
eine Schleife um den Block.

## Startparameter für den Handstart

Der Knoten `Laufart handstart` trägt die Schalter — änderbar ohne Codeänderung:

| Feld | Betrieb | Wirkung |
|---|---|---|
| `nurDatei` | leer | Namensfilter für gezielte Nacharbeit |
| `nurBereich` | leer | schränkt auf einen Bereich ein |
| `maxJeLauf` | `0` | überschreibt die Mengenbremse (0 = Vorgabe) |
| `verarbeiten` | `true` | `false` = Aufgaben nur bestimmen, nichts einlesen |
| `zustandSchreiben` | `true` | `false` = Anker nicht anfassen |

**Die Urbefüllung ist kein eigener Zweig**, sondern dieser Lauf mit `maxJeLauf` hoch.

**`verarbeiten: false` + `zustandSchreiben: false` ergeben einen Trockenlauf**: Der Bestand wird
vollständig verglichen und die Aufgabenliste gebaut, aber nichts eingelesen und der Anker nicht
angefasst. Das kostet nichts und ist der schnellste Weg zu einer belastbaren Bestandsaufnahme.

## Zwei Sicherungen beim Löschen

**Beim Verwaist-Befund** gilt nur als verwaist, was eine **Graph-Item-ID** trägt und damit nachweislich
aus dieser Bibliothek stammt. Die Wissensbasis enthält auch Dokumente aus der Power-Automate-Zeit
(`RWGID-…`), deren Herkunft sich nicht sicher bestimmen lässt. Die bleiben unangetastet.

Zusätzlich bricht der Abgleich ab, wenn mehr als ein Fünftel der zuordenbaren Dokumente als verwaist
gälte. Dann stimmt etwas nicht, und es wird gemeldet statt gelöscht.

**Neu gegenüber dem Vorgänger:** Geprüft wird nur, wenn der Lauf den **vollen Bestand** gesehen hat.
Ein auf einen Dateinamen eingeschränkter Lauf sieht die übrigen Dokumente nicht und darf sie nicht
für verwaist halten — im Vorgängerflow gab es nur einen Bereich, dort konnte der Fall nicht auftreten.

## Die Mengenbremse

`maxJeLauf` begrenzt jeden Lauf auf so viele Einlesungen. Löschungen sind billig und bleiben
unbegrenzt. Was diesmal nicht drankommt, findet der nächste Abgleich wieder.

**Stand 01.09.: `maxJeLauf` steht auf 3.** Die Begründung im Vorgängerflow war die 300-Sekunden-Grenze
des Task-Runners je Code-Node — dort sammelte `Laufbilanz` über alle Schleifendurchläufe hinweg.
Mit getrennten Flows läuft jede Datei in einer eigenen Ausführung. **Wie weit die Grenze jetzt steigen
kann, ist zu messen** — daran hängt, ob die Erstbefüllung von rechnerisch über 130 Nächten herunterkommt.

## Zustandsspeicher

Data Table `sharepoint_delta` (`RbdhNeubkrmgZkOC`), eine Zeile je Bibliothek — **geteilt mit dem
Vorgängerflow**, solange der noch aktiv ist.

`Anker laden` holt **alle** Zeilen auf einmal statt je Bereich gefiltert; `Anker zuordnen` legt jedem
Bereich den passenden daneben. Ein Bereich ohne Ankerzeile — beim ersten Lauf — würde sonst kein
Ergebnisitem liefern und stillschweigend aus dem Lauf fallen.

Der Anker rückt **nur vor, wenn tatsächlich verarbeitet wurde**. Ein Trockenlauf lässt ihn stehen,
sonst gingen ungelesene Änderungen verloren.

## Zeitzone

Der n8n-Server läuft auf **UTC**. Ohne ausdrückliche Angabe würde `30 3 * * *` um 05:30 Berliner Zeit
feuern. Der Flow trägt deshalb `timezone: Europe/Berlin`.

## Ein Fallstrick, der hier zuschlug

**In einer Schleife liefert `$('Node').all()` nur den letzten Durchlauf.** Die Bilanz sah bei vier
Dokumenten nur das vierte. `Laufbilanz` zählt deshalb den Durchlaufindex hoch, bis kein Durchlauf
mehr kommt — aber nur noch über **einen** Knoten statt über fünf, weil die Verarbeitung genau eine
Antwortform liefert.

## Zugänge

| Zweck | Credential |
|---|---|
| Microsoft Graph | `OAuth2 API: Entra-SharePoint-RWG` (`mClncgXjqvaJjfm4`) |
| Wissensbasis | `Supabase account: Org_RWG_Project_RAG` (`H1j5n8gUPkmrE97X`) |
| Rückstellungsmeldung | `Telegram account Linges: KAPA_Fehler_Bot` (`AAUfWg7IDOHyjAoK`) |

## Belegter Trockenlauf

Lauf `112947` vom 01.09., gegen den dokumentierten Stand des Vorgängerflows:

| | Steuerung | Vorgänger, dokumentiert |
|---|---|---|
| Einträge im Bestand | 1 651 | 1 650 |
| Dateien | 1 411 | 1 411 |
| falscher Typ | 922 | 1 411 − 489 = 922 |
| Sperrdateien `~$…` | 39 | 39 |
| über 40 MB | 1 | 1 |
| RAG-Dokumente / nicht zuordenbar | 294 / 247 | 247 mit PA-Kennung |
| noch einzulesen | 402 | 402 |
| verwaist | 0 | 0 |

Anker unangetastet, nichts geschrieben.

## Noch offen

- **Die erste Nacht ist noch nicht beobachtet.** Publiziert und aktiviert am 01.09. um 18:25; der
  Vorgänger wurde um 17:19 deaktiviert und in `RAG - SharePoint Ingest OLD` umbenannt. Zu prüfen ist
  der Abgleich um 03:30: Status `success`, drei Einlesungen, `anker_geschrieben: true`, keine
  Rückstellung.
- **Zeitpläne kollidieren** — dieser Flow und der Vorgänger tragen dieselben Cron-Zeiten und
  denselben Anker. Nie beide gleichzeitig aktiv. Der Rückweg ist der alte Flow, nicht ein Nebeneinander.
- **Mengenbremse neu ausloten** (siehe oben).
