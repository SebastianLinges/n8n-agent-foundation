# RWG Monitor - Microsoft Graph & Teams

Workflow `RWG Monitor - Microsoft Graph & Teams` (`1OcqfC4wTC9bj0wK`), aktiv, alle 15 Minuten. Prüft das Konto `rwg_automate@rwg-r.de`, mit dem der Teams-Agent liest und antwortet, und hält das Graph-Abo des Agenten am Leben. Schlägt eine Prüfung fehl, löst er einen Workflow-Fehler aus; `Telegram_Error_Info` meldet ihn.

## Aufbau

```
Schedule Trigger -> Config -> Check Graph Profile -> Check Teams Chats
  -> Abos abrufen -> Agent-Abo waehlen -> Abo bald faellig?
       ja:   Abo verlaengern -> Evaluate Healthcheck
       nein: ----------------> Evaluate Healthcheck
  -> IF Healthy -> Healthcheck OK
               -> Build Failure Details -> Trigger Healthcheck Alert
```

| Prüfung | Aufruf | rot, wenn |
|---|---|---|
| Anmeldung | `GET /me` | kein 2xx oder keine `id` |
| Teams-Zugriff | `GET /me/chats?$top=1` | kein 2xx, zum Beispiel 403 bei fehlender Lizenz |
| Abo des Agenten | `GET /subscriptions` | Liste nicht lesbar, **kein Abo zur Webhook-Adresse des Agenten**, oder die Verlängerung scheitert |

Alle Graph-Aufrufe laufen über den einzigen Teams-Zugang der Instanz, `Microsoft Teams account: RWG Automate`. Denselben nutzt der Trigger des Agenten. Das ist die Voraussetzung dafür, dass der Monitor dessen Abo überhaupt sieht: `GET /subscriptions` liefert nur die Abos, die dieselbe App für dasselbe Konto angelegt hat.

## Das Abo des Teams-Agenten

**Der Teams-Trigger empfängt nur, solange sein Graph-Abo lebt, und n8n verlängert es nie.** n8n legt das Abo beim Aktivieren des Flows an, mit einer Laufzeit von 4.318 Minuten (`utils-trigger.ts` im n8n-Quellcode). Danach schickt Graph nichts mehr. Es entsteht kein Fehler, keine Ausführung, kein Alarm; der Agent schweigt einfach.

Belegt an zwei Ausfällen (Ortszeit):

| Ausfall | Ursache | wieder da durch |
|---|---|---|
| 05.09. nachmittags bis 08.09. mittags | Abo aus dem Publizieren vom 02.09. abgelaufen. Keine einzige Ausführung, auch am Montag nicht | Umzug auf `n8n.kapa-digital.de` am 08.09., neue Webhook-Adresse |
| 11.09. ab etwa 12:30 bis 13:07 | Abo aus dem Umzug abgelaufen | Publizieren des Agenten um 13:06. Das neue Abo `b6e14054` wurde laut Ablaufzeit um 11:06:27 UTC angelegt |

Graph kündigt das Ende mit einer Lebenszyklus-Meldung an denselben Webhook an. Der Trigger reicht davon aber nur die Abo-ID weiter, nicht die Art der Meldung, und `Ist es eine Chatnachricht?` sortiert sie aus. Microsoft rät ohnehin davon ab, sich allein auf diese Meldungen zu verlassen.

**Was der Monitor tut:**

1. `Agent-Abo waehlen` sucht unter allen Abos des Kontos das, dessen `notificationUrl` die webhookId des Triggers enthält (`agentWebhookId` in `Config`). Gibt es mehrere, gewinnt das mit dem spätesten Ablauf.
2. Hat es weniger als `aboVerlaengernUnterStunden` (48) Stunden Rest, setzt `Abo verlaengern` den Ablauf per `PATCH` auf jetzt plus `aboLaufzeitStunden` (70). Das geschieht also etwa einmal am Tag. Der `PATCH` erneuert zugleich die Berechtigung des Abos.
3. Fehlt das Abo oder scheitert die Verlängerung, wird der Healthcheck rot.

## Entscheidungen

**Im Monitor, nicht im Agenten.** Der Monitor läuft ohnehin alle 15 Minuten mit demselben Konto und hat einen Alarmweg. Im Agenten wäre die Verlängerung an die Lebenszyklus-Meldungen gebunden, und deren Takt sagt Microsoft nicht zu.

**Ein fehlendes Abo legt der Monitor nicht neu an.** Der Trigger prüft bei jeder eingehenden Meldung das `clientState`-Geheimnis, das nur in seinen eigenen statischen Daten liegt. Ein von außen angelegtes Abo hätte ein anderes, und n8n würde die Meldungen verwerfen. Neu anlegen kann es nur der Trigger selbst, also **RWG Teams Agent neu publizieren**. Genau das nennt die Alarmmeldung als Abhilfe.

**Graph kürzt ein Abo nicht.** Ein `PATCH` mit einem Ablauf vor dem bisherigen kam in Lauf 120386 mit 200 zurück, ließ den Ablauf aber stehen. Für den Betrieb spielt das keine Rolle: Verlängert wird erst unter 48 Stunden Rest, das Ziel von 70 Stunden liegt immer später.

**Der Grund steht direkt unter der Kopfzeile.** `Telegram_Error_Info` kürzt die Meldung auf 300 Zeichen. Früher kam der Grund als letzte Zeile und fiel bei langen Fehlertexten weg.

## Belege

| Lauf | Was | Ergebnis |
|---|---|---|
| 120385 | echter Lauf, Abo mit rund 70 Stunden Rest | grün, keine Verlängerung |
| 120386 | Schwelle über gepinnte `Config` auf 100 Stunden, Ziel 71 Stunden | `PATCH` 200, Ablauf unverändert (Graph kürzt nicht) |
| 120387 | dasselbe mit Ziel 71,9 Stunden | Ablauf von 11:04:27 auf 11:23:23 UTC am 14.09. verlängert |
| 120388 | gepinnte leere Abo-Liste | rot, „Kein Graph-Abo für den Teams-Agenten“ |
| 120390 | gepinnte Verlängerung mit 403 | rot, „Abo-Verlängerung fehlgeschlagen: HTTP 403“ |

## Offen

- **Die erste Verlängerung im Betrieb.** Das Abo läuft am 14.09. um 11:23 UTC ab und fällt am **12.09. um 13:23 Ortszeit** unter 48 Stunden; verlängern sollte der Lauf um 13:30. Erfolgreiche Läufe werden nicht gespeichert (`saveDataSuccessExecution: none`). Nachsehen lässt sich das deshalb nur über einen Handlauf: `aboAblauf` an `Evaluate Healthcheck` muss danach etwa beim 15.09. stehen.
- **Die webhookId steht fest in `Config`.** Wird der Trigger im Agenten ersetzt statt nur neu publiziert, bekommt er eine neue webhookId. Der Monitor meldet dann „kein Abo“, obwohl eines da ist, und `agentWebhookId` muss nachgezogen werden.
- **Keine Seitenabfrage bei `GET /subscriptions`.** Das Konto hat heute genau ein Abo. Erst ab sehr vielen Abos würde Graph eine zweite Seite liefern.
