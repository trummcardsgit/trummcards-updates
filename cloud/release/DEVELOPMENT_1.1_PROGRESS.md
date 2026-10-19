# TrummCards Cloud 1.1.0 – Implementierungsprotokoll
Stand: 19.10.2026. **Nur Entwicklungsbranch `feature/cloud-1.1-unified`. Keine Änderungen an PROD, TEST oder der bestehenden Windows-Version 1.6.1.**

## Bereits im Code umgesetzt
- [x] Additive, noch NICHT auf Production angewandte Produkt-Migration: Kartennummer, Seltenheit, Variante, Lagerort, Grading und Katalog-ID; Vorarbeiten für Marktpreise.
- [x] Windows und PWA: diese Felder in Eingabe/Bearbeitung/Abruf, kombinierte Suche/Sprach-/Bestandsfilter und Sortierung, direkt aus Kartenanlage in passende Einkaufsmaske springen.
- [x] TCGdex-Read-only-Kartensuche über öffentlichen REST-Endpunkt, Ergebnisse und Kartendetails, Auswahl und Übernahme von Name/Set/Nummer/Seltenheit/Sprache plus Katalog-ID in beide Artikelmasken. Externe Bildvorschau `low.webp`; kein automatisches Kopieren in private Supabase-Storage, da Nutzungsrechte für Speicherung/Rehosting noch zu klären sind.
- [x] Finanzcenter mit Zeitraumfilter, FIFO-Gewinn, Umsatz, Gebühren, Einkaufsausgaben, Monats- und Plattformbalken in Windows und PWA.
- [x] Excel-kompatibler CSV-Export (UTF-8 BOM, Semikolon, Dezimal-Komma, Verhinderung von Formelinjektion); negative Geldbeträge bleiben numerisch.
- [x] Versandlogik als isolierter geprüfter Baustein: Status, Versanddienst, Trackingnummer, Bestellreferenz, Datum und validierte HTTPS-Links. **Noch keine persistente Versandmaske oder Datenbankmigration.**
- [x] Automatische Node-/RLS-/FIFO-/Restore-/Windows-Pakettests über GitHub Actions, **NO DEPLOY**.

## Noch offen bis zum einen gemeinsamen Release 1.1.0
- [ ] Set-Datenbank bequem durchsuchen, Sprachen/Fälle prüfen und Bildübernahmerechte klären; ggf. externe Bilder nur ansehen, eigene Bilder privat speichern.
- [ ] Marktpreisquelle (passende Sprache, Variante, Zustand, Zeitstempel, Rechte, Kosten) integrieren und manuelle Preise als Fallback.
- [ ] Versandstatus im owner-RLS-geschützten Datenmodell dauerhaft speichern, in Windows/PWA bearbeitbar und synchronisierbar machen. **Bestehenden Verkauf-FIFO-RPC nicht ändern.**
- [ ] Individuell konfigurierbare Plattformgebühren und vollständige Finanz-/Steuerexportdaten mit **Zahlungsdatum** und sonstigen Ausgaben (FIFO-Betriebsgewinn ≠ österreichische steuerliche E/A-Rechnung).
- [ ] Umfangreiche manuelle Systemtests mit echter PWA und Windows-Installer, inklusive Set/Artwork, Statistik und CSV-Download.
- [ ] Version 1.1.0, Cloud-Auto-Update-Metadaten, PWA-Service-Worker und durchgängig geschütztes Releaseverfahren vorbereiten.
- [ ] Vor Produktivmigration aktuelle Sicherung und Restore prüfen und ausdrückliche neue Eigentümerfreigabe einholen.

## Einschränkungen/Grundsätze
Die Benutzeroberflächen sind auf dem Branch weiterhin in **read-only 0.9.0-Release-Candidate** eingebettet. Der 1.1-Release wird erst nach abschließender Versionsstufe und Freigabe erstellt. Keine kostenpflichtigen APIs ohne explizite Zustimmung, keine geheime Schlüssel oder Service-Rollen in Clients. Alle bisher bestehenden Bestands-/Preis-/Verkaufsbuchungen werden unverändert übernommen.
