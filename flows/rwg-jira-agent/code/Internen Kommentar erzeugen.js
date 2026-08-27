// =============================================================================
// Baut den internen JSM-Kommentar (public:false) aus der abgesicherten Analyse.
//
// Regeln:
//   - Dedup pro Ticket/Dokument, nicht pro chunkType: comment/content/solution/
//     image_attachment desselben Falls ergeben EINEN Eintrag.
//   - Das aktuell bearbeitete Ticket erscheint nie als eigene interne
//     Dokumentation und nie als eigener Altfall.
//   - Faelle unter "Relevante geloeste Altfaelle" erscheinen nicht nochmals
//     unter "Relevante interne Dokumentation".
//   - Diagnostik gehoert nicht in den Kommentar. Sie wird vollstaendig ermittelt
//     und im Ausgabefeld `diagnostics` zurueckgegeben.
//   - Interne Doku-Zeilen bleiben schlank: Titel, Link, kurzer Nutzen.
//   - Kein Kommentar, der nur aus Kopf und Telemetrie besteht.
//
// Ausgabe-Vertrag fuer "Internen JSM-Kommentar anlegen":
//   { ticketKey, internalComment }   (+ diagnostics, sourceAudit zur Auswertung)
// =============================================================================

const route = $('Routing und Prioritaet ableiten').first().json ?? {};
const secured = $('Analyse und Identifikatoren absichern').first().json ?? {};
const analysis = route.analysis ?? secured.analysis ?? {};
const validation = secured.internalSourceValidation ?? {};

let safety = null;
try {
  safety = $('Sicherheitspruefung Anwendernachricht').first().json;
} catch (error) {
  safety = null;
}

const EXTERNAL_ALLOWED_HOSTS = new Set([
  'learn.microsoft.com',
  'support.microsoft.com',
  'techcommunity.microsoft.com',
  'docs.microsoft.com',
  'support.hp.com',
  'support.lenovo.com',
  'support.zebra.com',
  'kb.vmware.com',
  'support.citrix.com',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TICKET_KEY_REGEX = /SSD-\d+/;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, maxLength = 5000) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

// Zieht den Ticket-Key (SSD-xxxx) aus sourceRef/URL/Titel. Leerstring, wenn keiner.
function extractTicketKey(value) {
  const match = cleanText(value, 2000).toUpperCase().match(TICKET_KEY_REGEX);
  return match ? match[0] : '';
}

function normalizeSourceType(value) {
  const source = cleanText(value, 100).toLowerCase();
  if (source.includes('jira')) return 'jira';
  if (source.includes('confluence') || source.includes('dokuhub')) return 'confluence';
  if (source.includes('sharepoint')) return 'sharepoint';
  return 'unbekannt';
}

function normalizeAudience(value) {
  const audience = cleanText(value, 100).toLowerCase();
  return ['public', 'it_internal'].includes(audience) ? audience : '';
}

function normalizeChunkType(value) {
  const chunkType = cleanText(value, 100).toLowerCase();
  return ['solution', 'content', 'comment', 'image_attachment', 'other'].includes(chunkType)
    ? chunkType
    : 'other';
}

function normalizeRating(value) {
  const rating = cleanText(value, 100).toUpperCase();
  return ['RELEVANT', 'TEILWEISE_RELEVANT', 'NICHT_RELEVANT'].includes(rating)
    ? rating
    : 'NICHT_RELEVANT';
}

function normalizeHttpsUrl(value) {
  const raw = cleanText(value, 2000);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return '';
  }
}

function isAllowedExternalUrl(value) {
  const normalized = normalizeHttpsUrl(value);
  if (!normalized) return false;
  const host = new URL(normalized).hostname.toLowerCase();
  return (
    EXTERNAL_ALLOWED_HOSTS.has(host) ||
    [...EXTERNAL_ALLOWED_HOSTS].some((allowedHost) => host.endsWith(`.${allowedHost}`))
  );
}

function dedupe(items, keyBuilder) {
  const result = [];
  const seen = new Set();
  for (const item of items) {
    const key = cleanText(keyBuilder(item), 4000).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

// aktueller Ticket-Key fuer Selbstreferenz-Ausschluss
const currentTicketKey = (extractTicketKey(route.ticketKey) || extractTicketKey(secured.ticketKey)).toUpperCase();

const validatedSources = asArray(validation.validatedSources)
  .map((source) => ({
    sourceRef: cleanText(source?.sourceRef, 500),
    sourceType: normalizeSourceType(source?.sourceType),
    audience: normalizeAudience(source?.audience),
    chunkType: normalizeChunkType(source?.chunkType),
    title: cleanText(source?.title, 1000),
    url: normalizeHttpsUrl(source?.url),
    rating: normalizeRating(source?.rating),
    reason: cleanText(source?.reason, 2000),
  }))
  .filter((source) => source.sourceRef && source.sourceType !== 'unbekannt');

const groundingText = [
  secured.ticketKey,
  secured.summary,
  secured.description,
  secured.conversation,
  secured.imageAnalysis,
  ...validatedSources.flatMap((source) => [source.sourceRef, source.title, source.url, source.reason]),
  ...asArray(analysis.externeQuellen).flatMap((source) => [source?.titel, source?.url, source?.kernaussage]),
]
  .filter(Boolean)
  .join('\n')
  .toLowerCase();

function redactUngroundedEmails(value, maxLength = 5000) {
  return cleanText(value, maxLength).replace(EMAIL_REGEX, (email) =>
    groundingText.includes(email.toLowerCase())
      ? email
      : '[nicht verifizierte E-Mail-Adresse entfernt]'
  );
}

// -----------------------------------------------------------------------------
// [FIX 1/2] Interne Quellen: pro Ticket/Dokument EIN Eintrag, Selbstreferenz raus
// -----------------------------------------------------------------------------
const RATING_RANK = { RELEVANT: 2, TEILWEISE_RELEVANT: 1, NICHT_RELEVANT: 0 };
const CHUNK_RANK = { solution: 4, content: 3, comment: 2, image_attachment: 1, other: 0 };

// Gruppenschluessel = Ticket-Key, sonst URL, sonst sourceRef
function groupKeyOf(source) {
  return (
    extractTicketKey(source.sourceRef) ||
    source.url ||
    cleanText(source.sourceRef, 500).toLowerCase()
  );
}

const internalGroups = new Map();
for (const raw of validatedSources) {
  if (!['RELEVANT', 'TEILWEISE_RELEVANT'].includes(raw.rating)) continue;

  const ticketKey = extractTicketKey(raw.sourceRef);
  // Selbstreferenz ausschliessen
  if (ticketKey && ticketKey === currentTicketKey) continue;

  const gkey = groupKeyOf(raw);
  if (!gkey) continue;

  const candidate = {
    ...raw,
    ticketKey,
    title: redactUngroundedEmails(raw.title || raw.sourceRef, 1000),
    reason: redactUngroundedEmails(raw.reason, 2000),
  };

  const existing = internalGroups.get(gkey);
  if (!existing) {
    internalGroups.set(gkey, candidate);
    continue;
  }

  // besseren Repraesentanten behalten: zuerst Rating, dann chunkType
  const candidateScore =
    (RATING_RANK[candidate.rating] ?? 0) * 10 + (CHUNK_RANK[candidate.chunkType] ?? 0);
  const existingScore =
    (RATING_RANK[existing.rating] ?? 0) * 10 + (CHUNK_RANK[existing.chunkType] ?? 0);

  if (candidateScore > existingScore) {
    candidate.reason = candidate.reason || existing.reason;
    candidate.url = candidate.url || existing.url;
    internalGroups.set(gkey, candidate);
  } else {
    if (!existing.reason && candidate.reason) existing.reason = candidate.reason;
    if (!existing.url && candidate.url) existing.url = candidate.url;
  }
}

// -----------------------------------------------------------------------------
// Geloeste Altfaelle: Selbstreferenz raus, Dedup pro Ticket
// -----------------------------------------------------------------------------
const solutionCases = dedupe(
  asArray(analysis.relevanteLoesungsfaelle)
    .map((solutionCase) => {
      const ticketKey = (extractTicketKey(solutionCase?.ticketKey) || cleanText(solutionCase?.ticketKey, 100)).toUpperCase();
      return {
        ticketKey,
        title: redactUngroundedEmails(solutionCase?.titel, 1000),
        previousSymptom: redactUngroundedEmails(solutionCase?.damaligesSymptom, 2500),
        previousSolution: redactUngroundedEmails(solutionCase?.damaligeLoesung, 2500),
        comparison: redactUngroundedEmails(solutionCase?.vergleichAktuellerFall, 2500),
        evidence: cleanText(solutionCase?.beweiskraft, 100).toUpperCase(),
      };
    })
    .filter((solutionCase) => solutionCase.ticketKey && solutionCase.ticketKey !== currentTicketKey),
  (solutionCase) => solutionCase.ticketKey
).slice(0, 8);

// [FIX 3] Faelle, die schon als Altfall stehen, nicht nochmal als interne Doku
const solutionKeys = new Set(solutionCases.map((s) => s.ticketKey).filter(Boolean));
const relevantInternalSources = [...internalGroups.values()]
  .filter((source) => !(source.ticketKey && solutionKeys.has(source.ticketKey)))
  .slice(0, 8);

// -----------------------------------------------------------------------------
// Externe Quellen (unveraendert: Whitelist + Dedup)
// -----------------------------------------------------------------------------
const externalAudit = { input: 0, accepted: 0, rejectedUrl: 0, duplicatesRemoved: 0 };
const acceptedExternalBeforeDedupe = [];
const rawExternalSources = asArray(analysis.externeQuellen);
externalAudit.input = rawExternalSources.length;

for (const source of rawExternalSources) {
  const url = normalizeHttpsUrl(source?.url);
  if (!url || !isAllowedExternalUrl(url)) {
    externalAudit.rejectedUrl += 1;
    continue;
  }
  acceptedExternalBeforeDedupe.push({
    title: redactUngroundedEmails(source?.titel || new URL(url).hostname, 1000),
    url,
    statement: redactUngroundedEmails(source?.kernaussage, 2500),
  });
}

const externalSources = dedupe(
  acceptedExternalBeforeDedupe,
  (source) => `${source.url}|${source.title}`
).slice(0, 5);

externalAudit.accepted = externalSources.length;
externalAudit.duplicatesRemoved = acceptedExternalBeforeDedupe.length - externalSources.length;

// -----------------------------------------------------------------------------
// KOMMENTAR AUFBAUEN (nur anwender-/IT-hilfreiche Inhalte, KEINE Diagnostik)
// -----------------------------------------------------------------------------
const output = ['Agenten-Ersteinschätzung', ''];
let substantiveSections = 0;

// Kurze Prioritaetsnotiz (eine Zeile), nur wenn geaendert
if (route.shouldUpdatePriority === true) {
  if (route.priorityDirection === 'gesetzt') {
    output.push(`Priorität automatisch auf ${route.priorityName} gesetzt (${route.priorityReason}).`);
  } else {
    output.push(
      `Priorität automatisch von ${route.currentPriorityName ?? 'unbekannt'} auf ${route.priorityName} ${route.priorityDirection} (${route.priorityReason}).`
    );
  }
  output.push('');
}

if (safety && safety.isSafe === false) {
  output.push('Hinweis');
  output.push(
    `Die automatische Anwendernachricht wurde nicht veröffentlicht: ${safety.safetyReason ?? 'Sicherheitsprüfung nicht bestanden.'}`
  );
  output.push('');
}

function pushSection(heading, body) {
  const text = cleanText(body, 12000);
  if (!text) return;
  output.push(heading);
  output.push(text);
  output.push('');
  substantiveSections += 1;
}

pushSection('Einordnung', redactUngroundedEmails(analysis.einordnung, 5000));

const cause = redactUngroundedEmails(analysis.moeglicheUrsache, 5000);
if (cause) {
  pushSection(
    'Mögliche Ursache',
    cause + (analysis.ursacheBelegt === true
      ? ' (durch verifizierte interne Evidenz gestützt)'
      : ' (nicht abschliessend belegt)')
  );
}

const checks = asArray(analysis.pruefschritte)
  .map((step) => redactUngroundedEmails(step, 2500))
  .filter(Boolean)
  .map((step) => `- ${step}`)
  .join('\n');
pushSection('Empfohlene IT-Prüfschritte', checks);

const solutionCasesText = solutionCases
  .map((solutionCase) => {
    const lines = [
      `- ${solutionCase.ticketKey}${solutionCase.title ? ` – ${solutionCase.title}` : ''}`,
      `  Beweiskraft: ${['HINWEIS', 'STARKER_HINWEIS', 'BELEG'].includes(solutionCase.evidence) ? solutionCase.evidence : 'HINWEIS'}`,
    ];
    if (solutionCase.previousSymptom) lines.push(`  Damaliges Symptom: ${solutionCase.previousSymptom}`);
    if (solutionCase.previousSolution) lines.push(`  Damalige Lösung: ${solutionCase.previousSolution}`);
    if (solutionCase.comparison) lines.push(`  Vergleich zum aktuellen Fall: ${solutionCase.comparison}`);
    return lines.join('\n');
  })
  .join('\n\n');
pushSection('Relevante gelöste Altfälle', solutionCasesText);

// [FIX 5] schlanke interne Doku-Zeilen (Titel + Link + Nutzen)
const internalSourcesText = relevantInternalSources
  .map((source) => {
    const lines = [`- ${source.title || source.sourceRef}`];
    if (source.url) lines.push(`  ${source.url}`);
    if (source.reason) lines.push(`  Nutzen: ${source.reason}`);
    return lines.join('\n');
  })
  .join('\n\n');
pushSection('Weitere relevante interne Dokumentation', internalSourcesText);

pushSection('Ergebnis der externen Herstellerrecherche', redactUngroundedEmails(analysis.externeRechercheErgebnis, 5000));

const externalSourcesText = externalSources
  .map((source) => {
    const lines = [`- ${source.title}`, `  ${source.url}`];
    if (source.statement) lines.push(`  Aussage: ${source.statement}`);
    return lines.join('\n');
  })
  .join('\n\n');
pushSection('Externe Herstellerinformationen', externalSourcesText);

const openObservations = asArray(route.safeQuestionObjects)
  .map((question) => {
    const category = cleanText(question?.category, 100);
    const text = redactUngroundedEmails(question?.question, 1200);
    return category && text ? `- ${category}: ${text}` : '';
  })
  .filter(Boolean)
  .join('\n');
pushSection('Offene Anwenderbeobachtungen', openObservations);

const alreadyAnswered = asArray(route.bereitsImTicketBeantwortet)
  .map((entry) => redactUngroundedEmails(entry, 1200))
  .filter(Boolean)
  .map((entry) => `- ${entry}`)
  .join('\n');
pushSection('Bereits im Ticket beantwortet', alreadyAnswered);

// [FIX 6] Leer-Absicherung: keinen reinen Kopf-Kommentar erzeugen
if (substantiveSections === 0) {
  output.push('Keine belastbare automatische Einschätzung möglich.');
  output.push('Es liegen keine passenden internen Fälle oder Prüfschritte vor. Bitte manuell bewerten.');
  output.push('');
}

output.push('_Automatisch erstellt - bitte fachlich prüfen._');

// -----------------------------------------------------------------------------
// [FIX 4] Diagnostik NICHT in den Kommentar, sondern als Output-Feld
// -----------------------------------------------------------------------------
const gateDiag = route.rerankDiagnostics ?? {};
const claimedSourceCount = Number(validation.claimedSourceCount ?? 0);
const validatedSourceRowCount = Number(validation.validatedSourceRowCount ?? validatedSources.length);
const validatedRefCount = Number(validation.validatedRefCount ?? 0);
const rejectedClaimCount = Number(validation.rejectedClaimCount ?? 0);
const carryingEvidenceCount = Number(validation.carryingEvidenceCount ?? 0);

const diagnostics = {
  decision: route.decision,
  routeReason: route.routeReason,
  rechercheDurchgefuehrt: analysis.rechercheDurchgefuehrt === true,
  internalClaimed: claimedSourceCount,
  internalValidatedRefs: validatedRefCount,
  internalValidatedRows: validatedSourceRowCount,
  internalRejectedClaims: rejectedClaimCount,
  internalCarryingEvidence: carryingEvidenceCount,
  internalDisplayed: relevantInternalSources.length,
  solutionCasesDisplayed: solutionCases.length,
  publicEvidence: {
    gateReason: gateDiag.gateReason ?? 'unbekannt',
    candidateCount: gateDiag.candidateCount ?? 0,
    topScore: gateDiag.topScore ?? 0,
    spread: gateDiag.spread ?? 0,
  },
  rejectedQuestions: asArray(route.questionSanitizationAudit).length,
  external: externalAudit,
  identifierAudit: secured.identifierAudit ?? {},
  priority: {
    changed: route.shouldUpdatePriority === true,
    direction: route.priorityDirection,
    from: route.currentPriorityName,
    to: route.priorityName,
    reason: route.priorityReason,
  },
};

const sourceAudit = {
  internalClaimed: claimedSourceCount,
  internalValidatedRefs: validatedRefCount,
  internalValidatedRows: validatedSourceRowCount,
  internalRejectedClaims: rejectedClaimCount,
  internalCarryingEvidence: carryingEvidenceCount,
  internalDisplayed: relevantInternalSources.length,
  solutionCasesDisplayed: solutionCases.length,
  externalInput: externalAudit.input,
  externalAccepted: externalAudit.accepted,
  externalRejectedUrl: externalAudit.rejectedUrl,
  externalDuplicatesRemoved: externalAudit.duplicatesRemoved,
};

return [
  {
    json: {
      ticketKey: route.ticketKey,
      internalComment: output.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 14000),
      diagnostics,
      sourceAudit,
    },
  },
];