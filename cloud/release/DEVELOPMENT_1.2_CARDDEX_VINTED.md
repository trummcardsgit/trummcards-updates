# TrummCards Cloud 1.2 – KartenDex und Vinted-Inseratsvorlage
Datum: 19.10.2026

## Umsetzung im Entwicklungszweig
Branch: `feature/cloud-1.2-carddex-vinted`. Basis ist die erfolgreiche Cloud-1.1-Produktion.
- Windows und PWA: zusätzlicher Menüpunkt **KartenDex**. Er verwendet die existierende, unveränderte TCGdex-API, aber nicht die Artikelanlage als Eingabemaske. Karten-Namenssuche mit Vor-/Zurück-Seiten zu je 20 Karten, Sprache Deutsch/Englisch/Japanisch/Italienisch, Set-Suche samt Folgeseiten und Kartennavigation in den Sets. Vollständige Kartendetails, Bildvorschau und optionale Übernahme in die bisherige Artikelanlage.
- Windows und PWA: jeder Lagerartikel besitzt einen **Vinted**-Button, öffnet einen Dialog und erzeugt aus gespeichertem Namen und Kartennummer eine kopierbare Verkaufsüberschrift. Die Beschreibung nennt mindestens Set und Sprache, zusätzlich bekannte Kartennummer, Zustand und Variante. Textfelder und optionaler selbst zu setzender Verkaufspreis sind vor dem Kopieren bearbeitbar.
- Das Inserat wird **nicht** per Bot/API veröffentlicht. Ein Link öffnet Vinted im Browser. Die App zeigt nur selbst hochgeladene Artikelbilder als Verkaufsfoto-Vorschau; fremde TCGdex-Katalogbilder werden ausdrücklich nicht zum Rehosting oder für das Vinted-Inserat übernommen.
- Keine Supabase-Migration nötig. Lager, Verkaufsbuchungen, Artikelbilder und FIFO werden nicht verändert.

## TEST-Auslieferung
- Isoliertes Test-PWA-Verzeichnis: https://trummcardsgit.github.io/trummcards-updates/test-12/
- Unabhängiger Windows-TEST-Installer per GitHub Actions `cloud-12-test-build.yml`. Separates App-Profil, eigener TEST-Datenbankendpunkt, kein Cloud-PROD-Updater.
- Tests: `cloud/release/carddex-vinted12.test.mjs` plus Node-Syntaxchecks und getrennte Windows-/PWA-Builds.
- Bestehende Cloud 1.1 PRODUCTION, alter TEST-Root und `test-11/` unverändert.

## Offene Schritte
- Vinted-Text und KartenDex auf echten Endgeräten prüfen; insbesondere Set-/Sprachsuche, Folgeseiten, Übernahme in Artikelanlage, eigene Foto-Vorschau und Zwischenablagefunktion.
- Nach positivem TEST einen eigenen Cloud-1.2-Produktivupdateprozess mit der unveränderten Supabase-PRODUCTION-Datenbank erstellen, vollständiges v2-Backup/Restore erneut prüfen und Version 1.2.0 auf PWA und Windows-Updater veröffentlichen.
- Cloud-1.2-Releaselog im Projektchronikverzeichnis bei Produktivfreigabe ergänzen.
