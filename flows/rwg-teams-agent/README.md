# RWG Teams Agent

Workflow `RWG Teams Agent` (`BWswB3XA8S2gMwoT`), aktiv, 49 Nodes, Microsoft-Teams-Trigger auf neue Chatnachrichten.

## Aufbau

Teams-spezifisch bis `Build Teams Context`: **Aussonderung von Nicht-Nachrichten über `Ist es eine Chatnachricht?`**, Duplikatschutz über `Claim Message`, Nachladen von Chat und Nachricht über Microsoft Graph, `Resolve Identity` für Identität und Sichtbarkeit, Lesebestätigung.

Fachlich ab `Greeting-Gate`: Begrüßungsweiche, Bildzweig, `Agent-Eingabe bauen`, `AI Agent` mit sechs Werkzeugen (Semantische Wissenssuche, Volltextsuche, Jira-Tickets, Web-Recherche, Denkschritt, Confluence-Bereiche), `Output Guard`, `Format Reply for Teams`.

## Modell

`gpt-5.4`, `maxTokens 2500`, `reasoningEffort low`, **kein** `temperature`.

Der Parameter `temperature` muss fehlen: Die GPT-5-Generation lehnt ihn ab und der Agent stirbt sonst bei jeder Nachricht an `Bad request — Unsupported parameter`. `maxTokens` liegt bewusst über dem alten Wert von 900, weil Reasoning-Tokens aus demselben Budget gehen.

Der Wechsel von `gpt-4o` hat einen Testfall unmittelbar gelöst: Bei Verortungsfragen brach der Agent nach einem einzigen Werkzeugaufruf mit einer bloßen Titelliste ab, obwohl der Systemprompt einen zweiten Aufruf wörtlich vorschreibt. Seither zieht er mehrere Werkzeuge und liefert Inhalt statt Titel.

## Identität und Sichtbarkeit

`Resolve Identity` liefert `audienceCsv` aus dem Graph-Profil. Beim Test ergab sich `identityResolutionSource: it_department` bei `groupsConfigured: false` — die IT-Erkennung hängt damit **allein am Abteilungsnamen**, die Gruppenprüfung ist nicht konfiguriert. Für die Zulässigkeitsprüfung (fremde Vorgänge) ist das der entscheidende Punkt und noch ungeprüft.

Die Identität geht fest verdrahtet an das Jira-Werkzeug (`userEmail`, `istIT`) und stammt nie aus dem Modell.

## Kostenbremse der Web-Recherche

Der Node `Web-Recherche` ruft Tavily auf und wird vom Agenten selbst ausgelöst — ohne Vorprüfung, anders als beim Jira-Agenten, der eine vierfach bedingte Freigabe davorschaltet. Nachdem ein privater Wetterabruf einen bezahlten Aufruf ausgelöst hatte, verlangt die `toolDescription` jetzt ausdrücklich einen dienstlichen Bezug und untersagt Wetter, Sport, Nachrichten, Unterhaltung, Rezepte, Reiseplanung und Einkauf.

Gegengeprüft: „wie wird das wetter morgen in erkelenz?" löst **keinen** Werkzeugaufruf mehr aus (ein Modellaufruf, 4,4 s). „gibt es bei zebra bekannte probleme mit dem tc52?" führt zu drei zunehmend gezielteren Suchen, zuletzt mit `site:`-Einschränkung auf die Herstellerdomain, und liefert belegte Treffer mit Originallinks.

Bemerkenswert: Die Tool-Beschreibung setzt sich gegen den Systemprompt durch, der Städte ausdrücklich als Web-Fall führt. Der spezifischere Hinweis am Werkzeug gewinnt.

## Gespräch schlägt Werkzeug — entschärft

Der Gesprächsspeicher ist kein Sub-Node, sondern eigengebaut: `Save Memory` schreibt Frage und Antwort nach `public.agent_conversation_memory` und hält die letzten 40 Einträge; der Verlauf geht als `memoryText` in die Agent-Eingabe. Der Agent liest seine früheren Antworten also als Text im Prompt.

Das führte zu einem stillen Fehlverhalten: Hatte der Agent zu einem Namen einmal zurückgefragt („zu diesem Namen gibt es mehrere Personen"), beantwortete er dieselbe Frage danach **ohne jeden Werkzeugaufruf** aus dem Verlauf. Belege: Läufe `109808` und `109815`, beide mit `tool_calls.completed: 0` und nur einem Modellaufruf, bei gleichzeitig null Ausführungen des Sub-Workflows. Aus Modellsicht folgerichtig — es hatte um eine Angabe gebeten, die Person wiederholte die Frage, also wiederholte es die Bitte. Fachlich falsch, weil eine zwischenzeitliche Korrektur so nie sichtbar wird.

Die `description` des Werkzeugs `Jira-Tickets` verlangt deshalb jetzt ausdrücklich einen frischen Aufruf bei jeder Vorgangsfrage und untersagt, eine frühere Auskunft **oder Rückfrage** aus dem Gedächtnis zu wiederholen.

Dieselbe Stelle war schon einmal der wirksame Hebel: Die Tool-Beschreibung setzt sich in diesem Agenten gegen den Systemprompt durch.

## Dokumentation auf der Leinwand

Acht Notizen entlang der acht Phasen, jede an der Nodegruppe, die sie beschreibt. Drei waren überholt und sind ersetzt: Phase 1 nannte einen manuellen Testpfad, den es nicht gibt — der Workflow hat genau einen Trigger; Phase 6 nannte `gpt-4o`; Phase 8 verwies auf eine JSON-Ausgabe des Testpfads.

Drei Verhaltensweisen standen in keiner Notiz und sind ergänzt: die Claim-Kette gegen Doppelverarbeitung, der Gesprächsspeicher samt seiner Rückwirkung auf den Agenten, und die Kostenbremse der Web-Recherche.

Jede fett ausgezeichnete Node-Referenz in den Notizen wird gegen die tatsächlichen Node-Namen geprüft. Aktuell ist keine Referenz ungültig.

### Subflows des Teams-Agenten

| Subflow | n8n-ID | Rolle |
|---|---|---|
| RWG Sub - Identity & Audience Resolver | `B2kmRuBHRbJx8HBI` | Rolle und `allowedAudiences` aus dem Graph-Profil |
| RWG Sub – Teams Image Read | `omHDN0g9Lusb6H87` | Bildinhalte aus Teams und SharePoint |
| RWG Sub - Wissenssuche | `GD256mxClPHHbngI` | semantische Suche, audience-gefiltert |
| RWG Sub - Jira Tickets | `HoCch7AkiSroyJBB` | Ticketfragen |

Mehr ruft der Agent nicht. Die übrigen `RWG Sub -`-Workflows in der Instanz stammen aus der früheren Router-Architektur, haben keine Ausführungen und sind Kandidaten für die Löschung.

## Abgelöste Subflows der früheren Architektur

Vor dem heutigen Aufbau lief das Routing über einen eigenen Agenten-Subflow. Acht Workflows stammen aus dieser Zeit. Sie werden von **keinem** produktiven Flow mehr aufgerufen und sind inzwischen **deaktiviert und in den Ordner `00_Idias` verschoben**.

Der Ordner führt damit zweierlei: Ideen und stillgelegte Flows. Wer dort aufräumt, kann nicht mehr vom Ordner auf den Charakter schließen — maßgeblich ist die Liste unten.

Sie hängen in zwei Gruppen zusammen:

- **Router-Gruppe:** `RWG Sub - Main Router Agent` (`gHwBx2q73WOCsyHW`) ruft `RAG Retrieve` (`VFTpbtQ9V51f05Zj`), `Jira Query (Count/Filter)` (`PFdhyj2vorEFInUP`) und `My Tickets Lookup` (`d1iTRIJRYOH98Q91`). Fällt der Router weg, fallen alle vier weg.
- **Bild-Gruppe:** `KB Image Resolve & Send` (`ye5IXGMkidEWIEyg`) ruft `Teams Image Send` (`mYdSt2SLjazK8zSk`).
- **Einzeln:** `Guardrail Classify` (`21Ak3KiXtnFPZi7S`) und `Jira Issue Create` (`SnD6H4tQfX2sGSZgTaJfs`).

Die Notiz im Router behauptet, er werde vom Teams-Agenten über einen Node `Call Router Agent` gerufen. **Diesen Node gibt es dort nicht** — der Agent arbeitet heute mit einem eigenen `AI Agent` und vier Werkzeugen.

### Belege und ihre Grenzen

Ein Verweis-Scan über 28 Workflows — alle produktiven RWG- und KAPA-Flows — findet keinen einzigen Aufruf von außerhalb dieser acht. Nicht geprüft sind die acht Workflows im Ordner `00_Idias`, die als Ideenablage gelten, sowie `RWG_Reporter_BC`, an dem der MCP-Zugriff abgeschaltet ist.

Das Kriterium „null Ausführungen" allein trägt nicht: Bei `RWG Monitor` und `RAG-Confluence-Ingest` steht `saveDataSuccessExecution: none`, dort werden erfolgreiche Läufe gar nicht erst gespeichert. Belastbar ist erst der Verweis-Scan.

**`Jira Issue Create` wird aufgehoben.** Er ist der fertige, ausführlich dokumentierte Baustein für die Ticketanlage aus Teams und nie verdrahtet worden. Die Ticketanlage ist **später geplant, aktuell aber nicht vorgesehen**.

Er darf deshalb deaktiviert, aber **nicht gelöscht oder archiviert** werden. Wer künftig aufräumt: Dieser eine ist kein Altbestand, sondern Vorrat.

### Zum Deaktivieren

Das `active`-Flag steuert nur eigene Trigger. Ein Subflow, der über *Execute Sub-workflow* gerufen wird, läuft auch inaktiv. Deaktivieren blendet also aus, sichert aber nichts ab — dafür wäre Archivieren der passende Schritt.

## Entschieden: Reranking über Cohere bleibt vorerst unangetastet

Der Subflow `RWG Sub - Wissenssuche` schickt im Node `Kandidaten reranken` die Trefferinhalte an `api.cohere.com` — Titel plus bis zu 2.000 Zeichen je Kandidat, bis zu 24 Kandidaten je Anfrage. Bei IT-Anfragen sind darunter `it_internal`-Inhalte; in Ticket-Chunks stecken Signaturblöcke mit Namen, Anschriften und Telefonnummern.

**Entscheidung: bleibt so.** Die datenschutzrechtliche Bewertung wird bewusst zurückgestellt, nicht übersehen. Wird sie aufgenommen, ist dieser Node der Ansatzpunkt.

## Nicht jedes Webhook-Ereignis ist eine Nachricht

Microsoft Graph schickt über denselben Webhook auch Lebenszyklus-Meldungen des Abos. Dann steht in `@odata.type` nicht `#Microsoft.Graph.chatMessage`, sondern etwa `#microsoft.graph.subscription` — und es gibt weder Chat- noch Nachrichten-ID. Am 02.09. riss das den Lauf `113483` mit `URL parameter cannot be empty`; davor hatte `Claim Message` bereits einen Datensatz mit der **Abo-ID** angelegt.

`Ist es eine Chatnachricht?` sitzt deshalb **vor** `Claim Message` und nicht hinter `Extract IDs`, wo `hasIds` schon richtig auf `false` stand: An der früheren Stelle fällt auch der Pseudo-Eintrag weg.

```
String($json['@odata.type'] || '').toLowerCase().endsWith('chatmessage')
```

**Positiv geprüft, nicht negativ** — Graph kennt weitere Lifecycle-Typen als nur `subscription`. Das `toLowerCase()` ist notwendig, weil Graph die beiden Fälle unterschiedlich schreibt: `#Microsoft.Graph.chatMessage` gegen `#microsoft.graph.subscription`.

Belegt an beiden echten Nutzlasten: Lauf `113871` (Abo-Ereignis) endet bei `Kein Chat-Ereignis`, ohne dass `Claim Message` überhaupt läuft; Lauf `113872` (echte Nachricht) geht durch die Weiche und wird erst vom Duplikatschutz gestoppt. Der zweite Test nutzt bewusst eine bereits beanspruchte Nachricht — anders ließe sich der Durchlass nicht prüfen, ohne einem Anwender wirklich zu schreiben.

In `agent_requests` stehen **3 Alteinträge** mit einer Abo-ID statt einer Nachrichten-ID (unter 808 Zeilen, seit dem 15.07.). Sie sind wirkungslos: Zu ihnen gehört keine Nachricht, und der Duplikatschutz greift nur auf die eigene ID.

## Offene Punkte

**Begrüßungsantwort läuft auf `gpt-4o-mini`.** Der Node `Greeting Reply` nutzt ein eigenes, altes Modell mit `temperature 0.6`. Das ist kein Fehler — gpt-4o-mini akzeptiert den Parameter — aber eine Modellgeneration hinter dem Agenten. Ein Wechsel wäre eine Verhaltensänderung und keine Bereinigung; deshalb offen.

**Zulässigkeitsprüfung (T07) terminiert.** Der Test mit einem Konto außerhalb der drei gelisteten IT-Abteilungen ist für den kommenden Monat geplant. Die IT-Vergleichswerte liegen im Laufprotokoll: Läufe `109674` (IF-BC-BST-021) und `109678` (SSD-9083). Taucht davon beim Fachbereich Inhalt auf, ist der Test durchgefallen.

**Zuständigkeitsfragen sind nicht stabil.** Auf „wer kümmert sich um X" kommen mal Rollen, mal Namen — bei identischem Prompt und Modell. Die vorbereitete Prompt-Ergänzung in `prompt-ergaenzung-identitaet.md` schreibt die Kontaktübersicht bei Personenfragen verbindlich vor. Noch nicht eingespielt.

**Eigene Antworten lösen den Trigger erneut aus.** Nach jeder Antwort startet ein zweiter Lauf von unter einer Sekunde, der über den Filter verworfen wird. Funktional harmlos, verdoppelt aber Triggerlast und Ausführungsliste.

**Anleitungen werden gekürzt.** Bei mehrstufigen Anleitungen bricht die Antwort nach den Kernschritten ab und verweist auf die verlinkte Doku. Vertretbar, solange der Link mitkommt — bei der ODBC-Anleitung fehlte anfangs die Umstellung der Standarddatenbank, was die Doku selbst als Stolperstelle führt.
