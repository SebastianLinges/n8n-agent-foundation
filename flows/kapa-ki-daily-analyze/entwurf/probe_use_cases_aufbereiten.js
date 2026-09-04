// Fuehrt "use_cases aufbereiten" SO AUS, WIE ES IN
// use_cases_aufbereiten_referenz.js STEHT. Geprueft werden die vier Faelle,
// die vorher alle gleich aussahen - und dass die Bilanzzeile nie ein uc_id
// traegt, damit der Filter sie zuverlaessig aussortiert.
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'use_cases_aufbereiten_referenz.js'), 'utf8');

function lauf(antwort, kandidaten) {
  const quellen = { 'Redaktionsauswahl aufbereiten': [{ json: { count: kandidaten } }] };
  const $ = (name) => {
    const items = quellen[name];
    if (!items) throw new Error('Unbekannter Node im Test: ' + name);
    return { all: () => items, first: () => items[0] };
  };
  const fn = new Function('$', '$json', '$now', code);
  return fn($, { text: antwort }, { toISO: () => '2026-09-04T12:00:00.000Z' });
}

const GUT = JSON.stringify([{
  name: 'Lieferschein dem Auftrag zuordnen', pillar: 'handwerk',
  target_group: 'Elektrohandwerk', problem: 'Belege liegen lose im Buero.',
  solution: 'Zuordnung beim Eingang.', technology: 'Automatisierung',
  trigger_source: 'Test', score: 8, business_model: 'Weniger Nacharbeit.'
}]);

let fehler = 0;
function pruef(titel, ist, soll) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler += 1; console.log('  FEHLT ' + titel + '  ist ' + JSON.stringify(ist) + ', erwartet ' + JSON.stringify(soll)); }
  else console.log('  ok    ' + titel);
}

function bilanzVon(out) { return out.filter(o => o.json.ist_bilanz)[0]; }
function ucsVon(out) { return out.filter(o => !o.json.ist_bilanz); }

console.log('--- Fall 1: das Modell liefert einen brauchbaren Vorschlag ---');
let o = lauf(GUT, 5);
pruef('ein Use Case entsteht        ', ucsVon(o).length, 1);
pruef('genau eine Bilanzzeile       ', o.filter(x => x.json.ist_bilanz).length, 1);
pruef('Bilanz ohne uc_id            ', bilanzVon(o).json.uc_id === undefined, true);
pruef('Grund benannt                ', bilanzVon(o).json.grund, 'Use Cases entstanden');
console.log('        ' + bilanzVon(o).json.bilanz);

console.log('\n--- Fall 2: leeres Array, der reale Fall vom 02.09. ---');
o = lauf('```json\n[]\n```', 5);
pruef('kein Use Case                ', ucsVon(o).length, 0);
pruef('trotzdem eine Bilanzzeile    ', o.length, 1);
pruef('Grund benannt                ', bilanzVon(o).json.grund.indexOf('nichts vorgeschlagen') >= 0, true);
pruef('Kandidatenzahl im Protokoll  ', bilanzVon(o).json.kandidaten, 5);
console.log('        ' + bilanzVon(o).json.bilanz);

console.log('\n--- Fall 3: kaputtes JSON, vorher unsichtbar ---');
o = lauf('Hier sind die Use Cases: [{name: kaputt', 5);
pruef('kein Use Case                ', ucsVon(o).length, 0);
pruef('Parserfehler ist festgehalten', bilanzVon(o).json.parser_fehler.length > 0, true);
pruef('Grund benannt                ', bilanzVon(o).json.grund, 'Antwort des Modells nicht lesbar');
console.log('        ' + bilanzVon(o).json.bilanz);

console.log('\n--- Fall 4: alle Vorschlaege generisch, vorher unsichtbar ---');
o = lauf(JSON.stringify([{ name: 'Digitalisierung' }, { name: 'KI im Mittelstand' }]), 5);
pruef('kein Use Case                ', ucsVon(o).length, 0);
pruef('als generisch gezaehlt       ', bilanzVon(o).json.verworfen_generisch, 2);
pruef('Namen sind nachlesbar        ', bilanzVon(o).json.verworfene_namen.indexOf('KI im Mittelstand') >= 0, true);
console.log('        ' + bilanzVon(o).json.bilanz);

console.log('\n--- Fall 5: Antwort ist ein Objekt statt eines Arrays ---');
o = lauf('{"use_cases": []}', 5);
pruef('kein Use Case                ', ucsVon(o).length, 0);
pruef('Grund benannt                ', bilanzVon(o).json.grund, 'Antwort des Modells nicht lesbar');
console.log('        ' + bilanzVon(o).json.bilanz);

console.log('\n--- Gegenprobe: Verhalten gegenueber der Altfassung unveraendert ---');
const alt = fs.readFileSync(path.join(__dirname, 'use_cases_aufbereiten_aktiv.js'), 'utf8');
function laufAlt(antwort) {
  const fn = new Function('$json', '$now', alt);
  return fn({ text: antwort }, { toISO: () => '2026-09-04T12:00:00.000Z' });
}
for (const [name, antwort] of [['guter Vorschlag', GUT], ['leeres Array', '[]'], ['kaputt', '{'], ['generisch', JSON.stringify([{ name: 'Digitalisierung' }])]]) {
  const a = laufAlt(antwort).length;
  const n = ucsVon(lauf(antwort, 5)).length;
  const ok = a === n;
  if (!ok) fehler += 1;
  console.log((ok ? '  ok    ' : '  FEHLT ') + name.padEnd(18) + 'alt ' + a + ' Use Cases, neu ' + n);
}

console.log(fehler === 0 ? '\nAlle Faelle wie erwartet.' : '\n' + fehler + ' Abweichung(en).');
process.exit(fehler === 0 ? 0 : 1);
