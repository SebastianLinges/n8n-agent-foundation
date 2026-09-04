// ============================================================
// Nur die redaktionell ausgewaehlten Meldungen gehen weiter in
// Business- und Marketing-Scout. Vorher liefen beide Scouts auf
// dem ungefilterten Top-40-Rohpool und ignorierten die Redaktion.
// Zusaetzlich greift hier die Blocklist.
// ============================================================
const brief = $('Brief bauen').first().json;
const b = $('Kandidaten buendeln').first().json;
const cand = b.cand || [];
const byHash = {};
cand.forEach(c => { byHash[c.url_hash] = c; });

const rules = $('Blocklist lesen').all().map(i => i.json).filter(r => r && r.pattern);
const domains = rules.filter(r => r.match_type === 'domain').map(r => String(r.pattern).toLowerCase());
const paths   = rules.filter(r => r.match_type === 'url_path').map(r => String(r.pattern).toLowerCase());
const titleKw = rules.filter(r => r.match_type === 'title_keyword').map(r => String(r.pattern).toLowerCase());

function hostOf(u){ const m = String(u||'').match(/^https?:\/\/([^\/?#]+)/i); return m ? m[1].toLowerCase().replace(/^www\./,'') : ''; }
function pathOf(u){ const m = String(u||'').match(/^https?:\/\/[^\/?#]+([^?#]*)/i); return m ? m[1].toLowerCase() : ''; }
function blockReason(url, title){
  const h = hostOf(url), p = pathOf(url), t = String(title||'').toLowerCase();
  if (!h) return 'keine URL';
  for (const d of domains){ if (h === d || h.endsWith('.' + d)) return 'Domain: ' + d; }
  for (const s of paths){ if (p.indexOf(s) >= 0) return 'Verkaufsseite: ' + s; }
  for (const k of titleKw){ if (t.indexOf(k) >= 0) return 'Listicle: ' + k; }
  return '';
}

const sel = brief.selected || [];
const clean = [];
const dropped = [];
for (const s of sel) {
  const c = byHash[s.url_hash];
  if (!c) continue;
  const r = blockReason(c.url, c.title);
  if (r) { dropped.push(hostOf(c.url) + ' (' + r + ')'); continue; }
  clean.push({
    i: clean.length,
    title: c.title,
    domain: hostOf(c.url),
    url: c.url,
    section: s.section,
    score: c.score,
    category: c.category,
    region: c.region,
    summary: String(c.summary||'').slice(0,300)
  });
}

const payload = JSON.stringify(clean.map(c => ({ i: c.i, t: c.title, d: c.domain, sec: c.section, sc: c.score, cat: c.category, reg: c.region, sum: c.summary })));

return [{ json: {
  count: clean.length,
  payload,
  selected_clean: clean,
  dropped: dropped.join(' | '),
  coveredTopics: b.coveredTopics || ''
} }];