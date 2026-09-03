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

// --- M-5 Signaturbereinigung -------------------------------------------
// Entfernt aus Beschreibung und Kommentartexten, was die fachliche
// Bewertung nicht traegt: Grussformel samt Signaturblock, Kontaktzeilen,
// Postanschriften, rechtliche Fusszeilen und zitierte Vorgaengermails.
//
// KONSERVATIV: Im Zweifel wird nicht abgeschnitten. Bleibt nach der
// Bereinigung zu wenig Text uebrig, gilt das Muster als unsicher erkannt
// und der Originaltext wird verwendet. Diese Faelle zaehlt
// result.bereinigung.
//
// Die Sicherung ist eine absolute Untergrenze, kein Anteil. Ein Anteil
// misst nur, wie lang die Signatur im Verhaeltnis war, nicht ob der
// Schnitt stimmt: ist das Anliegen zwei Saetze lang und die Signatur zehn
// Zeilen, ist ein richtiger Schnitt zwangslaeufig groesser als die
// Haelfte. Die Zeichengrenze fragt stattdessen, ob genug Substanz fuer
// eine Bewertung stehen bleibt.
//
// Zwei Grenzen, weil die Schnittmarken unterschiedlich sicher sind:
// Nach einer Grussformel folgt ein Signaturblock, der die Bewertung nie
// traegt. Nach einem Zitat kann dagegen Inhalt stehen, auf den sich der
// Text davor beruft ("siehe unten"). Bleibt dort nur eine Verweiszeile
// uebrig, wird das Zitat behalten.
//
// Diese beiden Zahlen sind die einzigen Stellschrauben der Bereinigung.
const MIN_REST_ZEICHEN = 40;
const MIN_REST_ZEICHEN_ZITAT = 120;

const GRUSS = /^\s*(viele gr(ue|ü)(ss|ß)e|mit freundlichen gr(ue|ü)(ss|ß)en|beste gr(ue|ü)(ss|ß)e|freundliche gr(ue|ü)(ss|ß)e|liebe gr(ue|ü)(ss|ß)e|vielen dank und viele gr(ue|ü)(ss|ß)e|danke und (viele )?gr(ue|ü)(ss|ß)e|mfg)\s*[,.!]?\s*$/i;
const ZITAT = /^\s*(>|von:|gesendet:|an:|betreff:|-{2,}\s*urspr)/i;
const RECHT = /(vertraulichkeitshinweis|diese e-?mail und etwaige|confidentiality notice|nicht der beabsichtigte empf(ae|ä)nger)/i;
const KONTAKT = /^\s*\|?\s*(telefon|tel\.?|mobil|fax|e-?mail|website|web)\s*:?\s*\\?\\?\s*$/i;
const PLZ = /^\s*.{0,40}\|?\s*\d{5}\s+[A-Za-zÄÖÜäöüß.\- ]{2,40}\s*\|?\s*$/;

let bereinigtAnzahl = 0;
let verworfenAnzahl = 0;

function bereinigeText(s) {
  const roh = String(s || "");
  if (roh.length < MIN_REST_ZEICHEN) return roh;
  const zeilen = roh.split("\n");

  let schnitt = -1;
  let schnittAmZitat = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (GRUSS.test(z) || RECHT.test(z)) { schnitt = i; schnittAmZitat = false; break; }
    if (ZITAT.test(z)) { schnitt = i; schnittAmZitat = true; break; }
  }
  const bis = schnitt === -1 ? zeilen.length : schnitt;

  let neu = "";
  for (let i = 0; i < bis; i++) {
    const z = zeilen[i];
    if (KONTAKT.test(z)) continue;
    if (PLZ.test(z)) continue;
    neu = neu + z + "\n";
  }
  neu = neu.replace(/\n{3,}/g, "\n\n").trim();

  const untergrenze = schnittAmZitat ? MIN_REST_ZEICHEN_ZITAT : MIN_REST_ZEICHEN;
  if (neu.length < untergrenze) { verworfenAnzahl += 1; return roh; }
  if (neu.length < roh.length) bereinigtAnzahl += 1;
  return neu;
}
// --- Ende M-5 -----------------------------------------------------------

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
  const text = bereinigeText(adfText(c.body).replace(/\n{3,}/g, "\n\n").trim()).slice(0, 1500);
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
result.description = bereinigeText(adfText(f.description).replace(/\n{3,}/g, "\n\n").trim()).slice(0, 4000);
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
result.bereinigung = { bereinigt: bereinigtAnzahl, verworfen: verworfenAnzahl, minRestZeichen: MIN_REST_ZEICHEN, minRestZeichenZitat: MIN_REST_ZEICHEN_ZITAT };
return [{ json: result }];