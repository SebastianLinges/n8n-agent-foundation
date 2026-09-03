// Verwirft Ereignisse, die fachlich keine Neubewertung rechtfertigen.
//
// Maschinentickets (Monitoring, Defender, SIEM, RWG.Automate als Melder)
// sind hier NICHT mehr zu finden: sie sortiert der native Filter-Node
// "Maschinentickets aussortieren" direkt hinter dem Trigger aus. Dort stehen
// Konten, Adressen und Muster als Bedingungen in der Oberflaeche - die eine
// Stelle, an der neue Adressen ergaenzt werden.
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
// Ereignisse an Tickets, die bereits in einem Done-Status stehen (ERLEDIGT,
// GESCHLOSSEN, ...), werden mit abschluss: true weitergegeben. Es ist das
// letzte Ereignis, das dieser Workflow von einem Ticket sieht, denn der
// Trigger filtert auf statusCategory != Done. "Anspruch setzen" traegt dann
// nur die Zeile aus jira_feldpflege_state aus und der Lauf endet - bewusst
// nicht ergebnisneutral, Entscheidung vom 03.09.2026.

const IGNORIERTE_KONTEN = [
  "712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9",
  "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077",
  "712020:2c41da01-c990-498c-814a-aa04c2a3db9f",
  "60242eda988758006893fa52"
];
const RELEVANT = ["status", "description", "summary", "issuetype"];
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