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

// --- Kandidaten: Use-Cases ---
const ucAll = $('Use-Cases lesen').all().map(i => i.json)
  .filter(u => u && u.uc_id && (u.score || 0) >= 7)
  .filter(zielgruppePasst)
  .filter(u => !isDuplicate(u.name, '', u.uc_id));
const byScore = (a,b) => (b.score||0)-(a.score||0);

let pick = null;
let note = '';
for (let k = 0; k < prio.length; k++) {
  const cand = ucAll.filter(u => u.pillar === prio[k]).sort(byScore)[0];
  if (cand) {
    pick = cand;
    note = (k === 0)
      ? ('Use-Case aus der Saeule des Tages (' + slotName + ')')
      : ('Ersatzsaeule des Slots ' + slotName + ': ' + prio[k] + ' - keine Use-Cases mehr in ' + pillar);
    break;
  }
}
if (!pick) {
  const cand = ucAll.filter(u => prio.indexOf(u.pillar) < 0).sort(byScore)[0];
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
out.available_in_slot = ucAll.filter(u => prio.indexOf(u.pillar) >= 0).length;
out.available_ideas = ideas.length;
out.rejected_ideas = rejected.slice(0,10).join(' | ');
return [{ json: out }];