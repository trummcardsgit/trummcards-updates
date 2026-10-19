# TrummCards Cloud 1.1.0 – Produktionsrelease
Datum: 2026-10-19

## Ergebnis
Der getestete Cloud-1.1-Stand aus feature/cloud-1.1-unified wurde über den isolierten Branch release/cloud-1.1.0-production-upgrade für Windows und PWA ausgerollt.
- Erfolgreicher Freigabe-/Backup-/Windows-/Deploy-Workflow: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39243528506
- Veröffentlichungscommit auf gh-pages: d24f08d34e596f3a7528a20f4c9f2f05b8f3d5ba
- Windows-Updatefeed: https://trummcardsgit.github.io/trummcards-updates/cloud-updates/latest.yml
- PWA: https://trummcardsgit.github.io/trummcards-updates/production/
- Cloud 1.0 Installationspaket und Blockmap für Anwendung-Rollback weiterhin vorhanden.

## Datenmigration und Sicherung
- Additive Metadatenspalten für Kartennummer, Seltenheit, Variante, Lagerort, Grading, Katalog-ID, verlinktes Katalogbild und Marktpreis.
- Separate, durch Owner-RLS geschützte Tabellen tc_sale_shipments, tc_platform_fee_profiles, tc_cash_entries.
- Backup-Validator und Restore-Tester auf v1 und v2 gebracht, BEVOR die Produktiv-Snapshotfunktion auf v2 umgestellt wurde.
- AES-256-GCM Backup unmittelbar vor dem Release nachweislich erfolgreich, mit echtem temporärem PostgreSQL-17-Restore: alle 10 Tabellen, 8 private Bilddateien, 8 lagernde Stück.
- Datenstände direkt nach Release: 8 Artikel, 8 Einkäufe, 1 Verkauf, 8 private Bilder. Neue Tabellen leer.
- Bestehende Verkaufs-, Lager- und FIFO-Daten nicht gelöscht und keine TEST-Daten importiert.

## Funktionen in Cloud 1.1
Pokémon-Kartensuche mit Folgeseiten, Set-Browser, Katalogbild-URL beim Import, eigene Bilder mit Vorrang, Kartenmetadaten, Marktwert-Richtwerte, Finanzcenter, Versandverwaltung, Plattformgebühren, Zahlungsjournal und CSV-Exporte.

## Sicherheitsgrenzen
- Geänderter gh-pages-Commit enthält ausschließlich production/ und cloud-updates/; TEST und test-11 sind nicht betroffen.
- Legacy-Windows-Anwendung 1.6.1 wurde nicht verändert.
- Production-PWA-Client verwendet ausschließlich Supabase Production, aktiviert Geschäftsbuchungen und aktualisiert Service-Worker-Cache auf v11.
- EXE-Version 1.1.0, Update-Manifest latest.yml und Blockmap vorhanden. Ursprüngliche Cloud-Identität (appId, userData, Update-URL) bleibt erhalten.

## Ausstehende Praxisabnahme
- GitHub Pages CDN und Live-Anmeldung sowie tatsächlicher Windows-Autoupdateprozess auf dem installiertem Benutzergerät müssen nach Auslieferung manuell kontrolliert werden; technische CI-/GitHub-Auslieferung allein prüft dies nicht vollständig.
- Versand, Finanzen und Zahlungsjournal im echten Nutzerkonto mit nicht-desktruktiven Testabläufen prüfen.
- Die Caching-Aktualisierung einer bereits installierten PWA mit Neuladen bestätigen.
