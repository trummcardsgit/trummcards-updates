# TrummCards Cloud – Release 1.0.0 (16. Oktober 2026)

## Veröffentlicht und verifiziert
- **Eigentümerfreigabe:** ausdrücklich in der Unterhaltung am 16.10.2026 erteilt (sofortiger Produktivstart).
- **Release:** GitHub Actions Run #38968099440, erfolgreich, am 16.10.2026 nach 21:15 UTC ausgelöst.
  https://github.com/trummcardsgit/trummcards-updates/actions/runs/38968099440
- **Windows:** TrummCards-Cloud-Setup-1.0.0.exe, 85.698.584 Bytes, `gh-pages/cloud-updates/`. `latest.yml` Version 1.0.0 mit SHA-512-Metadaten.
- **PWA:** `gh-pages/production/`; Version 1.0.0, neuer Service-Worker-Cache `trummcards-mobile-production-shell-v2`; `WRITES_ENABLED=true`, separater PROD-Supabase-Ref `hgdexyvtgfffcasfpjyu`.
- **Deployment:** Alle Release-Jobschritte erfolgreich, einschließlich isoliertem `gh-pages`-Worktree, Push und explizit angefordertem Pages-Build. Die Erreichbarkeit der öffentlichen GitHub-Pages-URLs konnte vom Assistenten außerhalb GitHubs nicht unabhängig per HTTP geprüft werden.
- **TEST und Windows 1.6.1:** unverändert gelassen. Cloud-Installer nutzt eigene App-ID und Cloud-Updatefeed.
- **Datenstand bei letzter Überprüfung:** 0 Produkte, 0 Einkaufslosen, 0 Verkäufe, 0 gespeicherte Bilder.

## Sofortige Benutzerabnahme nach Release (offen)
1. Die Windows-Vorschau 0.9.0 schließen; `https://trummcardsgit.github.io/trummcards-updates/cloud-updates/TrummCards-Cloud-Setup-1.0.0.exe` herunterladen und TrummCards Cloud 1.0.0 installieren. Die alte Windows Lagerverwaltung 1.6.1 nicht deinstallieren.
2. In Windows Cloud in den Update-Einstellungen Version 1.0.0 und den freigegebenen separaten Updatekanal prüfen.
3. Auf dem Handy `https://trummcardsgit.github.io/trummcards-updates/production/` öffnen, aktualisieren und sichtbare Version 1.0.0 kontrollieren.
4. Ersten *echten* Pokémon-Kartenartikel mit SKU und echtem Kartenbild erfassen; bei Windows und mobil kleines Bild im Lager und die Großansicht prüfen.
5. Einen *echten* vorhandenen Einkauf erfassen; Bestand und Einkaufswert auf beiden Geräten nach manuellem Aktualisieren vergleichen. Keine fiktiven Umsätze in der Produktivdatenbank erzeugen.
6. Später beim ersten realen Verkauf FIFO-Einstand, Gebühren und Gewinn vergleichen, bei Fehleingabe korrekten Storno testen.
7. Am 17.10.2026 (GitHub cron 02:17 UTC ≈ 04:17 MESZ) ersten tatsächlich geplanten, erfolgreich verschlüsselten Backup-Lauf sowie gesicherte Bilddaten und verschlüsseltes Artefakt prüfen. Ein manueller erfolgreicher Backup-Run ist vorhanden, ersetzt die tägliche Probe jedoch nicht.
8. Unsigned Windows-Setup: Herkunft und Integrität prüfen; SmartScreen nicht global deaktivieren.
9. GitHub 2FA vor dem von GitHub angezeigten Termin 29.11.2026 aktivieren (GitHub UI-Warnung).

## Externe Quellen
- GitHub Actions: https://github.com/trummcardsgit/trummcards-updates/actions/runs/38968099440
- PWA: https://trummcardsgit.github.io/trummcards-updates/production/
- Update-Feed: https://trummcardsgit.github.io/trummcards-updates/cloud-updates/latest.yml
- Frühere Tests und Checkliste: cloud/release/PRACTICAL_TESTS_1.0.md

Diese Datei ist ein Release-Protokoll; spätere Funktionsänderungen und Fehlerbehebungen mit Version und Datum ergänzen.
