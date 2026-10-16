# TrummCards Cloud PROD: verschlüsselte Sicherung

Status: Die Sicherungswerkzeuge sind vorbereitet. **Der automatische Zeitplan ist noch deaktiviert**, bis der Benutzer die Zugangsdaten als GitHub-Secrets selbst hinterlegt und den ersten Lauf erfolgreich geprüft hat. Keine Passwörter/Passphrases in Chat oder Repository einfügen.

## Inhalt
- Alle sieben `tc_*`-Datentabellen inklusive FIFO-Historie in einem konsistenten, benutzerspezifischen PostgreSQL-Snapshot.
- Alle in `tc_lot_images` und `tc_product_images` referenzierten Bilder aus privatem Supabase Storage.
- AES-256-GCM verschlüsseltes, gzip-komprimiertes `.tcbackup`-Archiv. Scrypt (N=32768) leitet einen Schlüssel von einer separaten, mindestens 24 Zeichen langen Passphrase ab. Bilder werden anhand SHA-256 und Vollständigkeitszählung geprüft.
- Die Arbeit erfolgt mit dem **gewöhnlichen angemeldeten Besitzerkonto** und dem öffentlichen Supabase Publishable Key, niemals einem Admin- oder Service-Role-Secret.
- Im öffentlichen GitHub-Repository wird **nur das verschlüsselte Archiv** als Action-Artefakt (30 Tage) gespeichert; Klartext-Bilder und Datensätze werden nicht hochgeladen.

## Aktivierung ohne Zusatzkosten

Unter GitHub → Repo → Settings → Secrets and variables → Actions **Repository secrets** anlegen:

1. `TC_PROD_BACKUP_EMAIL`: dieselbe E-Mail-Adresse wie im Production-Konto
2. `TC_PROD_BACKUP_PASSWORD`: Production-Kontopasswort (nur im GitHub-Secret, niemals in Chat/Code)
3. `TC_PROD_BACKUP_PASSPHRASE`: **separate, zufällige Passphrase mit mindestens 24 Zeichen**, sicher offline notieren; nicht dasselbe wie das Konto-Passwort.

Sicherheitsabwägung: Ein echtes Besitzer-Passwort als CI-Secret bietet weniger Isolation als ein unabhängiger nur lesender Sicherungsnutzer. Wer diese Art von GitHub-Actions-Sicherung nicht möchte, sollte vor der Freigabe eine lokal geplante Sicherung mit eigener Backup-Identität einsetzen.

Unter **Actions → TrummCards PROD – AES-verschlüsselte Sicherung (Free) → Run workflow** einen manuellen Lauf starten. Ein grüner Test und der verschlüsselte Download sind Voraussetzung. Danach unter **Repository variables** `TRUMMCARDS_BACKUP_ACTIVE = true` setzen. **WICHTIG:** Geplante GitHub Actions laufen ausschließlich, wenn der Workflow auf dem Standardzweig `main` liegt. Solange er nur auf `release/production-readiness` existiert, läuft der Cronjob überhaupt nicht. Nach Secrets + erfolgreichem manuellen Test muss der geprüfte Sicherungscode samt Workflow auf `main` übernommen werden. Erst dann und nach Aktivieren der Repository-Variable läuft der tägliche Zeitplan um 02:17 UTC. Fehlende Variable bedeutet **übersprungene** Jobs, nicht vorhandene Backups.

## Kontrolle und Wiederherstellung

Das verschlüsselte Actions-Artefakt herunterladen, ZIP entpacken und die `.tcbackup`-Datei mit Node.js 22 prüfen:

`TC_BACKUP_PASSPHRASE=... node cloud/backup/verify.mjs PFAD_ZUM_BACKUP.tcbackup`

Unter Windows die Umgebungsvariable lokal setzen, ohne die Passphrase in Logs oder Chats zu veröffentlichen. Der Prüfer entschlüsselt die Daten im Speicher und meldet Tabellen- und Bildsummen.

**Entscheidend:** Diese Tests garantieren noch **keinen** fertigen Datenbank-Restore. Für einen echten Wiederherstellungstest sind ein isoliertes leeres Zielprojekt, der Besitzer, sämtliche Migrationen, eine transaktionale Datenbank-Wiederherstellung und das separate Zurückspielen der Bilder notwendig. **Keine Wiederherstellung in die vorhandene TEST- oder produktive Datenbank ohne gesonderte ausdrückliche Zustimmung.** Version 1.0 bleibt bis zum erfolgreichen Restore-Test gesperrt.

GitHub-Artefakte sind zeitlich begrenzt. Regelmäßig eine zweite verschlüsselte, offline verwahrte Kopie herunterladen. Der Nutzer sollte fehlgeschlagene GitHub-Actions-Läufe kontrollieren.
