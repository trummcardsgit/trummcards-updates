# TrummCards Cloud 1.2.5 – einheitliche produktive PWA

## Stand 20. Oktober 2026
Die bisherige mobile PWA unter https://trummcardsgit.github.io/trummcards-updates/production/ wurde durch die responsive 1.2.5-Oberfläche ersetzt. Dieselbe Oberfläche auf Windows (Chrome/Edge), iPhone (Safari/PWA) und Android (Chrome/PWA) greift auf die unveränderte TrummCards-PRODUCTION-Datenbank zu.

### Enthalten
- Breites Desktop-Layout ab 1080 px mit seitlicher Navigation und vergrößerten Lagereinträgen, Fotos und Statistiken.
- Kompaktes mobiles Layout mit unterer Navigation.
- Der Menüpunkt **Buchungen** ist auf sämtlichen Bildschirmbreiten erreichbar.
- Gemeinsame KartenDex-, Lager-, Einkauf-, Verkauf-, Buchungen-, Archiv-, Bestandskorrektur-, Versand-, Bild-, Finanz- und Vinted-Logik.
- Bereits bestehende Produktions-Anmeldesitzungen bleiben erhalten (PWA-`STORE` unverändert). PWA-Identität und Scope `./` unverändert.
- Service Worker Version `trummcards-mobile-production-shell-v125`, alle 1.2.5-JavaScript- und CSS-Dateien mit gemeinsamem Versionsparameter, Offline-Shell-Aktualisierung.

### Daten und Release-Sicherheit
- Kein Datenbank-Schemawechsel und **keine Übernahme oder Löschung von Altdaten**.
- Read-only Prüfung bei Freigabe: 14 Produkte, 15 Einkaufsposten, 1 Verkauf, 11 Produktbilder, 14 lagernde Stück, 1 Bestandskorrektur; Produkt-Tabellen-RLS aktiv und Backup-RPC V3.
- Verifiziertes PWA-Dry-Run CI: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39457524926
- Vollständiger Release inkl. grünen Tests und neuem verschlüsseltem V3-Snapshot: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39457780781
- Echte isolierte PostgreSQL-17-Wiederherstellung: **11 Tabellen, 11 private Bilder und 14 lagernde Stück**, erfolgreich. Privates verschlüsseltes Snapshot-Artefakt 30 Tage erhalten; keine Schlüssel veröffentlicht.
- Nur die Dateien unter `gh-pages/production/` verändert (**6 Dateien**); `test-124/`, `test-123/`, `desktop-test/`, `cloud-updates/` und alle alten Windows-Installer wurden nicht verändert.
- Windows-Electron-Installer/Updater **bleibt Version 1.2.4** als Rückfallmöglichkeit. Er wird nicht automatisch in eine PWA konvertiert. Die neue Windows-PWA wird über Chrome oder Edge installiert.
- Letzter sicherer Pages-Commit für eventuelles PWA-Rollback: `4ed13c5c44e40b39a0c2be50667cbc955129a7bf`. Bei Rollback **nur** die sechs durch den Release geänderten Dateien in `production/` aus diesem Commit wiederherstellen, keinesfalls die komplette Pages-Branch zurücksetzen (TEST/andere Änderungen bleiben erhalten).

### Anwenderkontrolle nach Release
1. Im Chrome/Edge auf Windows `/production/` öffnen und über Browser-Menü als App installieren; bestehende Electron-Anwendung während der Testphase behalten.
2. Auf iPhone bestehende Home-Bildschirm-App schließen und neu öffnen; falls nötig im Safari `/production/` neu laden.
3. Login, Lagerbestände, Nidoking/Kartenbilder, Buchungen (inkl. Storno-/Versandoptionen) und einen bestehenden Artikel **ohne** unnötige Echtdatenänderung kontrollieren.
4. Auf breitem Bildschirm erscheint das Seitenmenü links; bei schmalem Fenster/mobile am unteren Rand.
5. Nach sichtbarer Nutzerabnahme und bestätigter Funktionsparität kann die alte Electron-App später außer Betrieb genommen werden.

Die aktuell installierte PWA ist das Produktivsystem; Windows, iPhone und Android teilen eine einzige PWA-Codebasis und denselben Bestand.
