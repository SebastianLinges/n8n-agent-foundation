// Verwirft Ereignisse, die fachlich keine Neubewertung rechtfertigen.
//
// RELEVANT enthaelt bewusst NICHT assignee, labels und components.
// Das Governance-Regelwerk schliesst diese als Kriterium aus: eine reine
// personelle Zuweisung ist keine fachliche Weitergabe, Standort und Komponente
// sind keine Level-Kriterien. Ein Modellaufruf darauf koennte per Definition
// nie zu einer Aenderung fuehren.
//
// Ausserdem verworfen: Aenderungen durch RWG.Automate selbst (dieser Workflow
// schreibt nach Jira, sonst Rueckkopplung) und durch die Automation-for-Jira-
// Regel, die bei Anlage Bearbeiter und Faelligkeit setzt. Letztere wuerde
// unmittelbar nach dem Aufruf aus dem Jira-Agent einen zweiten Lauf ausloesen.
//
// Seit 03.09.2026 ausserdem verworfen, beides bewusst NICHT ergebnisneutral:
// - Maschinentickets (Monitoring, Defender, SIEM, RWG.Automate als Melder).
//   Dieselbe Regel wie "Filter Automated Ticket Creator" im RAG-JIRA-Ingest,
//   damit beide Flows dasselbe darunter verstehen. Einzige Abweichung: "siem"
//   nur als ganzes Wort, sonst traefe die Regel auch "Siemensring".
//   Bei Kommentarereignissen liefert Jira weder reporter noch creator mit -
//   dort greifen nur die Regeln auf der Zusammenfassung.
// - Ereignisse an Tickets, die bereits in einem Done-Status stehen (ERLEDIGT,
//   GESCHLOSSEN, ...). Das ist das letzte Ereignis, das dieser Workflow von
//   einem Ticket sieht, denn der Trigger filtert auf statusCategory != Done.
//   Es wird mit abschluss: true weitergegeben; "Anspruch setzen" traegt dann
//   nur die Zeile aus jira_feldpflege_state aus und der Lauf endet.

const IGNORIERTE_KONTEN = [
  "712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9",
  "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077",
  "712020:2c41da01-c990-498c-814a-aa04c2a3db9f",
  "60242eda988758006893fa52"
];
const RELEVANT = ["status", "description", "summary", "issuetype"];

const MASCHINEN_KONTEN = [
  "712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9",
  "712020:2c41da01-c990-498c-814a-aa04c2a3db9f",
  "60242eda988758006893fa52"
];
const MASCHINEN_TOKENS = ["rwg_automate", "rwg.automate", "managed.monitoring", "defender-noreply", "defender"];
const MASCHINEN_PRAEFIX = /^\s*\[\s*managed\s*\|\s*monitoring\s*\]/i;
const MASCHINEN_MUSTER = /(intune-checker|snipe-checker|bericht zu kritischen events|aufgabenwarteschlangenprotokoll|\bsiem\b|new vulnerabilities notification)/i;

function istMaschinenticket(fields) {
  const leute = [fields.creator, fields.reporter];
  for (const p of leute) {
    if (!p) continue;
    if (MASCHINEN_KONTEN.indexOf(String(p.accountId || "")) !== -1) return true;
    const text = (String(p.emailAddress || "") + " " + String(p.displayName || "")).toLowerCase();
    for (const t of MASCHINEN_TOKENS) { if (text.indexOf(t) !== -1) return true; }
  }
  const summary = String(fields.summary || "");
  if (MASCHINEN_PRAEFIX.test(summary)) return true;
  if (MASCHINEN_MUSTER.test(summary)) return true;
  return false;
}

const out = [];

for (const it of $input.all()) {
  const e = it.json || {};
  const event = String(e.webhookEvent || "");
  const key = String((e.issue && e.issue.key) || "").trim().toUpperCase();
  if (!key) continue;

  let actor = String((e.user && e.user.accountId) || "");
  if (!actor && e.comment && e.comment.author) actor = String(e.comment.author.accountId || "");
  if (IGNORIERTE_KONTEN.indexOf(actor) !== -1) continue;

  const fields = (e.issue && e.issue.fields) || {};
  if (istMaschinenticket(fields)) continue;

  const kategorie = String(((fields.status && fields.status.statusCategory) || {}).key || "").toLowerCase();
  const abschluss = kategorie === "done";

  if (event.indexOf("comment") !== -1) {
    out.push({ json: { issueKey: key, source: "kommentar", ausloeser: event, abschluss: abschluss } });
    continue;
  }

  const changes = (e.changelog && Array.isArray(e.changelog.items)) ? e.changelog.items : [];
  if (changes.length === 0) continue;

  const felder = [];
  for (const c of changes) {
    const fid = String((c && (c.fieldId || c.field)) || "").toLowerCase();
    if (RELEVANT.indexOf(fid) !== -1) felder.push(fid);
  }
  if (felder.length === 0) continue;

  out.push({ json: { issueKey: key, source: "feldaenderung", ausloeser: felder.join(", "), abschluss: abschluss } });
}

return out;