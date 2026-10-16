# TrummCards Cloud 1.0 – kontrollierter Praxistest

**Stand:** 16.10.2026 – Windows und Handy-Anmeldung/Bedienoberfläche vom Eigentümer bestätigt. Freigabe ausstehend. Die **schreibgeschützte Windows-Vorschau 0.9.0** wurde vom Eigentümer als funktionierend gemeldet. Die **ebenfalls schreibgeschützte PWA-Vorschau 0.9.0** liegt bereits unter `gh-pages/production/`; eine direkte HTTPS-Erreichbarkeitsprüfung war von dieser Umgebung aus nicht möglich. Kein Release 1.0.0, keine TEST-Umschaltung und keine Echtbuchungen.

## A. Windows-Preview testen (echter Benutzer, keine Buchungen)
1. GitHub Actions: https://github.com/trummcardsgit/trummcards-updates/actions/runs/38933990190
2. Unter **Artifacts** das Paket **TrummCards-Cloud-PROD-RC-0.9.0-NO-RELEASE** herunterladen, ZIP entpacken, darin `TrummCards-Cloud-Setup-0.9.0.exe` starten.
3. Nicht die bestehende **TrummCards Lagerverwaltung 1.6.1** deinstallieren oder ersetzen. TrummCards Cloud besitzt eine eigene App-ID und eigene Benutzerdaten.
4. Prüfen, ob „TrummCards Cloud – PRODUKTIONSVORSCHAU“ erscheint. Im Bereich **Programm-Updates** muss 0.9.0 angezeigt werden, Updater vor Release noch gesperrt.
5. Mit dem **bereits angelegten TrummCards Production-Benutzerkonto** anmelden; Passwort niemals im Chat oder in GitHub-Issues posten.
6. Prüfen: Lager-Übersicht = 0 Produkte / 0 Stück / 0 Verkäufe. Synchronisieren. Wechsel zwischen Lager, Einkauf, Verkauf, Bildern und Updates.
7. Versuchen, das **leere** Artikel- oder Einkaufsformular abzusenden; die Anwendung muss vor jeder Geschäftsoperation mit einem Hinweis auf die gesperrte Vorschau stoppen. **Keine echten Karten-/Verkaufsdaten eingeben.**
8. Abmelden, App schließen und neu öffnen. Sie darf niemals auf TEST zurückfallen.
9. Im Problemfall nur Fehlermeldung/Foto ohne E-Mail-Adressen, Passwörter, Access-Tokens oder Kundendaten melden.

**Signatur/SmartScreen:** Das interne Windows-Testartefakt kann unsigniert sein. Bei einer Sicherheitswarnung nicht pauschal Schutzmechanismen abschalten. Den Installer nur verwenden, wenn Herausgeber und Quelle eindeutig geprüft sind.

## B. Mobile-PWA – jetzt mit der vorhandenen Produktionsvorschau prüfen
Die Dateien für die schreibgeschützte Version 0.9.0 sind bereits auf GitHub Pages im Ordner `gh-pages/production/` vorhanden. Der dortige Code hat **`WRITES_ENABLED=false`**, verwendet die neue PROD-Ref `hgdexyvtgfffcasfpjyu` und keinen TEST-Datenbankverweis. Der separate Pfad ist **keine separate Web-Origin**, die PWA verwendet aber eigene Session-/Cache-Namen und einen auf `./` begrenzten Service-Worker-Scope.

**Testadresse:** https://trummcardsgit.github.io/trummcards-updates/production/

1. Die URL direkt am iPhone (Safari) oder Android (Chrome) öffnen. Bei **404**, Zertifikatswarnung, fehlender Darstellung oder Weiterleitung an die TEST-Startseite zuerst hier abbrechen und melden.
2. In der Kopfzeile **CLOUD PRODUCTION / PRODUKTIONSVORSCHAU 0.9.0** prüfen. Keine Daten eingeben, bevor diese Kennzeichnung korrekt ist.
3. Mit dem **bereits in Supabase Production angelegten** persönlichen Konto anmelden; niemals Passwörter, JWTs, Cookies oder Screenshots mit diesen Daten veröffentlichen.
4. Prüfen: `0` Artikel, `0` lagernde Stück, `0,00 €` Lagerwert, `0,00 €` Gewinn; Seitenwechsel zwischen Lager, Einkauf, Verkauf, Bilder und Einstellungen; Synchronisieren.
5. Die Eingabefelder für Kauf und Verkauf ansehen; kein Speichern, keine Testartikel oder echten Bilder hochladen. Die Version 0.9.0 verweigert Geschäftsbuchungen absichtlich.
6. Abmelden, Seite neu öffnen und erneut anmelden. Bei Erfolg iPhone über Safari **Teilen → Zum Home-Bildschirm**, Android über Chrome **Menü → App installieren** oder **Zum Startbildschirm hinzufügen**.
7. Passwort-Reset separat und erst nach Prüfung der Supabase **Authentication → URL Configuration → Redirect URLs** testen; Ziel muss ausschließlich auf die Produktions-PWA und niemals auf die TEST-Startseite zeigen.

**Abnahme:** Die mobile Vorschau ist nur ein Login-/Darstellungs-/Caching-Test. Synchronisierung mit echten neu gebuchten Artikeln, Bildvorschau, FIFO-Verkauf, Storno und Wiederherstellung mit Daten bleiben für den isolierten synthetischen End-to-End-Test bzw. nach Freigabe offen.


## B.1 Ausdrücklicher Releasewunsch vom 16.10.2026
Eigentümer: **„ich möchte aber jetzt die 1.0 veröffentlichen und damit arbeiten“**. Damit liegt die Zustimmung zur erstmaligen Veröffentlichung von Version 1.0.0 und zum Produktivbetrieb vor.

**Einmaliger Erst-Release vor dem geplanten Backup:** Das echte manuelle verschlüsselte Backup #38931448375 ist erfolgreich geprüft und vom Eigentümer zusätzlich lokal gesichert worden. Der geplante Sicherungslauf um 02:17 UTC war zum Zeitpunkt der Freigabe noch nicht fällig. Der Release-Workflow erlaubt deshalb einen **bewusst manuell angekreuzten Einmal-Ausnahmewert** nur, wenn noch kein geplanter Backup-Lauf existiert UND noch kein Cloud-Updater `cloud-updates/latest.yml` veröffentlicht ist. Das ist kein Ersatz für die tägliche Sicherung. Ein fehlgeschlagener geplanter Backup-Lauf darf damit **nicht** übergangen werden.

**Konkrete Durchführung, sobald das Release-PR auf main zusammengeführt ist:**
1. Repository Settings → Secrets and variables → Actions → **Variables**: `TRUMMCARDS_PRODUCTION_APPROVED` auf `true` setzen; bereits bestätigte `TRUMMCARDS_BACKUP_ACTIVE=true`, `TRUMMCARDS_RESTORE_VERIFIED=true` beibehalten.
2. GitHub Actions → **TrummCards Cloud 1.0 – CONTROLLED Release (disabled until approvals)** → **Run workflow**, Branch `main`; beim **ERSTEN** Release die Option **„Nur fuer ERST-Release: heute starten, bevor die erste taegliche Sicherung gelaufen ist?“** aktivieren.
3. Nur nach **grünem** Release-Workflow mit veröffentlichtem Manifest `https://trummcardsgit.github.io/trummcards-updates/cloud-updates/latest.yml` Windows 1.0.0 aus dem separaten Cloud-Updateordner installieren; der Installer 0.9.0 ist NICHT updatefähig und muss manuell auf 1.0.0 aktualisiert werden.
4. Mobile PWA `https://trummcardsgit.github.io/trummcards-updates/production/` nach frischem Laden kontrollieren (Version 1.0.0). **TEST-Root bleibt unverändert.**
5. Erst dann mit dem neuen, weiterhin leeren PROD-Lager arbeiten: einen kontrollierten echten ersten Artikel und ein gültiges JPEG/PNG hochladen, Thumbnail und Vergrößerung auf beiden Geräten prüfen, anschließend Einkauf, Verkauf und Bestandssync nachvollziehen. Fehlbuchungen durch Storno korrigieren.
6. Am nächsten Tag den automatischen Backup-Lauf **und seine verschlüsselte Sicherungsdatei** überprüfen. Backups lokal regelmäßig sichern. Probleme sofort beheben, bevor umfangreiche Daten eingetragen werden.

**Restrisiken bei früher Freigabe:** kein nachgewiesener Live-Bild-Upload, noch kein veröffentlichter automatischer Updatewechsel und keine erfolgreich beobachtete *automatisch geplante* Sicherung. Benutzer entscheidet über den vorzeitigen Start. GitHub Actions führt keine Veröffentlichung aus, bevor die drei Repo-Variablen und der manuelle Workflow-Start erfolgt sind.

## C. Automatisch geprüfte Voraussetzungen
- Die neue Datenbank hat RLS auf 7 Tabellen, Besitzer-Guard und privaten Image-Bucket.
- Ein echtes verschlüsseltes Backup einer momentan leeren DB wurde erstellt, verifiziert und in temporäres PostgreSQL 17 zurückgespielt: https://github.com/trummcardsgit/trummcards-updates/actions/runs/38931448375
- Die Windows-1.0.0-Buildprobe läuft in einem isolierten GitHub-Runner ohne Veröffentlichung. Sie ist **nicht** der lokale User-Abnahmetest.
- Bei jedem PR-Lauf wird der **anonyme, ausschließlich lesende** Zugriff auf Supabase Production geprüft; keine Auth-Daten oder Business-Schreiboperationen.
- TEST und Windows 1.6.1 bleiben unangetastet.

## C.1 Backup-/Release-Flags (Repository Variables)
Vom Eigentümer am 16.10.2026 gemeldet:
- `TRUMMCARDS_BACKUP_ACTIVE=true` – angelegt, **geplanter Sicherungslauf noch nicht beobachtet**.
- `TRUMMCARDS_RESTORE_VERIFIED=true` – angelegt, lokaler automatisierter Restore eines echten leeren Backups und separater nichtleerer Testdaten bestanden.
- `TRUMMCARDS_PRODUCTION_APPROVED` – **nicht setzen**, bevor die finale Freigabe ausgesprochen und die offenen Prüfungen abgearbeitet sind.

Der GitHub-Connector kann Repository-Variablen nicht auslesen. Angaben zu den ersten beiden Variablen basieren auf Nutzerbestätigung; die Variable `TRUMMCARDS_PRODUCTION_APPROVED` ist nicht als bestätigt bekannt.

## D. Abschließendes Go/No-Go
- [x] Windows-Preview-Anmeldung laut Rückmeldung des Eigentümers erfolgreich (16.10.2026, „in der windows version hat alles geklappt“)
- [ ] Windows-Abmeldung, Neustart und schreibgeschützte Formularsperre einzeln protokolliert
- [x] Anonyme Requests gegen Production und fremde Auth-Identität im lokalen DB-E2E-Test ohne Zugriff (Sicherheitschecks)
- [ ] Reale zweite Supabase-Identität gegen Production noch nicht unabhängig getestet
- [x] Bestehende HTTPS-PWA unter `/production/`: Anmeldung und Darstellung am Handy vom Eigentümer am 16.10.2026 bestätigt ("es funktioniert soweit alles")
- [ ] Abmeldung und erneute Anmeldung, PWA-Installation auf dem Startbildschirm und Browser-/Cache-Neustart separat protokollieren
- [x] Supabase Production `Authentication → URL Configuration` laut Eigentümer am 16.10.2026 eingerichtet: Site URL `https://trummcardsgit.github.io/trummcards-updates/production/`; Redirect URL `https://trummcardsgit.github.io/trummcards-updates/production/reset-password.html`. **Direkte Dashboard-Auslesung über Connector nicht möglich.**
- [x] Passwort-Reset-**E-Mail-Versand** und Erreichbarkeit der verlinkten Seiten auf dem Produktivpfad vom Eigentümer am 16.10.2026 bestätigt ("ja die email kommt an und die seiten lassen sich öffnen"). Passwort wurde nicht verändert, Backup-Secret bleibt gültig.
- [ ] Passwort-Reset-Token tatsächlich angenommen und Passwort geändert/erneute Anmeldung erfolgreich: **bewusst nicht ausgeführt**, um laufende Backup-Anmeldedaten nicht zu stören; exakten Link-Zielpfad nach Rückmeldung noch nicht eigenständig verifiziert. Separates Origin-Konzept für endgültigen Betrieb bewertet
  - **Wichtig:** Wenn beim Test das Produktionspasswort geändert wird, danach das GitHub Actions Secret `TC_PROD_BACKUP_PASSWORD` mit dem neuen Passwort aktualisieren und eine neue **manuelle** erfolgreiche Sicherung prüfen. Sonst schlägt die tägliche Sicherung ab dem nächsten Lauf fehl. Passwörter und Secrets niemals ins Chatprotokoll schreiben.
- [x] Geschäftsbuchungen mit **fiktiven Daten in einer wegwerfbaren PostgreSQL-17-Datenbank**: 2 Einkäufe, FIFO-Verkauf (Einstand 55,00 €, Gewinn 38,00 €), Storno, Idempotenz, Bestandsgrenze und fremde Nutzerrechte bestanden (Run #38937164898)
- [x] Verschlüsselte Rücksicherung einer nichtleeren **synthetischen Daten- und Bilddatei** in isoliertes PostgreSQL erfolgreich
- [ ] Reale Geräteprüfung mit hochgeladenem **gültigem JPEG/PNG**, Anzeige/Vollbild sowie Cloud-Synchronisierung neuer Buchungen auf beiden Geräten – noch nicht durchgeführt
- [ ] Bildvorschauen auf Windows und Mobilgeräten sichtbar und vergrößerbar
- [ ] Feature-Parität (insbesondere Einkaufs-/Verkaufsbearbeitung, CSV-Import und Export) bestätigt oder bewusst eingeschränkt
- [x] Release-Workflow vorzeitigem Go-Live geschützt: erfolgreiches **automatisch per `schedule` ausgelöstes** Backup und gültiges verschlüsseltes Artefakt innerhalb von 72 Stunden sind zusätzlich zur aktuellen Sicherung erforderlich; manueller Lauf allein reicht nicht.
- [ ] `TRUMMCARDS_BACKUP_ACTIVE=true` laut Eigentümer eingerichtet; **erster geplanter Lauf** am 17.10.2026 gegen 04:17 Uhr MESZ (02:17 UTC) muss noch erfolgreich und mit gültigem verschlüsselten Artefakt bestätigt werden. Manuelle Sicherung allein reicht dafür nicht.
- [x] Zweite Kopie des verschlüsselten GitHub-Backups laut Eigentümer aufbewahrt (16.10.2026, „ich habe sie gespeichert“); separater, sicherer Aufbewahrungsort empfohlen
- [x] Wiederherstellung einer fiktiven Testdatei in PostgreSQL 17 und erstes leeres PROD-Backup geprüft
- [ ] Entschlüsselung und Wiederherstellung der **lokal gespeicherten** Archivkopie unabhängig getestet; Passphrase separat verwahren
- [ ] Windows-Installer-Integrität, Update-Manifest und Updates aus getrenntem Cloud-Kanal durch Praxisprobe bestätigt
- [ ] Unsignierter Installer/SmartScreen-Bewertung akzeptabel oder Code-Signing vor Verteilung eingerichtet
- [ ] Supabase Free-Tarif: Leaked-Password-Protection laut Dokumentation Pro+; einziges Konto mit starkem, einzigartigem Passwort/ggf. MFA geschützt
- [x] `TRUMMCARDS_RESTORE_VERIFIED=true` am 16.10.2026 laut Eigentümer als GitHub-Repository-Variable angelegt; GitHub-API-Verifizierung der Variablen nicht verfügbar
- [x] **Ausdrückliche Produktionsfreigabe des Eigentümers** am 16.10.2026 erteilt; frühe Erstauslieferung trotz noch ausstehender erster geplanter Sicherung gewünscht
- [ ] `TRUMMCARDS_PRODUCTION_APPROVED=true` vom Eigentümer im GitHub-Repository setzen und kontrollierten Release-Workflow manuell ausführen; Veröffentlichung selbst ist noch offen

**Installationshinweis:** Der bisherige Windows-Cloud-Preview-Installer 0.9.0 hat den Updater absichtlich deaktiviert. Der erste Wechsel auf 1.0.0 erfolgt daher durch eine **manuelle, getrennte Installation**; automatische Updates sollen erst ab 1.0.0 aus dem separaten `/cloud-updates/`-Feed funktionieren.

**Bis zur erfolgreichen Veröffentlichung** verbleiben beide Clients bei der schreibgeschützten 0.9.0-Version. Einmaliger Start vor dem ersten geplanten Backup nur mit ausdrücklicher Einwilligung und der im Workflow dokumentierten kontrollierten Ausnahme; alle anderen Freigabeprüfungen müssen erfolgreich sein.
