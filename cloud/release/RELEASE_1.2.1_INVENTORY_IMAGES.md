# TrummCards Cloud 1.2.1 – Lager-Artikelbilder (20.10.2026)
## Fehler
Der Nutzer meldete, dass nach der Kartenübernahme ins Lager in der Windows-Cloud-Version anstatt der Karte nur das ▧-Symbol erscheint. Konkret: `Glumanda 168/165`, SKU `SIN-008`, Set `ポケモンカード151`, Sprache Japanisch.
## Diagnose
PRODUCTION hatte den Artikel mit leeren Feldern `catalog_card_id` und `catalog_image_url` gespeichert; eigenes Produktfoto und Einkaufsfoto waren nicht vorhanden. Der alte Katalogpicker verknüpfte nur das Bild aus der gerade ausgewählten Katalogsprache. Bei manuellen Anpassungen auch nur des Artikelnamens wurde die Katalogverknüpfung gelöscht. Zudem zeigten Lager-Vorschaubilder den Platzhalter unabhängig vom erfolgreichen Bildladeereignis.
## Sofortkorrektur am einzelnen Produkt
Das japanische TCGdex-Katalogobjekt `SV2a-168` wurde öffentlich mit Bildwurzel `https://assets.tcgdex.net/ja/SV/SV2a/168` geprüft, die URL `/low.webp` antwortete HTTP 200 (image/webp). Nur die bisher leeren Katalogverknüpfungsfelder des Produkts SKU SIN-008 wurden unter weiteren exakten Identitätsbedingungen ergänzt. Produkt, Artikelbestand, Einkaufs- und Verkaufsbuchungen, Fotos und Preise unverändert. Eine anschließende lesende PROD-Abfrage bestätigte den Link.
## Dauerhafte App-Korrektur in Cloud 1.2.1
- Neuer clientseitiger, gemeinsamer Bildauflöser `image-link12.js` in Windows und PWA. Bevorzugt Bild der ursprünglichen Kartensprache, prüft tatsächliches Bildladen und versucht bei Bedarf alternative Sprachen derselben exakt passenden Karte. Andere Hosts / fremde IDs bleiben ausgeschlossen.
- Beim Übernehmen im Artikelstamm wird die geprüfte `catalog_image_url` gespeichert. Die Benutzer-Kartensprache wird durch einen Ersatzbildtreffer nicht überschrieben.
- Das manuelle Anpassen des reinen Artikelnamens entfernt die bestehende Bildzuordnung nicht mehr. Bei Änderung von Set, Nummer oder Sprache wird die alte Bildzuordnung dagegen weiterhin aus Sicherheitsgründen gelöst.
- Bei älteren japanischen Karten aus dem eindeutig benannten Set Pokémon Card 151 kann der Lagerbildaufruf anhand von `SV2a` und Kartennummer erneut nachsehen. Fremde Sets erhalten keinerlei spekulative Zuordnung. Kein automatischer Datenbank-Updateprozess für diese Nachsuche.
- Lagerbilder werden erst nach einem erfolgreichen `onload` sichtbar. Bei `onerror` bleibt das bisherige Icon erhalten. Bereits vorhandene eigene Fotos haben immer Vorrang.
- Unveränderte Supabase-PRODUCTION-Datenbank und TEST-Datenbank, keine Schemaänderung, kein Datenimport.
## Tests / Release
- Bild-Regressionstests Windows und PWA; jap. Katalog-ID, englischer Fallback, ungeprüfte/gefälschte Quellen und unveränderte Artikel-Speicherlogik.
- Testworkflow: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39402264764 (grün).
- Produktions-Probelauf mit beiden Clients: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39402718105 (grün).
- Live-Release mit vollständiger verschlüsselter PROD-Sicherung und Restore: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39403762255 (Status erst nach vollständigem Lauf bestätigen).
