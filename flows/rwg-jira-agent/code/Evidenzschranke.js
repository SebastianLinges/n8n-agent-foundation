const src = $('Public Wissen hybrid abrufen').first().json;
const candidates = Array.isArray(src.candidates) ? src.candidates : [];
const resp = $input.first().json ?? {};
const MIN_SCORE = 0.30;
const MIN_SPREAD = 0.10;
const CARRY = new Set(['solution','content']);
const results = Array.isArray(resp.results) ? resp.results : [];
const rerankOk = results.length > 0;
const scored = results.map(r => {
  const c = candidates[Number(r.index)];
  return c ? { ...c, rerankScore: Number(r.relevance_score ?? 0) } : null;
}).filter(Boolean).sort((a,b) => b.rerankScore - a.rerankScore);
const topScore = scored.length ? scored[0].rerankScore : 0;
const tailScore = scored.length ? scored[Math.min(4, scored.length - 1)].rerankScore : 0;
const spread = scored.length > 1 ? topScore - tailScore : 0;
const qualifying = scored.filter(r => r.rerankScore >= MIN_SCORE);
const hasCarry = qualifying.some(r => CARRY.has(String(r.chunkType)));
const gateScoreOk = topScore >= MIN_SCORE;
const gateSpreadOk = scored.length >= 2 && spread >= MIN_SPREAD;
const publicSolveAllowed = rerankOk && gateScoreOk && gateSpreadOk && hasCarry;
let gateReason = 'Evidenz belastbar.';
if (!rerankOk) gateReason = 'Kein Reranker-Ergebnis verfuegbar.';
else if (!gateScoreOk) gateReason = 'Bester Score ' + topScore.toFixed(3) + ' unter Schwelle ' + MIN_SCORE;
else if (!gateSpreadOk) gateReason = 'Kein deutlicher Abstand im Trefferfeld (Spread ' + spread.toFixed(3) + ')';
else if (!hasCarry) gateReason = 'Nur comment oder image_attachment ueber der Schwelle.';

// Ein Vorgang liegt in der Wissensbasis als mehrere Chunks (header, content,
// comment, solution, image_attachment). Ohne Zusammenfassung wirkt ein einziger
// Altfall wie mehrere unabhaengige Belege und belegt mehrere der sechs Plaetze
// im Policy-Prompt.
//
// Daher ein Eintrag je sourceRef. Repraesentant ist der beste Chunk, wobei
// solution/content Vorrang vor comment/image_attachment hat - sonst koennte ein
// Bildchunk den Vorgang vertreten und er fiele aus publicRefs heraus.
// Die weiteren Chunks desselben Vorgangs gehen gekuerzt als Zusatztext mit,
// damit kein Inhalt verloren geht.
//
// Die Torpruefung bleibt davon unberuehrt: hasCarry, topScore, spread und
// publicSolveAllowed rechnen auf der ungefilterten Liste. Die Deduplizierung
// betrifft ausschliesslich das, was dem Modell vorgelegt wird.
const MAX_ZUSATZ = 2;
const ZUSATZ_LAENGE = 400;

const proRef = new Map();
for (const r of qualifying) {
  const ref = String(r.sourceRef ?? '');
  const eintrag = proRef.get(ref);
  if (!eintrag) {
    proRef.set(ref, { haupt: r, weitere: [] });
    continue;
  }
  const neuIstCarry = CARRY.has(String(r.chunkType));
  const altIstCarry = CARRY.has(String(eintrag.haupt.chunkType));
  if (neuIstCarry && !altIstCarry) {
    eintrag.weitere.push(eintrag.haupt);
    eintrag.haupt = r;
  } else {
    eintrag.weitere.push(r);
  }
}

const dedupliziert = [...proRef.values()]
  .sort((a, b) => b.haupt.rerankScore - a.haupt.rerankScore);

const publicContext = (publicSolveAllowed ? dedupliziert : []).slice(0,6).map(e => {
  const r = e.haupt;
  const zusatz = e.weitere
    .slice(0, MAX_ZUSATZ)
    .map(w => '[' + String(w.chunkType) + ', Score ' + Number(w.rerankScore).toFixed(3) + '] '
      + String(w.text ?? '').slice(0, ZUSATZ_LAENGE));
  return {
    sourceRef: r.sourceRef,
    sourceType: r.sourceType,
    chunkType: r.chunkType,
    title: r.title,
    url: r.url,
    rerankScore: Number(r.rerankScore.toFixed(4)),
    text: String(r.text ?? '').slice(0,2400),
    weitereChunkTypen: e.weitere.map(w => String(w.chunkType)),
    weitereAuszuege: zusatz
  };
});

const publicRefs = [...new Set(publicContext.filter(r => CARRY.has(String(r.chunkType))).map(r => r.sourceRef))];
return [{ json: {
  publicContext,
  publicRefs,
  publicContextCount: publicContext.length,
  publicSolveAllowed,
  rerankDiagnostics: { rerankOk, candidateCount: candidates.length, scoredCount: scored.length, topScore: Number(topScore.toFixed(4)), spread: Number(spread.toFixed(4)), minScore: MIN_SCORE, minSpread: MIN_SPREAD, publicSolveAllowed, gateReason, qualifyingCount: qualifying.length, distinctRefCount: proRef.size, topFive: scored.slice(0,5).map(r => ({ ref: r.sourceRef, type: r.chunkType, source: r.sourceType, score: Number(r.rerankScore.toFixed(4)) })) }
} }];