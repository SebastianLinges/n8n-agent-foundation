// ============================================================
// Was die Scouts zu sehen bekommen. Die Blocklist greift hier fuer alles.
//
// Seit dem 04.09.2026 entstehen ZWEI Listen:
//   payload        - nur die redaktionelle Auswahl. Der Marketing Scout
//                    arbeitet unveraendert damit, weil eine Marketing-Idee
//                    dem Newsletter folgen soll.
//   payload_scout  - dieselbe Auswahl zuerst, danach mit den besten
//                    uebrigen Kandidaten desselben Laufs aufgefuellt.
//                    Nur der Business Scout arbeitet damit.
//
// WARUM DIE ZWEITE LISTE: Bis zum 20.08.2026 liefen beide Scouts auf dem
// Top-40-Rohpool, und es entstanden taeglich 4 bis 12 Use Cases. Danach
// sahen sie nur noch die fuenf redaktionellen Treffer - und es entstanden
// vom 21.08. bis zum 03.09. null. Die Redaktion waehlt nach
// Nachrichtenwert aus, der Business Scout braucht beschriebene
// Arbeitsschritte. Zwei verschiedene Massstaebe an derselben Liste.
//
// Der Grund fuer die urspruengliche Verengung bleibt erhalten: Die
// Blocklist gilt fuer beide Listen, und die redaktionelle Auswahl behaelt
// den Vortritt - sie steht immer vorn.
// ============================================================
const KANDIDATEN_FUER_SCOUT = 20;   // Startwert 04.09.2026. Unter 15 wird
                                    // es erfahrungsgemaess wieder duenn.

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
function alsEintrag(c, i, section){
  return {
    i: i,
    title: c.title,
    domain: hostOf(c.url),
    url: c.url,
    section: section,
    score: c.score,
    category: c.category,
    region: c.region,
    summary: String(c.summary||'').slice(0,300)
  };
}
function alsPayload(liste){
  return JSON.stringify(liste.map(c => ({ i: c.i, t: c.title, d: c.domain, sec: c.section, sc: c.score, cat: c.category, reg: c.region, sum: c.summary })));
}

// ---------- 1. Die redaktionelle Auswahl, wie bisher ----------
const sel = brief.selected || [];
const clean = [];
const dropped = [];
for (const s of sel) {
  const c = byHash[s.url_hash];
  if (!c) continue;
  const r = blockReason(c.url, c.title);
  if (r) { dropped.push(hostOf(c.url) + ' (' + r + ')'); continue; }
  clean.push(alsEintrag(c, clean.length, s.section));
}

// ---------- 2. Auffuellen fuer den Business Scout ----------
// Vortritt hat die Redaktion, danach die besten uebrigen nach Score.
const schonDrin = {};
clean.forEach(c => { schonDrin[c.url] = true; });

const uebrige = cand
  .filter(c => c && c.url && !schonDrin[c.url])
  .filter(c => !blockReason(c.url, c.title))
  .sort((a, b2) => (b2.score || 0) - (a.score || 0));

const scoutListe = clean.slice();
for (const c of uebrige) {
  if (scoutListe.length >= KANDIDATEN_FUER_SCOUT) break;
  scoutListe.push(alsEintrag(c, scoutListe.length, 'Weiterer Kandidat'));
}

return [{ json: {
  count: clean.length,
  payload: alsPayload(clean),
  selected_clean: clean,
  dropped: dropped.join(' | '),
  coveredTopics: b.coveredTopics || '',

  count_scout: scoutListe.length,
  payload_scout: alsPayload(scoutListe),
  scout_aufgefuellt: scoutListe.length - clean.length,
  scout_pool: cand.length,
  scout_grenze: KANDIDATEN_FUER_SCOUT
} }];
