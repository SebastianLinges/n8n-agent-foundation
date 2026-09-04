let raw = ($json && $json.text) ? $json.text : (($json && $json.output) ? $json.output : '');
let arr=[]; try{ arr = JSON.parse(String(raw).replace(/```json/g,'').replace(/```/g,'').trim()); }catch(e){ arr=[]; }
if(!Array.isArray(arr)) arr=[];
const VALID = ['handwerk','fertigung','engineering','buero'];

// Austauschbare Namen werden verworfen, statt den Bestand zu verwaessern.
const GENERIC = ['workflow-automatisierung','workflow automation','prozessoptimierung','ki-integration','digitalisierung','automatisierung','automatisierung fuer kleine unternehmen','automatisierung f\u00fcr kleine unternehmen','ki im mittelstand','effizienzsteigerung'];
function istGenerisch(name){
  const n = String(name||'').toLowerCase().trim().replace(/\s+/g,' ');
  if (n.length < 12) return true;
  return GENERIC.some(g => n === g || n === g + ' fuer kleine unternehmen' || n === g + ' f\u00fcr kleine unternehmen');
}
function fallbackPillar(u){
  const blob = ((u.name||'')+' '+(u.target_group||'')+' '+(u.problem||'')+' '+(u.solution||'')).toLowerCase();
  if (/handwerk|baustelle|montage|installat|aufmass|werkstatt|gewerk/.test(blob)) return 'handwerk';
  if (/fertigung|produktion|maschine|pr\u00fcfprotokoll|pruefprotokoll|qualit\u00e4t|qualitaet|inspekt|ausschuss|cnc/.test(blob)) return 'fertigung';
  if (/ingenieurb|konstruktion|cad|pdm|plm|st\u00fcckliste|stueckliste|zeichnung|projektkoordination/.test(blob)) return 'engineering';
  return 'buero';
}
const nowIso=$now.toISO(); const base=Date.now(); const out=[];
arr.slice(0,4).forEach((u,idx)=>{
  if(!u || !u.name) return;
  if(istGenerisch(u.name)) return;
  let pillar = String(u.pillar||'').toLowerCase().trim();
  if (VALID.indexOf(pillar) < 0) pillar = fallbackPillar(u);
  out.push({ json: {
    uc_id:'uc_'+base+'_'+idx,
    name:String(u.name||'').slice(0,200),
    pillar,
    target_group:String(u.target_group||''),
    problem:String(u.problem||''),
    solution:String(u.solution||''),
    technology:String(u.technology||''),
    trigger_source:String(u.trigger_source||''),
    score:(typeof u.score==='number'?u.score:0),
    business_model:String(u.business_model||''),
    status:'new', first_seen:nowIso, last_evaluated:nowIso
  } });
});
return out;