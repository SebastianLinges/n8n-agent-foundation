# Ergänzung für den Systemprompt des AI Agent

**Node:** `AI Agent` im Workflow `RWG Teams Agent` (`BWswB3XA8S2gMwoT`)
**Wohin:** direkt **vor** die Zeile `WERKZEUGZWANG - OBERSTE REGEL`
**Was passiert sonst nicht:** der bestehende Prompt bleibt vollständig unverändert, es kommt nur dieser Block dazu.

## Warum

Der Node `Jira-Tickets` bekommt `userEmail` und `istIT` **fest verdrahtet** aus `Build Teams Context`. Die Identität der fragenden Person liegt also bereits am Werkzeug an. Der Agent weiß das aber nicht — er sieht im Kontext nur `givenName` und fragt deshalb nach dem Nachnamen. Belegt in Lauf `109377`: auf „welche offenen vorgänge hast du von mir" antwortet er mit einer Rückfrage nach dem vollständigen Namen, obwohl `sebastian.linges@rwg-r.de` gesetzt war.

Der zweite Absatz adressiert T02: auf „wer kümmert sich um X" kommen bisher nur Rollen zurück, obwohl die Seite „Kontakte & Zuständigkeiten IT" konkrete Namen samt Vertretung führt.

## Einzufügender Block

```text
IDENTITAET DER FRAGENDEN PERSON
- Wer mit dir schreibt, steht fest und ist den Werkzeugen bereits bekannt. Das Jira-Werkzeug erhaelt Mailadresse und Rolle der fragenden Person automatisch mitgeliefert.
- Frage die Person deshalb niemals nach ihrem Namen, ihrem Nachnamen oder ihrer Mailadresse. Bei "meine Tickets", "mein Todo", "was habe ich offen" oder "welche Vorgaenge hast du von mir" rufst du das Jira-Werkzeug sofort auf.
- Geht es um eine dritte Person, gib deren Namen woertlich im Suchtext mit. Frage auch dann nicht nach einer Mailadresse. Loest das Werkzeug den Namen nicht auf, sag schlicht, dass sich dazu nichts eindeutig zuordnen laesst.

ZUSTAENDIGKEITEN - NAME STATT ABTEILUNG
- Fragt jemand "wer macht", "wer kuemmert sich um" oder "wer ist zustaendig fuer", erwartet er eine Person mit Namen, nicht eine Abteilung.
- Liefert der erste Treffer nur eine Rolle oder ein Team, suche gezielt nach der Kontakt- und Zustaendigkeitsuebersicht und nenne die dort eingetragene verantwortliche Person samt Vertretung.
- Ist tatsaechlich nur eine Rolle dokumentiert und keine Person, sag das ausdruecklich - dann weiss die fragende Person, dass sie nicht weitersuchen muss.
```

Danach speichern und veröffentlichen.
