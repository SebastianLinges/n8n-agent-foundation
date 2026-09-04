// Fuehrt "Redaktionsauswahl aufbereiten" SO AUS, WIE ES IN
// redaktionsauswahl_referenz.js STEHT, und stellt es der Altfassung
// gegenueber. Entscheidend: payload und count duerfen sich NICHT aendern,
// weil der Marketing Scout unveraendert damit arbeitet.
const fs = require('fs');
const path = require('path');

const neu = fs.readFileSync(path.join(__dirname, 'redaktionsauswahl_referenz.js'), 'utf8');
const alt = fs.readFileSync(path.join(__dirname, 'redaktionsauswahl_aktiv.js'), 'utf8');

// Nachgebildeter Lauf: 40 Kandidaten, davon 5 redaktionell ausgewaehlt,
// einer auf einer gesperrten Domain, einer ohne URL.
const cand = [];
for (let i = 0; i < 40; i++) {
  cand.push({
    url_hash: 'h' + i,
    url: 'https://quelle' + i + '.de/artikel-' + i,
    title: 'Meldung ' + i,
    score: 10 - Math.floor(i / 5),
    category: 'manufacturing',
    region: 'DE',
    summary: 'Zusammenfassung der Meldung ' + i + '.'
  });
}
cand.push({ url_hash: 'hblock', url: 'https://gesperrt.de/werbung', title: 'Gesperrt', score: 10, category: 'x', region: 'DE', summary: '' });
cand.push({ url_hash: 'hleer', url: '', title: 'Ohne URL', score: 10, category: 'x', region: 'DE', summary: '' });

const brief = { selected: [
  { url_hash: 'h0', section: 'Wichtig' },
  { url_hash: 'h1', section: 'Wichtig' },
  { url_hash: 'h2', section: 'Wichtig' },
  { url_hash: 'hblock', section: 'Wichtig' },
  { url_hash: 'h3', section: 'Tools & Apps' },
  { url_hash: 'h4', section: 'Auf dem Radar' }
] };

const blocklist = [{ pattern: 'gesperrt.de', match_type: 'domain', reason: 'vendor_sales' }];

function lauf(code) {
  const quellen = {
    'Brief bauen': [{ json: brief }],
    'Kandidaten buendeln': [{ json: { cand, coveredTopics: 'thema-a, thema-b' } }],
    'Blocklist lesen': blocklist.map(r => ({ json: r }))
  };
  const $ = (name) => {
    const items = quellen[name];
    if (!items) throw new Error('Unbekannter Node im Test: ' + name);
    return { all: () => items, first: () => items[0] };
  };
  return new Function('$', code)($)[0].json;
}

let fehler = 0;
function pruef(titel, ist, soll) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler += 1; console.log('  FEHLT ' + titel + '  ist ' + JSON.stringify(ist) + ', erwartet ' + JSON.stringify(soll)); }
  else console.log('  ok    ' + titel + '  ' + JSON.stringify(ist));
}

const a = lauf(alt);
const n = lauf(neu);

console.log('--- Der Marketing Scout darf nichts merken ---');
pruef('count unveraendert          ', n.count, a.count);
pruef('payload zeichengleich       ', n.payload === a.payload, true);
pruef('dropped unveraendert        ', n.dropped, a.dropped);
pruef('coveredTopics unveraendert  ', n.coveredTopics, a.coveredTopics);

console.log('\n--- Die neue Liste fuer den Business Scout ---');
pruef('Kandidaten fuer den Scout   ', n.count_scout, 20);
pruef('davon aufgefuellt           ', n.scout_aufgefuellt, 15);
pruef('Grenze im Knoten            ', n.scout_grenze, 20);

const scout = JSON.parse(n.payload_scout);
const auswahl = JSON.parse(n.payload);
console.log('\n--- Die Redaktion steht vorn ---');
pruef('erste 5 sind die Redaktion  ', scout.slice(0, 5).map(x => x.t), auswahl.map(x => x.t));
pruef('danach Weitere Kandidaten   ', scout.slice(5).every(x => x.sec === 'Weiterer Kandidat'), true);

console.log('\n--- Blocklist und Doubletten ---');
pruef('gesperrte Domain nicht drin ', scout.some(x => x.d === 'gesperrt.de'), false);
pruef('keine Doublette             ', new Set(scout.map(x => x.t)).size, scout.length);
pruef('keine leere URL             ', scout.some(x => !x.d), false);

console.log('\n--- Sortierung der Aufgefuellten ---');
const scores = scout.slice(5).map(x => x.sc);
pruef('absteigend nach Score       ', scores.every((s, i) => i === 0 || scores[i - 1] >= s), true);

console.log('\n--- Gegenprobe: kleiner Pool sprengt nichts ---');
const kleinCand = cand.slice(0, 3);
const kleinLauf = new Function('$', neu)((name) => {
  const q = { 'Brief bauen': [{ json: { selected: [{ url_hash: 'h0', section: 'Wichtig' }] } }],
              'Kandidaten buendeln': [{ json: { cand: kleinCand, coveredTopics: '' } }],
              'Blocklist lesen': [] };
  return { all: () => q[name], first: () => q[name][0] };
})[0].json;
pruef('drei Kandidaten, drei drin  ', kleinLauf.count_scout, 3);
pruef('Redaktionsauswahl bleibt 1  ', kleinLauf.count, 1);

console.log(fehler === 0 ? '\nAlle Faelle wie erwartet.' : '\n' + fehler + ' Abweichung(en).');
process.exit(fehler === 0 ? 0 : 1);
