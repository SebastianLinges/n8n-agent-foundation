# n8n Arbeitsablage

Arbeitsordner für die laufende Optimierung der n8n-Instanz. **Die n8n-Instanz ist die Quelle der Wahrheit** — Workflows werden dort direkt über den n8n-MCP-Zugriff gelesen, gebaut und getestet, nicht hier versioniert.

Hier liegt nur, was in n8n selbst keinen Platz hat: Befunde, Optimierungsvorschläge und isoliert testbare Logik für Code-Nodes.

## Struktur

| Pfad | Inhalt |
|---|---|
| `proposals/` | Analysen und Vorab-Artefakte je Optimierungsthema. Testbarer Code, bevor er als Code-Node in n8n landet. |
| `.agents/skills/` | n8n-Skills (Expression-Syntax, Code-Nodes, Node-Konfiguration, Validierung, Patterns). Quelle: `czlonkowski/n8n-skills`, Stand in `skills-lock.json`. |
| `.claude/skills/` | Verzeichnis-Junctions auf `.agents/skills/`, damit Claude Code die Skills sieht. Nicht versioniert. |

## Arbeitsweise

1. Thema kommt rein, Ist-Stand direkt aus n8n lesen (`search_workflows`, `get_workflow_details`, `search_executions`).
2. Befund und Vorschlag unter `proposals/<thema>.md` festhalten.
3. Nicht-triviale Logik als `.mjs` mit Test danebenlegen und lokal prüfen, bevor sie in einen Code-Node wandert.
4. Änderung in n8n anwenden (`update_workflow`), mit `validate_workflow` bzw. `test_workflow` absichern, erst dann publizieren.

Bevorzugt werden native n8n-Nodes. Code-Nodes nur für das, was Nodes nicht abdecken.

## Sicherheit

Keine produktiven Zugangsdaten im Repository — keine Credential-Exports, `.env`-Dateien, Tokens, API-Keys oder Zertifikate. Credentials leben ausschließlich im n8n Credential Store. Die `.gitignore` ist entsprechend gesetzt.

## Historie

Dieser Ordner war bis April 2026 eine Vorlage für den RWG Teams Agent (`workflows/`, `docs/`, `prompts/`). Diese Artefakte sind durch die Live-Instanz überholt und wurden entfernt; sie liegen weiterhin in der Git-Historie bis Commit `9636379`.
