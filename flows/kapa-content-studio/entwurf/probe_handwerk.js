// Bewertet die Handwerk-Entwuerfe mit dem ECHTEN Code aus
// thema_waehlen_referenz.js. Kein Nachbau der Eignungsformel - der Node wird
// je Kandidat einmal ausgefuehrt und seine Ausgabe gelesen.
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'thema_waehlen_referenz.js'), 'utf8');
const regeln = JSON.parse(fs.readFileSync(path.join(__dirname, 'redaktionsregeln.json'), 'utf8'));
const neue = JSON.parse(fs.readFileSync(path.join(__dirname, 'handwerk_use_cases.json'), 'utf8'));

const ZEITPLAN = [
  { weekday: 2, slot_name: 'Werkstatt & Produktion', pillars: 'handwerk,fertigung,engineering', active: true },
  { weekday: 4, slot_name: 'Engineering & Konstruktion', pillars: 'engineering,fertigung', active: true },
  { weekday: 5, slot_name: 'Buero & Verwaltung', pillars: 'buero,engineering', active: true }
];

function lauf(useCases) {
  const quellen = {
    'Saeule bestimmen': [{ json: { pillar: 'handwerk', pillar_priority: ['handwerk'], slot_name: 'Werkstatt & Produktion' } }],
    'Blocklist lesen': [],
    'Use-Cases lesen': useCases.map(u => ({ json: u })),
    'Idee lesen': [],
    'Bisherige Pakete lesen': [],
    'Redaktionsregeln': [{ json: regeln }],
    'Zeitplan lesen': ZEITPLAN.map(r => ({ json: r }))
  };
  const $ = (name) => {
    const items = quellen[name];
    if (!items) throw new Error('Unbekannter Node im Test: ' + name);
    return { all: () => items, first: () => items[0] };
  };
  return new Function('$', '$json', '$now', code)($, {}, { toISO: () => new Date().toISOString() });
}

let fehler = 0;
console.log('Eignung  Anker  Kandidat');
console.log('-'.repeat(100));
for (const u of neue) {
  const out = lauf([u]);
  if (!out.length) {
    console.log('   —           ' + u.name + '   AUSSORTIERT (kein Anker)');
    fehler += 1;
    continue;
  }
  const g = out[0].json;
  const blob = (u.name + ' ' + u.problem + ' ' + u.solution).toLowerCase();
  const anker = regeln.anker.filter(a => blob.indexOf(a) >= 0);
  console.log(String(g.eignung).padStart(6) + '   ' + String(anker.length).padStart(2) + '    ' + u.name);
  console.log('         ' + g.eignung_gruende);
  if (g.eignung < 70) { console.log('         ZU SCHWACH'); fehler += 1; }
}

// Gegenprobe: schlagen die neuen die beiden verbrauchten Altfaelle?
console.log('\n--- Rangfolge im Slot Werkstatt, neue gegen zwei typische Altfaelle ---');
const alt = [
  { uc_id: 'alt_kalkulation', pillar: 'handwerk', name: 'KI-gestuetzte Kalkulation im Handwerk',
    target_group: 'Handwerksbetriebe', problem: 'Kalkulation und Dokumentation sind zeitaufwendig und fehleranfaellig.',
    solution: 'Einsatz von KI-Agenten zur Automatisierung von Kalkulations- und Dokumentationsprozessen.',
    technology: 'KI-Agenten', score: 8 },
  { uc_id: 'alt_email', pillar: 'handwerk', name: 'E-Mail Automatisierung fuer Handwerker',
    target_group: 'Handwerksbetriebe', problem: 'Zeitverlust durch manuelle Bearbeitung von Anfragen und Angeboten.',
    solution: 'Automatisierung der E-Mail-Kommunikation zur effizienten Sortierung und Bearbeitung von Anfragen.',
    technology: 'KI-gestuetzte E-Mail-Management-Tools', score: 9 }
];
const alle = neue.concat(alt);
const rang = alle.map(u => {
  const o = lauf([u]);
  return { name: u.name, punkte: o.length ? o[0].json.eignung : -1 };
}).sort((a, b) => b.punkte - a.punkte);
for (const r of rang) console.log('   ' + String(r.punkte).padStart(3) + '  ' + r.name);
const gewaehlt = lauf(alle)[0].json;
console.log('\nGewaehlt wuerde: ' + gewaehlt.topic + '  (Eignung ' + gewaehlt.eignung + ')');
if (rang[0].name !== gewaehlt.topic) { console.log('ABWEICHUNG: nicht der bestbewertete'); fehler += 1; }

console.log(fehler === 0 ? '\nAlle sechs tragen und liegen vorn.' : '\n' + fehler + ' Abweichung(en).');
process.exit(fehler === 0 ? 0 : 1);
