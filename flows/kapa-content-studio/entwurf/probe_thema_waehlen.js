// Fuehrt "Thema waehlen" SO AUS, WIE ES IN thema_waehlen_referenz.js STEHT.
// Die n8n-Zugriffe $(), $json und $now werden nachgebildet; die Use-Cases sind
// der echte offene Pool aus Supabase (pool_new.json, Stand 03.09.2026), der
// Zeitplan entspricht content_schedule.
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'thema_waehlen_referenz.js'), 'utf8');
const regeln = JSON.parse(fs.readFileSync(path.join(__dirname, 'redaktionsregeln.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.join(__dirname, 'pool_new.json'), 'utf8'));

const ZEITPLAN = [
  { weekday: 2, slot_name: 'Werkstatt & Produktion', pillars: 'handwerk,fertigung,engineering', active: true },
  { weekday: 4, slot_name: 'Engineering & Konstruktion', pillars: 'engineering,fertigung', active: true },
  { weekday: 5, slot_name: 'Buero & Verwaltung', pillars: 'buero,engineering', active: true }
];

function lauf(saeule, useCases, ideen) {
  const quellen = {
    'Saeule bestimmen': [{ json: saeule }],
    'Blocklist lesen': [],
    'Use-Cases lesen': useCases.map(u => ({ json: u })),
    'Idee lesen': (ideen || []).map(i => ({ json: i })),
    'Bisherige Pakete lesen': [],
    'Redaktionsregeln': [{ json: regeln }],
    'Zeitplan lesen': ZEITPLAN.map(r => ({ json: r }))
  };
  const $ = (name) => {
    const items = quellen[name];
    if (!items) throw new Error('Unbekannter Node im Test: ' + name);
    return { all: () => items, first: () => items[0] };
  };
  const fn = new Function('$', '$json', '$now', code);
  return fn($, {}, { toISO: () => new Date().toISOString() });
}

const saeulen = {
  buero: { pillar: 'buero', pillar_priority: ['buero', 'engineering'], slot_name: 'Buero & Verwaltung' },
  engineering: { pillar: 'engineering', pillar_priority: ['engineering', 'fertigung'], slot_name: 'Engineering & Konstruktion' },
  werkstatt: { pillar: 'handwerk', pillar_priority: ['handwerk', 'fertigung', 'engineering'], slot_name: 'Werkstatt & Produktion' }
};

// score fehlt im gezogenen Pool - im Test auf 8 gesetzt, damit die
// Score-Schwelle (>= 7) nicht das Ergebnis bestimmt.
const uc = pool.map(u => Object.assign({}, u, { score: 8, target_group: 'Kleine Unternehmen', business_model: '' }));

let fehler = 0;
console.log('Ankerliste: ' + regeln.anker.length + ' Eintraege, Technik-Stoppwoerter: ' + regeln.technik_stopwoerter.length + '\n');
console.log('Slot                          Pool  tauglich  gewaehlt');
console.log('-'.repeat(100));
for (const [name, s] of Object.entries(saeulen)) {
  const out = lauf(s, uc, []);
  const g = out.length ? out[0].json : null;
  const imSlot = uc.filter(u => s.pillar_priority.indexOf(u.pillar) >= 0).length;
  console.log(s.slot_name.padEnd(30) + String(imSlot).padStart(4) + String(g ? g.available_in_slot : 0).padStart(10) + '  ' +
    (g ? (g.uc_id + '  ' + g.topic) : '— nichts, Lauf endet ohne Modellaufruf'));
  if (g) {
    const blob = (g.topic + ' ' + g.uc_problem + ' ' + g.uc_solution).toLowerCase();
    const treffer = regeln.anker.filter(a => blob.indexOf(a) >= 0);
    if (!treffer.length) { console.log('    ABWEICHUNG: gewaehlter Use-Case hat keinen Anker'); fehler += 1; }
    else console.log('    Eignung ' + g.eignung + ': ' + g.eignung_gruende);
  }
}

console.log('\n--- Wochenvorschau je Posttag (aus einem Lauf) ---');
console.log(lauf(saeulen.buero, uc, [])[0].json.slot_vorschau_text);

console.log('\n--- Rangfolge im Slot Buero (Eignung entscheidet, nicht der Scout-Score) ---');
const nurBuero = uc.filter(u => u.pillar === 'buero');
const einzeln = nurBuero.map(u => {
  const o = lauf({ pillar: 'buero', pillar_priority: ['buero'], slot_name: 'x' }, [u], []);
  return { uc: u, punkte: o.length ? o[0].json.eignung : null };
}).filter(x => x.punkte !== null).sort((a, b) => b.punkte - a.punkte);
for (const e of einzeln) console.log('    ' + String(e.punkte).padStart(3) + '  ' + e.uc.uc_id + '  ' + e.uc.name);
if (einzeln.length && einzeln[0].uc.uc_id !== lauf(saeulen.buero, uc, [])[0].json.uc_id) {
  console.log('    ABWEICHUNG: der bestbewertete Kandidat wurde nicht gewaehlt'); fehler += 1;
}

console.log('\n--- Gegenprobe: Pool ohne jeden tauglichen Kandidaten ---');
const ohne = uc.filter(u => {
  const blob = (u.name + ' ' + u.problem + ' ' + u.solution).toLowerCase();
  return !regeln.anker.some(a => blob.indexOf(a) >= 0);
});
const leer = lauf(saeulen.buero, ohne, []);
console.log('Ergebnis: ' + (leer.length === 0 ? 'leer - kein Modellaufruf (richtig)' : 'ABWEICHUNG: ' + JSON.stringify(leer[0].json.uc_id)));
if (leer.length !== 0) fehler += 1;

console.log('\n--- Gegenprobe: News-Idee bleibt unangetastet ---');
const idee = [{ mi_id: 'mi_test', topic: 'KI-Verordnung fuer kleine Firmen', target_group: 'Kleine Unternehmen',
                hook: '', core_message: 'Transparenzpflicht', content_format: 'Einzelbild', cta: '',
                source: 'Testquelle', source_url: 'https://example.org/artikel', idea_date: '2026-09-03' }];
const nur = lauf(saeulen.buero, ohne, idee);
console.log('Ergebnis: ' + (nur.length && nur[0].json.source_mode === 'news'
  ? 'News-Idee gewaehlt (richtig - der Anker gilt nur fuer Use-Cases)'
  : 'ABWEICHUNG: ' + JSON.stringify(nur.length ? nur[0].json.source_mode : null)));
if (!(nur.length && nur[0].json.source_mode === 'news')) fehler += 1;

console.log(fehler === 0 ? '\nAlle Faelle wie erwartet.' : '\n' + fehler + ' Abweichung(en).');
process.exit(fehler === 0 ? 0 : 1);
