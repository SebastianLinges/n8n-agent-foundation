// --- M-5 Signaturbereinigung -------------------------------------------
// Entfernt aus Beschreibung und Kommentartexten, was die fachliche
// Bewertung nicht traegt: Grussformel samt Signaturblock, Kontaktzeilen,
// Postanschriften, rechtliche Fusszeilen und zitierte Vorgaengermails.
//
// KONSERVATIV: Im Zweifel wird nicht abgeschnitten. Bleibt nach der
// Bereinigung zu wenig Text uebrig, gilt das Muster als unsicher erkannt
// und der Originaltext wird verwendet. Diese Faelle zaehlt
// result.bereinigung.
//
// Die Sicherung ist eine absolute Untergrenze, kein Anteil. Ein Anteil
// misst nur, wie lang die Signatur im Verhaeltnis war, nicht ob der
// Schnitt stimmt: ist das Anliegen zwei Saetze lang und die Signatur zehn
// Zeilen, ist ein richtiger Schnitt zwangslaeufig groesser als die
// Haelfte. Die Zeichengrenze fragt stattdessen, ob genug Substanz fuer
// eine Bewertung stehen bleibt.
//
// Zwei Grenzen, weil die Schnittmarken unterschiedlich sicher sind:
// Nach einer Grussformel folgt ein Signaturblock, der die Bewertung nie
// traegt. Nach einem Zitat kann dagegen Inhalt stehen, auf den sich der
// Text davor beruft ("siehe unten"). Bleibt dort nur eine Verweiszeile
// uebrig, wird das Zitat behalten.
//
// Diese beiden Zahlen sind die einzigen Stellschrauben der Bereinigung.
const MIN_REST_ZEICHEN = 40;
const MIN_REST_ZEICHEN_ZITAT = 120;

const GRUSS = /^\s*(viele gr(ue|ü)(ss|ß)e|mit freundlichen gr(ue|ü)(ss|ß)en|beste gr(ue|ü)(ss|ß)e|freundliche gr(ue|ü)(ss|ß)e|liebe gr(ue|ü)(ss|ß)e|vielen dank und viele gr(ue|ü)(ss|ß)e|danke und (viele )?gr(ue|ü)(ss|ß)e|mfg)\s*[,.!]?\s*$/i;
const ZITAT = /^\s*(>|von:|gesendet:|an:|betreff:|-{2,}\s*urspr)/i;
const RECHT = /(vertraulichkeitshinweis|diese e-?mail und etwaige|confidentiality notice|nicht der beabsichtigte empf(ae|ä)nger)/i;
const KONTAKT = /^\s*\|?\s*(telefon|tel\.?|mobil|fax|e-?mail|website|web)\s*:?\s*\\?\\?\s*$/i;
const PLZ = /^\s*.{0,40}\|?\s*\d{5}\s+[A-Za-zÄÖÜäöüß.\- ]{2,40}\s*\|?\s*$/;

let bereinigtAnzahl = 0;
let verworfenAnzahl = 0;

function bereinigeText(s) {
  const roh = String(s || "");
  if (roh.length < MIN_REST_ZEICHEN) return roh;
  const zeilen = roh.split("\n");

  let schnitt = -1;
  let schnittAmZitat = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (GRUSS.test(z) || RECHT.test(z)) { schnitt = i; schnittAmZitat = false; break; }
    if (ZITAT.test(z)) { schnitt = i; schnittAmZitat = true; break; }
  }
  const bis = schnitt === -1 ? zeilen.length : schnitt;

  let neu = "";
  for (let i = 0; i < bis; i++) {
    const z = zeilen[i];
    if (KONTAKT.test(z)) continue;
    if (PLZ.test(z)) continue;
    neu = neu + z + "\n";
  }
  neu = neu.replace(/\n{3,}/g, "\n\n").trim();

  const untergrenze = schnittAmZitat ? MIN_REST_ZEICHEN_ZITAT : MIN_REST_ZEICHEN;
  if (neu.length < untergrenze) { verworfenAnzahl += 1; return roh; }
  if (neu.length < roh.length) bereinigtAnzahl += 1;
  return neu;
}
// --- Ende M-5 -----------------------------------------------------------
