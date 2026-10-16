# TrummCards Cloud 1.0 – Veröffentlichungsablauf (NICHT AKTIV)

Der spätere Release läuft nur manuell und lässt sich nicht durch eine zufällige Codeänderung oder den Windows-1.6.1-Updater starten.

## Voraussetzungen

1. **GitHub-Secrets:** `TC_PROD_BACKUP_EMAIL`, `TC_PROD_BACKUP_PASSWORD`, `TC_PROD_BACKUP_PASSPHRASE` vom Besitzer im Repo hinterlegt, nicht per Chat übermittelt.
2. **Sicherung:** Backup-Workflow auf Standardzweig `main`, manuell mindestens einmal erfolgreich ausgeführt und verschlüsseltes Archiv lokal prüfbar; anschließend Repository-Variable `TRUMMCARDS_BACKUP_ACTIVE = true`. Die Veröffentlichung verlangt einen erfolgreichen Backup-Lauf aus den letzten 72 Stunden plus ein unverfallenes Artefakt.
3. **Restore:** Echter Import in eine *isolierte, leere* Supabase/PostgreSQL-Testumgebung einschließlich privater Storage-Bilder und Prüfung von Produkten, FIFO, Verkäufen und Summen. TEST und PROD sind für destruktive Wiederherstellungstests tabu. Danach erst `TRUMMCARDS_RESTORE_VERIFIED = true`.
4. **Produktiv-Auth:** Anmelde-/Passwortwiederherstellungs-URLs bei Supabase Production konfigurieren; Login / Passwort-Reset / Berechtigungen praktisch testen.
5. **Windows-/PWA-Releasecode:** Version `1.0.0`; im freigegebenen Commit `WRITES_ENABLED=true` (Windows + PWA), `UPDATE_FEED_ENABLED=true`; aktualisierte PWA Cache-Version und manuelle Regressionstests.
6. **Ausdrückliches GO-LIVE:** Benutzerfreigabe dokumentiert, erst dann GitHub-Repository-Variable `TRUMMCARDS_PRODUCTION_APPROVED = true`.

## Publikationsskript

Der separate Workflow `.github/workflows/cloud-production-release.yml` (erst nach Aufnahme auf `main` im Actions-Menü manuell ausführbar) prüft diese Bedingungen, baut die Windows-EXE plus `.blockmap` und `latest.yml`, und kopiert die **Produktiv-PWA** nach `gh-pages/production/` sowie ausschließlich die **Cloud-Windows-Updates** nach `gh-pages/cloud-updates/`. Der bisherige TEST-Root bleibt erhalten. Danach wird ein Pages-Build ausdrücklich angefordert.

Windows 1.6.1 verwendet weiterhin den alten GitHub-Releases-Kanal. Der Cloud-Updater verwendet **nur** `https://trummcardsgit.github.io/trummcards-updates/cloud-updates/` (Generic-Provider). Niemals Cloud-`latest.yml` im GitHub Release von 1.6.1 veröffentlichen.

Der Workflow enthält keine automatische Veröffentlichung bei Git Push; ein **manueller** Dispatch mit abgeschlossenen Freigaben ist erforderlich.

## Noch offen

- Restore-Executor und echter Ende-zu-Ende-Wiederherstellungstest.
- Auth-Redirect im Supabase-Production-Dashboard. Kostenfreier Dienst: ein öffentliches GitHub-Pages-/production-Verzeichnis teilt den *Origin* mit TEST; Sessions sind durch verschiedene Schlüssel und Service-Worker-Scopes getrennt, aber eine komplett eigenständige Domain wäre sicherheitstechnisch besser.
- Installations-/Updaterprüfung auf einem echten Windows-PC, insbesondere SmartScreen / Code Signing.
- Backup-Zeitplan auf `main` verfügbar machen; Produktions-Passwort als GitHub Secret ist eine bewusste Sicherheitsentscheidung.

**Aktueller RC 0.9.0 hat Schreibsperren. Für echte Buchungen nicht freigegeben.**
