// ============================================================
// Fester Redaktionsplan statt rechnerischer Rotation.
// Gepflegt wird er in der Tabelle content_schedule, nicht hier.
//
// WICHTIG: Der weekday in content_schedule ist der POSTTAG, nicht
// der Lauftag. Der Flow laeuft einen Tag vorher, damit der Entwurf
// am Vorabend im Buffer liegt:
//
//   Montag    laeuft -> Slot Dienstag  -> Werkstatt & Produktion
//   Mittwoch  laeuft -> Slot Donnerstag -> Engineering & Konstruktion
//   Donnerstag laeuft -> Slot Freitag   -> Buero & Verwaltung
//
// Wer den Cron aendert, muss die Tabelle mitaendern - und umgekehrt.
// ============================================================
const rows = $input.all().map(i => i.json).filter(r => r && r.weekday != null);
const now = $now;
const runWd = now.weekday;              // 1 = Montag ... 7 = Sonntag
const postWd = now.plus({ days: 1 }).weekday;  // der Tag, fuer den produziert wird

let row = rows.find(r => Number(r.weekday) === postWd) || null;
let fallbackUsed = false;
if (!row && rows.length) {
  // Manueller Lauf an einem Tag ohne Slot: naechstliegenden Slot verwenden,
  // damit ein Test nicht ins Leere laeuft.
  row = rows.slice().sort((a, b) => Math.abs(a.weekday - postWd) - Math.abs(b.weekday - postWd))[0];
  fallbackUsed = true;
}

const pillars = String((row && row.pillars) || 'buero')
  .split(',').map(s => s.trim()).filter(Boolean);

const namen = { 1: 'Montag', 2: 'Dienstag', 3: 'Mittwoch', 4: 'Donnerstag', 5: 'Freitag', 6: 'Samstag', 7: 'Sonntag' };

return [{ json: {
  pillar: pillars[0] || 'buero',
  pillar_priority: pillars,
  slot_name: String((row && row.slot_name) || 'ohne Slot'),
  schedule_fallback: fallbackUsed,
  run_weekday: runWd,
  run_tag: namen[runWd] || String(runWd),
  post_weekday: postWd,
  post_tag: namen[postWd] || String(postWd),
  run_date: now.toISO(),
  post_date: now.plus({ days: 1 }).toISODate()
} }];