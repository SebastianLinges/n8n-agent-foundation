# RWG Vertragsdaten

Neuaufbau des `RWG_Contract_Loader` (`661BDwEditNicEc0`). Der alte Flow läuft über ein Formular und einen Webhook und schreibt in eine n8n-Data-Table. Der neue holt seine Dokumente aus SharePoint, schreibt nach Supabase und legt die verarbeitete Datei in einen Unterordner `Erledigt`.

**Stand:** Die Zieltabelle ist angelegt. Der Flow selbst wartet auf die SharePoint-Angaben (Site, Bibliothek, Eingangsordner).

## Die Tabelle `vertraege`

Liegt im Projekt `zckaxkpycyyxaymmkmvu` (RWG Rheinland eG / RAG). Angelegt am 30.08.2026.

### Zwei Entscheidungen, die den Unterschied machen

**Jedes Feld doppelt: als Klartext und als ausgewerteter Wert.** `laufzeit_ende_text` hält, was im Vertrag steht — auch „bis auf Widerruf" oder „31.12. des Folgejahres". `laufzeit_ende` als `date` wird nur gefüllt, wenn es eindeutig ist. Wer nur typisierte Spalten führt, verliert genau die Fälle, die später Ärger machen; wer nur Text führt, kann nicht nach auslaufenden Verträgen fragen.

**Der OCR-Text bleibt gespeichert.** `ocr_text` und `rohdaten` erlauben eine **erneute Auswertung ohne neue OCR**. Wird der Extraktionsprompt später besser — und das wird er, das Ziel ist ja „bestmögliche Erkennung" —, laufen alle Altverträge in Sekunden neu durch, ohne einen Cent für Mistral. Ohne diese beiden Spalten müsste jedes Dokument erneut durch die Erkennung.

### Aufbau

| Gruppe | Spalten |
|---|---|
| Herkunft | `datei_name`, `datei_hash` (eindeutig, Duplikatschutz), `sharepoint_item_id`, `sharepoint_pfad`, `sharepoint_url` |
| Verarbeitungsstand | `status` (`neu`, `ocr`, `extrahiert`, `abgelegt`, `fehler`), `fehler_text`, `erkannt_am`, `abgelegt_am` |
| Vertragsdaten als Klartext | `definition`, `mandant`, `vertragsart`, `vertragspartner`, `lieferantennummer`, `vertragsnummer`, `laufzeit_beginn_text`, `laufzeit_ende_text`, `intervalle`, `verlaengerung`, `kuendigungsfrist`, `kuendigung_zum_text`, `preis_netto_text`, `preis_brutto_text`, `kosten_jaehrlich_text`, `sparte_bereich`, `standortinfo`, `kostenstelle` |
| Ausgewertet | `laufzeit_beginn`, `laufzeit_ende`, `kuendigung_zum` als `date`; `preis_netto`, `preis_brutto`, `kosten_jaehrlich` als `numeric(14,2)` |
| Nachvollziehbarkeit | `ocr_text`, `rohdaten` (jsonb, unveränderte Modellantwort), `ocr_modell`, `extraktions_modell`, `seiten`, `woerter` |

Indizes auf `status`, `vertragspartner`, `laufzeit_ende` und `kuendigung_zum` (beide nur wo gefüllt), dazu ein deutscher Volltextindex über Partner, Definition und Vertragsart. RLS ist an, ohne Regeln — wie im ganzen Projekt.

`abgelegt_am` wird erst gesetzt, wenn die Datei tatsächlich in `Erledigt` liegt. Damit ist ein abgebrochener Lauf erkennbar: Eintrag vorhanden, Datei noch im Eingang.

## Der geplante Ablauf

```
Zeitplan → SharePoint-Eingang lesen → Je Datei
              ↓
         Hash bilden → schon in vertraege? → ja: überspringen
              ↓ nein
         Zeile mit status 'neu' anlegen
              ↓
         Mistral OCR  → ocr_text sichern, status 'ocr'
              ↓
         Extraktion   → rohdaten + Felder, status 'extrahiert'
              ↓
         Datei nach Erledigt verschieben → status 'abgelegt'
              ↓
         Excel-Liste fortschreiben
```

**Reihenfolge ist Absicht:** Erst schreiben, dann verschieben. Bricht der Lauf zwischen OCR und Extraktion ab, liegt die Datei noch im Eingang und der nächste Lauf holt sie erneut — der Hash verhindert die Dublette, der Status sagt, wie weit sie kam.

## Was noch fehlt

- **SharePoint-Angaben:** Site, Bibliothek, Eingangsordner. Kommt von Sebastian.
- **Excel-Liste:** Ablageort und ob je Zeile angehängt oder die Datei ersetzt wird.
- **Der alte Flow** `RWG_Contract_Loader` (`661BDwEditNicEc0`) läuft weiter, bis der neue belegt ist. Seine Data Table `CEz5GXpTS7yHhjqS` enthält den Altbestand — ob der übernommen wird, ist offen.
