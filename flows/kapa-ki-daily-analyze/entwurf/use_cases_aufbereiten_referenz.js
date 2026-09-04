// ============================================================
// Aus der Antwort des Business Scout werden Use-Case-Zeilen.
//
// Der Knoten gibt seit dem 04.09.2026 IMMER eine Bilanzzeile aus, auch
// wenn nichts entsteht. Vorher waren drei Faelle nicht zu unterscheiden:
// das Modell fand nichts, die Antwort war kein gueltiges JSON, oder der
// Generisch-Filter verwarf alles. Alle drei sahen gleich aus - leere
// Ausgabe, gruener Lauf, keine Meldung. So blieb vom 21.08. bis zum
// 03.09.2026 vierzehn Tage lang unbemerkt, dass gar keine Use Cases
// mehr entstanden.
//
// WICHTIG: Die Bilanzzeile traegt ist_bilanz = true und hat bewusst
// KEIN uc_id. Der Filter "Nur Use Cases" sortiert sie vor dem Schreiben
// aus. Ohne diesen Filter landet sie in use_cases und scheitert dort an
// den NOT-NULL-Spalten uc_id und name.
// ============================================================
let kandidaten = null;
try { kandidaten = $('Redaktionsauswahl aufbereiten').first().json.count; } catch (e) { kandidaten = null; }

const roh = ($json && $json.text) ? $json.text : (($json && $json.output) ? $json.output : '');
const text = String(roh).replace(/```json/g, '').replace(/```/g, '').trim();

let arr = null;
let parserFehler = '';
try {
  arr = JSON.parse(text);
} catch (e) {
  parserFehler = String((e && e.message) || e).slice(0, 200);
}
if (!Array.isArray(arr)) {
  if (!parserFehler) parserFehler = 'Antwort ist kein Array, sondern ' + (arr === null ? 'null' : typeof arr);
  arr = [];
}

const VALID = ['handwerk', 'fertigung', 'engineering', 'buero'];

// Austauschbare Namen werden verworfen, statt den Bestand zu verwaessern.
const GENERIC = ['workflow-automatisierung','workflow automation','prozessoptimierung','ki-integration','digitalisierung','automatisierung','automatisierung fuer kleine unternehmen','automatisierung für kleine unternehmen','ki im mittelstand','effizienzsteigerung'];
function istGenerisch(name){
  const n = String(name||'').toLowerCase().trim().replace(/\s+/g,' ');
  if (n.length < 12) return true;
  return GENERIC.some(g => n === g || n === g + ' fuer kleine unternehmen' || n === g + ' für kleine unternehmen');
}
function fallbackPillar(u){
  const blob = ((u.name||'')+' '+(u.target_group||'')+' '+(u.problem||'')+' '+(u.solution||'')).toLowerCase();
  if (/handwerk|baustelle|montage|installat|aufmass|werkstatt|gewerk/.test(blob)) return 'handwerk';
  if (/fertigung|produktion|maschine|prüfprotokoll|pruefprotokoll|qualität|qualitaet|inspekt|ausschuss|cnc/.test(blob)) return 'fertigung';
  if (/ingenieurb|konstruktion|cad|pdm|plm|stückliste|stueckliste|zeichnung|projektkoordination/.test(blob)) return 'engineering';
  return 'buero';
}

const nowIso = $now.toISO();
const base = Date.now();
const out = [];
let ohneNamen = 0;
let generisch = 0;
const verworfeneNamen = [];

arr.slice(0, 4).forEach((u, idx) => {
  if (!u || !u.name) { ohneNamen += 1; return; }
  if (istGenerisch(u.name)) { generisch += 1; verworfeneNamen.push(String(u.name).slice(0, 60)); return; }
  let pillar = String(u.pillar||'').toLowerCase().trim();
  if (VALID.indexOf(pillar) < 0) pillar = fallbackPillar(u);
  out.push({ json: {
    uc_id:'uc_'+base+'_'+idx,
    name:String(u.name||'').slice(0,200),
    pillar,
    target_group:String(u.target_group||''),
    problem:String(u.problem||''),
    solution:String(u.solution||''),
    technology:String(u.technology||''),
    trigger_source:String(u.trigger_source||''),
    score:(typeof u.score==='number'?u.score:0),
    business_model:String(u.business_model||''),
    status:'new', first_seen:nowIso, last_evaluated:nowIso
  } });
});

// ------------------------------------------------------------
// Die Bilanz. Sie beantwortet die eine Frage, die vierzehn Tage lang
// niemand beantworten konnte: Warum ist nichts entstanden?
// ------------------------------------------------------------
const saeulen = {};
out.forEach(o => { saeulen[o.json.pillar] = (saeulen[o.json.pillar] || 0) + 1; });

let grund = '';
if (out.length > 0) grund = 'Use Cases entstanden';
else if (parserFehler) grund = 'Antwort des Modells nicht lesbar';
else if (arr.length === 0) grund = 'Das Modell hat nichts vorgeschlagen - meist zu wenige oder unpassende Kandidaten';
else if (generisch + ohneNamen >= arr.length) grund = 'Alle Vorschlaege als generisch oder namenlos verworfen';
else grund = 'unklar';

const bilanz =
  'Business Scout: ' + String(kandidaten === null ? '?' : kandidaten) + ' Kandidaten -> ' +
  arr.length + ' Vorschlaege -> ' + out.length + ' geschrieben' +
  (generisch ? ' (' + generisch + ' generisch verworfen)' : '') +
  (ohneNamen ? ' (' + ohneNamen + ' ohne Namen)' : '') +
  (parserFehler ? ' | PARSERFEHLER: ' + parserFehler : '') +
  ' | ' + grund;

out.push({ json: {
  ist_bilanz: true,
  bilanz,
  grund,
  kandidaten,
  vorschlaege: arr.length,
  geschrieben: out.length,
  verworfen_generisch: generisch,
  verworfen_ohne_namen: ohneNamen,
  verworfene_namen: verworfeneNamen.join(' | '),
  parser_fehler: parserFehler,
  saeulen: JSON.stringify(saeulen),
  antwort_gekuerzt: text.slice(0, 300),
  gemessen_am: nowIso
} });

return out;
