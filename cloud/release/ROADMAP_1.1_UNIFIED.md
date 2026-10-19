# TrummCards Cloud 1.1 – GROSSES KOMFORT-, POKÉMON- UND FINANZ-UPDATE
**Produktentscheidung:** 19.10.2026. Der Eigentümer wünscht die Inhalte der bisherigen Planung für 1.1, 1.2 und 1.3 zusammen in **einer einzigen nächsten Veröffentlichung: Version 1.1.0**. Entwicklung/Tests dürfen in isolierten Zweigen und Teilabschnitten erfolgen; **keine Zwischenveröffentlichung**, solange das Gesamtpaket nicht bereit ist.

## Ausgangslage (Produktivversion 1.0.0)
- Eigene Supabase-Produktivdatenbank, getrennt von TEST; bestehende Daten und Bilder niemals ersetzen oder unkontrolliert migrieren.
- Windows Cloud/Electron + PWA verwenden dieselbe Eigentümer-RLS-geschützte Datenbank und private Bilder.
- Artikel können bereits Set, Sprache, Zustand und Bild enthalten. Verkauf hat bereits Plattform, Gebühren, Versand-Einnahmen/-Kosten und FIFO-Einstand. Diese Felder **erweitern**, nicht doppelt neu implementieren.
- Bereits verfügbare einfache Suchfunktion in mobiler PWA nach Name/SKU; für 1.1 ausbauen (Filter, Suche auf beiden Oberflächen).
- 1.0.0 bei jedem Entwicklungsschritt unverändert weiter nutzbar; kein Bruch von Windows 1.6.1 oder TEST.

## Umfang 1.1.0 – ALLES IN EINEM RELEASE

### A. Komfort und Lager
- Einheitliche Suche in Windows/PWA: Name, SKU, Set, Kartennummer, Sprache, Zustand, Rarität, Lagerort.
- Mehrfachfilter, schnelle Sortierung (Name, Preis/Einstand, Menge, Lagerort, Set, Alter), kombinierbare Filter, Ergebnisse sofort aktualisieren, mobil bedienbar.
- Lagerorte (Box / Ordner / Regal / Fach) mit sinnvoller Eingabe und Anzeige im Lager; Bestände und Einzelkarten schnell auffindbar.
- Zusätzliche Kartendaten (Kartennummer, Seltenheit, Variantentyp/Holo, Edition, ggf. Grading PSA/CGC/BGS mit Bewertung und Zertifikatsnummer, Zustandsdetails). Bestehende Set/Sprach-/Zustandsfelder beibehalten.
- Schnellerfassungsmaske: „Speichern & nächsten Artikel“, Defaults wiederverwenden, Menge/Einkauf möglichst direkt aus dem Formular; optional CSV-Massenerfassung mit Validierung und Vorschau vor Import.
- Datenmodell: additive, rückwärtskompatible Migrationen, RLS und Bestands-/Buchungswerte unverändert.

### B. Pokémon-Katalog, Bilder und Preise
- Automatische Kartensuche nach Name, Set, Kartennummer und Sprache; Auswahl aus Suchtreffern mit Vorschau.
- Automatische Übernahme von Kartenname, Set, Nummer, Rarität und **Katalogbild nach Wahl**; manuelle Korrekturen und eigene private Fotos behalten Vorrang.
- Katalog der Sets einschließlich deutsch/englisch/japanisch soweit von der Quelle verfügbar; fehlende Kartendaten dürfen eine manuelle Anlage nicht verhindern.
- Zuerst dokumentierte/offen nutzbare Katalogquelle wie TCGdex evaluieren (`https://tcgdex.dev/de`), inklusive Nutzungsbedingungen, Abdeckung, Bildrechte/CORS, Rate-Limits und Fallback.
- Marktpreisvergleich pro Karte mit Preisquelle, Währung, konkreter Edition/Sprache/Zustand, Beobachtungszeitpunkt und Hinweis „Richtwert, kein garantierter Verkaufspreis“. Einkaufspreis, Marktwert und Gebührenprognose gegenüberstellen.
- **Keine unzulässige Datenabfrage/Cardmarket-Scraping.** Cardmarket-API ist laut offizieller Dokumentation nur für bestimmte zugelassene Verkäufer verfügbar (Stand Okt 2026); ohne Berechtigung andere lizenzkonforme Preisquelle oder manuelle Markteingabe + Referenzlink verwenden. Eventuelle Drittanbietergebühren vor Aktivierung ausdrücklich angeben; keine kostenpflichtigen Dienste ohne Zustimmung.

### C. Verkaufscenter, Versand, Auswertungen und Export
- Bestehendes Plattformfeld erweitern: Cardmarket, eBay, Willhaben, Whatnot, Vinted, Privat, Sonstige; Plattformfilter, optional vorkonfigurierte Gebührenmodelle **mit kontrollierbarer manueller Überschreibung**.
- Versand zu einem Verkauf: Bestell-/Transaktionsreferenz, Versandart, Sendungsnummer, Status (offen/verpackt/versendet/zugestellt), Versanddatum, Versanddienstleister und externe Tracking-URL; keine automatische Weitergabe von Käuferdaten.
- Dashboard mit Zeitraumfilter und Diagrammen: Umsatz, Gewinn nach FIFO, Einstand, Gebühren, Versandergebnis, Einkaufsausgaben, Bestand/Lagerwert, Verkaufskanäle und meistverkaufte Karten/Sets; gebuchte vs. stornierte Verkäufe korrekt abgrenzen.
- Buchhaltungsexport CSV mit Rohdaten und Feldern für Datum, Transaktionsart, Einnahme, Ausgabe, Gebühren, Versand, Plattform und Artikel; optional Excel-kompatibler Export. Für Österreich ausdrücklich **Auswertung/Export, kein zertifiziertes Buchhaltungssystem/automatische Steuererklärung**. Erfassung nach Zufluss/Abfluss (Einnahmen-Ausgaben-Rechnung) erfordert bei Bedarf zusätzliche Zahlungsdatum-Felder; Buchungsdatum/FIFO-Lagergewinn sind NICHT automatisch steuerpflichtiger Gewinn.
- Optionale Auswertungen mit Jahres-/Monatsfiltern, exportierbar, dokumentiert.

## Sicherheit, Qualität und Veröffentlichung
1. Planung und Entwicklungen in isoliertem Git-Branch, bestehende **Cloud 1.0.0 Production unverändert**.
2. Vor Migration: frisches verschlüsseltes PROD-Backup + Restorekontrolle. Additive Felder/Tabellen, owner_id + RLS, niemals service-role in Endgeräten, private Bilder.
3. API-Keys für zugangsbeschränkte Preisservices nicht in PWA/Windows bündeln; bei Bedarf serverseitig via sicherer Function. Keine heimliche Paid-API.
4. Automatische Tests: Suche/Filter, Import-Duplikate, Daten- und Bildübernahme, Preisquellen/Fallback, Plattformgebühren, Versandstatus, Dashboard-Kennzahlen, Buchhaltungsexport, FIFO/Storno, RLS und Backup/Restore.
5. Gleiche Funktionen in Windows und PWA, responsive Darstellung. Offline-/Netzfehler klar behandeln, keine doppelten Buchungen.
6. Versionssprung auf 1.1.0 inklusive Windows-Cloud-Updater und separatem `cloud-updates/latest.yml`, PWA Service Worker/Cacheversion und TEST-Isolation.
7. **Erst wenn alle Funktionsgruppen fertig und abgenommen sind, eine einzige Veröffentlichung 1.1.0**, gefolgt von Realgerätetests.

## Offene fachliche Festlegungen zu Beginn
- Lagerort: für den Artikel pauschal oder für einzelne FIFO-Einkaufslosen/unterschiedliche Exemplare? Empfehlung: zunächst Artikel-Lagerort, optional Los-Lagerort für verteilte Bestände.
- Kartenvarianten und Zustände beeinflussen die Marktpreise erheblich. Identität im Katalog = Set + Kartennummer + Variante + Sprache; Katalogdaten können lückenhaft sein.
- Preisprovider: lizenzierte Preisquelle und evtl. Kosten vor Implementierung entscheiden; kostenlose/ohne-Key-Daten für Suchfunktion priorisieren.
- Steuerexport: tatsächliche Zahlungsflüsse separat erfassen, sofern steuerlich brauchbare E/A-Auswertung gewünscht ist.

**Diese Datei ist die verbindliche gemeinsame Funktionsliste für 1.1.0; keine automatische Aktivierung von Features und keine Zusage eines Datums.**
