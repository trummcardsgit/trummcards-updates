# TrummCards Cloud 1.1.0 – Implementierungsprotokoll
Stand: 19.10.2026. **Nur Entwicklungsbranch `feature/cloud-1.1-unified`. Keine Änderungen an PROD, TEST oder der bestehenden Windows-Version 1.6.1.**

## Bereits im Code umgesetzt
- [x] Additive, noch NICHT auf Production angewandte Produkt-Migration: Kartennummer, Seltenheit, Variante, Lagerort, Grading und Katalog-ID; Vorarbeiten für Marktpreise.
- [x] Windows und PWA: diese Felder in Eingabe/Bearbeitung/Abruf, kombinierte Suche/Sprach-/Bestandsfilter und Sortierung, direkt aus Kartenanlage in passende Einkaufsmaske springen.
- [x] TCGdex-Read-only-Kartensuche über öffentlichen REST-Endpunkt, Ergebnisse und Kartendetails, Auswahl und Übernahme von Name/Set/Nummer/Seltenheit/Sprache plus Katalog-ID in beide Artikelmasken. Externe Bildvorschau `low.webp`; kein automatisches Kopieren in private Supabase-Storage, da Nutzungsrechte für Speicherung/Rehosting noch zu klären sind.
- [x] Finanzcenter mit Zeitraumfilter, FIFO-Gewinn, Umsatz, Gebühren, Einkaufsausgaben, Monats- und Plattformbalken in Windows und PWA.
- [x] **Marktpreise:** TCGdex Cardmarket-Trendpreise in EUR mit Variantenprüfung (Standard/Holo), Quelle und Zeitstempel; bei fehlenden/unsicheren Marktpreisen manuelle Eingabe. Preisvergleich je Artikel mit durchschnittlichem verbleibenden FIFO-Einstand **vor Verkaufsgebühren und Steuern** in Windows und PWA. Für Reverse/SIR/Grading keine automatische Preisannahme.
- [x] **Gebührenprofile:** Konfigurierbarer Prozentsatz plus Fixgebühr pro Plattform, optional Versand-Einnahmen als Berechnungsbasis; profilbasierter Vorschlag nur auf ausdrücklichen Klick beim Verkauf, danach frei bearbeitbar. Getrennte owner-RLS-Tabelle `tc_platform_fee_profiles` im Entwicklungsbranch.
- [x] Excel-kompatibler CSV-Export (UTF-8 BOM, Semikolon, Dezimal-Komma, Verhinderung von Formelinjektion); negative Geldbeträge bleiben numerisch.
- [x] **Versandverwaltung in Windows/PWA:** Versandstatus, Dienstleister, Trackingnummer, Bestellreferenz, Versanddatum und HTTPS-Link je Verkauf, Cloud-Synchronisierung, Bearbeiten direkt aus Verkaufsliste.
- [x] **Datenmodell vorbereitet:** Separate, owner-RLS-geschützte Tabelle `tc_sale_shipments` mit zusammengesetzter Referenz auf den richtigen Verkäufer; kein Eingriff in FIFO-Verkauf/Buchungs-RPC. SQL liegt **nur im Entwicklungsbranch**.
- [x] **Datensicherung vorbereitet:** Backupformat v2 enthält Verkaufssendungen und private Plattformgebührenprofile; Validierung akzeptiert v1 (historisch) und v2; Offline-Restore und Eigentümerzugriff werden in GitHub Actions geprüft. V2-Umstellung erfordert einen geplanten Backup-/Schema-Switchover und ist noch nicht live.
- [x] Automatische Node-/RLS-/FIFO-/Restore-/Windows-Pakettests über GitHub Actions, **NO DEPLOY**.

## Noch offen bis zum einen gemeinsamen Release 1.1.0
- [ ] Set-Datenbank bequem durchsuchen, Sprachen/Fälle prüfen und Bildübernahmerechte klären; ggf. externe Bilder nur ansehen, eigene Bilder privat speichern.
- [x] TCGdex-EUR-Trendpreis und manueller Richtwert in beiden Clients integriert. **Noch offen:** Nutzungslizenzen/aktuelle Variantenabdeckung und Liveabnahmetests mit realen Kartenpreisen und externem Netzwerk; Richtwerte dürfen nicht als garantierter Verkaufswert gelten.
- [x] Versandfunktion und Speicherung im 1.1-Branch integriert (SQL, Windows/PWA, Tests). **Noch nicht produktiv migriert, noch kein Endgerätetest.**
- [ ] Backup-Upgrade im abgestimmten Verfahren: neue v1/v2-kompatible Sicherungssoftware vor der Datenbankänderung bereitstellen; Snapshot v2 aktivieren; vollständige echte verschlüsselte Sicherung und Restore des Versanddatensatzes bestätigen.
- [x] Individuell konfigurierbare Plattformgebühren inkl. Testansätzen in Windows/PWA integriert. **Noch offen:** steuerlich vollständigere Finanz-/Steuerexportdaten mit **Zahlungsdatum** und sonstigen Ausgaben (FIFO-Betriebsgewinn ≠ österreichische steuerliche E/A-Rechnung).
- [ ] Umfangreiche manuelle Systemtests mit echter PWA und Windows-Installer, inklusive Set/Artwork, Statistik und CSV-Download.
- [ ] Version 1.1.0, Cloud-Auto-Update-Metadaten, PWA-Service-Worker und durchgängig geschütztes Releaseverfahren vorbereiten.
- [ ] Vor Produktivmigration aktuelle Sicherung und Restore prüfen und ausdrückliche neue Eigentümerfreigabe einholen.

## Einschränkungen/Grundsätze
Die Benutzeroberflächen sind auf dem Branch weiterhin in **read-only 0.9.0-Release-Candidate** eingebettet. Der 1.1-Release wird erst nach abschließender Versionsstufe und Freigabe erstellt. Keine kostenpflichtigen APIs ohne explizite Zustimmung, keine geheime Schlüssel oder Service-Rollen in Clients. Alle bisher bestehenden Bestands-/Preis-/Verkaufsbuchungen werden unverändert übernommen.
