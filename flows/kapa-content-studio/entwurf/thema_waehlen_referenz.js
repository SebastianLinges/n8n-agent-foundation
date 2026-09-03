// ============================================================
// KAPA Content Studio - Themenauswahl
// Der Wochentag gibt ueber content_schedule die Saeule vor.
// Prioritaet: 1) Use-Case der Saeule des Tages
//             2) Use-Case aus den Ersatzsaeulen des Slots
//             3) Use-Case aus einer beliebigen anderen Saeule
//             4) Marketing-Idee aus den News (nur Blocklist-sauber)
// Kein Treffer -> leeres Ergebnis, der Lauf produziert nichts.
// ============================================================
const saeule = $('Saeule bestimmen').first().json;
const prio = (Array.isArray(saeule.pillar_priority) && saeule.pillar_priority.length)
  ? saeule.pillar_priority : [String(saeule.pillar || 'buero')];
const pillar = prio[0];
const slotName = String(saeule.slot_name || '');

const MOTIFS = {
  handwerk: 'Werkstatt, Baustellencontainer, Tablet auf der Werkbank, Aufmassskizze, Materiallager, Montagefahrzeug',
  fertigung: 'Werkhalle, CNC-Maschine, Messmittel und Pruefplatz, Auftragsmappe, Materialfluss, Schichtuebergabe',
  engineering: 'Konstruktionsarbeitsplatz, Zeichnungsablage, Planrolle, Revisionsstempel, Projekttafel, Datenuebergabe',
  buero: 'Buerotisch mit Belegstapel, Ablageordner, Posteingangskorb, Bildschirm mit Uebersicht, Besprechungstisch'
};
const PILLAR_LABEL = { handwerk:'Handwerk & Baustelle', fertigung:'Fertigung & Maschine', engineering:'Engineering & CAD/PDM', buero:'Buero & Verwaltung' };

// --- Blocklist ---
const rules = $('Blocklist lesen').all().map(i => i.json).filter(r => r && r.pattern);
const domains = rules.filter(r => r.match_type === 'domain').map(r => String(r.pattern).toLowerCase());
const paths   = rules.filter(r => r.match_type === 'url_path').map(r => String(r.pattern).toLowerCase());
const titleKw = rules.filter(r => r.match_type === 'title_keyword').map(r => String(r.pattern).toLowerCase());

function hostOf(url){ const m = String(url||'').match(/^https?:\/\/([^\/?#]+)/i); return m ? m[1].toLowerCase().replace(/^www\./,'') : ''; }
function pathOf(url){ const m = String(url||'').match(/^https?:\/\/[^\/?#]+([^?#]*)/i); return m ? m[1].toLowerCase() : ''; }
function blockReason(url, title){
  const h = hostOf(url), p = pathOf(url), t = String(title||'').toLowerCase();
  if (!h) return 'keine gueltige URL';
  for (const d of domains){ if (h === d || h.endsWith('.' + d)) return 'Domain gesperrt: ' + d; }
  for (const s of paths){ if (p.includes(s)) return 'Verkaufsseite: ' + s; }
  for (const k of titleKw){ if (t.includes(k)) return 'Listicle-Muster: ' + k; }
  return '';
}

// --- Dublettenschutz (45 Tage) ---
const cutoff = Date.now() - 45*86400000;
const recent = $('Bisherige Pakete lesen').all().map(i => i.json).filter(p => {
  const d = Date.parse(p.created_at || p.createdAt || '');
  return isNaN(d) ? true : d >= cutoff;
});
function norm(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9aeoeuess ]/g,' ').replace(/ +/g,' ').trim(); }
const usedTopics = new Set(recent.map(p => norm(p.topic)).filter(Boolean));
const usedRefs = new Set(recent.map(p => String(p.use_case_ref||'')).filter(Boolean));
const usedUrls = new Set(recent.map(p => { const m = String(p.sources||'').match(/https?:\/\/\S+/); return m ? hostOf(m[0]) + pathOf(m[0]) : ''; }).filter(Boolean));
function isDuplicate(topic, url, ref){
  if (ref && usedRefs.has(String(ref))) return true;
  if (usedTopics.has(norm(topic))) return true;
  if (url && usedUrls.has(hostOf(url) + pathOf(url))) return true;
  return false;
}

// ------------------------------------------------------------
// Zielgruppenfilter: KAPA spricht Handwerk, Fertigung, Ingenieur-
// bueros und Bueroorganisation an. Use-Cases fuer SaaS-Anbieter,
// Startups, Konzerne oder Entwicklerteams gehoeren nicht in einen
// KAPA-Beitrag, auch wenn der Scout sie hoch bewertet hat.
// ------------------------------------------------------------
const OFF_TARGET = /(saas|start\s?-?up|scale\s?-?up|enterprise|konzern|softwareunternehmen|software-unternehmen|softwarehaus|entwicklerteam|entwickler|developer|agentur|it-dienstleister|dienstleistungsunternehmen im it)/;
function zielgruppePasst(u){
  const blob = (String(u.target_group||'') + ' ' + String(u.name||'') + ' ' + String(u.problem||'')).toLowerCase();
  return !OFF_TARGET.test(blob);
}

// ------------------------------------------------------------
// Eignungsfilter (seit 03.09.2026): Der Redaktions-Check blockiert
// einen Beitrag hart, wenn im Text kein benanntes Dokument und kein
// benannter Arbeitsschritt vorkommt. Ein Use-Case, der selbst keines
// nennt, kann die Pruefung nicht bestehen - er faellt hier heraus,
// bevor ein Modell laeuft. Deterministisch, kostet nichts.
//
// Die Liste steht in "Redaktionsregeln" und wird von dort auch vom
// Redaktions-Check gelesen: Auswahl und Pruefung muessen dasselbe
// darunter verstehen, sonst waehlt der Flow, was er selbst verwirft.
//
// Nur auf Use-Cases angewandt. Eine News-Idee traegt einen echten
// Artikel, aus dem der Text den Beleg holen kann; ihre kurzen Felder
// sind kein taugliches Mass.
// ------------------------------------------------------------
const REGELN = $('Redaktionsregeln').first().json;
const ANKER = REGELN.anker || [];
const TECHNIK_STOP = new Set(REGELN.technik_stopwoerter || []);
function ankerTreffer(u){
  const blob = (String(u.name||'') + ' ' + String(u.problem||'') + ' ' + String(u.solution||'')).toLowerCase();
  const t = [];
  for (const a of ANKER) { if (blob.indexOf(a) >= 0) t.push(a); }
  return t;
}
function hatAnker(u){ return ankerTreffer(u).length > 0; }

// ------------------------------------------------------------
// Eignung: welcher Kandidat traegt den besten Beitrag?
//
// LinkedIn veroeffentlicht keine Rankingformel. Was es gibt, sind
// Empfehlungen fuer organische Beitraege - konkreter Einstieg statt
// Allgemeinplatz, benannter Arbeitskontext, kein Fremdprodukt, eine
// Frage am Ende. Genau diese Punkte pruefen 'Redaktions-Check' und
// 'Lesbarkeit pruefen' am fertigen Text. Die Eignung schaetzt hier
// vorab, wie gut ein Use-Case dieses Material hergibt - damit die
// Auswahl an denselben Massstaeben haengt wie die Abnahme.
//
// Der Scout-Score taugt dafuer nicht: er liegt konstant bei 8 bis 9.
// Er bleibt nur noch Stichentscheid bei gleicher Eignung.
// ------------------------------------------------------------
function hatProduktname(u){
  const toks = String(u.technology||'').split(/[^A-Za-z0-9ÄÖÜäöüß]+/);
  for (const t of toks) { if (t.length >= 4 && !TECHNIK_STOP.has(t.toLowerCase())) return true; }
  return false;
}
function eignung(u){
  const gruende = [];
  let p = 0;
  const treffer = ankerTreffer(u);
  const n = Math.min(treffer.length, 3);
  p += n * 20;
  if (n) gruende.push(n + 'x Dokument/Arbeitsschritt (' + treffer.slice(0,3).join(', ') + ')');
  if (String(u.solution||'').length >= 60) { p += 15; gruende.push('Loesungsweg beschrieben'); }
  if (String(u.problem||'').length >= 60) { p += 10; gruende.push('Problem beschrieben'); }
  const tg = String(u.target_group||'').trim().toLowerCase();
  if (tg && !/^(kleine unternehmen|unternehmen|kmu|mittelstand|allgemein)$/.test(tg)) { p += 10; gruende.push('spezifische Zielgruppe'); }
  if (!hatProduktname(u)) { p += 5; gruende.push('kein Fremdprodukt in der Vorlage'); }
  return { punkte: p, gruende: gruende };
}
function besserZuerst(a, b){
  const d = eignung(b).punkte - eignung(a).punkte;
  return d !== 0 ? d : ((b.score||0) - (a.score||0));
}

// --- Kandidaten: Use-Cases ---
const ucVorAnker = $('Use-Cases lesen').all().map(i => i.json)
  .filter(u => u && u.uc_id && (u.score || 0) >= 7)
  .filter(zielgruppePasst)
  .filter(u => !isDuplicate(u.name, '', u.uc_id));
const ucAll = ucVorAnker.filter(hatAnker);
// Sortiert wird nach Eignung, der Scout-Score ist nur noch Stichentscheid.

let pick = null;
let note = '';
for (let k = 0; k < prio.length; k++) {
  const cand = ucAll.filter(u => u.pillar === prio[k]).sort(besserZuerst)[0];
  if (cand) {
    pick = cand;
    note = (k === 0)
      ? ('Use-Case aus der Saeule des Tages (' + slotName + ')')
      : ('Ersatzsaeule des Slots ' + slotName + ': ' + prio[k] + ' - keine Use-Cases mehr in ' + pillar);
    break;
  }
}
if (!pick) {
  const cand = ucAll.filter(u => prio.indexOf(u.pillar) < 0).sort(besserZuerst)[0];
  if (cand) { pick = cand; note = 'Slot ' + slotName + ' erschoepft, Use-Case aus ' + (cand.pillar || 'ohne Zuordnung'); }
}

// --- Kandidaten: Marketing-Ideen ---
const ideas = [];
const rejected = [];
for (const it of $('Idee lesen').all().map(i => i.json).filter(x => x && x.mi_id)) {
  const reason = blockReason(it.source_url, (it.source || '') + ' ' + (it.topic || ''));
  if (reason) { rejected.push(it.mi_id + ': ' + reason); continue; }
  if (isDuplicate(it.topic, it.source_url, it.mi_id)) { rejected.push(it.mi_id + ': Dublette'); continue; }
  ideas.push(it);
}
ideas.sort((a,b) => String(a.idea_date||'').localeCompare(String(b.idea_date||'')));

// --- Auswahl ---
let out = null;
if (pick) {
  out = {
    source_mode: 'use_case',
    pillar: pick.pillar || pillar,
    ref_id: pick.uc_id, uc_id: pick.uc_id, mi_id: '__none__',
    topic: String(pick.name||''),
    target_group: String(pick.target_group||''),
    hook: '', core_message: String(pick.problem||''),
    uc_problem: String(pick.problem||''), uc_solution: String(pick.solution||''),
    uc_technology: String(pick.technology||''), uc_business_model: String(pick.business_model||''),
    content_format: 'Einzelbild', cta: '', source: '', source_url: '',
    selection_note: note
  };
} else if (ideas.length) {
  const it = ideas[0];
  out = {
    source_mode: 'news', pillar,
    ref_id: it.mi_id, uc_id: '__none__', mi_id: it.mi_id,
    topic: String(it.topic||''), target_group: String(it.target_group||''),
    hook: String(it.hook||''), core_message: String(it.core_message||''),
    uc_problem: '', uc_solution: '', uc_technology: '', uc_business_model: '',
    content_format: String(it.content_format||'Einzelbild'), cta: String(it.cta||''),
    source: String(it.source||''), source_url: String(it.source_url||''),
    selection_note: 'Keine Use-Cases mehr verfuegbar, News-Idee verwendet'
  };
}
if (!out) return [];
out.slot_name = slotName;
out.pillar_label = PILLAR_LABEL[out.pillar] || out.pillar;
out.visual_motifs = MOTIFS[out.pillar] || MOTIFS.buero;
out.available_use_cases = ucAll.length;
out.available_ohne_anker = ucVorAnker.length - ucAll.length;
if (pick) {
  const e = eignung(pick);
  out.eignung = e.punkte;
  out.eignung_gruende = e.gruende.join(' | ');
} else { out.eignung = 0; out.eignung_gruende = ''; }

// ------------------------------------------------------------
// Wochenvorschau: je Posttag der beste verfuegbare Kandidat.
// Steht in der Tagesmeldung und in der E-Mail, damit sichtbar ist,
// was an den naechsten Posttagen ansteht und wo der Pool duenn wird -
// bevor ein Lauf leer ausgeht.
// ------------------------------------------------------------
const TAGE = { 1:'Montag', 2:'Dienstag', 3:'Mittwoch', 4:'Donnerstag', 5:'Freitag', 6:'Samstag', 7:'Sonntag' };
const plan = $('Zeitplan lesen').all().map(i => i.json)
  .filter(r => r && r.weekday != null && r.active !== false)
  .sort((a,b) => Number(a.weekday) - Number(b.weekday));
const vorschau = [];
for (const r of plan) {
  const saeulen = String(r.pillars||'').split(',').map(s => s.trim()).filter(Boolean);
  let bester = null;
  for (const s of saeulen) {
    const c = ucAll.filter(u => u.pillar === s).sort(besserZuerst)[0];
    if (c) { bester = c; break; }
  }
  const anzahl = ucAll.filter(u => saeulen.indexOf(u.pillar) >= 0).length;
  vorschau.push({
    tag: TAGE[Number(r.weekday)] || String(r.weekday),
    slot: String(r.slot_name||''),
    kandidaten: anzahl,
    topic: bester ? String(bester.name||'') : '',
    uc_id: bester ? String(bester.uc_id||'') : '',
    eignung: bester ? eignung(bester).punkte : 0
  });
}
out.slot_vorschau = vorschau;
let zeilen = '';
for (const v of vorschau) {
  zeilen += v.tag + ' (' + v.slot + '): ' + (v.topic ? (v.topic + ' - Eignung ' + v.eignung) : 'kein tauglicher Kandidat') + ', ' + v.kandidaten + ' im Pool' + String.fromCharCode(10);
}
out.slot_vorschau_text = zeilen.trim();
out.available_in_slot = ucAll.filter(u => prio.indexOf(u.pillar) >= 0).length;
out.available_ideas = ideas.length;
out.rejected_ideas = rejected.slice(0,10).join(' | ');
return [{ json: out }];