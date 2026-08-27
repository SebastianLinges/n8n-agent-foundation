// Ergaenzt den internen Kommentar um zwei Bloecke:
//   1. Anliegen-Zerlegung der Policy - nur wenn sie etwas beitraegt
//   2. Feldpflege-Notiz, ausschliesslich bei tatsaechlich geschriebener Aenderung
// Ausgabe-Vertrag { ticketKey, internalComment } bleibt erhalten.

const inp = $input.first().json || {};
const route = $('Routing und Prioritaet ableiten').first().json || {};

let policy = {};
try {
  const pn = $('Policy und Routing bestimmen').first().json || {};
  policy = pn.output || pn || {};
} catch (e) { policy = {}; }

const bloecke = [];

// ---- Block 1: Anliegen-Zerlegung ----
// Nur ausgeben, wenn sie mehr sagt als die Zusammenfassung: mehrere Anliegen,
// eine benannte Luecke oder eine belegte Unklarheit.
const anliegen = Array.isArray(policy.anliegen) ? policy.anliegen.slice(0, 5) : [];

function klaerungsbedarf(a) {
  const lesarten = Array.isArray(a.lesarten) ? a.lesarten.filter(function (x) { return String(x || '').trim().length > 0; }) : [];
  return a.zielUnklar === true && a.vorgehenGleich !== true && lesarten.length >= 2 ? lesarten : null;
}

const mehrere = anliegen.length > 1;
const hatLuecke = anliegen.some(function (a) { return String((a || {}).fehlt || '').trim().length > 0; });
const hatKlaerung = anliegen.some(function (a) { return klaerungsbedarf(a || {}) !== null; });

if (anliegen.length > 0 && (mehrere || hatLuecke || hatKlaerung)) {
  const zeilen = [];
  zeilen.push(mehrere ? ('Anliegen im Ticket: ' + anliegen.length) : 'Anliegen im Ticket');
  for (let i = 0; i < anliegen.length; i++) {
    const a = anliegen[i] || {};
    const nr = String(a.nr || (i + 1));
    let zeile = nr + ' - ' + String(a.thema || 'ohne Bezeichnung').trim();

    const fehlt = String(a.fehlt || '').trim();
    if (fehlt) zeile += '. Fehlt: ' + fehlt;

    const lesarten = klaerungsbedarf(a);
    if (lesarten) zeile += '. Zu klaeren: ' + lesarten.slice(0, 3).join(' oder ') + '?';

    zeilen.push(zeile);
  }
  if (mehrere) {
    zeilen.push('Mehrere unabhaengige Anliegen. Aufteilung des Tickets pruefen.');
  }
  bloecke.push(zeilen.join('\n'));
}

// ---- Block 2: Support-Level ----
// Nur bei tatsaechlich geschriebener Aenderung. Konnte nicht sicher bewertet
// werden, bleibt der bestehende Wert stehen und es gibt nichts zu melden.
const lvl = route.supportLevel || {};
if (lvl.geaendert === true) {
  bloecke.push('Support-Level automatisch von ' + (lvl.von || 'unbekannt') + ' auf ' + lvl.nach + ' ' + (lvl.richtung || '') + ' (' + (lvl.begruendung || 'ohne Begründung') + ').');
}

// ---- Einfuegen ----
const out = Object.assign({}, inp);
out.zusatznotizen = bloecke;

const text = String(inp.internalComment || '');
if (bloecke.length > 0 && text) {
  const einschub = bloecke.join('\n\n');
  const kopf = 'Agenten-Ersteinschätzung';
  if (text.indexOf(kopf) === 0) {
    const rest = text.slice(kopf.length).replace(/^\n+/, '');
    out.internalComment = kopf + '\n\n' + einschub + '\n\n' + rest;
  } else {
    out.internalComment = einschub + '\n\n' + text;
  }
}

return [{ json: out }];