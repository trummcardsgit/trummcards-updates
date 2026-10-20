# TrummCards – gemeinsame PWA für Windows, Smartphone und Tablet

## Beschlossene Reihenfolge (20.10.2026)
1. **1.2.4 Bildkorrektur**: der TEST-getestete Nidoking/TCGdex-Bildfix wurde über den vorhandenen produktiven Electron-Updater und die PWA freigegeben. Produktive Version 1.2.4, Datenbank unverändert; verschlüsseltes V3-Backup mit lokalem PostgreSQL-Restore vor dem Release.
2. **1.2.5 Desktop-PWA im TEST**: Responsive Webansicht, die auf >=1080 px eine seitliche Navigation, breitere Lagerzeilen, größere Bildvorschau und Dashboard-Karten bietet; mobile Ansicht bleibt ohne Layoutänderung. Separat unter `/desktop-test/`, nur Supabase TEST, eigener Login-/SW-Cache, kein produktives Deployment.
3. **Eine gemeinsame App-Logik**: Erst nach geprüftem Browser-/PWA-Test alle fehlenden Funktionen der bisherigen Electron-Desktop-App erfassen und in die responsive PWA portieren; gemeinsame Geschäftslogik, keine zweite eigenständige Datenbank.
4. **Desktop-Nutzung umstellen**: Chrome/Edge-App installieren, parallel zum bisherigen Electron-Programm testen. Electron/Windows-Autoupdater erst stilllegen, wenn Parität, Datenmigration (keine notwendig), Dokument-/Dateiexport, Berechtigungen, Bild-Uploads, Druck- und Tastaturabläufe verifiziert wurden.

## Details für die TEST-Abnahme
- TEST-Seite: `https://trummcardsgit.github.io/trummcards-updates/desktop-test/`
- Großes PC-Fenster (>=1080 px): linker Navigationsbereich (Lager, Einkauf, Verkauf, KartenDex, Bilder, Mehr); Dashboard vier Kennzahlen nebeneinander; breites, durchsuchbares Lager mit Vorschaubildern und Korrektur-/Archivschaltflächen.
- Schmaleres Fenster (<1080 px) und Smartphone: unveränderte mobile Navigation am unteren Fensterrand, vorhandene Buchungsformulare.
- In Desktop TEST einen bestehenden Artikel öffnen, Bild vergrößern, einen Testartikel mit Bild importieren, Einkauf/Verkauf (nur TEST!), Bestand korrigieren und Archivierung prüfen; KartenDex inklusive Japanisch/Fallback durchsuchen.
- Fenstergrößen 1280x720, 1920x1080, ca. 900 px Breite und Mobile simulieren; achten auf horizontales Scrollen, abgeschnittene Bedienelemente und Dialoge.
- Login, Logout, Browser-F5, Service-Worker-Update, TEST-Daten-Isolation kontrollieren.
- Für die endgültige Umstellung: Tastaturkürzel, CSV-Export, Foto-Upload, Kamera, Vinted und gegebenenfalls Barcode-Scanner-/Druckerfunktionen auf Windows vergleichen.
- Keine produktiven Datenbankänderungen und **kein Wechsel von PRODUCTION** als Teil dieses Desktop-TEST-Zweigs.

## Releasestrategie
- `cloud-1.2.4`: produktiver Bildfix mit Windows-Installer + PWA (ist separat von Desktop-PWA).
- `feature/cloud-1.2.5-responsive-desktop-pwa`: TEST-only, niemals automatische Veröffentlichung nach `/production/` oder `/cloud-updates/`.
- Nach positiver visueller Abnahme: robustes responsive Layout und die verbleibenden Desktop-Funktionen gemeinsam freigeben, begleitet von frischem V3-Backup + erfolgreichem Restore und Prüfung der Supabase-RLS-Regeln.
