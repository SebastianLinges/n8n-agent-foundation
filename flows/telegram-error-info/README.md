# Telegram_Error_Info

Zentraler Fehlermelder der Instanz. Jeder Flow, der ihn in seinen Einstellungen
als `errorWorkflow` traegt, schickt bei einem Fehlschlag seine Fehlerdaten
hierher; von hier geht eine Kurzmeldung nach Telegram.

**Er feuert nur bei Produktionslaeufen.** Manuelle Testlaeufe loesen ihn nicht
aus - wer beim Testen die Ursache sehen will, muss den Lauf ueber einen Trigger
starten.

## Aufbau

```
Error Trigger  ->  Fehler einordnen (Code)  ->  Send a text message (Telegram)
```

## Was die Meldung enthaelt

```
[DIENST] RAG - SharePoint Ingest

Node:    Upload Source To Mistral
Code:    ECONNRESET / NodeApiError
Info:    The connection to the server was closed unexpectedly ...
Lauf:    110988 (trigger)
https://n8n.srv.../executions/110988
```

Die Kennung in der ersten Zeile ordnet den Fehler ein, damit man ihn ohne
Nachlesen einsortieren kann:

| Kennung | Wann |
|---|---|
| `ZEITGRENZE` | `Task execution timed out` - die 300-Sekunden-Grenze des Task-Runners je Code-Node |
| `ZUGANG` | fehlende Credential, 401, 403 |
| `DIENST` | `ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`, `ENOTFOUND`, `EAI_AGAIN`, `EPIPE`, 5xx - Gegenstelle weg oder Kontingent erschoepft |
| `ANFRAGE` | uebrige 4xx |
| `DATEN` | alles Weitere |

## Entscheidungen

**Der Knotenname ist das Wichtigste.** Ohne ihn sucht man im falschen Teil des
Flows - das hat am 30.08. Stunden gekostet. Er steht nicht in jedem Fehler zur
Verfuegung: Bei einem HTTP-Fehler gibt es `error.node.name`, beim Task-Timeout
nicht. Fehlt er, tritt `lastNodeExecuted` an seine Stelle, ausdruecklich als
"zuletzt erfolgreich" gekennzeichnet.

**`error.context`, `error.stack` und `error.description` werden nie ausgegeben.**
Bei HTTP-Fehlern traegt `context` den kompletten Request samt `apikey` und
`Authorization` im Klartext. Die Meldung selbst ist auf 300 Zeichen begrenzt.

**Die Ausfuehrungen dieses Flows werden nicht gespeichert**
(`saveDataSuccessExecution: none`). Vorher lagen 167 davon in der Datenbank, jede
mit einer Klartextkopie der Zugangsdaten des fehlgeschlagenen Aufrufs. Die
Ausfuehrung des Quell-Workflows bleibt erhalten und ist ueber den Link in der
Meldung erreichbar.

**Der Flow ist nicht mehr sein eigener `errorWorkflow`.** Diese Selbstreferenz
war ein Rekursionsrisiko, wenn der Telegram-Versand selbst scheitert.

## Offen

**Nachrichtenflut.** Es geht eine Meldung je fehlgeschlagenem Item raus. Am
22.08. waren das ueber 40 in zehn Sekunden, und sechzehn Ausfuehrungen des
Melders scheiterten dabei selbst - vermutlich an der Ratenbegrenzung von
Telegram. Dagegen hilft nur eine Zusammenfassung ueber einen Zeitraum, und die
braucht Zustand. Der Indikator macht die Einzelmeldung besser, nicht seltener.
