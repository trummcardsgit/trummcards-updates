# TrummCards Cloud – Projektübersicht

> **Aktueller Stand (16.10.2026):** Windows Cloud TEST 0.2.1 und Mobile PWA TEST v0.4 existieren bereits und wurden auf echten Geräten getestet. Die alten Phase-1-Abschnitte unten sind historische Entwurfsinformationen. **Release-Vorbereitung:** [release/README.md](release/README.md); das neue, leere PROD-Projekt `hgdexyvtgfffcasfpjyu` ist angelegt und mit Schema/FIFO/RLS/privatem Storage initialisiert; TEST bleibt unangetastet. Noch **kein** Produktiv-Login, keine Produktions-Apps und keine Alt-Datenmigration. Release bleibt gesperrt, bis kostenlose Backup-/Restore-Lösung und getrennte Updatewege getestet sind.

**Ziel:** Einen sicheren Cloud-Datenbank-Unterbau für genau einen TrummCards-Benutzer vorbereiten. Windows 1.6.1 bleibt unverändert und synchronisiert derzeit **nicht** mit der Cloud.

## Inhalt

| Datei | Zweck |
|---|---|
| `supabase/migrations/20261014000100_phase1_schema.sql` | Tabellen, RLS, ein Eigentümer, privater Bildspeicher, FIFO-Purchase-/Sale-/Void-RPCs, Historie, Import-Staging |
| `scripts/prepare-legacy-import.mjs` | **Nur offline**: JSON-Backup prüfen, Bestand/Gewinn abgleichen, optional lokalen Importplan erzeugen |
| `scripts/test-legacy-import.mjs` + `examples/demo-backup.json` | Automatisierte Tests mit **fiktiven** Daten |
| `supabase/tests/phase1_smoke.sql` | **Manueller** SQL-Smoke-Test für späteres, isoliertes Supabase-Testprojekt; Transaktion endet mit ROLLBACK |
| `docs/import-mapping.md` | Zuordnung des bestehenden JSON-Formats und sicherer Übernahmeablauf |
| `docs/setup-and-security.md` | Einrichtung, Zugriffsschutz, Verifikation und Freigabegrenzen |

## Bereits lokal prüfbar

```bash
node cloud/scripts/test-legacy-import.mjs
node cloud/scripts/prepare-legacy-import.mjs cloud/examples/demo-backup.json
```

Bei einem echten Backup (niemals auf GitHub hochladen):

```bash
node cloud/scripts/prepare-legacy-import.mjs "C:\\Privat\\TrummCards_Backup.json"
```

Optional `--out "C:\\Privat\\import-plan.json"` für eine **lokale** Zuordnungsvorschau, die nur nach Prüfung in späteren Schritten übernommen werden darf.

## Architektur

```
Windows (später) ─┐
                  ├─ Supabase Auth ─ RLS ─ PostgreSQL (Artikel, Chargen, Verkäufe)
Mobile PWA ───────┘                         ├─ private Storage-Bilder
                                            └─ sichere FIFO-Buchungsfunktionen
```

- **Heute**: Windows 1.6.1 mit lokalem `localStorage` und `IndexedDB`.
- **Phase 1 (hier)**: Quellcode, Datenmodell, Offline-Prüfer und Sicherheitskonzept.
- **Phase 2**: Separates Cloud-Testprojekt anlegen, erlaubten Benutzer einrichten, SQL auf Testdatenbank ausführen und echten Backfill-Importer bauen/testen (keine Freigabe ohne Datenabgleich).
- **Phase 3**: Windows-App und mobile PWA an Cloud-API anbinden, Synchronisation/Fehlerfälle testen und erst danach freischalten.

## Sicherheit und Grenzen

Dieses Paket **führt keine SQL-Befehle aus**, enthält keine Zugangsschlüssel und verändert keine bestehende Benutzerdatei. Der Importer verbindet sich **nicht** mit Supabase. Der Migrationsentwurf wurde nicht gegen eine reale Supabase-Instanz ausgeführt und benötigt vor Einsatz DB-/Sicherheitstests in einem isolierten Testprojekt.

Die alte App benötigt vor dem späteren Cutover einen **finalen** JSON-Export inklusive Bildern. Eine Cloud-Synchronisierung ist nicht automatisch durch das Hinzufügen dieser Dateien möglich.

Supabase-Dokumentation:
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Private Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)

## PR-Checks

Der separate GitHub-Actions-Workflow `.github/workflows/cloud-phase1-checks.yml` führt bei einem Pull Request nur Node.js-Offline-Tests mit fiktiven Beispieldaten aus. Er baut **keinen** Windows-Installer und hat keine Deployment-Berechtigung (`contents: read`).
