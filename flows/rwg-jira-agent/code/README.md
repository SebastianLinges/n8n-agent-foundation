# Code-Node zum Einfügen

`Internen Kommentar erzeugen.js` enthält den Code des gleichnamigen Nodes mit bereinigtem
Kopfkommentar — Versionsbezüge und Änderungshistorie entfernt, die fachlichen Regeln bleiben.

**Der ausführbare Code ist unverändert** — geprüft durch Vergleich beider Fassungen ohne
Kommentarzeilen, dazu `node --check`.

## Warum von Hand

Der Node umfasst 16.793 Zeichen mit 42 Template-Literalen, 20 Backslashes und mehreren
Regex-Ausdrücken — darunter die E-Mail-Maskierung `EMAIL_REGEX` und `.replace(/\u0000/g, '')`.
Über die MCP-Schnittstelle müsste dieser Code als JSON-String übergeben werden; ein einzelner
falsch maskierter Backslash würde die PII-Maskierung still beschädigen. Das Risiko steht in
keinem Verhältnis zum Nutzen eines aufgeräumten Kommentars.

Copy-Paste aus dieser Datei in den Node ist dagegen gefahrlos.

## Einfügen

Node in n8n öffnen, Inhalt vollständig ersetzen, speichern, veröffentlichen. Danach diese
Datei löschen — der Stand steckt dann im Workflow-Export.
