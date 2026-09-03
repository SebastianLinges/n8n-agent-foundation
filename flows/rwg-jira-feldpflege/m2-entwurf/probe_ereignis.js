// Prueft die beiden Eingangs-Nodes des Webhook-Pfads:
//   1. "Maschinentickets aussortieren" (nativer Filter-Node) - die fuenf
//      Bedingungen werden hier 1:1 nachgebildet, weil ein Filter-Node keinen
//      Code hat, den man herausschneiden koennte. Muster und Listen muessen
//      mit dem Node identisch sein (siehe filter_bedingungen.json).
//   2. "Ticketereignis pruefen" (Code-Node) - ausgefuehrt so, wie der Code in
//      ereignis_referenz.js steht.
// Die Testfaelle sind nachgebaut; Fall 1 des Code-Nodes ist die echte
// Nutzlast aus Lauf 114800 (Kommentar am erledigten SSD-9240). Mit
// tickets_maschinen.json (200 echte Zusammenfassungen und Melder aus Jira)
// laesst sich der Filter zusaetzlich gegen den Bestand pruefen.
const fs = require("fs");
const path = require("path");

// ---------- Filter-Node, nachgebildet ----------
const bed = JSON.parse(fs.readFileSync(path.join(__dirname, "filter_bedingungen.json"), "utf8"));
const RX = Object.fromEntries(Object.entries(bed).map(([k, v]) => [k, new RegExp(v)]));
function links(json) {
  const f = (json.issue && json.issue.fields) || {};
  const r = f.reporter || {}, c = f.creator || {};
  return {
    reporterKonto: String(r.accountId || ""),
    creatorKonto: String(c.accountId || ""),
    personen: (String(r.emailAddress || "") + " " + String(r.displayName || "") + " " + String(c.emailAddress || "") + " " + String(c.displayName || "")).toLowerCase(),
    summary: String(f.summary || "").toLowerCase()
  };
}
function bleibt(json) {
  const l = links(json);
  return !RX.konten.test(l.reporterKonto) && !RX.konten.test(l.creatorKonto)
    && !RX.personen.test(l.personen) && !RX.praefix.test(l.summary) && !RX.muster.test(l.summary);
}

// ---------- Code-Node ----------
const code = fs.readFileSync(path.join(__dirname, "ereignis_referenz.js"), "utf8");
function laufen(items) {
  const $input = { all: () => items.map((j) => ({ json: j })) };
  return new Function("$input", code)($input);
}

const RWG_AUTOMATE = "712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9";
const AUTOMATION_FOR_JIRA = "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077";
const MENSCH = "712020:mensch-a";
const mensch = { accountId: "712020:mensch-b", emailAddress: "mensch@rwg-r.de", displayName: "mensch" };
const monitoring = { accountId: "712020:2c41da01-c990-498c-814a-aa04c2a3db9f", emailAddress: "", displayName: "managed.monitoring" };
const defender = { accountId: "60242eda988758006893fa52", emailAddress: "", displayName: "defender-noreply@microsoft.com" };
const automate = { accountId: RWG_AUTOMATE, emailAddress: "rwg_automate@rwg-r.de", displayName: "RWG.Automate" };

function kommentar(key, summary, statusName, katKey) {
  return { webhookEvent: "comment_created", comment: { id: "0", author: { accountId: MENSCH, displayName: "mensch" }, body: "x" },
    issue: { key: key, fields: { summary: summary, issuetype: { name: "Service Anfrage" }, project: { key: "SSD" }, priority: { name: "Medium" },
      status: { name: statusName, statusCategory: { key: katKey } } } } };
}
function aenderung(key, summary, reporter, statusName, katKey, actor) {
  return { webhookEvent: "jira:issue_updated", user: { accountId: actor || MENSCH },
    issue: { key: key, fields: { summary: summary, reporter: reporter, creator: reporter, status: { name: statusName, statusCategory: { key: katKey } } } },
    changelog: { items: [{ field: "status", fieldId: "status", fromString: "Offen", toString: statusName }] } };
}

const filterFaelle = [
  ["Mensch, Feldaenderung", aenderung("SSD-1", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate"), true],
  ["Mensch, Kommentar (kein Melder im Payload)", kommentar("SSD-2", "Headsets / Zuweisung Postfach", "ERLEDIGT", "done"), true],
  ["Siemensring, Kommentar", kommentar("SSD-3", "Drucker am Siemensring defekt", "In Arbeit", "indeterminate"), true],
  ["Mensch erwaehnt Defender", kommentar("SSD-4", "Defender blockiert unser Warenwirtschaftsprogramm", "In Arbeit", "indeterminate"), true],
  ["Snipe-IT Anfrage (kein Checker)", kommentar("SSD-5", "Snipe-IT - Geraetestatus auf Standard zuruecksetzen", "In Arbeit", "indeterminate"), true],
  ["Monitoring, Feldaenderung (Melder)", aenderung("SSD-6", "Ping Fehler", monitoring, "In Arbeit", "indeterminate"), false],
  ["Monitoring, Kommentar (nur Zusammenfassung)", kommentar("SSD-7", "[Managed | Monitoring] FSLogix fslogix Fehler", "In Arbeit", "indeterminate"), false],
  ["Defender, Feldaenderung (Melder)", aenderung("SSD-8", "Irgendwas", defender, "In Arbeit", "indeterminate"), false],
  ["Defender Threat analytics, Kommentar", kommentar("SSD-9", "Threat analytics report from Microsoft 365 Defender", "In Arbeit", "indeterminate"), false],
  ["Defender severity alert, Kommentar", kommentar("SSD-10", "Low severity alert: An active 'X' unwanted software was blocked on laptop", "In Arbeit", "indeterminate"), false],
  ["Defender XDR, Kommentar", kommentar("SSD-11", "Important: A user has taken an immediate response action in Microsoft Defender XDR", "In Arbeit", "indeterminate"), false],
  ["Defender Endpoint, Kommentar", kommentar("SSD-12", "New zero-day vulnerabilities from Microsoft Defender for Endpoint", "In Arbeit", "indeterminate"), false],
  ["SIEM-Bericht, Kommentar", kommentar("SSD-13", "Bericht zu kritischen Events (SIEM)", "In Arbeit", "indeterminate"), false],
  ["Intune-Checker, Kommentar", kommentar("SSD-14", "Intune-Checker: Fehlende Seriennummern identifiziert", "In Arbeit", "indeterminate"), false],
  ["RWG.Automate als Melder", aenderung("SSD-15", "Neue Anfrage", automate, "In Arbeit", "indeterminate"), false]
];
let fehler = 0;
console.log("=== Filter-Node 'Maschinentickets aussortieren' (nachgebildet) ===");
for (const [name, json, soll] of filterFaelle) {
  const ist = bleibt(json);
  const ok = ist === soll; if (!ok) fehler += 1;
  console.log((ok ? "ok         " : "ABWEICHUNG ") + name.padEnd(46) + (ist ? "bleibt" : "aussortiert"));
}

// Bestand: 200 echte Tickets, je einmal mit Melder und einmal als Kommentar ohne Melder
const bestandPfad = path.join(__dirname, "..", "..", "..", "..", "..", "..", "..", "AppData", "Local", "Temp", "feldpflege", "tickets_maschinen.json");
const alt = "C:/Users/lis/AppData/Local/Temp/feldpflege/tickets_maschinen.json";
const bp = fs.existsSync(alt) ? alt : null;
if (bp) {
  const t = JSON.parse(fs.readFileSync(bp, "utf8"));
  const MENSCHEN = new Set(["712020:a66e98e3-d5c0-4735-b88d-bf32054483ec"]);
  let f1 = [], f2 = [];
  for (const [key, summary, name, mail, acc] of t) {
    const istMensch = MENSCHEN.has(acc);
    const mit = aenderung(key, summary, { accountId: acc, emailAddress: mail, displayName: name }, "In Arbeit", "indeterminate");
    const ohne = kommentar(key, summary, "In Arbeit", "indeterminate");
    if (bleibt(mit) !== istMensch) f1.push(key);
    if (bleibt(ohne) !== istMensch) f2.push(key);
  }
  console.log("Bestand mit Melder : " + t.length + " Tickets, Abweichungen: " + (f1.length ? f1.join(", ") : "keine"));
  console.log("Bestand ohne Melder: " + t.length + " Tickets, Abweichungen: " + (f2.length ? f2.join(", ") : "keine"));
  if (f1.length || f2.length) fehler += 1;
}

console.log("\n=== Code-Node 'Ticketereignis pruefen' ===");
const echterKommentar = { timestamp: 1788445576082, webhookEvent: "comment_created",
  comment: { id: "61233", author: { accountId: MENSCH, displayName: "mensch" }, body: "Hardware wurde abgeholt und im Snipe erfasst. ", jsdPublic: false },
  issue: { id: "50792", key: "SSD-9240", fields: { summary: "Headsets / Zuweisung Postfach", issuetype: { id: "10003", name: "Service Anfrage" }, project: { key: "SSD" },
    assignee: { accountId: MENSCH, displayName: "mensch" }, priority: { name: "Sehr Niedrig", id: "5" },
    status: { name: "ERLEDIGT", id: "10020", statusCategory: { id: 3, key: "done", name: "Fertig" } } } },
  eventType: "partOfWorkflowEvent", triggeredByUser: MENSCH };
const codeFaelle = [
  ["echter Kommentar, Ticket ERLEDIGT (114800)", [echterKommentar], { anzahl: 1, abschluss: true }],
  ["Feldaenderung In Arbeit", [aenderung("SSD-1", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate")], { anzahl: 1, abschluss: false }],
  ["Feldaenderung nach ERLEDIGT", [aenderung("SSD-2", "Drucker druckt nicht", mensch, "ERLEDIGT", "done")], { anzahl: 1, abschluss: true }],
  ["Automation for Jira als Akteur", [aenderung("SSD-3", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate", AUTOMATION_FOR_JIRA)], { anzahl: 0 }],
  ["RWG.Automate als Akteur", [aenderung("SSD-4", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate", RWG_AUTOMATE)], { anzahl: 0 }],
  ["Bearbeiterwechsel (kein relevantes Feld)", [Object.assign(aenderung("SSD-5", "x", mensch, "In Arbeit", "indeterminate"), { changelog: { items: [{ field: "assignee", fieldId: "assignee" }] } })], { anzahl: 0 }],
  ["ohne Ticketschluessel", [{ webhookEvent: "jira:issue_updated", issue: {} }], { anzahl: 0 }]
];
for (const [name, items, soll] of codeFaelle) {
  const out = laufen(items);
  let ok = out.length === soll.anzahl;
  if (ok && soll.anzahl === 1) ok = out[0].json.abschluss === soll.abschluss;
  if (!ok) fehler += 1;
  const ist = out.length === 0 ? "verworfen" : ("weiter, abschluss=" + out[0].json.abschluss + ", " + out[0].json.source);
  console.log((ok ? "ok         " : "ABWEICHUNG ") + name.padEnd(46) + ist);
}
console.log(fehler === 0 ? "\nAlle Faelle wie erwartet." : "\n" + fehler + " Abweichung(en).");
process.exit(fehler === 0 ? 0 : 1);
