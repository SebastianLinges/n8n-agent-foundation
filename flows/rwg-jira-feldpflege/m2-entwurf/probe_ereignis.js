// Prueft "Ticketereignis pruefen" gegen Webhook-Nutzlasten - so, wie der
// Code in ereignis_referenz.js steht. Fall 1 ist die echte Nutzlast aus
// Lauf 114800 (Kommentar am erledigten SSD-9240, Avatar-Adressen entfernt);
// die uebrigen Faelle bilden die Struktur eines jira:issue_updated nach,
// wie sie der Ingest in raw_payload aufzeichnet.
const fs = require("fs");
const code = fs.readFileSync(__dirname + "/ereignis_referenz.js", "utf8");

function laufen(items) {
  const $input = { all: () => items.map((j) => ({ json: j })) };
  return new Function("$input", code)($input);
}

const RWG_AUTOMATE = "712020:86b7f975-90a6-40c7-9e3b-aff4c9013cb9";
const AUTOMATION_FOR_JIRA = "557058:f58131cb-b67d-43c7-b30d-6b58d40bd077";
const MENSCH = "712020:mensch-a";

const echterKommentar = {
  timestamp: 1788445576082, webhookEvent: "comment_created",
  comment: { id: "61233", author: { accountId: MENSCH, displayName: "mensch" }, body: "Hardware wurde abgeholt und im Snipe erfasst. ", jsdPublic: false },
  issue: { id: "50792", key: "SSD-9240", fields: {
    summary: "Headsets / Zuweisung Postfach",
    issuetype: { id: "10003", name: "Service Anfrage" },
    project: { key: "SSD" },
    assignee: { accountId: MENSCH, displayName: "mensch" },
    priority: { name: "Sehr Niedrig", id: "5" },
    status: { name: "ERLEDIGT", id: "10020", statusCategory: { id: 3, key: "done", name: "Fertig" } }
  } },
  eventType: "partOfWorkflowEvent", triggeredByUser: MENSCH
};

function aenderung(key, summary, reporter, statusName, katKey, actor) {
  return {
    webhookEvent: "jira:issue_updated", issue_event_type_name: "issue_generic",
    user: { accountId: actor || MENSCH, displayName: "jemand" },
    issue: { key: key, fields: {
      summary: summary,
      reporter: reporter, creator: reporter,
      status: { name: statusName, statusCategory: { key: katKey } }
    } },
    changelog: { items: [{ field: "status", fieldId: "status", fromString: "Offen", toString: statusName }] }
  };
}
const mensch = { accountId: "712020:mensch-b", emailAddress: "mensch@rwg-r.de", displayName: "mensch" };
const monitoring = { accountId: "5f0000000000000000000000", emailAddress: "managed.monitoring@rwg-r.de", displayName: "Managed Monitoring" };
const automate = { accountId: RWG_AUTOMATE, emailAddress: "rwg_automate@rwg-r.de", displayName: "RWG.Automate" };

const faelle = [
  { name: "echter Kommentar, Ticket ERLEDIGT (114800)", items: [echterKommentar], soll: { anzahl: 1, abschluss: true } },
  { name: "Feldaenderung, Mensch, In Arbeit", items: [aenderung("SSD-1", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate")], soll: { anzahl: 1, abschluss: false } },
  { name: "Feldaenderung, Mensch, nach ERLEDIGT", items: [aenderung("SSD-2", "Drucker druckt nicht", mensch, "ERLEDIGT", "done")], soll: { anzahl: 1, abschluss: true } },
  { name: "Monitoring-Praefix in der Zusammenfassung", items: [aenderung("SSD-3", "[Managed | Monitoring] 192.168.26.11 (Barracuda Erkelens) Ping (Ping) Fehler", mensch, "In Arbeit", "indeterminate")], soll: { anzahl: 0 } },
  { name: "Monitoring-Mailbox als Melder, neutrale Zusammenfassung", items: [aenderung("SSD-4", "Ping Fehler", monitoring, "In Arbeit", "indeterminate")], soll: { anzahl: 0 } },
  { name: "Defender-Muster", items: [aenderung("SSD-5", "New vulnerabilities notification from Microsoft Defender for Endpoint", mensch, "In Arbeit", "indeterminate")], soll: { anzahl: 0 } },
  { name: "SIEM-Bericht", items: [aenderung("SSD-6", "Bericht zu kritischen Events (SIEM)", mensch, "In Arbeit", "indeterminate")], soll: { anzahl: 0 } },
  { name: "Siemensring darf NICHT als SIEM gelten", items: [aenderung("SSD-7", "Drucker am Siemensring defekt", mensch, "In Arbeit", "indeterminate")], soll: { anzahl: 1, abschluss: false } },
  { name: "RWG.Automate als Melder", items: [aenderung("SSD-8", "Neue Anfrage", automate, "In Arbeit", "indeterminate")], soll: { anzahl: 0 } },
  { name: "Automation for Jira als Akteur (Bestandsregel)", items: [aenderung("SSD-9", "Drucker druckt nicht", mensch, "In Arbeit", "indeterminate", AUTOMATION_FOR_JIRA)], soll: { anzahl: 0 } },
  { name: "Monitoring-Kommentar ohne reporter im Payload", items: [Object.assign({}, echterKommentar, { issue: { key: "SSD-10", fields: { summary: "[Managed | Monitoring] FSLogix fslogix Fehler", status: { name: "In Arbeit", statusCategory: { key: "indeterminate" } } } } })], soll: { anzahl: 0 } }
];

let fehler = 0;
for (const f of faelle) {
  const out = laufen(f.items);
  let ok = out.length === f.soll.anzahl;
  if (ok && f.soll.anzahl === 1) ok = out[0].json.abschluss === f.soll.abschluss;
  if (!ok) fehler += 1;
  const ist = out.length === 0 ? "verworfen" : ("weiter, abschluss=" + out[0].json.abschluss + ", " + out[0].json.source);
  console.log((ok ? "ok         " : "ABWEICHUNG ") + f.name.padEnd(52) + ist);
}
console.log(fehler === 0 ? "\nAlle " + faelle.length + " Faelle wie erwartet." : "\n" + fehler + " Abweichung(en).");
process.exit(fehler === 0 ? 0 : 1);
