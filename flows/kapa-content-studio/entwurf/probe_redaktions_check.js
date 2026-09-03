// Fuehrt "Redaktions-Check" SO AUS, WIE ES IN redaktions_check_referenz.js
// STEHT. Geprueft wird vor allem die Mengenwortregel, seit sie ihr Muster aus
// "Redaktionsregeln" bezieht statt es selbst zu fuehren.
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'redaktions_check_referenz.js'), 'utf8');
const regeln = JSON.parse(fs.readFileSync(path.join(__dirname, 'redaktionsregeln.json'), 'utf8'));

function lauf(c, regelnJson) {
  const quellen = {
    'Blocklist lesen': [{ json: { pattern: 'beispiel-beratung.de', match_type: 'domain', reason: 'consulting' } }],
    'Redaktionsregeln': [{ json: regelnJson }]
  };
  const $ = (name) => {
    const items = quellen[name];
    if (!items) throw new Error('Unbekannter Node im Test: ' + name);
    return { all: () => items, first: () => items[0] };
  };
  const fn = new Function('$', '$json', code);
  return fn($, c)[0].json;
}

const BASIS = {
  linkedin_hashtags: '#Handwerk #Automatisierung #Prozesse',
  instagram_hashtags: '',
  uc_technology: 'Automatisierung',
  belegte_zahlen: ''
};
function fall(text, extra) {
  return lauf(Object.assign({}, BASIS, { linkedin_text: text }, extra || {}), regeln);
}
function hatMenge(r) {
  return String(r.qa_issues || '').indexOf('Mengenangabe ohne Beleg') >= 0;
}

let fehler = 0;
function pruef(titel, ist, soll) {
  const ok = ist === soll;
  if (!ok) fehler += 1;
  console.log((ok ? '  ok    ' : '  FEHLT ') + titel + '  (ist ' + ist + ', erwartet ' + soll + ')');
}

console.log('--- Mengenwortregel ---');
const mitZiel = fall('Im Rechnungseingang wird jeder Beleg einzeln gepruft. Das senkt den Aufwand erheblich.');
pruef('Mengenwort neben Aufwand wird gemeldet', hatMenge(mitZiel), true);

const ohneZiel = fall('Im Rechnungseingang wird jeder Beleg einzeln gepruft. Das erleichtert den Arbeitsalltag erheblich.');
pruef('qualitatives Mengenwort laeuft durch ', hatMenge(ohneZiel), false);

const belegt = fall('Der Aufwand sinkt erheblich, um 30 Prozent.', { belegte_zahlen: '30 Prozent' });
pruef('mit belegter Zahl keine Meldung    ', hatMenge(belegt), false);

const zweitwort = fall('Die Fehlerquote geht spuerbar zurueck im Pruefprotokoll.');
pruef('zweites Wort aus dem Muster greift ', hatMenge(zweitwort), true);

console.log('\n--- Muster fehlt: es darf nicht geprueft und nicht gehangen werden ---');
const ohneMuster = Object.assign({}, regeln); delete ohneMuster.mengenwoerter_muster;
const t0 = Date.now();
const leer = lauf(Object.assign({}, BASIS, { linkedin_text: 'Das senkt den Aufwand erheblich.' }), ohneMuster);
pruef('kein Befund ohne Muster            ', hatMenge(leer), false);
pruef('Lauf endet (kein Endlos)           ', Date.now() - t0 < 2000, true);

console.log('\n--- Die uebrigen Regeln greifen weiter ---');
pruef('Link im Text                       ', String(fall('Mehr unter https://example.org').qa_issues).indexOf('Link im Text') >= 0, true);
pruef('gesperrte Marke                    ', String(fall('Wie beispiel-beratung zeigt.').qa_issues).indexOf('Gesperrte Marke') >= 0, true);
pruef('nicht belegte Zahl                 ', String(fall('Das spart 15 Minuten.').qa_issues).indexOf('Nicht belegte Zahl') >= 0, true);
const GUT = [
  'Im Rechnungseingang kleiner Handwerksbetriebe wird jeder Beleg einzeln geoeffnet, dem passenden Auftrag zugeordnet und danach zur Freigabe weitergereicht. Wer das macht, sitzt meist am Abend daran, weil tagsueber die Baustelle laeuft. Wir sehen diesen Ablauf in fast jedem Projekt, unabhaengig von der Groesse des Betriebs.',
  '',
  'In Projekten faellt uns auf, dass die Zuordnung selbst selten das Problem ist. Schwierig wird der Rueckweg: welcher Beleg gehoert zu welchem Nachtrag, und wer hat ihn zuletzt gesehen.',
  '',
  'Ein Assistent kann den Beleg lesen, den Auftrag vorschlagen und die Freigabe anstossen. Die Entscheidung bleibt beim Menschen, der Weg dorthin wird kuerzer.',
  '',
  'Wie ordnen Sie heute einen Lieferschein dem richtigen Auftrag zu?'
].join(String.fromCharCode(10));
const sauber = fall(GUT);
pruef('sauberer Text besteht              ', sauber.qa_passed, true);
if (!sauber.qa_passed) console.log('        Befunde: ' + sauber.qa_issues);

console.log(fehler === 0 ? '\nAlle Faelle wie erwartet.' : '\n' + fehler + ' Abweichung(en).');
process.exit(fehler === 0 ? 0 : 1);
