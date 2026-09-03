// Regelbasiertes Qualitaetsgate. Der content_score des Modells ist wertlos
// (liegt konstant bei 8-9), deshalb wird hier hart gegen Regeln geprueft.
const c = $json;
const rules = $('Blocklist lesen').all().map(i => i.json).filter(r => r && r.pattern);
const blockedNames = rules
  .filter(r => r.match_type === 'domain' && ['competitor','consulting','vendor_sales'].indexOf(r.reason) >= 0)
  .map(r => String(r.pattern).toLowerCase().replace(/\.(com|de|eu|ai|io|net|au|group)$/,''))
  .filter(n => n.length >= 5);

const text = String(c.linkedin_text || '');
const lower = text.toLowerCase();
const firstLine = (text.split('\n').map(s => s.trim()).filter(Boolean)[0]) || '';
const issues = [];
const soft = [];

for (const n of blockedNames) { if (lower.indexOf(n) >= 0) issues.push('Gesperrte Marke im Text: ' + n); }
if (/https?:\/\/|www\./i.test(text)) issues.push('Link im Text');
if (/\?\s*$/.test(firstLine)) issues.push('Erster Satz ist eine Frage');
if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(firstLine)) issues.push('Emoji im ersten Satz');

// ------------------------------------------------------------
// Fremdprodukte: der Use-Case nennt im Feld 'technology' oft ein
// konkretes Anbieterprodukt. Das darf nicht im KAPA-Beitrag landen -
// sonst bewirbt KAPA fremde Werkzeuge unter eigenem Namen.
//
// Der Befund meldet, er blockiert nicht. Oft steht in 'technology'
// gar kein Produkt, sondern ein Allerweltsbegriff wie
// 'Bildverarbeitung'. Den koennte nur eine vollstaendige Liste
// generischer Woerter aussortieren, und die gibt es nicht. Echte
// Marken haelt die Blocklist-Pruefung weiter oben hart auf.
//
// Der Bindestrich trennt mit, sonst bliebe 'KI-gestuetzte' ein
// einziges Token, das die STOP-Liste nicht kennt.
// ------------------------------------------------------------
// Die Technik-Stoppwoerter stehen in "Redaktionsregeln" - dieselbe Quelle,
// aus der "Thema waehlen" erkennt, ob ein Use-Case einen Produktnamen
// mitbringt, den der Text spaeter nicht nennen darf.
const STOP = new Set(($('Redaktionsregeln').first().json.technik_stopwoerter) || []);
const techTokens = String(c.uc_technology || '')
  .split(/[^A-Za-z0-9ÄÖÜäöüß]+/)
  .map(t => t.trim())
  .filter(t => t.length >= 4 && !STOP.has(t.toLowerCase()));
for (const t of techTokens) {
  if (lower.indexOf(t.toLowerCase()) >= 0) { soft.push('Begriff aus dem Technologiefeld im Text: ' + t); break; }
}

const weak = ['könnte','koennte','könnten','koennten','würde','wuerde','würden','wuerden','stellen sie sich vor'];
for (const w of weak) { if (lower.indexOf(w) >= 0) { issues.push('Hypothetische Formulierung: ' + w); break; } }
const buzz = ['revolutionär','revolutionaer','gamechanger','game changer','verändert alles','veraendert alles','disruptiv','zukunft der arbeit'];
for (const b of buzz) { if (lower.indexOf(b) >= 0) { issues.push('Buzzword: ' + b); break; } }

// Zahlenpruefung: jede Zahl muss aus 'belegte_zahlen' stammen.
const belegt = String(c.belegte_zahlen || '');
const belegteZiffern = new Set((belegt.match(/\d+(?:[.,]\d+)?/g) || []).map(String));
const imText = (text.replace(/#\S+/g, '').match(/\d+(?:[.,]\d+)?/g) || []).map(String);
const erfunden = [...new Set(imText.filter(z => !belegteZiffern.has(z)))];
if (erfunden.length) issues.push('Nicht belegte Zahl(en) im Text: ' + erfunden.join(', '));
const claimWords = ['studie','studien','umfrage','laut einer','durchschnittlich','im schnitt','branchenüblich','branchenueblich'];
for (const w of claimWords) { if (lower.indexOf(w) >= 0) { issues.push('Statistik-Behauptung ohne Beleg: ' + w); break; } }
// Ausgeschriebene Mengenangaben ohne Beleg. Die Ziffernpruefung oben
// greift hier nicht: "erheblich guenstiger" enthaelt keine Zahl und ist
// trotzdem eine Behauptung.
//
// Ein Mengenwort allein reicht nicht als Befund. "Den Arbeitsalltag
// erheblich erleichtern" ist qualitativ und harmlos; erst zusammen mit
// einem messbaren Ziel in der Naehe wird daraus eine Mengenbehauptung.
// Gemessen an den 17 abgelegten Beitraegen: 3 Treffer, alle drei echte
// Behauptungen - die beiden qualitativen "erheblich" laufen durch.
//
// Weich, nicht hart: Ein durchgelassener Beitrag geht als Entwurf nach
// Buffer und wird dort von Hand freigegeben. Der Befund gehoert an die
// Stelle, wo geprueft wird; ein harter Block kostet den ganzen Posttag,
// obwohl danach ohnehin jemand draufschaut.
if (!belegt.trim()) {
  // Die Wortliste steht als Muster in "Redaktionsregeln" - dieselbe Quelle, auf
  // die sich auch Analyse- und COPY-Prompt beziehen. Fehlt das Muster, wird
  // nicht geprueft; ein leeres Muster wuerde ueberall greifen.
  const MUSTER = String(($('Redaktionsregeln').first().json.mengenwoerter_muster) || '');
  const MENGE = MUSTER ? new RegExp('\\b(' + MUSTER + ')', 'gi') : null;
  const ZIEL = /(kosten|zeit|dauer|aufwand|ressourcen|personal|fehler|quote|umsatz|produktivit(?:ä|ae)t|effizienz|senk|spar|reduzier|verk(?:ü|ue)rz|beschleunig|steiger|erh(?:ö|oe)h)/i;
  const NAEHE = 50;
  let treffer;
  while (MENGE && (treffer = MENGE.exec(text)) !== null) {
    const von = Math.max(0, treffer.index - NAEHE);
    const bis = Math.min(text.length, treffer.index + treffer[0].length + NAEHE);
    const umfeld = text.slice(von, bis);
    if (ZIEL.test(umfeld)) {
      soft.push('Mengenangabe ohne Beleg: "' + umfeld.replace(/\s+/g, ' ').trim() + '"');
      break;
    }
  }
}

// Zielgruppenpruefung im Text selbst
const offTarget = ['saas','start-up','startup','enterprise','konzern','softwareunternehmen','entwicklerteam'];
for (const o of offTarget) { if (lower.indexOf(o) >= 0) { issues.push('Zielgruppenfremder Begriff im Text: ' + o); break; } }

// Die Ankerliste steht in "Redaktionsregeln" - dieselbe Quelle, aus der
// "Thema waehlen" seinen Eignungsfilter speist. Nur so verwirft die
// Pruefung nicht, was die Auswahl vorher fuer tauglich gehalten hat.
const anchors = ($('Redaktionsregeln').first().json.anker) || [];
if (!anchors.some(a => lower.indexOf(a) >= 0)) issues.push('Kein benanntes Dokument und kein benannter Arbeitsschritt');
if (text.indexOf('?') < 0) issues.push('Keine Frage am Ende');

const len = text.length;
if (len < 500) issues.push('LinkedIn-Text zu kurz (' + len + ' Zeichen)');
if (len > 1600) issues.push('LinkedIn-Text zu lang (' + len + ' Zeichen)');

// Hashtags saeubern: LinkedIn bricht ein Hashtag am ersten Sonderzeichen ab.
function cleanTag(t){
  let s = String(t).replace(/^#+/, '');
  s = s.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
       .replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue');
  s = s.replace(/[^A-Za-z0-9]/g, '');
  return s ? ('#' + s) : '';
}
const rawTags = String(c.linkedin_hashtags||'').split(/\s+/).map(t => t.trim()).filter(t => t.indexOf('#') === 0);
const tags = [...new Set(rawTags.map(cleanTag).filter(Boolean))];
if (rawTags.length > 3) soft.push('Mehr als 3 Hashtags (' + rawTags.length + '), auf 3 gekuerzt');
if (tags.length === 0) soft.push('Keine verwertbaren Hashtags geliefert');
if (rawTags.join(' ') !== tags.join(' ')) soft.push('Hashtags bereinigt (Sonderzeichen entfernt)');

const igTags = [...new Set(String(c.instagram_hashtags||'').split(/\s+/).map(t=>t.trim()).filter(t=>t.indexOf('#')===0).map(cleanTag).filter(Boolean))];

const all = issues.concat(soft);
return [{ json: Object.assign({}, c, {
  linkedin_hashtags: tags.slice(0,3).join(' '),
  instagram_hashtags: igTags.slice(0,8).join(' '),
  qa_passed: issues.length === 0,
  qa_issues: all.join(' | '),
  qa_issue_count: all.length
}) }];