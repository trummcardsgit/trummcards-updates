# TrummCards Cloud 1.2.3 – Freigabeplan Lagerverwaltung

Stand: 20. Oktober 2026. **NICHT LIVE; kein Produktions-Deployment ausführen, solange die Bedingungen offen sind.**

## Änderungen

- **Bestand ändern**: Stückzahl nachträglich korrigieren; SQL-RPC `tc_adjust_inventory` sperrt den Artikel, vergleicht den erwarteten Bestand, korrigiert FIFO-Einkaufslose und schreibt Protokoll + Lagerbewegungen.
- **Entfernen**: archiviert Artikel statt Einkauf/Verkauf/Bilder dauerhaft zu löschen. Restbestand wird ausgebucht; ehemalige Verkaufsnachweise bleiben. Falls später wieder Bestand entsteht, reaktiviert das System den Artikel.
- **Windows und PWA**: gleichartige Aktionen und Sicherheitsabfragen. Basis `fix/cloud-1.2.2-inventory-images`, damit der letzte Bild-Hotfix erhalten bleibt.
- **Backup V3**: ergänzt `tc_inventory_corrections` als elfte Tabelle und unterstützt bestehende V1/V2-Sicherungen weiterhin.

## Bereits erfolgreich

- Syntax und Frontend-Tests: `cloud/release/stock-management123.test.mjs`.
- Echte SQL-Migration mit synthetischen Daten und echten PostgreSQL-17-RPC-Tests, ohne Supabase: `.github/workflows/cloud-123-postgres-integration.yml`.
- Backup-V3-Audit und Altformat-Kompatibilität: `cloud/backup/backup.test.mjs`.
- Vorbereitete PRODUCTION-Pakete ohne Veröffentlichung: `.github/workflows/cloud-123-production-staging.yml`.
- Alle obigen GitHub-Workflowläufe sind nur Entwicklungs-/CI-Läufe.

## Geordnete Freigabe – zwingend

**A. Testdatenbank**

1. Im Supabase-Projekt **TEST** (ID: `cpycfxolqpidfjbhhsmr`) sicherstellen, dass ein aktueller Test-Snapshot oder eine Wiederherstellungsmöglichkeit existiert. Nicht auf die Produktivdatenbank umstellen.
2. Die SQL-Migration `cloud/supabase/migrations/20261020000100_stock_corrections_archive.sql` nach einer fachlichen Freigabe im TEST-SQL-Editor als Ganzes ausführen (enthält `BEGIN`/`COMMIT`). Die verbundene automatische Ausführung war durch die Plattform-Sicherheitsprüfung blockiert; **nicht versuchen, die Sicherheitsprüfung zu umgehen**.
3. In TEST die vier Objekte read-only verifizieren: Spalte `tc_products.archived_at`, Tabelle `tc_inventory_corrections`, RPCs `tc_adjust_inventory(uuid,integer,integer,text,numeric)` und `tc_archive_product(uuid,integer,text)`.
4. TEST-App aus isoliertem Cloud-1.2.3-Build verwenden. Einen reinen Testartikel anlegen und Menge erhöhen, reduzieren, auf 0 setzen, archivieren, Verkauf stornieren, Nachbestellung, anschließend Browser-PWA und Windows synchron vergleichen. Gültige Historie darf nicht verschwinden; veraltete Bestandsversion muss eine Fehlermeldung liefern.
5. TEST-Backupfunktion bei gewünschter V3-Wiederherstellung auf `cloud/release/sql/cloud123_backup_snapshot_v3_staging.sql` aktualisieren und V3-Snapshot samt Korrekturen und Bildern testen. **Keine** TEST-Daten in PROD importieren.

**B. Produktionssicherung und Datenbank**

6. Produktions-Buchungen für den Release abstimmen bzw. möglichst kurz pausieren, während Schema/Backup/Clients nacheinander umgestellt werden.
7. Unmittelbar vor der Änderung einen **frischen, verschlüsselten V2-PRODUCTION-Snapshot inklusive privater Bilder** erstellen, entschlüsselt validieren und in einer **separaten lokalen PostgreSQL-17-Instanz tatsächlich wiederherstellen**. Die Sicherung sicher aufbewahren. Die Restoreprüfung erfolgt durch `cloud/backup/restore-check.mjs`.
8. Aktuellen PROD-Bestand/Tabellenzahlen dokumentieren. Die letzten vom Assistenten verifizierten Werte waren 14 Artikel, 15 Einkaufsposten, 1 Verkauf und 11 Artikelbilder. Spätere Änderungen müssen als neue Baseline aufgenommen werden.
9. Erst nach positivem TEST und Rücksicherung die überprüfte Lager-Migration separat im Supabase-Projekt **TrummCards Production** (ID: `hgdexyvtgfffcasfpjyu`) anwenden. Keine bereits gespeicherten Artikel, Verkäufe oder Bilder löschen oder überschreiben.
10. Direkt anschließend den V3-Snapshot-RPC aus `cloud/release/sql/cloud123_backup_snapshot_v3_staging.sql` aktualisieren, v3-fähige Backup-/Restore-Tools als aktive Backup-Version sicherstellen und einen **neuen V3-Snapshot** einschließlich `tc_inventory_corrections` erfolgreich entschlüsseln und lokal wiederherstellen. Auch dann muss die Archiv-/Audit-Tabelle im Backup vorhanden sein.
11. Erst jetzt Windows **1.2.3** in den bestehenden Generic-Update-Feed `gh-pages/cloud-updates/` und die PWA nach `gh-pages/production/` ausliefern. TEST-Verzeichnisse und frühere Installer nicht entfernen. App-ID `at.trummcards.cloudproduction` und Feed bleiben unverändert.
12. Veröffentlichung read-only prüfen: `latest.yml` ist Version 1.2.3, PWA-Service-Worker `v123`, Supabase-Production-Referenz korrekt, Windows-App aktualisiert; Datensatzanzahlen von PROD bleiben im normalen Migrationsteil gleich.
13. Zwei bis drei kleine reale Bedienungs- und Korrekturtests mit gesonderten Testartikeln und anschließendem Audit-/Backup-Abgleich. Kein automatisches Massen-Archivieren.

## Sicherheitsgrenzen und Wiederherstellung

- **Kein reines Frontend-Deployment ohne beide RPCs**: Schaltflächen würden fehlschlagen.
- Bestehende `tc_inventory`-Sicht und FIFO-Verkaufs-RPCs werden durch die Migration nicht neu implementiert.
- Fehler vor PROD-Migration: keine Live-Änderung; bestehende Version **1.2.2** weiterverwenden.
- Fehler nach PROD-Migration, vor PWA/Windows-Release: Clients 1.2.2 weiterlaufen lassen, Änderungen untersuchen. Nicht blind SQL rückgängig machen.
- Fehler nach Veröffentlichung: Client-Deployment auf letzte stabile Version zurücksetzen, Datenbank und Korrekturprotokoll aber **nicht ohne Wiederherstellungsplan löschen**. Datenbank-Rollback erfordert fachliche Prüfung, abgestimmten Datenstand und gültige Sicherung.
- Sicherheitswarnungen/fehlende Admin-Freigaben stoppen den Release. Weder geschützte SQL-Zugänge noch Deployment-Gates umgehen.

## Repository
- PR: https://github.com/trummcardsgit/trummcards-updates/pull/7
- SQL TEST/PROD Migration: `cloud/supabase/migrations/20261020000100_stock_corrections_archive.sql`
- Backup V3 RPC: `cloud/release/sql/cloud123_backup_snapshot_v3_staging.sql`
- Test: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39424948424

**Aktueller Blocker**: Die Sicherheitsblockierung bei der verbundenen Supabase-Migration bleibt offen. Die Migration wurde weder auf TEST noch auf PRODUCTION installiert; ein automatisiertes Live-Deployment ist daher nicht freigegeben.
