# RWG Teams Agent fuer n8n

Produktionsnaher n8n Workflow fuer einen internen Microsoft Teams AI-Agenten. Der Agent beantwortet Teams-Nachrichten schnell, nutzt interne Wissensquellen, erkennt Sprache und Kontext, beruecksichtigt Datei-/Linkinformationen und liefert robuste Fallback-Antworten.

## Aktueller Hauptworkflow

| Datei | Zweck |
|---|---|
| `workflows/rwg-teams-agent-resilient.json` | Importierbarer n8n Hauptworkflow fuer Microsoft Teams |

Der Workflow ist als n8n JSON exportiert und kann direkt in n8n importiert werden. Zugangsdaten sind bewusst nicht enthalten und muessen nach dem Import in n8n neu zugewiesen werden.

## Was der Workflow leistet

- Reagiert auf neue Microsoft Teams Chatnachrichten.
- Laedt die vollstaendige Teams-Nachricht ueber Microsoft Graph.
- Sendet bei laengeren Anfragen schnell eine erste Rueckmeldung.
- Erkennt Deutsch, Englisch, Niederlaendisch, Franzoesisch, Spanisch und Italienisch heuristisch.
- Normalisiert Text, Links, Attachments und Hosted Contents.
- Nutzt OpenAI Chat Model, Postgres Chat Memory, Supabase Knowledge Search und Jira Lookup.
- Gibt Textantworten sowie relevante Bild-, Dokument- und Linkhinweise zurueck.
- Antwortet mit einem sprachabhaengigen Fallback, wenn der Agent keine belastbare Antwort erzeugt.
- Vermeidet das Committen von Zugangsdaten und lokalen n8n Exporten mit Credentials.

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `workflows/` | Importierbare n8n Workflow-Dateien |
| `docs/` | Import, Sicherheit, Architektur und Workflow-Erklaerung |
| `prompts/` | System-Prompts und Agent-Anweisungen |
| `examples/` | Beispielnachrichten und Testdaten |
| `knowledge-base/` | Beispielhafte Wissensdateien fuer spaetere RAG-Inhalte |
| `subworkflows/` | Platz fuer wiederverwendbare n8n Teilworkflows |

## Schnellstart

1. In n8n einen neuen Workflow importieren.
2. `workflows/rwg-teams-agent-resilient.json` auswaehlen.
3. In n8n die benoetigten Credentials zuweisen:
   Microsoft Teams OAuth2 API, OpenAI API, Supabase API und Postgres.
4. Im Code-Node `Normalize Request` die `ownUserIds` des Bot-/Service-Users setzen.
5. Eine Testnachricht in einem Teams 1:1 Chat senden.
6. Erst nach erfolgreichem Test aktivieren.

## Wichtige Dokumente

| Datei | Wann lesen |
|---|---|
| `docs/import-and-security.md` | Vor dem Import und vor jedem Push |
| `docs/workflow-overview.md` | Wenn der Ablauf oder die Fehlerstrategie unklar ist |
| `docs/architecture.md` | Fuer die technische Gesamtstruktur |
| `docs/knowledge-strategy.md` | Fuer RAG- und Wissensablage-Themen |
| `prompts/rwg-teams-agent-system.md` | Fuer Anpassungen an Verhalten, Sprache und Stil |

## Sicherheit

Dieses Repository darf keine produktiven Zugangsdaten enthalten. Nicht committen:

- n8n Credential-Exports mit Secrets
- `.env` Dateien
- Tokens, API Keys, Client Secrets
- lokale `.n8n` Daten
- private Zertifikate oder Schluessel

Die `.gitignore` ist entsprechend vorbereitet. Nach dem Import werden Credentials ausschliesslich in n8n zugewiesen.

## GitHub-Ziel

Dieses Projekt gehoert zu:

`https://github.com/SebastianLinges/rwg-teams-agent`

Das Repository `SebastianLinges/n8n-agent-foundation` dient nur als Grundlage/Master-Vorlage und soll nicht mit projektspezifischen Aenderungen beschrieben werden.
