// Prueft die Bereinigung SO, WIE SIE IN DER REFERENZFASSUNG STEHT:
// der Block wird aus kontext_referenz.js herausgeschnitten, nicht abgetippt.
//
// ACHTUNG: Die Testtexte sind nachgebaut, nicht aus Jira geholt. Sie
// belegen das Verhalten des Codes, nicht die Wirkung auf echte Tickets.

const fs = require("fs");

const quelle = fs.readFileSync("kontext_referenz.js", "utf8");
const von = quelle.indexOf("// --- M-5 Signaturbereinigung");
const bis = quelle.indexOf("// --- Ende M-5");
if (von === -1 || bis === -1) { throw new Error("M-5-Block in der Referenzfassung nicht gefunden"); }
const block = quelle.slice(von, bis);

const bauen = new Function(
  block + "\nreturn { bereinigeText: bereinigeText, zaehler: function () { return { bereinigt: bereinigtAnzahl, verworfen: verworfenAnzahl }; }, grenzen: { normal: MIN_REST_ZEICHEN, zitat: MIN_REST_ZEICHEN_ZITAT } };"
);
const m5 = bauen();

console.log("Grenzen aus der Referenzfassung: normal=" + m5.grenzen.normal + ", zitat=" + m5.grenzen.zitat + "\n");

const faelle = [
  {
    name: "kurzes Anliegen, langer Signaturblock",
    soll: "bereinigt",
    zeilen: [
      "Guten Morgen,",
      "",
      "beim Anmelden am Terminal 3 kommt seit heute die Meldung 'Profil nicht verfuegbar'.",
      "Bitte einmal pruefen.",
      "",
      "Mit freundlichen Gruessen",
      "Max Mustermann",
      "Abteilung Warenwirtschaft",
      "RWG Rheinland eG",
      "Telefon:",
      "+49 221 123456",
      "E-Mail:",
      "max.mustermann@rwg-r.de",
      "Musterstrasse 12 | 50667 Koeln",
      "Website:",
      "www.rwg-r.de"
    ]
  },
  {
    name: "zwei Saetze, Signatur mit Rechtshinweis",
    soll: "bereinigt",
    zeilen: [
      "Der Drucker in Raum 2.14 druckt nicht mehr.",
      "",
      "Viele Gruesse",
      "Lena Ober",
      "Telefon:",
      "0221 999888",
      "50667 Koeln",
      "Vertraulichkeitshinweis: Diese E-Mail und etwaige Anhaenge sind vertraulich."
    ]
  },
  {
    name: "langer Fachtext, kurze Signatur",
    soll: "bereinigt",
    zeilen: [
      "Bei der Monatsabrechnung laufen die Buchungen aus dem Vorsystem doppelt ein.",
      "Betroffen sind alle Belege vom 28. bis 31. des Vormonats, insgesamt rund 240 Zeilen.",
      "Der Abgleich ueber die Belegnummer zeigt, dass die zweite Zeile jeweils eine neue",
      "interne ID traegt, sonst aber identisch ist. Ein manuelles Loeschen ist mir zu riskant,",
      "weil die Fibu bereits auf die Zahlen zugegriffen hat.",
      "",
      "Beste Gruesse",
      "Anna Schmitz"
    ]
  },
  {
    name: "Verweiszeile plus Zitat - Zitat muss bleiben",
    soll: "unveraendert",
    zeilen: [
      "Das Problem besteht weiterhin, siehe unten.",
      "",
      "Von: Support <support@rwg-r.de>",
      "Gesendet: Montag, 1. September 2026 09:12",
      "An: Max Mustermann",
      "Betreff: AW: Terminal 3",
      "",
      "Bitte pruefen Sie, ob das Kabel steckt."
    ]
  },
  {
    name: "eigener Inhalt plus Zitat - Zitat darf weg",
    soll: "bereinigt",
    zeilen: [
      "Das Kabel steckt, ich habe es an beiden Enden geprueft und auch getauscht.",
      "Der Fehler tritt weiterhin an allen drei Terminals im Erdgeschoss auf,",
      "an den Terminals im ersten Stock dagegen nicht.",
      "",
      "Von: Support <support@rwg-r.de>",
      "Gesendet: Montag, 1. September 2026 09:12",
      "Betreff: AW: Terminal 3",
      "",
      "Bitte pruefen Sie, ob das Kabel steckt."
    ]
  },
  {
    name: "ohne Signatur - darf sich nicht aendern",
    soll: "unveraendert",
    zeilen: [
      "Die Schnittstelle zur Warenwirtschaft meldet seit 08:00 Uhr Zeitueberschreitungen.",
      "Alle Filialen sind betroffen, Bestellungen koennen nicht abgesetzt werden."
    ]
  },
  {
    name: "sehr kurzer Kommentar - darf sich nicht aendern",
    soll: "unveraendert",
    zeilen: ["Erledigt, danke."]
  }
];

let fehler = 0;
console.log("Fall".padEnd(46) + "roh".padStart(6) + "neu".padStart(6) + "  Ergebnis      Soll");
console.log("-".repeat(92));

for (const f of faelle) {
  let roh = "";
  for (const z of f.zeilen) { roh = roh + z + "\n"; }
  roh = roh.trim();

  const vor = m5.zaehler();
  const neu = m5.bereinigeText(roh);
  const nach = m5.zaehler();

  let ist;
  if (nach.verworfen > vor.verworfen) { ist = "verworfen"; }
  else if (neu !== roh) { ist = "bereinigt"; }
  else { ist = "unveraendert"; }

  // "verworfen" bedeutet fachlich: Originaltext bleibt stehen.
  const istWirkung = ist === "verworfen" ? "unveraendert" : ist;
  const ok = istWirkung === f.soll;
  if (!ok) { fehler += 1; }

  console.log(
    f.name.padEnd(46) +
    String(roh.length).padStart(6) +
    String(neu.length).padStart(6) +
    "  " + ist.padEnd(14) + f.soll.padEnd(14) + (ok ? "ok" : "ABWEICHUNG")
  );
}

console.log("\nZaehler am Ende: " + JSON.stringify(m5.zaehler()));
console.log(fehler === 0 ? "\nAlle Faelle wie erwartet." : "\n" + fehler + " Fall/Faelle weichen ab.");

console.log("\n--- Was jeweils an das Modell ginge ---\n");
for (const f of faelle) {
  let roh = "";
  for (const z of f.zeilen) { roh = roh + z + "\n"; }
  roh = roh.trim();
  const neu = m5.bereinigeText(roh);
  console.log("### " + f.name + "  (" + roh.length + " -> " + neu.length + ")");
  console.log(neu);
  console.log("");
}

process.exit(fehler === 0 ? 0 : 1);
