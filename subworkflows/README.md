# Subworkflows

Dieser Ordner ist fuer wiederverwendbare n8n Teilworkflows reserviert.

## Aktueller Stand

Der produktive Hauptworkflow liegt aktuell vollstaendig in `workflows/rwg-teams-agent-resilient.json`. Es gibt noch keine ausgelagerten Subworkflows.

## Geeignete Kandidaten fuer spaetere Auslagerung

- Dateiinhalt aus Teams/SharePoint/OneDrive laden.
- Dokumente in Text umwandeln.
- Knowledge Base Chunks erzeugen.
- Monitoring und Fehlerbenachrichtigung.
- Audit-Logging ohne sensible Inhalte.

## Regeln

- Subworkflows muessen eigenstaendig importierbar dokumentiert sein.
- Keine Credentials oder produktiven Secrets exportieren.
- Eingabe- und Ausgabeformat im jeweiligen Subworkflow dokumentieren.
