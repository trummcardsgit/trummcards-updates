# TrummCards Cloud 1.0 – kontrollierter Praxistest

**Stand:** 16.10.2026 – Freigabe ausstehend. Nur der **read-only Windows-Preview-Installer 0.9.0** darf vor dem Produktions-Go-Live installiert werden. Kein produktives PWA-Deployment, keine TEST-Umschaltung, keine Echtbuchungen.

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

## B. Mobile-PWA
Die produktive PWA ist noch nicht veröffentlicht. Die alte TEST-PWA ist ausdrücklich **kein** Produktionstest. Für einen echten iOS-/Android-Test braucht die Produktion ihre eigenständige HTTPS-Adresse sowie erlaubte Auth-Redirect-URLs und einen finalen Service-Worker-Scope. Keine Daten vor Go-Live in PROD schreiben.

## C. Automatisch geprüfte Voraussetzungen
- Die neue Datenbank hat RLS auf 7 Tabellen, Besitzer-Guard und privaten Image-Bucket.
- Ein echtes verschlüsseltes Backup einer momentan leeren DB wurde erstellt, verifiziert und in temporäres PostgreSQL 17 zurückgespielt: https://github.com/trummcardsgit/trummcards-updates/actions/runs/38931448375
- Die Windows-1.0.0-Buildprobe läuft in einem isolierten GitHub-Runner ohne Veröffentlichung. Sie ist **nicht** der lokale User-Abnahmetest.
- Bei jedem PR-Lauf wird der **anonyme, ausschließlich lesende** Zugriff auf Supabase Production geprüft; keine Auth-Daten oder Business-Schreiboperationen.
- TEST und Windows 1.6.1 bleiben unangetastet.

## D. Abschließendes Go/No-Go
- [ ] Echtes Windows-Preview-Login und Abmeldung durch Eigentümer erfolgreich
- [ ] Unangemeldete Anfragen und fremder Benutzer können keine Bestände/Bilder/Buchungen einsehen oder ändern
- [ ] Produktions-PWA mit eigener HTTPS-Adresse, Redirects, Passwort-Reset und iOS-/Android-Login geprüft
- [ ] Geschäftslogik (Einkauf → FIFO-Verkauf → Storno) inkl. Fotos und Wiederherstellung **mit nichtleeren synthetischen Daten im isolierten Testsystem** geprüft
- [ ] Bildvorschauen auf Windows und Mobilgeräten sichtbar und vergrößerbar
- [ ] Feature-Parität (insbesondere Einkaufs-/Verkaufsbearbeitung, CSV-Import und Export) bestätigt oder bewusst eingeschränkt
- [ ] Backup-Zeitplan nach GitHub-Variable tatsächlich durch erfolgreichen geplanten Lauf bestätigt
- [ ] Zweite offline verwahrte, verschlüsselte Sicherung und Wiederherstellungsanleitung vorhanden
- [ ] Windows-Installer-Integrität, Update-Manifest und Updates aus getrenntem Cloud-Kanal durch Praxisprobe bestätigt
- [ ] Unsignierter Installer/SmartScreen-Bewertung akzeptabel oder Code-Signing vor Verteilung eingerichtet
- [ ] Supabase Free-Tarif: Leaked-Password-Protection laut Dokumentation Pro+; einziges Konto mit starkem, einzigartigem Passwort/ggf. MFA geschützt
- [ ] Ausdrückliche Produktionsfreigabe des Eigentümers, danach erst `TRUMMCARDS_RESTORE_VERIFIED` und `TRUMMCARDS_PRODUCTION_APPROVED` setzen

**Nie** alle drei Go-Live-Variablen setzen, bevor die offenen Prüfungen nachweislich bestanden wurden. Testgeräte sollten bis zur Freigabe ausschließlich das read-only 0.9.0-Testpaket verwenden.
