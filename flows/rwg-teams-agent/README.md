# RWG Teams Agent

Workflow `RWG Teams Agent` (`BWswB3XA8S2gMwoT`), aktiv, 47 Nodes, Microsoft-Teams-Trigger auf neue Chatnachrichten.

## Aufbau

Teams-spezifisch bis `Build Teams Context`: Duplikatschutz über `Claim Message`, Nachladen von Chat und Nachricht über Microsoft Graph, `Resolve Identity` für Identität und Sichtbarkeit, Lesebestätigung.

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

## Offene Punkte

**Zuständigkeitsfragen sind nicht stabil.** Auf „wer kümmert sich um X" kommen mal Rollen, mal Namen — bei identischem Prompt und Modell. Die vorbereitete Prompt-Ergänzung in `prompt-ergaenzung-identitaet.md` schreibt die Kontaktübersicht bei Personenfragen verbindlich vor. Noch nicht eingespielt.

**Eigene Antworten lösen den Trigger erneut aus.** Nach jeder Antwort startet ein zweiter Lauf von unter einer Sekunde, der über den Filter verworfen wird. Funktional harmlos, verdoppelt aber Triggerlast und Ausführungsliste.

**Anleitungen werden gekürzt.** Bei mehrstufigen Anleitungen bricht die Antwort nach den Kernschritten ab und verweist auf die verlinkte Doku. Vertretbar, solange der Link mitkommt — bei der ODBC-Anleitung fehlte anfangs die Umstellung der Standarddatenbank, was die Doku selbst als Stolperstelle führt.
