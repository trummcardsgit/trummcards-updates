# TrummCards Cloud – Windows Production Release Candidate 0.9.0

**NO-GO-LIVE.** Die App ist fest mit dem neuen Supabase-Projekt **TrummCards Production** verbunden: `hgdexyvtgfffcasfpjyu`. Die Veröffentlichung und alle geschäftlichen Schreibvorgänge sind absichtlich **gesperrt**, bis der Nutzer das Release freigibt und ein erfolgreich getestetes Backup + Restore vorhanden ist.

## Isolierung
- Electron appId: `at.trummcards.cloudproduction`; Name `TrummCards Cloud`; eigenes Benutzerprofil `trummcards-cloud-production`. Installiert separat von `TrummCards Lagerverwaltung` (1.6.1) und `TrummCards Cloud TEST`.
- Supabase URL und **öffentlicher Publishable Key** sind fest hinterlegt. Es gibt kein beliebig einstellbares TEST-Ziel. Auth Storage `trummcards-cloud-production-auth-v1`, Pending Bookings `trummcards-cloud-production-pending-v1`.
- Einzige schreibberechtigte Produktionsidentität weiterhin durch RLS + `trummcards_private.owner_guard` beschränkt.
- `WRITES_ENABLED = false` in `src/app.js`: Artikel, Einkäufe, Verkäufe, Storno und Bilder können in dieser RC nicht gespeichert werden. **Nicht nur eine UI-Sperre:** alle Business-Submit-Handler prüfen das Flag vor dem ersten Schreibzugriff.

## Automatische Updates wie Windows 1.6.1 (eigener Kanal!)
- `electron-updater` mit `autoDownload = true`, `autoInstallOnAppQuit = false`.
- Prüft später beim Programmstart und alle 12 Stunden. Einstellungen unter **Programm-Updates**: Versionsnummer, Update suchen, Downloadfortschritt, bewusstes Installieren. Kein Neustart mitten in einer laufenden Buchung.
- **Nicht** derselbe GitHub-Releases-Provider wie die alte 1.6.1-App. Cloud verwendet allein den **generic updater** mit dem eigenständigen URL-Pfad:
  `https://trummcardsgit.github.io/trummcards-updates/cloud-updates/`
- Bei späterem Release muss `cloud-updates/latest.yml` **nur Cloud-Dateien** referenzieren: `TrummCards-Cloud-Setup-<VERSION>.exe` und `.blockmap`. Niemals `latest.yml` von 1.6.1 hochladen/überschreiben. Für den Feed ist ein separater Webpfad reserviert, **noch nicht publiziert**.
- Die freigegebene Version muss in `main.cjs` `UPDATE_FEED_ENABLED=true` setzen (erst nach Test des Feed) und in `src/app.js` `WRITES_ENABLED=true` (erst nach Backup/Restore und Freigabe). Beide Flags bleiben für RC `false`.
- Ein Update der lokal installierten Cloud-App ist **kein Backup der Cloud-Datenbank**! Dafür benötigt es separate automatisierte Backups von PostgreSQL **und** Storage, inkl. Wiederherstellungsprobe.
- Unsigned Windows EXEs können SmartScreen-Warnungen verursachen. Vor produktiver Verteilung Code-Signing/Installationsvertrauen prüfen; niemals Systemschutz abschalten, um Installer zu erzwingen.

## Nur Vorabprüfung, ohne Veröffentlichung
```bash
cd cloud/desktop-production
npm install
npm run check
npm run dist
```

GitHub Actions `.github/workflows/cloud-production-preview.yml` baut die EXE, die `.blockmap` und das `latest.yml` ausschließlich als **internes Vorschau-Artefakt**. Keine Tag-/Release-Erstellung, keine Cloud-Schreiboperationen, kein gh-pages-Update.
