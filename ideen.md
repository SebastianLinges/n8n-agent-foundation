# Ideen

Vorhaben, die noch keine Aufgabe sind. Hier steht, was den Gedanken wertvoll macht und was zu klären wäre, bevor daraus Arbeit wird. Was hier zur Aufgabe reift, wandert nach [offene-punkte.md](offene-punkte.md) und verschwindet an dieser Stelle.

## KAPA-Blogbeitrag aus dem Content-Bestand

Das Content Studio erzeugt dreimal pro Woche einen LinkedIn-Beitrag. Diese Texte sind kurz und für den Feed gebaut. Ein Blogbeitrag auf der KAPA-Seite hätte einen anderen Zweck: Suchmaschinen, längere Verweildauer, ein Ziel für den Link im LinkedIn-Beitrag.

Reizvoll daran ist, dass die Vorarbeit bereits geleistet wird — Recherche, Use Case, Fachbegriffe. Der Beitrag müsste nicht neu erhoben, sondern nur anders ausgeschrieben werden.

Zu klären: Wohin veröffentlicht wird und über welche Schnittstelle. Ob monatlich ein längerer Text aus mehreren Beiträgen entsteht oder je Beitrag eine lange Fassung. Und wer redigiert — die Prüfung im Content Studio ist auf Feed-Texte zugeschnitten, für einen Blogbeitrag greifen ihre Regeln nur teilweise.

## Post-Idee per Telegram in die Marketinganalyse

Ein Einfall unterwegs geht heute verloren oder landet in einer Notiz, die niemand wieder aufmacht. Eine Telegram-Nachricht an den Bot könnte stattdessen direkt in `content_ideas` laufen — mit Vorrang vor dem, was der Business Scout automatisch sammelt.

Der Reiz liegt im Vorrang: Der Scout liefert Themen, die überall stehen. Eine Idee aus einem Kundengespräch trägt weiter als der fünfte Beitrag über den EU AI Act.

Zu klären: Ob der Bot zurückfragt, wenn die Idee zu dünn für einen Beitrag ist — Zielgruppe, benannter Arbeitsschritt, Problem. Genau die Felder, an denen der Redaktions-Check später hart prüft. Eine Rückfrage im Moment der Idee ist billiger als eine Ablehnung drei Tage später.

Zugang ausschließlich für die Geschäftsführung von KAPA Digital. Der Bot schreibt in die Marketingdatenbank, das ist keine offene Tür.

## Kammern als Themenquelle statt angelsaechsischer Tech-Presse

Aufgekommen am 04.09.2026. Zielt auf die Ursache der Handwerk-Luecke, nicht auf das Symptom.

**Das Problem:** `KI Daily - Collect` zieht aus GitHub, Tavily und Hacker News. Daraus entsteht angelsaechsische Tech-Presse. 14 von 22 Ausloesern waren Herstellermeldungen, und die Saeule `handwerk` stand deshalb auf null. Von Hand nachgelegte Use-Cases beheben das fuer ein paar Wochen, nicht dauerhaft.

**Die Idee:** Handwerkskammern, IHKs und die Mittelstand-Digital-Zentren als Quelle. Die veroeffentlichen genau das, was der Ankerfilter sucht - deutschsprachige Beschreibungen konkreter Arbeitsschritte in kleinen Betrieben - und sie veroeffentlichen **belegte Zahlen** aus eigenen Umfragen. Genau die fehlen dem COPY-Prompt heute, der ohne Beleg keine Mengenangabe schreiben darf.

**Warum das technisch klein sein duerfte:** Tavily haengt bereits in WF-1 und kennt einen Domainfilter; die CRM-Anreicherung nutzt ihn schon fuer linkedin.com. Eine zweite Tavily-Abfrage mit einer Liste von Kammer- und Zentrendomains waere kein neuer Flow, sondern ein Knoten mehr. **Vor dem Bau zu pruefen:** was WF-1 heute genau abfragt, ob die Domains ergiebig sind, und ob die Trefferqualitaet den Ankerfilter tatsaechlich besteht.

**Was ausdruecklich NICHT automatisiert werden sollte:** das Kommentieren unter fremden Beitraegen. Ein Firmenkonto, das automatisch unter Kammerbeitraegen kommentiert, ist ein Reputationsrisiko und widerspricht der eigenen Redaktionslogik - der ganze Aufwand mit Ankern, Belegpflicht und Mengenwoertern existiert, weil eine Maschine unter dem Firmennamen leicht Unsinn schreibt. Unter einem fremden Beitrag faellt das direkt auf den Absender zurueck.

**Sinnvoll dagegen:** Kammerinhalte als Eingang fuer eigene Beitraege, mit Quellenangabe. Und eine gepflegte Liste relevanter Kammer- und Zentrenkonten, unter denen sich das Mitreden lohnt - das bleibt Handarbeit und Beziehungsarbeit.

## E-Rechnung vor der Buchung prüfen

Aufgekommen am 10.09.2026.

**Die Idee:** Rechnung aus dem Posteingang holen, gegen die Regeln prüfen, Ergebnis an die Buchhaltung, bei Fehlern Rückmeldung an den Absender. Der Nutzen ist beim Eingang größer als beim Ausgang: Seit 2025 müssen Unternehmen E-Rechnungen empfangen können, und ein fehlerhafter Beleg kostet dort eine Rückfrage. Alternativ beim Ausgang vor dem Versand.

**Möglicher Anbieter:** [ZUGFeRD-Validator](https://zugferd-validator.de/). Laut Anbieterseite, abgerufen am 10.09.2026, nicht selbst geprüft:

| Punkt | Angabe |
| --- | --- |
| Formate | ZUGFeRD 2.x (alle Profile), Factur-X, XRechnung (UBL und CII) |
| Regeln | EN 16931 und die deutschen Geschäftsregeln BR-DE |
| API | REST, Schlüssel im Header `X-Api-Key`; Endpunkte u. a. `validate_invoice`, `extract_xml`, `check_consistency` (sichtbares PDF gegen XML), `create_invoice`, `validation_report` |
| Antwort | JSON mit Regel-ID, betroffenem Feld, Zeile und Korrekturvorschlag; rund 2 s je Prüfung |
| Kosten | kostenlos 20 Prüfungen/Woche; 19 €/Monat für 500/Woche mit API (60 Aufrufe/Std.); 69 €/Monat unbegrenzt (300 Aufrufe/Std.); jährliche Abrechnung |
| Datenschutz | Server in Nürnberg; Dateien bleiben laut Anbieter nur im Arbeitsspeicher und werden nicht gespeichert |
| Prüfkern | Mustang und KoSIT-Validator; dazu eine MCP-Anbindung für KI-Agenten |

**Es geht auch ohne Dritten.** Beide Prüfwerkzeuge sind Open Source: Der KoSIT-Validator ist das amtliche Prüfwerkzeug für die XRechnung, Mustang prüft und liest ZUGFeRD. Selbst betrieben macht das mehr Aufwand beim Einrichten, dafür bleiben die Rechnungen im Haus und es gibt kein Kontingent.

**Zu klären vor einem Start:** Rechnungen enthalten Namen, Adressen, Beträge und Bankdaten. Beim Anbieter verlassen sie das Haus - dafür braucht es eine Freigabe von Datenschutz und IT und einen Auftragsverarbeitungsvertrag, auch wenn der Anbieter nichts speichert. Außerdem offen: ob das Vorhaben RWG oder KAPA Digital betrifft, und damit welcher Posteingang und welche Buchhaltung gemeint sind.
