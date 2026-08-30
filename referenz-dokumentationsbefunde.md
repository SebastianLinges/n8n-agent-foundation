# Dokumentationsbefunde aus dem Doku-Waechter

Ein Vorhaben vom 13. bis 16.08.2026 hat Jira gegen Confluence auf widerspruechliche
Dokumentation abgeglichen und seine Ergebnisse in `documentation_findings` und
`documentation_review_state` abgelegt. Kein Flow der Instanz schreibt seither dort
hinein; die Tabellen sind entfernt. **Die Befunde selbst sind fachlich weiter gueltig**
und stehen deshalb hier.

Jeder Punkt ist eine konkrete Korrektur an einer Confluence-Seite oder einem
Jira-Vorgang. Keiner davon ist erledigt.

## Hohe Prioritaet

### SMTP bei IBM Planning Analytics steht faelschlich auf offen
[APP HB - IBM Planning Analytics (TM1) / OLAP](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/292356297/APP+HB+-+IBM+Planning+Analytics+TM1+OLAP) fuehrt SMTP als IN PRUEFUNG.
Belegt ist das Gegenteil: Laut [SSD-8454](https://rwg-r.atlassian.net/browse/SSD-8454) versendet der tm1db am 14.08. erfolgreich ueber das ITB Mail Relay, die Testmail kam an, das Ticket ist geschlossen.
**Zu tun:** SMTP-Status auf getestet setzen, den offenen Punkt in Abschnitt 8.2 als erledigt kennzeichnen.

### Backup- und Monitoring-Stand von TM1 fehlt in der Plattformuebersicht
[OPS HB - Plattform-Owner, Backup, Monitoring](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/331120657/OPS+HB+-+Plattform-Owner+Backup+Monitoring+und+Betriebsstatus+je+Anwendung) fuehrt IBM Analytics bei Backup und Monitoring weiter als offen.
Belegt in [SSD-8689](https://rwg-r.atlassian.net/browse/SSD-8689): taegliche Azure-VM-Backups fuer az10754tm1db und az10754tm1fe, PRTG-Sensorik bestaetigt, Restore-Test am 13.08. erfolgreich.
**Zu tun:** Zeile aktualisieren, Referenzen setzen, offene Punkte nur fuer wirklich ungeklaerte Owner/RPO/RTO belassen.

### Notfallplan ist ohne Kontaktliste nicht einsatzbereit
Der [IT-Notfall- und Massnahmenplan](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/436338733/IT-Notfall-+und+Ma+nahmenplan) verlangt eine offline verfuegbare Kontaktliste - Geschaeftsfuehrung, IT-Leitung, Vertretung, Informationssicherheit, Datenschutz, Azure/M365, Netzwerk, Backup, BC, Standortleitungen, Dienstleister. **Saemtliche Felder stehen auf "einzutragen".**
Die [Kontakte-Seite](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/284524545/Kontakte+Zust+ndigkeiten+IT) existiert, deckt die geforderten Mobil- und Ersatzkontakte aber nicht ab.
**Zu tun:** Liste aus dem zentralen Pflegeort ableiten, fehlende Kontakte ergaenzen, einen geschuetzten Offline-Export definieren. Keine Nummern doppelt pflegen.

### Sicherheitsgruppen-Liste widerspricht sich selbst
[SEC HB - Liste Sicherheitsgruppen](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/304742416/SEC+HB+-+Liste+Sicherheitsgruppen) bezeichnet sich als vollstaendige Liste aller Gruppen aus AD und Entra ID und als Grundlage fuer Audit und Rezertifizierung. Abschnitt 8 enthaelt aber ausdruecklich nur einen Auszug und verweist die vollstaendige Liste auf eine erst noch zu pflegende Tabelle.
**Zu tun:** Entweder das vollstaendige Register bereitstellen oder die Vollstaendigkeitsbehauptung streichen und den verbindlichen Ablageort verlinken.

### Kassenarbeitsplaetze - drei zusammenhaengende Befunde
Der Betriebsstand hat sich auf lokalen Betrieb ueber Intune verschoben, drei Stellen tragen noch die AVD-Welt:

- **[OPS-410](https://rwg-r.atlassian.net/browse/OPS-410)** ist offen, obwohl am 13.08. bestaetigt wurde, dass die Konfiguration fuer alle Kassen und Theken einheitlich ist und lokal performanter laeuft. *Vor Abschluss kurz bestaetigen, nicht automatisch schliessen.*
- **Confluence-Seite 279937873** beschreibt den Signopad-Prozess weiterhin ueber AVD als aktuellen Zustand. *Als LEGACY kennzeichnen.*
- **OPS-402** nennt als Ziel eine BC-App auf festen Kassen-AVD-Servern; OPS-404 legt inzwischen die BC App als Standard fest, Theken bleiben im Browser. *Zielstellung neu bewerten.*

## Mittlere Prioritaet

### d.velop sign - alter Hinweis widerspricht der Anbieterantwort
Auf [APP HB d.velop sign](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/433618953/APP+HB+d.velop+sign) steht im Funktionsabschnitt noch, es muesse bestaetigt werden, ob sign-me/Bundesdruckerei genutzt wird. Weiter unten auf derselben Seite ist die GWS-Antwort bereits eindeutig: sign-me wird nicht genutzt, vorgesehen sind Swisscom und D-Trust.
**Zu tun:** Den offenen Satz ersetzen.

### Scanner-Seite mit Platzhaltern und fremdem Templateblock
[Dokumentenscanner - Aufbau & Belegscanner](https://rwg-r.atlassian.net/wiki/spaces/DokuHub/pages/277643298/Dokumentenscanner+Aufbau+Belegscanner) enthaelt den Platzhalter "Ziel dieser Anleitung - hier eintragen" und ein nahezu leeres Kapitel 13 zu Triumph-Adler-Druckern. Fuer Drucker gibt es eigene Seiten.
**Zu tun:** Zielbeschreibung vervollstaendigen, den leeren Druckerblock entfernen. Keine leeren Kapitel als scheinbare Betriebsdokumentation stehen lassen.

### Browser-Security fuer Kassen und Theken - Status vermutlich veraltet
Confluence-Seite 343277569 fuehrt den Deployment-Status als Testgruppe mit ausstehender Freigabe. Der Stand aus OPS-410 beschreibt Kassen und Theken bereits mit Download Control und schaerferen Sperr-Richtlinien.
**Zu tun:** Intune-Zuweisungsstatus fuer RWG_KASSEN und RWG_THEKE pruefen, danach Status aktualisieren. *Als einziger Befund nur "wahrscheinlich", nicht belegt.*

---

## Was aus den anderen beiden Tabellen kam

`documentation_review_state` hielt den Pruefstand je Quelle: 17 Eintraege, davon 7 als
`deviation` (die Befunde oben), 6 als `clean` und 4 als `recheck`. Die `recheck`-Faelle
- OPS-567 Wipperfuerth, OPS-122 Sicherheitsgruppen, OPS-418 Swyx-Kuendigung,
OPS-142 Citrix-Reste - waren nur Statusnachfragen ohne belastbare Evidenz.

`agent_ticket_dialogs` hielt zwei Entwuerfe des Teams-Agenten vom 15.07.2026, beide zum
selben Outlook-Postausgang-Problem: einer wurde als SSD-8127 angelegt, einer abgebrochen.
Der heutige Teams-Agent nutzt dafuer `agent_jira_create_requests` und
`agent_conversation_memory`. Ohne fachlichen Wert.
