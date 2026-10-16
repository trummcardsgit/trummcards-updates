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


## C. Automatisch geprüfte Voraussetzungen
- Die neue Datenbank hat RLS auf 7 Tabellen, Besitzer-Guard und privaten Image-Bucket.
- Ein echtes verschlüsseltes Backup einer momentan leeren DB wurde erstellt, verifiziert und in temporäres PostgreSQL 17 zurückgespielt: https://github.com/trummcardsgit/trummcards-updates/actions/runs/38931448375
- Die Windows-1.0.0-Buildprobe läuft in einem isolierten GitHub-Runner ohne Veröffentlichung. Sie ist **nicht** der lokale User-Abnahmetest.
- Bei jedem PR-Lauf wird der **anonyme, ausschließlich lesende** Zugriff auf Supabase Production geprüft; keine Auth-Daten oder Business-Schreiboperationen.
- TEST und Windows 1.6.1 bleiben unangetastet.

## D. Abschließendes Go/No-Go
- [x] Windows-Preview-Anmeldung laut Rückmeldung des Eigentümers erfolgreich (16.10.2026, „in der windows version hat alles geklappt“)
- [ ] Windows-Abmeldung, Neustart und schreibgeschützte Formularsperre einzeln protokolliert
- [x] Anonyme Requests gegen Production und fremde Auth-Identität im lokalen DB-E2E-Test ohne Zugriff (Sicherheitschecks)
- [ ] Reale zweite Supabase-Identität gegen Production noch nicht unabhängig getestet
- [x] Bestehende HTTPS-PWA unter `/production/`: Anmeldung und Darstellung am Handy vom Eigentümer am 16.10.2026 bestätigt ("es funktioniert soweit alles")
- [ ] Abmeldung und erneute Anmeldung, PWA-Installation auf dem Startbildschirm und Browser-/Cache-Neustart separat protokollieren
- [ ] Produktions-PWA Passwort-Reset und sichere Auth-Redirects geprüft; separates Origin-Konzept für endgültigen Betrieb bewertet
- [x] Geschäftsbuchungen mit **fiktiven Daten in einer wegwerfbaren PostgreSQL-17-Datenbank**: 2 Einkäufe, FIFO-Verkauf (Einstand 55,00 €, Gewinn 38,00 €), Storno, Idempotenz, Bestandsgrenze und fremde Nutzerrechte bestanden (Run #38937164898)
- [x] Verschlüsselte Rücksicherung einer nichtleeren **synthetischen Daten- und Bilddatei** in isoliertes PostgreSQL erfolgreich
- [ ] Reale Geräteprüfung mit hochgeladenem **gültigem JPEG/PNG**, Anzeige/Vollbild sowie Cloud-Synchronisierung neuer Buchungen auf beiden Geräten – noch nicht durchgeführt
- [ ] Bildvorschauen auf Windows und Mobilgeräten sichtbar und vergrößerbar
- [ ] Feature-Parität (insbesondere Einkaufs-/Verkaufsbearbeitung, CSV-Import und Export) bestätigt oder bewusst eingeschränkt
- [ ] Backup-Zeitplan: `TRUMMCARDS_BACKUP_ACTIVE=true` laut Eigentümer angelegt; erster **geplanter** Sicherungslauf noch zu bestätigen (02:17 UTC täglich). Manueller Erfolg reicht nicht als Beleg für den Zeitplan
- [x] Zweite Kopie des verschlüsselten GitHub-Backups laut Eigentümer aufbewahrt (16.10.2026, „ich habe sie gespeichert“); separater, sicherer Aufbewahrungsort empfohlen
- [x] Wiederherstellung einer fiktiven Testdatei in PostgreSQL 17 und erstes leeres PROD-Backup geprüft
- [ ] Entschlüsselung und Wiederherstellung der **lokal gespeicherten** Archivkopie unabhängig getestet; Passphrase separat verwahren
- [ ] Windows-Installer-Integrität, Update-Manifest und Updates aus getrenntem Cloud-Kanal durch Praxisprobe bestätigt
- [ ] Unsignierter Installer/SmartScreen-Bewertung akzeptabel oder Code-Signing vor Verteilung eingerichtet
- [ ] Supabase Free-Tarif: Leaked-Password-Protection laut Dokumentation Pro+; einziges Konto mit starkem, einzigartigem Passwort/ggf. MFA geschützt
- [ ] Ausdrückliche Produktionsfreigabe des Eigentümers, danach erst `TRUMMCARDS_RESTORE_VERIFIED` und `TRUMMCARDS_PRODUCTION_APPROVED` setzen

**Installationshinweis:** Der bisherige Windows-Cloud-Preview-Installer 0.9.0 hat den Updater absichtlich deaktiviert. Der erste Wechsel auf 1.0.0 erfolgt daher durch eine **manuelle, getrennte Installation**; automatische Updates sollen erst ab 1.0.0 aus dem separaten `/cloud-updates/`-Feed funktionieren.

**Nie** alle drei Go-Live-Variablen setzen, bevor die offenen Prüfungen nachweislich bestanden wurden. Testgeräte sollten bis zur Freigabe ausschließlich das read-only 0.9.0-Testpaket verwenden.
