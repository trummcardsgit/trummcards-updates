# TrummCards Lagerverwaltung

Windows-App zur Verwaltung von Pokémon-Karteneinkäufen, Verkäufen und Lagerbeständen.

## Automatische Windows-Updates
`package.json` enthält die Programmversion. Sobald eine neue Version auf `main`
erscheint, baut GitHub Actions auf Windows die installierbare EXE, `latest.yml`
und die zugehörige `.exe.blockmap` und veröffentlicht diese **gemeinsam** als
GitHub Release `v<version>`. Bereits vorhandene Versionsnummern werden übersprungen.

### Neue Version veröffentlichen
1. Änderungen im Quellcode vornehmen und testen.
2. In `package.json` die Version erhöhen, beispielsweise `1.5.1` → `1.5.2`.
3. Änderungen nach `main` übertragen.
4. Unter **Actions → TrummCards – Windows Auto-Release** den Build prüfen.
5. Die installierte App bietet die neue Version anschließend zum Update an.

**Wichtig:** Versionsnummern müssen eindeutig und aufsteigend sein. Ein
GitHub Release mit dieser Versionsnummer darf noch nicht existieren. Nur
lauffähige, getestete App-Versionen auf `main` übertragen.

Die App verwendet `electron-updater`. Das Programm speichert Daten lokal.
Vor automatischer Installation wird eine JSON-Datensicherung mit Artikelbildern
erstellt. Für produktive Windows-Sicherheit wird digitale Codesignierung empfohlen.
