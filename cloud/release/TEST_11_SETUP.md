# TrummCards Cloud 1.1 – Testumgebung (bestehendes Supabase-Projekt)
Stand: 19.10.2026.

## Datenbank
- Ausschließlich Supabase-Projekt **TEST** (`cpycfxolqpidfjbhhsmr`). **Keine neue Datenbank, keine Migration auf PROD**.
- Originale Testdaten vor Migration: **4 Produkte, 5 Einkäufe, 5 Verkäufe, 3 private Storage-Objekte**.
- Privater, TEST-interner Pre-1.1-Datensnapshot in `trummcards_private.tc_pre11_test_snapshot` angelegt (snapshot_id 1, enthält DB-Zeilen und Storage-Metadaten, **nicht** die Bildbytes / keine externe Vollsicherung). Bestehende Storage-Bilddateien nicht verändert.
- Additive 1.1-Migrationen auf TEST angewandt und nachgeprüft: Produktfelder, `tc_sale_shipments`, `tc_platform_fee_profiles`, `tc_cash_entries`, Backup-Snapshot-v2.
- Bestehende 1.0-Buchungen wurden nicht modifiziert; neue Tabellen beginnen leer. Benutzerrechte/Owner-RLS schützen alle neuen Datensätze; anonyme Lesezugriffe sind gesperrt.
- Gleiches vorhandenes TEST-Auth-Konto nutzen (PRODUCTION-Kennwort muss nicht identisch sein).

## Getrennte Testanwendungen
GitHub Actions: [1.1 TEST – Isolated Build](https://github.com/trummcardsgit/trummcards-updates/actions/workflows/cloud-11-test-build.yml).
- Das Buildscript `cloud/release/prepare-cloud-11-test.mjs` ändert nur **den temporären Actions-Runner-Checkout** (per `TRUMMCARDS_TEST11_ENABLE`-Gate) und prüft alle harten Projektgrenzen.
- **PWA TEST:** nur nach erfolgreichem Workflow und Pages-Build: `https://trummcardsgit.github.io/trummcards-updates/test-11/`. Eigene Service-Worker-Cache-Namen, Auth-Session und PWA-Identität. GH Pages TEST-Root `/` und PROD `/production/` bleiben unverändert.
- **Windows TEST:** Installer als GitHub-Actions-Artefakt `TrummCards-Cloud-11-TEST-Windows` im erfolgreichen Workflow. Eigener Windows-AppId, Shortcut, lokaler userData-Ordner `trummcards-cloud-test11`, Versionsname `1.1.0-test.1`; **Auto-Updater bleibt deaktiviert**; niemals an `/cloud-updates/` veröffentlichen.
- Testbuilds sind **beschreibbar und nur mit TEST verbunden**. Keine echten Handelsdaten oder Produktions-Anmeldungen verwenden.
- Github Actions RC (NO DEPLOY) testet weiterhin den unveränderten Feature-Branch mit gesperrten Production-Schreibfunktionen.

## Manuelle Abnahme – beide Geräte
1. Mit dem TEST-Benutzer anmelden. In TEST vorhandene 4 Artikel sowie bisherige Einkäufe/Verkäufe und 3 Bilder prüfen.
2. TCGdex-Sets/Karten suchen und Metadaten/Bild-Vorschau übernehmen, dann neue Testkarte mit Lagerort, Variante, Sprache und Seltenheit speichern.
3. Test-Einkauf erfassen, auf zweitem Gerät Bestand prüfen; auf zweitem Gerät Test-Verkauf mit Gebührenprofil buchen und Windows FIFO/Storno kontrollieren.
4. Versandstatus/Sendungsnummer bearbeiten und auf anderem Gerät synchron anzeigen lassen.
5. Test-Marktpreis bearbeiten; Statistik und CSV überprüfen.
6. Tatsächliche Testzahlungen/Teilzahlungen, weitere Testbetriebsausgaben, Jahresfilter und CSV-Export prüfen.
7. Negativfälle: Offline, doppelte Buchung, gültige Besitzerrechte, private Bilder. Keine TEST-Daten auf PROD.
8. Nach erfolgreichem Praxistest Fehler dokumentieren und im Feature-Branch beheben; Version 1.1 erst nach separater **PROD-Backup- und Release-Freigabe** vorbereiten.

**Wichtig:** Eine interne TEST-Snapshot-Tabelle ist keine vollständige externe Sicherung (Storage-Bytes fehlen). Produktivbackups werden separat behandelt. Das Aufsetzen dieser TEST-Ausgaben ersetzt keine finale QA oder verifizierte Backups.
