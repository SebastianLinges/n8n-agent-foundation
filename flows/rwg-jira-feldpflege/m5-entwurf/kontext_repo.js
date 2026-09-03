const SUPPORT_FIELD = "customfield_10777";
const STATUS_GWS = "10373";
const AUTOMATION = ["712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9", "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077", "712020:2c41da01-c990-498c-814a-aa04c2a3db9f", "60242eda988758006893fa52"];
const cand = $("Kandidat und Konfiguration").first().json || {};
const issue = $input.first().json || {};
const f = issue.fields || {};

function adfText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(adfText).join("");
  if (typeof v !== "object") return String(v);
  let s = "";
  if (v.type === "text" && typeof v.text === "string") s += v.text;
  if (v.type === "hardBreak") s += "\n";
  if (Array.isArray(v.content)) s += v.content.map(adfText).join("");
  if (v.type === "paragraph") s += "\n";
  return s;
}

const histories = (issue.changelog && Array.isArray(issue.changelog.histories)) ? issue.changelog.histories : [];
const statusHistory = [];
const levelHistory = [];
let assigneeChangeCount = 0;
for (const h of histories) {
  const at = String(h.created || "");
  const accountId = String((h.author && h.author.accountId) || "");
  const who = String((h.author && h.author.displayName) || "");
  const isAutomation = AUTOMATION.indexOf(accountId) !== -1;
  const items = Array.isArray(h.items) ? h.items : [];
  for (const it of items) {
    const fid = String((it.fieldId || it.field) || "");
    if (fid.toLowerCase() === "status") {
      statusHistory.push({ at: at, von: String(it.fromString || ""), nach: String(it.toString || ""), durch: who, automatisiert: isAutomation });
    } else if (fid === SUPPORT_FIELD || fid === "Support-Level") {
      levelHistory.push({ at: at, von: String(it.fromString || ""), nach: String(it.toString || ""), durch: who, automatisiert: isAutomation });
    } else if (fid.toLowerCase() === "assignee") {
      assigneeChangeCount += 1;
    }
  }
}
statusHistory.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });
levelHistory.sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); });

const manualLevel = levelHistory.filter(function (e) { return e.automatisiert !== true; });
const lastManual = manualLevel.length > 0 ? manualLevel[manualLevel.length - 1] : null;
const levelSetManually = lastManual !== null;
const levelLastSetAt = lastManual ? lastManual.at : "";
let statusChangedAfterLevel = statusHistory.length > 0;
if (levelSetManually) {
  statusChangedAfterLevel = statusHistory.some(function (s) { return String(s.at) > String(levelLastSetAt); });
}

const rawComments = (f.comment && Array.isArray(f.comment.comments)) ? f.comment.comments : [];
const comments = [];
for (const c of rawComments.slice(-14)) {
  const accountId = String((c.author && c.author.accountId) || "");
  const text = adfText(c.body).replace(/\n{3,}/g, "\n\n").trim().slice(0, 1500);
  if (!text) continue;
  comments.push({
    at: String(c.created || ""),
    autor: String((c.author && c.author.displayName) || ""),
    automatisiert: AUTOMATION.indexOf(accountId) !== -1,
    text: text
  });
}

const levelField = f[SUPPORT_FIELD] || null;
const statusId = String((f.status && f.status.id) || "");
const currentLevelValue = String((levelField && levelField.value) || "");

const hatMenschKommentar = comments.some(function (c) { return c.automatisiert !== true; });
const hatMenschStatus = statusHistory.some(function (s) { return s.automatisiert !== true; });
const frischesTicket = !hatMenschKommentar && !hatMenschStatus && (currentLevelValue === "" || currentLevelValue === "1st-Lvl.") && statusId !== STATUS_GWS;
const vorgabeVorhanden = cand.vorgabeVorhanden === true;

const result = {};
result.issueKey = String(issue.key || cand.issueKey || "");
result.source = String(cand.source || "unbekannt");
result.ausloeser = String(cand.ausloeser || "");
result.dryRun = cand.dryRun !== false;
result.jiraBaseUrl = String(cand.jiraBaseUrl || "https://rwg-r.atlassian.net");
result.vorgabeVorhanden = vorgabeVorhanden;
result.vorgabeScope = String(cand.vorgabeScope || "UNKNOWN");
result.vorgabeBusinessImpact = String(cand.vorgabeBusinessImpact || "UNKNOWN");
result.vorgabeBusinessProcess = String(cand.vorgabeBusinessProcess || "UNKNOWN");
result.vorgabeSecurityRisk = cand.vorgabeSecurityRisk === true;
result.bewertungNoetig = !(vorgabeVorhanden && frischesTicket);
result.summary = String(f.summary || "").slice(0, 500);
result.description = adfText(f.description).replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000);
result.statusId = statusId;
result.statusName = String((f.status && f.status.name) || "");
result.assigneeName = String((f.assignee && f.assignee.displayName) || "");
result.assigneeChangeCount = assigneeChangeCount;
result.currentPriorityId = String((f.priority && f.priority.id) || "");
result.currentPriorityName = String((f.priority && f.priority.name) || "");
result.currentLevelId = String((levelField && levelField.id) || "");
result.currentLevelValue = currentLevelValue;
result.levelSetManually = levelSetManually;
result.levelLastSetAt = levelLastSetAt;
result.statusChangedAfterLevel = statusChangedAfterLevel;
result.statusHistory = statusHistory.slice(-15);
result.levelHistory = levelHistory.slice(-8);
result.comments = comments;
return [{ json: result }];